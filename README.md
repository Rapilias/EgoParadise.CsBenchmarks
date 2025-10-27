# EgoParadise.CsBenchmarks

## 実行方法

```
dotnet build -c Release
dotnet run --project EgoParadise.CsBenchmarks -c Release -- --warmupCount 1 --iterationCount 3 --launchCount 1
```

## フロントエンド (VitePress) ローカル表示

前提: Node.js 20 以上。

```
cd EgoParadise.CsBenchmarks.Frontend
npm i
npm run ingest   # BenchmarkDotNet の JSON を取り込み public/data に配置
npm run dev      # http://localhost:5173 で閲覧
```
