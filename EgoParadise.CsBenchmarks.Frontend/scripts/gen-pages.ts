#!/usr/bin/env node
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

const outDir = join(process.cwd(), 'entries')
function ensure(p:string){ try{ mkdirSync(p, { recursive: true }) } catch{}
}

function main(){
  ensure(outDir)
  const idx = JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'index.json'), 'utf8'))
  for(const e of idx.entries || []){
    const typesText = Array.isArray(e.types) && e.types.length ? e.types.join(', ') : (e.title || e.key)
    const p = join(outDir, `${e.key}.md`)
    const md = `---\ntitle: ${typesText}\n---\n\n<script setup lang=\"ts\">\nimport Comp from '../detail/[key].md'\n</script>\n\n<Comp/>\n`
    writeFileSync(p, md)
  }
  console.log(`Generated ${idx.entries?.length||0} entry pages`)
}

main()


