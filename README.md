# STOCK EDGE INTELLIGENCE

日本株のテクニカル・財務・公開記事を比較するHTMLアプリです。総合スコアの根拠・充足度を表示し、買い取引の数量と想定損失を計算できます。

スコアは候補比較用の仮説モデルで、勝率・期待収益率や利益を保証するものではありません。収益性のバックテストは未実施です。

## GitHub Pagesで公開

1. このフォルダーの公開用ファイルをGitHubの公開リポジトリの `main` ブランチにアップロードします。
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
3. **Actions → Publish GitHub Pages → Run workflow** を実行します。
4. 完了後、Settings → Pages に表示される公開URLへアクセスします。

ワークフローはテストに成功した場合のみ、`public/index.html` と `.nojekyll` をサイトへ公開します。mainへの更新時も自動デプロイします。

`index.html` をブラウザで直接開くこともできます。

## データ取得の制約

- GitHub Pagesは静的ホスティングのため、同梱の `server.cjs` は実行されません。公開版のRSS・株価・財務の取得は、元のブラウザ側取得経路と外部中継の稼働状態・CORS制限に依存します。
- 安定した公開用データ収集には、別途バックエンドまたは利用条件に沿った定期収集基盤が必要です。今回の公開設定には含みません。
- 専門家情報は公開記事の見出し・概要からのキーワード分類です。本人確認や有料レポート本文の取得には対応しません。原記事・公式開示を確認してください。
- ウォッチ等は各閲覧者のブラウザに保存されます。端末間では共有されず、ファイル版・ローカル版・公開版の保存領域も別です。

## ローカル起動

Node.js 22以降で次を実行します。追加パッケージは不要です。

```sh
npm start
```

http://127.0.0.1:8765 を開きます。Windowsでは `起動.cmd` も使用できます。ローカル版だけは、Google News/Bing Newsに限定したRSS中継を利用します。

## 検証・ビルド

```sh
npm test
npm run build
```

配布用HTMLは `index.html` です。`edge-model.js` は計算モデルの参照・単体テスト用で、HTMLにも同じモデルを内包しています。モデルを変更する際はHTML内のモデルも同期してください。

詳しい修正一覧と未対応事項は [改善内容と使い方](改善内容と使い方.md) を参照してください。

参考：[GitHub Pagesサイトの作成](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
