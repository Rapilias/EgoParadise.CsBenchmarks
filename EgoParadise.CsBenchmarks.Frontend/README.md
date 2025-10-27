## EgoParadise.CsBenchmarks.Frontend

VitePress で BenchmarkDotNet の JSON 結果を検索/一覧/閲覧する静的サイト。

### ローカル

```
cd EgoParadise.CsBenchmarks.Frontend
npm i
npm run dev
```

`BenchmarkDotNet.Artifacts/results/` にある `*-compressed.json` を `public/data/` にコピーし、`index.json` を生成する

### ビルド

```
npm run site
```

`public/data/` に埋め込んだ JSON を含めて `.vitepress/dist` を生成する


