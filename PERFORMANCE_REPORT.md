# 詳細画面・更新対象の設計改善（2026-10-28）

## 原因

1. hashchangeで詳細・履歴・candlesを破棄し、render内で履歴展開、各種分析、パターン検出とshell全体のDOM生成を再実行していました。分析用メモも直前1件だけのため、A→B→AでAを再計算していました。
2. nikkei225.rows()が日経225と追加銘柄レジストリを一緒に返し、その表示一覧を更新対象にも流用していました。保存ジョブの全Object.values()を数えるため、対象外コードも集計されました。
3. force/優先要求が一部のretryAtを迂回し、別の呼出元から同じ価格・財務・ニュースを取得できる構造でした。

## 新しい依存関係と主な変更ファイル

| ファイル | 主な役割・関数 |
|---|---|
| performance-core.js | 純粋なuniverse / normalizeJob / counts、LRU / DetailCache / seriesKey、Requests / failureDelay / httpError |
| update-targets-ui.js | getAutoUpdateCodes / getFullUpdateCodes / getPriorityUpdateCodes / normalizeFullUpdateJob |
| detail-runtime.js | renderStockDetail / loadDetailEntry / mountDetailEntry / revalidateDetail / refreshDetailPanels / bindDetailChart |
| builtin-market.js | 元の内蔵株価モジュールを抽出。yahooChart / fetchAndSaveの共通flight、HTTP状態・Retry-After保持 |
| nikkei-runtime.js | 元の日経225モジュールを抽出。rowsは閲覧用、scanは明示対象と再試行時刻だけで判断 |
| app-features-ui.js | runFullUpdate / fullUpdateCounts / fullUpdatePhases、Forecastのキャッシュ・部分更新 |
| news-runtime.js | marketIntelCandidateRows / collectBrowserMarketIntel。銘柄ごとのnews flightと保存済みretryAtを尊重 |
| fundamental-runtime.js | 財務flight・再試行の共通化、財務要約LRU |
| analysis-ui.js / chart-overlays-ui.js | technicalAnalysisForView / chartOverlayAnalysisの銘柄別分析メモ |
| friendly-ui.js / friendly-ui.css | 既存UIを維持し、更新内訳と部分更新用の取付位置を追加 |
| voice-ui.js / research-ui.js / paper-lab-ui.js | 明示取得の重複を集約。自動取得対象を限定し、既存の記録・手動機能は維持 |
| stock-registry.js | 保存済み閲覧銘柄の役割を明記。キー・データ形式は維持 |
| index.html / sync-voice.py / sync-community.py | hashchangeの破棄を廃止し、新モジュールを従来の単体HTMLへ内包 |

## 更新対象

- 優先順位：現在の銘柄 → ウォッチ → 日経225。コードを重複除去します。
- 自動更新：上の優先対象。日経225以外でも現在開いている間は対象になり、離れるとウォッチ以外は継続しません。
- すべて更新：日経225＋日経225以外のウォッチだけ。検索・閲覧しただけの保存銘柄は含みません。
- rows()やStockRegistry.all()は表示一覧として残し、更新対象を決める箇所から分離しました。
- 自動の調査メモ・模擬検証の取得も同じ範囲に限定します。対象外の保存記録は削除せず、手動更新は従来どおり利用できます。自動検証で未ウォッチの比較指数を新たに取得することはせず、保存済み指数を利用します。不足は評価待ちになります。

## 導入したキャッシュ

- 詳細キー：ticker:interval:basis。各銘柄でdetail、history、candles、evidencePatterns、表示DOM、表示設定を保持。
- 最大20銘柄のLRU。現在表示中とウォッチを優先し、全てが優先対象でも上限を超えません。各銘柄の足種・基準の組合せは最大6、分析メモは最大32。
- 分析キーは銘柄・足種・基準・本数・最新日付・最新close＋OHLCV全体のハッシュ。終点が同じでも過去データが改訂されれば再計算します。
- technical、doubleBottoms、Forecastの期間別結果、ChartOverlaysの設定・範囲別結果を保持。分析だけの全銘柄巡回が、閲覧DOMのLRUを押し出さないようにしています。
- JSONの生文字列が同じ間はworkspace・閲覧レジストリ・ランキング保存値を再パースしません。別タブの変更は文字列差分で検出します。
- 財務要約は最大20件、通信成功の短期共有結果は最大20件。inflightは完了・失敗の両方でfinallyから解放します。
- 破棄時はResizeObserverと保持DOMを解放し、当該銘柄の一時的な開閉状態・取得状態も整理します。

## SWR・DOM更新

保存済みまたはメモリ上の銘柄を先に表示し、有効期間内は再利用します。古い標準価格は自動更新モードを尊重して裏で更新し、変更があった部分だけを置き換えます。ファイル取込の価格基準は自動で別の配信元へ置換しません。

A→B→AではAの詳細DOMとSVGを再接続し、同じデータ・幅・表示設定ならチャートも描き直しません。財務・ニュース・ウォッチ・Forecast・表示範囲・表示オプションの変更でshell全体を作り直しません。新しい価格では価格に依存するパネルだけ更新し、待機中は既存のチャートを残します。初めて開く未保存銘柄だけは、その銘柄名と取得中の案内を表示します。

## 件数

新規・再開・復元時に現在対象へジョブを正規化します。prices / financial / newsは対象codesにあるtrue / false / deferredだけを数え、その他のコードや不正な値を無視します。

225銘柄なら、株価225・財務225・ニュース225・ブログ1＝676確認項目です。対象銘柄数とは別に各項目の完了・成功・取得不可・再試行待ち・残りを表示します。再試行待ちは通信を省略した「確認済み」として進捗に含め、取得不可とは別に表示します。未確認の項目は残りに含めます。

## 再試行・重複通信

- 通信単位はprice:code、financial:code、news:code。10年日足は応答内容が異なるためprice-long:code。同一単位の取得中は同じPromiseを共有します。
- 一時失敗は2分から指数的に延長。404/410/422・データなしは6時間から最大24時間。429/503はRetry-Afterがより長ければその値を優先し、同じ取得の経路切替も直ちに打ち切ります。
- 既存価格行・ニュースscanのretryAt / retryFailuresも取り込みます。forceやすべて更新でも待機時刻を迂回しません。成功時に失敗回数と待機時刻をリセットします。
- 再試行メタデータはstock-edge-request-state-v2に最大1500単位。通常成功の保存は2秒間隔に抑え、失敗と失敗後の成功リセットは即保存します。保存できない場合でも現在のタブ内では適用し、他の保存データは削除しません。

## Migration

破壊的migrationはありません。stock-edge-extra-stocks-v1、ウォッチ、株価、ノート、判断記録などの既存キーを削除・初期化しません。追加銘柄の配列はそのまま保存済み閲覧銘柄として利用し、ウォッチかどうかで更新対象を別に決めます。古いfullUpdateJobは現在のコード集合へ絞り、範囲外の完了印だけを集計から外します。新規開始は処理マップを空で開始し、再開は現在対象内の完了印だけを引き継ぎます。

## 計測とテスト

開発用に `window.stockEdgePerformance.snapshot()` で件数・範囲・hit/miss・分析時間・チャート描画数を取得できます。localStorageの `stock-edge-performance-debug-v1` を `1` にするとconsole.debugを出し、通常は出力しません。

- verify-performance.cjs：閲覧と更新範囲、ウォッチ追加/解除、225固定、重複、旧ジョブ除外、再試行待ち、同一Promise、改訂検出、A→B→A、LRUと保存互換性。
- verify-performance-job.cjs：実際のrunFullUpdateを実行し、225/226銘柄の正規化・各処理マップ・再開/新規・失敗/待機/残りの集計を検証。
- verify-performance-scan.cjs：実scanでlegacy retryAtの強制更新時の尊重、成功時のリセット、同時更新で別銘柄の行が消えないことを検証。
- performance-browser-smoke.cjs：Aのroot/SVG/shellの同一性、分析missとチャート描画数が増えないこと、12回の再訪で通信と保持数が増えないこと、財務・ニュース・ウォッチの部分更新と資金管理の入力保持、変更価格の差し替え、遅延SWR、23銘柄の上限、既存localStorage、再試行前の手動取得抑止、320〜1280pxを検証。
- chart-overlays-browser-smoke.cjs：W/M、トレンド、支持抵抗、移動平均、変動帯、予想、週足、60本先、設定の保存・開閉を回帰検証。
- friendly-browser-smoke.cjs：検索、追加銘柄、日本語表示、ウォッチ、キーボード操作、メモ入力、スマホ/PCを回帰検証。
- 既存15検証と新規3検証を含む18スイートを通過。スコアと予想の計算モデル・既存データは変更していません。

制御したローカル実ブラウザでは、初回表示約254〜305msに対して戻り表示約9〜10ms、分析cache miss 8→8、チャート描画数2→2でした。機種・履歴量・ネットワークにより時間は変わり、長時間の実機利用全てを保証する数値ではありません。保持数・observer・inflightに上限と解放を設け、蓄積する構造を検証しています。
