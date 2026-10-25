"""Bounded public-article extraction and evidence tagging; no generative claims."""
from html.parser import HTMLParser
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.robotparser import RobotFileParser
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
import re
import unicodedata
import threading
import time
import hashlib
import calendar

VERSION = 6
AGENT = 'StockEdgeResearch/1.0'
VOID = {'br','hr','img','input','meta','link','wbr','source','area','base','embed','param','track','col'}
class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.stack=[]; self.parts=[]; self.start=None; self.finished=False
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        marker=attrs.get('class','')+' '+attrs.get('id','')
        target=attrs.get('itemprop')=='articleBody' or re.search(r'(?:^|\s)(?:dText|article-body|entry-content|entry_body|entry-body|skin-entryBody|blogText|blog_text)(?:\s|$)',marker)
        if self.start is None and not self.finished and target:self.start=len(self.stack)
        if tag in ('br','p','div','li','h2','h3','table','tr') and self.start is not None:self.parts.append('\n')
        if tag not in VOID:self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in ('p','div','li','h2','h3','tr') and self.start is not None:self.parts.append('\n')
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]==tag:
                self.stack=self.stack[:i]
                if self.start is not None and len(self.stack)<=self.start:self.start=None;self.finished=True
                break
    def handle_data(self, data):
        if self.start is not None and not any(t in ('script','style','nav','aside','footer','form') for t in self.stack[self.start:]):self.parts.append(data)
    def text(self):return '\n'.join(re.sub(r'\s+',' ',s).strip() for s in ''.join(self.parts).splitlines() if s.strip())[:16000]

def norm(value):return unicodedata.normalize('NFKC',str(value or '')).replace('\u200b','').strip()
def subjects(title, body, code='', company=''):
    title=norm(title);body=norm(body);found={code:{'code':code,'name':company or code,'basis':'既存銘柄の明示表記'}} if code else {}
    # Never interpret arbitrary table values, years, price amounts, or portfolio
    # performance as stock codes. These pairs must occur in the title or beside
    # an explicit listing-market marker near the beginning of the article.
    patterns=[(title,r'(?:^|[\s、\-:])([1-9][0-9]{3}|[1-9][0-9]{2}[A-Z])\s*([ァ-ヶー一-龥A-Za-z][ァ-ヶー一-龥A-Za-z0-9・&.\-]{1,35})'),
              (body[:900],r'(?:^|[\s、])([1-9][0-9]{3}|[1-9][0-9]{2}[A-Z])\s+([ァ-ヶー一-龥A-Za-z][ァ-ヶー一-龥A-Za-z0-9・&.\-]{1,35})\s*[（(](?:東証|東[PSGプスグ]|福証|名証|札証|JQ|ジャスダック|スタンダード|プライム|グロース)')]
    for text,pattern in patterns:
        for match in re.finditer(pattern,text):
            c,name=match.groups()
            if re.match(r'年|月|日|円|万円|億円|年度|期|年末|年第|位|ポイント|倍|株|口|件',name):continue
            if c not in found:found[c]={'code':c,'name':name,'basis':'記事中のコード・社名表記（取引所照合前）'}
    return list(found.values())[:4]

RULES=[
 ('valuation','企業価値・割安さ',r'割安|割高|PER|PBR|時価総額|資産価値|ネット(?:キャッシュ|ネット)|含み資産|清算価値'),
 ('growth','業績・成長',r'増益|減益|増収|減収|上方修正|下方修正|成長|受注|利益率|最高益|好調|悪化'),
 ('return','株主還元',r'増配|減配|自社株買い|配当利回り|配当性向|DOE|株主還元|優待'),
 ('catalyst','変化のきっかけ',r'TOB|MBO|新工場|新製品|新規出店|価格改定|事業売却|資本提携|上場廃止|統合|分割'),
 ('risk','リスク・反対材料',r'リスク|懸念|競争激化|需要減|減損|赤字|債務超過|不正|下方修正|減配|割高|減益|悪化|失敗'),
 ('condition','前提条件・撤回条件',r'なら(?:ば)?|場合(?:は|に)|を下回|を上回|次第|限り|まで待|損切り|撤退|見送')]
UP=re.compile(r'割安|増益|増収|上方修正|増配|自社株買い|最高益|好調')
DOWN=re.compile(r'割高|減益|減収|下方修正|減配|赤字|悪化|リスク|懸念')
NEGATE=re.compile(r'(?:割安|増益|増収|好調|成長)(?:で(?:は|も)|と(?:は|も))?ない|(?:減益|赤字|懸念|リスク)(?:で(?:は|も)|と(?:は|も)|は)?ない|割安とは言え|増益とは言え')
NEGATED_TERM=re.compile(r'(?:割高(?:感)?|割安(?:感)?|減益|減収|増益|増収|赤字|リスク|懸念|悪化)(?:が|は|も|の|でも|では|とは|とも)?(?:あまり|ほとんど)?(?:ありません|ありえない|ない|なく|見当たらない|見られない|認められない)')
NUMBER=r'([+-]?(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.[0-9]+)?)'
def structured_statement(sentence):
    periods=set(re.findall(r'(20[0-9]{2})(?:年|/)\s*([0-9]{1,2})(?:月期|期)',sentence))
    periods={(int(y),int(m)) for y,m in periods if 1<=int(m)<=12}
    end='';label='・'.join(f'{y}年{m}月期' for y,m in sorted(periods))
    if len(periods)==1:
        year,month=next(iter(periods));end=f'{year:04d}-{month:02d}-{calendar.monthrange(year,month)[1]:02d}'
    if not label:label='年度未特定の今期・来期' if re.search(r'今期|来期|前期',sentence) else '対象期不明'
    quarter=bool(re.search(r'四半期|[1-4]\s*Q(?:\b|累計|実績|決算)',sentence,re.I))
    half=bool(re.search(r'上期|下期|(?<!四)半期|中間期|中間決算|中間実績',sentence))
    annual=bool(re.search(r'通期',sentence)) or bool(re.search(r'年度',sentence)) and not (quarter or half)
    scope='mixed' if sum((quarter,half,annual))>1 else 'quarter' if quarter else 'half' if half else 'annual' if annual or len(periods)==1 else 'unknown'
    if scope in ('quarter','half','mixed'):label+=' / '+{'quarter':'四半期','half':'半期','mixed':'集計期間が混在'}[scope]
    forecast=bool(re.search(r'予想|計画|見込|見通し|会社側は|想定|目指|予定',sentence));actual=bool(re.search(r'実績|着地|確定|だった|となった|となりました',sentence))
    nature='mixed' if forecast and actual else 'forecast' if forecast else 'actual' if actual else 'unspecified'
    attribution='会社予想への言及（一次開示未照合）' if re.search(r'会社(?:の|側の)?(?:予想|計画)|会社側',sentence) else '著者の記述・解釈'
    metrics=[]
    patterns=[('per','PER',r'(?:予想|実績)?PER\s*'+NUMBER,'倍'),('pbr','PBR',r'PBR\s*'+NUMBER,'倍'),('yield','配当利回り',r'配当利回り\s*'+NUMBER+r'\s*%','%'),('eps','EPS',r'EPS\s*'+NUMBER+r'\s*円','円'),('price','記事中株価',r'株価(?:は|が|:)?\s*'+NUMBER+r'\s*円','円'),('operatingProfitGrowth','営業利益増減率',r'営業利益(?!率)[^。]{0,28}?(?:前年比|前年同期比|前期比)\s*'+NUMBER+r'\s*%','%'),('revenueGrowth','売上増減率',r'売上(?:高)?[^。]{0,28}?(?:前年比|前年同期比|前期比)\s*'+NUMBER+r'\s*%','%')]
    for measure,name,pattern,unit in patterns:
        match=re.search(pattern,sentence,re.I)
        if not match:continue
        if measure.endswith('Growth'):
            prefix=re.sub(r'^(?:営業利益|売上高?)','',match.group(0))
            if re.search(r'営業利益|純利益|経常利益|粗利益|利益率|EPS|配当|売上',prefix,re.I):continue
        if re.match(r'\s*(?:~|〜|～|から|[-－])\s*[0-9]',sentence[match.end():]):continue
        value=float(match.group(1).replace(',',''))
        if measure.endswith('Growth') and re.match(r'\s*(?:減|減少)',sentence[match.end():]):value=-abs(value)
        metric_nature=nature if measure.endswith('Growth') else 'unspecified'
        if measure=='per':metric_nature='forecast' if re.search(r'予想PER',match.group(0),re.I) else 'actual' if re.search(r'実績PER',match.group(0),re.I) else 'unspecified'
        metrics.append({'measure':measure,'name':name,'value':value,'unit':unit,'nature':metric_nature})
    return {'periodLabel':label[:100],'periodEnd':end,'periodScope':scope,'nature':nature,'attribution':attribution,'metrics':metrics[:6]}
def evidence(title, body, code='', company='', basis='rss'):
    text=norm(title)+'\n'+norm(body)
    sentences=[re.sub(r'\s+',' ',s).strip() for s in re.split(r'[。！？\n]+',text[:16000]) if s.strip()]
    claims=[];used=set();remaining=340
    for kind,label,pattern in RULES:
        candidates=[s for s in sentences if re.search(pattern,s,re.I)]
        if kind=='valuation':candidates=[s for s in candidates if not re.search(r'PF時価総額|ポートフォリオ.*時価総額|運用資産総額',s)]
        if kind=='return':candidates=[s for s in candidates if not re.fullmatch(r'[0-9]+位\s+[0-9A-Z]{4}\s+.*',s)]
        if kind=='risk':candidates=[s for s in candidates if re.search(pattern,NEGATED_TERM.sub('',re.sub(r'リスク[・\-]?リワード','',s)),re.I) and not re.search(r'何か見逃している|最強で最上|投資にはリスク|自己責任|当ブログは|免責',s)]
        if not candidates:continue
        # Prefer concrete valuation/financial statements over rankings or generic
        # investor slogans. A metric alone still isn't a verified current fact.
        def relevance(sentence):
            score=min(len(sentence),120)/120
            if kind=='valuation':score+=5*bool(re.search(r'(?:PER|PBR)\s*[0-9]|割安|割高',sentence,re.I))
            if kind=='return':score+=5*bool(re.search(r'増配|減配|自社株買い|配当利回り|配当性向|DOE',sentence,re.I))
            if kind=='growth':score+=3*bool(re.search(r'増益|減益|増収|減収|上方修正|下方修正|受注|利益率',sentence))
            return score
        sentence=max(candidates,key=relevance)
        match=re.search(pattern,sentence,re.I);start=max(0,match.start()-24)
        budget=min(68,remaining)
        if budget<8:break
        prefix='…' if start else ''
        end=min(len(sentence),start+budget-len(prefix)-1)
        excerpt=prefix+sentence[start:end]+('…' if end<len(sentence) else '')
        if (kind,excerpt) in used:continue
        used.add((kind,excerpt));remaining-=len(excerpt)
        if remaining<0:break
        affirmed=NEGATED_TERM.sub('',sentence)
        up=bool(UP.search(affirmed));down=bool(DOWN.search(affirmed))
        polarity='unclear' if NEGATE.search(sentence) or up==down else 'support' if up else 'caution'
        claim={'kind':kind,'label':label,'polarity':polarity,'excerpt':excerpt}
        claim.update(structured_statement(sentence))
        claim['sourceSentence']=sentences.index(sentence)+1
        claim['evidenceHash']=hashlib.sha256(sentence.encode()).hexdigest()
        if kind=='condition':claim['conditionType']='invalidation' if re.search(r'損切り|撤退|見送|下回|下方修正|悪化|未達',sentence) else 'assumption'
        claims.append(claim)
    identities=subjects(title,body,code,company)
    for claim in claims:claim['entityScope']='single-subject' if len(identities)==1 else 'unassigned'
    return {'version':VERSION,'basis':basis,'subjects':identities,'claims':claims,'singleSubject':len(identities)==1,'coverage':'本文の一部' if basis=='article' else 'RSSの範囲','checkedAt':datetime.now(timezone.utc).isoformat(),'documentHash':hashlib.sha256(text.encode()).hexdigest()}

def allowed_article(url, source):
    try:
        u=urlparse(url);h=urlparse(source['home'])
        return u.scheme=='https' and u.hostname==h.hostname and not u.username and not u.password and u.port in (None,443) and u.path.startswith(h.path.rstrip('/')+'/') and u.path!=h.path
    except ValueError:return False

def enrich(items, sources, previous):
    known={s['id']:s for s in sources};old={p.get('url'):p for p in previous};now=datetime.now(timezone.utc)
    for p in items:p['research']=evidence(p['headline'],p.get('summary',''),p.get('code',''),p.get('company',''))
    jobs=[];per_source={}
    for p in items:
        source=known.get(p.get('sourceId'));prior=old.get(p['url'],{})
        research=prior.get('research',{})
        try:age=(now-datetime.fromisoformat(research['checkedAt'])).total_seconds()
        except (KeyError,ValueError,TypeError):age=1e10
        if research.get('version')==VERSION and research.get('basis')=='article' and age<36*3600 and prior.get('publishedAt')==p['publishedAt']:
            p['research']=research;continue
        # Use a small fixed budget; only company-focused articles justify a body fetch.
        is_company=bool(p['research']['subjects']) or re.search(r'主力概況|PF概況|決算|株価|銘柄|TOB',p['headline'])
        count=per_source.get(p.get('sourceId'),0)
        if source and is_company and allowed_article(p['url'],source) and count<2 and len(jobs)<16:
            per_source[source['id']]=count+1;jobs.append(p)
    # Fetch robots once per source host, outside the article worker pool.
    policies={}
    for p in jobs:
        u=urlparse(p['url']);host=u.hostname
        if host in policies:continue
        robots=RobotFileParser();robots.set_url('https://'+host+'/robots.txt')
        try:
            with build_opener().open(Request(robots.url,headers={'User-Agent':AGENT}),timeout=5) as response:robots.parse(response.read(200000).decode('utf-8','replace').splitlines())
            policies[host]=robots
        except Exception as error:
            if getattr(error,'code',None)==404:robots.parse([]);policies[host]=robots
            else:policies[host]=None
    host_locks={host:threading.Lock() for host in policies};last_request={}
    def one(p):
        source=known[p['sourceId']];policy=policies.get(urlparse(p['url']).hostname)
        if policy is None or not policy.can_fetch(AGENT,p['url']):p['research']['bodyStatus']='取得方針によりRSSのみ';return
        delay=policy.crawl_delay(AGENT) or policy.crawl_delay('*') or 1
        if delay>8:p['research']['bodyStatus']='配信元の取得間隔を優先してRSSのみ';return
        class Redirect(HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                if not allowed_article(newurl,source):raise ValueError('Redirect denied')
                return super().redirect_request(req,fp,code,msg,headers,newurl)
        try:
            host=urlparse(p['url']).hostname
            with host_locks[host]:
                time.sleep(max(0,delay-(time.monotonic()-last_request.get(host,0))))
                last_request[host]=time.monotonic()
                with build_opener(Redirect()).open(Request(p['url'],headers={'User-Agent':AGENT,'Accept':'text/html'}),timeout=8) as response:
                    data=response.read(2000001)
                    if len(data)>2000000:raise ValueError('Article too large')
                    encoding=response.headers.get_content_charset() or 'utf-8'
            parser=ArticleParser();parser.feed(data.decode(encoding,'replace'));body=parser.text()
            if len(body)<100:raise ValueError('本文領域を特定できず')
            p['research']=evidence(p['headline'],body,p.get('code',''),p.get('company',''),'article')
        except Exception as error:p['research']['bodyStatus']='本文未取得：'+str(error)[:80]
    with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(one,jobs))
    return items
