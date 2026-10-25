"""Collect public RSS metadata only. No article-page scraping or third-party package."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urlparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
MAX_BYTES = 2_000_000
FINANCE = re.compile(r'株|投資|決算|配当|優待|銘柄|運用|ポートフォリオ|バリュー|PER|PBR|ROE|ROIC|DCF|TOB|REIT|TOPIX|日経|資産|企業価値|利益|業績|増収|減収|上方修正|下方修正|IR|四季報|資本|金融|経済|インフレ|景気|金利|円安|円高', re.I)
NON_FINANCE = re.compile(r'旅行記|登山|トレッキング|ランチ|温泉|宿泊|ハイキング|[旅宿]日記|食べ歩き')

def plain(value):
    value = re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>', ' ', value or '', flags=re.I | re.S)
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', value))).strip()

def valid_url(value):
    try:
        u = urlparse(value)
        return u.scheme == 'https' and bool(u.hostname) and not u.username and not u.password and u.port in (None, 443)
    except ValueError:
        return False

def date_iso(value):
    try:
        try: dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError: dt = parsedate_to_datetime(value)
        if dt.tzinfo is None: return None
        return dt.astimezone(timezone.utc)
    except (ValueError, TypeError, OverflowError): return None

def field(node, *names):
    for name in names:
        for child in node:
            if child.tag.split('}')[-1] == name:
                return ''.join(child.itertext()).strip()
    return ''

def investment_item(title, categories, summary):
    # A personal blogger also writes about travel. A sidebar mentioning stocks
    # must never turn an unrelated travel post into a financial opinion.
    if NON_FINANCE.search(title) and not FINANCE.search(title): return False
    return bool(FINANCE.search(title + ' ' + categories) or FINANCE.search(summary[:300]))

def load_universe():
    source = (ROOT / 'index.html').read_text(encoding='utf-8')
    rows = json.loads(re.search(r'const UNIVERSE=(\[.*?\]);', source).group(1))
    model = (ROOT / 'edge-model.js').read_text(encoding='utf-8')
    aliases = dict(re.findall(r"'([0-9A-Z]{4})':'([^']+)'", model.split('const age=')[0]))
    return rows, aliases

def match_codes(title, rows, aliases):
    # Read only the title. A four-digit financial figure or year is insufficient:
    # require explicit stock-code notation or an unambiguous company name.
    normalized = unescape(title).translate(str.maketrans('０１２３４５６７８９（）', '0123456789()'))
    codes = []
    for row in rows:
        code = row['code']; name = aliases.get(code, '')
        explicit = re.search(r'(?:銘柄コード\s*[:：]?\s*' + re.escape(code) + r'(?![0-9A-Za-z])|[（(【\[]' + re.escape(code) + r'[）)】\]])', normalized, re.I)
        named = len(name) >= 3 and name in normalized
        if code == '9434' and re.search(r'ソフトバンク(?:グループ|[GＧ])', normalized) and not explicit: named = False
        if explicit or named: codes.append((code, name or row['name']))
    return codes

def parse_feed(data, source, rows, aliases, now):
    if len(data) > MAX_BYTES: raise ValueError('Feed too large')
    if re.search(br'<!DOCTYPE|<!ENTITY', data, re.I): raise ValueError('XML declarations denied')
    root = ET.fromstring(data)
    if root.tag.split('}')[-1].lower() not in ('rss', 'rdf', 'feed'): raise ValueError('Not RSS/Atom/RDF')
    result = []; seen = set()
    for node in [n for n in root.iter() if n.tag.split('}')[-1] in ('item', 'entry')][:50]:
        title = plain(field(node, 'title'))[:300]
        summary = plain(field(node, 'description', 'summary', 'content', 'encoded'))
        categories = ' '.join(plain(''.join(c.itertext()) or c.get('term', '')) for c in node if c.tag.split('}')[-1] in ('category', 'subject'))
        link = field(node, 'link')
        if not link:
            link = next((c.get('href', '') for c in node if c.tag.split('}')[-1] == 'link' and c.get('rel', 'alternate') == 'alternate'), '')
        # Some feeds still emit HTTP links to the same HTTPS-supported site.
        if link.startswith('http://') and urlparse(link).hostname == urlparse(source['home']).hostname: link = 'https://' + link[7:]
        stamp = date_iso(field(node, 'pubDate', 'date', 'published', 'updated'))
        if not title or not valid_url(link) or not stamp or stamp > now + timedelta(minutes=5) or now - stamp > timedelta(days=90): continue
        if not investment_item(title, categories, summary) or link in seen: continue
        seen.add(link)
        matched = match_codes(title, rows, aliases)
        # Global, small-cap and unassigned articles remain readable without being
        # scored as an unrelated Nikkei 225 company.
        code, company = matched[0] if len(matched) == 1 else ('', '市場全体・225以外／銘柄未特定')
        topic = '運用記録' if re.search(r'運用成績|ポートフォリオ|保有株|含み損益|金融資産', title) else '銘柄分析' if matched or re.search(r'決算|銘柄|企業|TOB|[（(][0-9A-Z]{4}[）)]', title) else '投資考察'
        result.append({'id':'blog-' + hashlib.sha256(link.encode()).hexdigest()[:20], 'code':code, 'company':company, 'scope':'stock' if code else 'market', 'headline':title, 'summary':summary[:160], 'url':link, 'publishedAt':stamp.isoformat(), 'publisher':source['name'], 'author':source['name'], 'feedAuthor':source['name'], 'sourceId':source['id'], 'sourceGroup':source['owner'], 'sourceStyle':source['style'], 'topic':topic, 'communityFeed':True, 'browserAuto':True, 'extractionVersion':2, 'sourceCategory':'voice', 'opinionChannel':'community', 'collectorRoute':'original-rss', 'reasons':[topic, source['style']], 'outcome':'open'})
        if len(result) >= 16: break
    return result

def collect():
    sources = json.loads((ROOT / 'community-sources.json').read_text(encoding='utf-8'))
    rows, aliases = load_universe(); now = datetime.now(timezone.utc)
    old = {}
    try: old = json.loads((ROOT / 'community-data.json').read_text(encoding='utf-8'))
    except (OSError, ValueError): pass
    # Last deployed snapshot can preserve posts across a feed outage on Actions.
    try:
        if __import__('os').environ.get('GITHUB_ACTIONS') == 'true':
            request = Request('https://mametank51-rgb.github.io/stock-edge-intelligence/community-data.json', headers={'User-Agent':'StockEdgeFeedReader/1.0'})
            with build_opener().open(request, timeout=8) as response:
                deployed = json.loads(response.read(MAX_BYTES))
            if deployed.get('schema') == 'stock-edge-community-v1' and deployed.get('generatedAt', '') > old.get('generatedAt', ''): old = deployed
    except Exception: pass
    allowed = {urlparse(s['feed']).hostname for s in sources}
    class Redirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            if not valid_url(newurl) or urlparse(newurl).hostname not in allowed: raise ValueError('Redirect denied')
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    def fetch(source):
        try:
            if not valid_url(source['feed']): raise ValueError('Invalid source')
            req = Request(source['feed'], headers={'User-Agent':'StockEdgeFeedReader/1.0', 'Accept':'application/rss+xml, application/xml, text/xml'})
            with build_opener(Redirect()).open(req, timeout=10) as response: data = response.read(MAX_BYTES + 1)
            items = parse_feed(data, source, rows, aliases, now)
            return {**source, 'status':'ok', 'checkedAt':now.isoformat(), 'count':len(items), 'latestAt':max((p['publishedAt'] for p in items), default=None)}, items
        except Exception as e:
            cached = [p for p in old.get('items', []) if p.get('sourceId') == source['id'] and date_iso(p.get('publishedAt', '')) and now - date_iso(p['publishedAt']) <= timedelta(days=90)]
            return {**source, 'status':'cached' if cached else 'failed', 'checkedAt':now.isoformat(), 'count':len(cached), 'error':str(e)[:140]}, cached
    with ThreadPoolExecutor(max_workers=3) as pool: results = list(pool.map(fetch, sources))
    payload = {'schema':'stock-edge-community-v1', 'generatedAt':now.isoformat(), 'sources':[x[0] for x in results], 'items':sorted([p for _, items in results for p in items], key=lambda p:p['publishedAt'], reverse=True)}
    (ROOT / 'community-data.json').write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f"Individual blogs: {len(sources)} feeds, {len(set(s['owner'] for s in sources))} writers, {len(payload['items'])} articles; {sum(s['status']=='ok' for s in payload['sources'])} feeds fetched.")

if __name__ == '__main__': collect()
