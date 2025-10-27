---
title: 検索
---

# 検索

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

type IndexEntry = { key: string; title: string; date: string; fileBrief: string; fileFull: string | null; pathBrief: string; pathFull: string | null; keywords: string; types: string[] }
type IndexJson = { entries?: IndexEntry[] }
type BdnJson = { Title?: string; HostEnvironmentInfo?: any; Benchmarks?: any[] }
type GroupItem = { key: string; typeName: string; methods: string[] }

const datasets = ref<IndexEntry[]>([])
const methods = ref<GroupItem[]>([])
const query = ref<string>('')
const selected = ref<BdnJson | null>(null)
const loading = ref<boolean>(true)
const error = ref<string>('')

async function loadIndex() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/index.json`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`failed to load index.json: ${res.status}`)
    const data: IndexJson = await res.json()
    datasets.value = data.entries || []
    // brief の内容から MethodTitle を収集し、key ごとに重複排除
    const unique = new Set<string>()
    const list: GroupItem[] = []
    for (const d of datasets.value){
      // brief をロードして MethodTitle を抽出
      try{
        const r = await fetch(`${import.meta.env.BASE_URL}${d.pathBrief}`)
        const brief: BdnJson = await r.json()
        const map = new Map<string, Set<string>>()
        for (const b of (brief.Benchmarks||[])){
          const typeName = String((b as any).Type||'')
          const methodTitle = String((b as any).MethodTitle||'').replace(/^'+|'+$/g, '')
          if(!typeName || !methodTitle) continue
          if(!map.has(typeName)) map.set(typeName, new Set<string>())
          map.get(typeName)!.add(methodTitle)
        }
        for(const [typeName, mset] of map){
          const id = `${d.key}::${typeName}`
          if(unique.has(id)) continue
          unique.add(id)
          list.push({ key: d.key, typeName, methods: Array.from(mset).sort() })
        }
      }catch{ /* ignore single brief parse error */ }
    }
    methods.value = list
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadIndex)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return methods.value
  return methods.value.filter(x => x.typeName.toLowerCase().includes(q) || x.methods.some(m => m.toLowerCase().includes(q)))
})

function entryLink(g: GroupItem){
  return `${import.meta.env.BASE_URL}entries/${encodeURIComponent(g.key)}.html`
}
</script>

<div class="search">
  <input placeholder="検索 (ベンチマーククラス名/ベンチマークケース名)" v-model="query" />
</div>

<div v-if="loading">読み込み中...</div>
<div v-else>
  <div v-if="error" style="color:#b00">{{ error }}</div>
  <table v-if="filtered.length">
    <thead>
      <tr>
        <th>ベンチマーククラス</th>
        <th>ベンチマークケース</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="e in filtered" :key="e.key + e.typeName">
        <td>{{ e.typeName }}</td>
        <td>
          <div v-for="m in e.methods" :key="m">{{ m }}</div>
        </td>
        <td><a :href="entryLink(e)">詳細</a></td>
      </tr>
    </tbody>
  </table>
  <div v-else>データがありません。</div>

  <div v-if="selected" class="detail">
    <h2>{{ selected.Title }}</h2>
    <details open>
      <summary>Host</summary>
      <pre>{{ JSON.stringify(selected.HostEnvironmentInfo, null, 2) }}</pre>
    </details>
    <details open>
      <summary>Benchmarks</summary>
      <pre>{{ JSON.stringify(selected.Benchmarks, null, 2) }}</pre>
    </details>
  </div>
</div>

<style scoped>
.search{ margin: 1rem 0; }
input{ width: 100%; padding: .5rem; border:1px solid #555; border-radius:6px; background:#0b1021; color:#e6edf3; }
table{ width: 100%; border-collapse: collapse; }
th, td{ border-bottom: 1px solid #ddd; padding: .5rem; text-align: left; }
.detail{ margin-top: 2rem; }
pre{ background: #0b1021; color: #e6edf3; padding: 1rem; overflow:auto; }
</style>


