#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, writeFileSync, cpSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { codeToHtml } from 'shiki'

type HostEnvironmentInfo = Record<string, unknown>
type BenchmarkEntry = {
  DisplayInfo?: string
  Namespace?: string
  Type?: string
  Method?: string
  MethodTitle?: string
  Parameters?: string
  FullName?: string
  Statistics?: { Mean?: number }
  Memory?: { BytesAllocatedPerOperation?: number }
}

interface BdnJson {
  Title?: string
  HostEnvironmentInfo?: HostEnvironmentInfo
  Benchmarks?: BenchmarkEntry[]
}

interface IndexEntry {
  key: string
  title: string
  date: string
  fileBrief: string
  fileFull: string | null
  pathBrief: string
  pathFull: string | null
  keywords: string
  types: string[]
  pathGithubMd?: string | null
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const repoRoot = join(__dirname, '..', '..')
const artifactsDir = join(repoRoot, 'BenchmarkDotNet.Artifacts', 'results')
const outDir = join(__dirname, '..', 'public', 'data')
const codeOutDir = join(__dirname, '..', 'public', 'code')

function ensureDir(p: string){ try{ mkdirSync(p, { recursive: true }) } catch(_){} }

function isJsonCandidate(name: string){
  return name.endsWith('-compressed.json') || name.endsWith('.json')
}

function normalizeKey(fileName: string){
  // 例: Foo-report-brief-compressed.json / Foo-report-full-compressed.json -> Foo
  return fileName
    .replace(/-report-(brief|full)-compressed\.json$/, '')
    .replace(/\.json$/, '')
}

function readJsonSafe<T = unknown>(p: string): T | null{
  try{
    const txt = readFileSync(p, 'utf8')
    return JSON.parse(txt) as T
  }catch{
    return null
  }
}

function buildKeywordsFromBrief(json: BdnJson){
  const parts: string[] = []
  if (json.Title) parts.push(json.Title)
  if (Array.isArray(json.Benchmarks)){
    for(const b of json.Benchmarks as BenchmarkEntry[]){
      if (b.MethodTitle) parts.push(String(b.MethodTitle).replace(/^'+|'+$/g, ''))
      if (b.Method) parts.push(b.Method)
      if (b.Type) parts.push(b.Type)
      if (b.Namespace) parts.push(b.Namespace)
      if (b.Parameters) parts.push(String(b.Parameters))
    }
  }
  return parts.join(' ').toLowerCase()
}

function buildIndexEntry(key: string, briefName: string, fullName: string | null, brief: BdnJson): IndexEntry{
  const title = String(brief?.Title || key).replace(/^'+|'+$/g, '')
  const types = Array.from(new Set((brief.Benchmarks||[]).map((b:any)=> String(b.Type||'')).filter(Boolean)))
  return {
    key,
    title,
    date: new Date().toISOString(),
    fileBrief: briefName,
    fileFull: fullName,
    pathBrief: `data/${briefName}`,
    pathFull: fullName ? `data/${fullName}` : null,
    keywords: buildKeywordsFromBrief(brief),
    types,
  }
}

async function main(){
  ensureDir(outDir)
  ensureDir(codeOutDir)
  const files = readdirSync(artifactsDir).filter(isJsonCandidate)
  const briefMap = new Map<string, string>()
  const fullMap = new Map<string, string>()
  const githubMap = new Map<string, string>()

  for(const f of files){
    const key = normalizeKey(f)
    if (/brief-compressed\.json$/.test(f)) briefMap.set(key, f)
    else if (/full-compressed\.json$/.test(f)) fullMap.set(key, f)
  }

  // github markdown を拾う
  for (const f of readdirSync(artifactsDir)){
    if (/-report-github\.md$/.test(f)){
      const key = f.replace(/-report-github\.md$/, '')
      githubMap.set(key, f)
    }
  }

  const entries: IndexEntry[] = []
  for(const [key, briefName] of briefMap){
    const fullName = fullMap.get(key) || null
    const srcBrief = join(artifactsDir, briefName)
    const brief = readJsonSafe<BdnJson>(srcBrief)
    if(!brief) continue

    // copy brief/full
    cpSync(srcBrief, join(outDir, briefName))
    if (fullName) cpSync(join(artifactsDir, fullName), join(outDir, fullName))
    const gh = githubMap.get(key) || null
    if (gh) cpSync(join(artifactsDir, gh), join(outDir, gh))

    const entry = buildIndexEntry(key, briefName, fullName, brief)
    entry.pathGithubMd = gh ? `data/${gh}` : null
    entries.push(entry)
  }

  const index = { generatedAt: new Date().toISOString(), entries }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2))
  console.log(`Indexed ${entries.length} result(s) to public/data/`)

  // ベンチマークコード(.cs)を public/code へコピー + Shiki で HTML 生成
  const benchSrc = join(repoRoot, 'EgoParadise.CsBenchmarks', 'src', 'Benchmarks')
  try{
    for(const f of readdirSync(benchSrc)){
      if (f.endsWith('.cs')){
        const src = join(benchSrc, f)
        cpSync(src, join(codeOutDir, f))
        try{
          const code = readFileSync(src, 'utf8')
          const html = await codeToHtml(code, { lang: 'cs', theme: 'github-dark' })
          writeFileSync(join(codeOutDir, f + '.html'), html)
        }catch{}
      }
    }
  }catch{}
}

main().catch(err => { console.error(err); process.exitCode = 1 })


