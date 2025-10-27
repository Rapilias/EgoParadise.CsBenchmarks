---
title: Benchmark 詳細
---

# <span id="detail-title">Benchmark 詳細</span>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderGithubPartial } from '../src/utils/report'
// Chart.js はブラウザ実行時にのみ動的 import する

type IndexEntry = { key: string; title: string; date: string; fileBrief: string; fileFull: string | null; pathBrief: string; pathFull: string | null; keywords: string }
type IndexJson = { entries?: IndexEntry[] }
type BdnBenchmark = { MethodTitle?: string; Type?: string; Statistics?: { OriginalValues?: number[]; Mean?: number }; Parameters?: string; Memory?: { BytesAllocatedPerOperation?: number } }
type BdnJson = { Title?: string; Benchmarks?: BdnBenchmark[] }

const state = ref<{ key: string; entry?: IndexEntry; data?: BdnJson; githubMd?: string; codeFiles?: Array<{name:string, content:string, isHtml:boolean}> } | null>(null)
const reportHtml = ref<string>('')
const jsonHtml = ref<string>('')
const error = ref('')
const barEl = ref<HTMLCanvasElement | null>(null)
const scatterEl = ref<HTMLCanvasElement | null>(null)
let barChart: any = null
let scatterChart: any = null
const active = ref<'bar'|'samples'|'report'|'code'|'json'>('code')

const allowedTabs = ['report','code','json','bar','samples'] as const
type TabName = typeof allowedTabs[number]

function setActive(tab: TabName){
  active.value = tab
  try{
    const u = new URL(location.href)
    u.searchParams.set('tab', tab)
    history.replaceState(null, '', u.toString())
  }catch{}
  // タブ変更に応じてサイドバーリンクも即座に更新
  setTimeout(applySidebarQuerySync, 0)
}

function applySidebarQuerySync(){
  try{
    const search = location.search
    if (!search) return
    const anchors = document.querySelectorAll('.VPSidebar a[href^="/entries/"]')
    anchors.forEach(a => {
      const el = a as HTMLAnchorElement
      if (!el || !el.href) return
      const url = new URL(el.getAttribute('href') || el.href, location.origin)
      const cur = new URLSearchParams(search)
      const dest = new URLSearchParams(url.search)
      // Preserve all current params then set tab to current active
      cur.forEach((v,k) => { if (!dest.has(k)) dest.set(k,v) })
      dest.set('tab', String(active.value))
      url.search = dest.toString() ? `?${dest}` : ''
      el.href = url.pathname + url.search + url.hash
    })
  }catch{}
}

function getKeyFromPath(){
  const u = new URL(location.href)
  const qk = u.searchParams.get('key')
  if (qk) return qk
  const last = (u.pathname.split('/').pop() || '')
  return decodeURIComponent(last.replace(/\.html$/, ''))
}

function getQuery(name: string){
  const u = new URL(location.href)
  return u.searchParams.get(name)
}

async function load(){
  try{
    const key = getKeyFromPath()
    const method = (getQuery('method') || '').replace(/^'+|'+$/g, '')
    // 初期タブ: query ?tab= を尊重
    const t = String(getQuery('tab')||'').toLowerCase()
    if (allowedTabs.includes(t as TabName)) {
      active.value = t as TabName
    }
    const idxRes = await fetch(`${import.meta.env.BASE_URL}data/index.json`)
    const idx: IndexJson = await idxRes.json()
    const entry = idx.entries?.find(e => e.key === key)
    if(!entry) throw new Error('entry not found')
    const fullPath = entry.pathFull || entry.pathBrief
    const res = await fetch(`${import.meta.env.BASE_URL}${fullPath}`)
    const json: BdnJson = await res.json()
    // method が指定されていれば絞り込み
    if (method){
      json.Benchmarks = (json.Benchmarks||[]).filter(b => (b as any).MethodTitle === method)
    }
    // github.md 読み込み
    let githubMd: string | undefined
    if (entry.pathGithubMd){
      try{
        const gh = await fetch(`${import.meta.env.BASE_URL}${entry.pathGithubMd}`)
        githubMd = await gh.text()
      }catch{}
    }
    // コード(.cs)一覧読み込み（エントリの Type に対応するファイルのみ、.html 優先）
    const codeFiles: Array<{name:string, content:string, isHtml:boolean}> = []
    try{
      const typeSet = Array.from(new Set((json.Benchmarks||[])
        .map(b => String((b as any).Type||'')).filter(Boolean)))
      for(const typeName of typeSet){
        const name = `${typeName}.cs`
        try{
          const rh = await fetch(`${import.meta.env.BASE_URL}code/${name}.html`)
          if (rh.ok){
            codeFiles.push({ name, content: await rh.text(), isHtml: true })
            continue
          }
          const r = await fetch(`${import.meta.env.BASE_URL}code/${name}`)
          if (r.ok){
            codeFiles.push({ name, content: await r.text(), isHtml: false })
          }
        }catch{}
      }
    }catch{}

    state.value = { key, entry, data: json, githubMd, codeFiles }
    if (githubMd) reportHtml.value = renderGithubPartial(githubMd)
    // JSON を Shiki でハイライト
    try{
      const { codeToHtml } = await import('shiki')
      jsonHtml.value = await codeToHtml(JSON.stringify(json, null, 2), { lang: 'json', theme: 'github-dark' })
    }catch{}
    // タイトル表示を Type に置換
    const types = Array.from(new Set((json.Benchmarks||[]).map(b => (b as any).Type).filter(Boolean)))
    const titleEl = document.getElementById('detail-title')
    if (titleEl) titleEl.textContent = types.join(', ')
    renderCharts(json)
  }catch(e){
    error.value = String(e)
  }
}

async function renderCharts(json: BdnJson){
  const { Chart } = await import('chart.js/auto')
  const benches = (json.Benchmarks||[])
  const labels = benches.map((b) => {
    const m = String((b as any).MethodTitle||'Method')
    const p = String((b as any).Parameters||'')
    return p ? `${m} (${p})` : m
  })
  const means = benches.map(b => (b.Statistics?.Mean ?? 0))
  const memKb = benches.map(b => {
    const bytes = (b as any).Memory?.BytesAllocatedPerOperation ?? 0
    return bytes / 1024
  })

  // Bar chart (Mean and Alloc KB)
  if(barChart){ barChart.destroy(); barChart = null }
  if(barEl.value){
    barChart = new Chart(barEl.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Mean (ns)', data: means, backgroundColor: '#3e82f7' },
          { label: 'Allocated (KB/op)', data: memKb, backgroundColor: '#52a447', yAxisID: 'y2' },
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: false, title: { display: true, text: 'ns' } },
          y2: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'KB/op' } },
        },
        plugins: { legend: { display: true } },
      }
    })
  }

  // Scatter chart for OriginalValues
  if(scatterChart){ scatterChart.destroy(); scatterChart = null }
  if(scatterEl.value){
    const datasets = benches.map((b, idx) => {
      const vals = b.Statistics?.OriginalValues || []
      const data = vals.map((v, i) => ({ x: idx + (i/(vals.length||1)) * 0.6 - 0.3, y: v }))
      return { label: String(b.MethodTitle||`#${idx+1}`), data, showLine: false, pointRadius: 2 }
    })
    scatterChart = new Chart(scatterEl.value, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          x: {
            ticks: {
              callback: (value: any) => {
                const i = Math.round(Number(value))
                return labels[i] ?? ''
              }
            }
          },
          y: { beginAtZero: false, title: { display: true, text: 'ns (samples)' } }
        }
      }
    })
  }
}

onMounted(load)
onMounted(() => {
  // DOM 安定後にサイドバーのリンクへクエリを付与
  setTimeout(applySidebarQuerySync, 0)
})
function isShikiContent(s?: string){
  return !!s && s.includes('class="shiki"')
}
</script>

<div v-if="error" style="color:#b00">{{ error }}</div>
<div v-else-if="state">
  <div class="tabs">
    <button class="tab" @click="setActive('report')" :class="{active: active==='report'}">Report</button>
    <button class="tab" @click="setActive('code')" :class="{active: active==='code'}">Code</button>
    <button class="tab" @click="setActive('json')" :class="{active: active==='json'}">JSON</button>
    <button class="tab" @click="setActive('bar')" :class="{active: active==='bar'}">Mean/Allocated</button>
    <button class="tab" @click="setActive('samples')" :class="{active: active==='samples'}">Samples</button>
  </div>

  <div v-show="active==='report'">
    <h3>レポート</h3>
    <div v-if="reportHtml" v-html="reportHtml"></div>
    <div v-else>レポートが見つかりません。</div>
  </div>

  <div v-show="active==='code'">
    <h3>ベンチマークコード (.cs)</h3>
    <details v-for="f in (state.codeFiles||[])" :key="f.name" open>
      <summary>{{ f.name }}</summary>
      <div v-if="f.isHtml" v-html="f.content"></div>
      <pre v-else>{{ f.content }}</pre>
    </details>
  </div>

  <div v-show="active==='json'">
    <h3>JSON</h3>
    <div v-if="jsonHtml" v-html="jsonHtml"></div>
    <pre v-else>{{ JSON.stringify(state.data, null, 2) }}</pre>
  </div>

  <div v-show="active==='bar'">
    <h3>Mean / Allocated</h3>
    <canvas ref="barEl" height="220"></canvas>
  </div>

  <div v-show="active==='samples'">
    <h3>Original Samples</h3>
    <canvas ref="scatterEl" height="240"></canvas>
  </div>

</div>



<style scoped>
.tabs{ display:flex; gap:.5rem; margin: 1rem 0; }
.tab{ padding:.4rem .8rem; border:1px solid #444; background:transparent; color:inherit; cursor:pointer; }
.tab.active{ background:#2b2f3a; }
pre{ background:#0b1021; color:#e6edf3; padding:1rem; overflow:auto; }
</style>

