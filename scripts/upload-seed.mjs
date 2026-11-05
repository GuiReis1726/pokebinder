// Envia as imagens do binder PC (public/seed) para o teu espaço PRIVADO no Supabase.
// Corre-se uma vez, no teu PC, a partir da pasta do projeto:  node scripts/upload-seed.mjs
// Faz login com o teu email e palavra-passe, por isso só escreve na tua pasta (as regras do schema.sql garantem isso).
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const { SUPABASE_URL, SUPABASE_ANON_KEY, EMAIL, PASSWORD } = process.env
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !EMAIL || !PASSWORD) {
  console.error('Faltam variáveis: SUPABASE_URL, SUPABASE_ANON_KEY, EMAIL e PASSWORD.')
  process.exit(1)
}

const root = path.resolve('public/seed')
const imgDir = path.join(root, 'img')
if (!fs.existsSync(imgDir)) {
  console.error('Não encontrei', imgDir, '— corre este comando na pasta do projeto (onde está a pasta public).')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const { data, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
if (error) { console.error('Login falhou:', error.message); process.exit(1) }
const uid = data.user.id
console.log('Login ok. A enviar para a pasta privada', uid)

const bucket = sb.storage.from('pokebinder')
const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.webp'))
let ok = 0, falhou = 0
const fila = [...files]

async function trabalhador() {
  while (fila.length) {
    const f = fila.shift()
    const { error } = await bucket.upload(`${uid}/seed/img/${f}`, fs.readFileSync(path.join(imgDir, f)), {
      contentType: 'image/webp', upsert: true
    })
    if (error) { falhou++; console.error('\nErro em', f, '→', error.message) } else ok++
    process.stdout.write(`\r${ok + falhou}/${files.length}`)
  }
}
await Promise.all(Array.from({ length: 5 }, trabalhador))

// a estrutura do binder (páginas e posições) também vai para o espaço privado
const manifest = path.join(root, 'binder.json')
if (fs.existsSync(manifest)) {
  const { error } = await bucket.upload(`${uid}/seed/binder.json`, fs.readFileSync(manifest), { contentType: 'application/json', upsert: true })
  console.log(error ? `\nErro no binder.json → ${error.message}` : '\nbinder.json enviado.')
}
console.log(`Imagens enviadas: ${ok} · falhadas: ${falhou}`)
process.exit(falhou ? 1 : 0)
