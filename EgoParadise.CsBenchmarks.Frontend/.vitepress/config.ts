import { defineConfig } from 'vitepress';
import { readFileSync } from 'fs';
import { join } from 'path';

// https://vitepress.dev/guide/deploy#github-pages
const repoBase = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/';
const base = process.env.VITEPRESS_BASE || repoBase;

export default defineConfig({
  base,
  title: 'EgoParadise CsBenchmarks',
  description: 'BenchmarkDotNet 結果ビューア',
  lastUpdated: true,
  themeConfig: {
    outline: {
      level: [2, 3],
      label: '目次',
    },
    nav: [
      { text: 'ホーム', link: '/' },
    ],
    sidebar: [
      { text: '検索/一覧', link: '/' },
      {
        text: '詳細',
        items: (() => {
          try {
            const idxPath = join(process.cwd(), 'public', 'data', 'index.json');
            const idx = JSON.parse(readFileSync(idxPath, 'utf8')) as { entries?: Array<{ key: string; title?: string; types?: string[] }> };
            return (idx.entries || []).map(e => {
              const text = (Array.isArray(e.types) && e.types.length) ? e.types.join(', ') : (e.key);
              return { text, link: `/entries/${e.key}` };
            });
          } catch {
            return [] as Array<{ text: string; link: string }>;
          }
        })(),
      },
    ],
  },
});


