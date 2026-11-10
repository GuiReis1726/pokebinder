import './style.css'
import { sb } from './supabase.js'
import { SUPABASE_URL } from './config.js'
import { createPokemon, defaultAspects } from './pokemon.js'

const API = 'https://api.tcgdex.net/v2'
const KEY = 'pokebinder-v2'
const LANGS = [
  ['en', 'Inglês'], ['ja', 'Japonês'], ['zh-cn', 'Chinês simplificado'], ['zh-tw', 'Chinês tradicional'],
  ['ko', 'Coreano'], ['fr', 'Francês'], ['de', 'Alemão'], ['es', 'Espanhol'], ['it', 'Italiano'], ['pt', 'Português']
]
const $app = document.getElementById('app')
const BASE = import.meta.env.BASE_URL
// imagens: do TCGdex (URL), do binder PC (ficheiros privados no Supabase) ou fotos minhas (data-photo → hydratePhotos)
const imgOf = it => `${it.image}/low.webp`
const imgTag = (it, alt = '') => {
  const key = it.src || (!it.image && it.pid) || null
  return key ? `<img data-photo="${esc(key)}" alt="${esc(alt)}">` : `<img loading="lazy" src="${imgOf(it)}" alt="${esc(alt)}">`
}

/* ---------- dados (estrutura em localStorage, fotos em IndexedDB) ---------- */
const DEFAULT_CATEGORIES = ['Pessoal', 'Trabalho', 'Compras', 'Coleção']
let data = load()
let view = { page: 'dashboard', binderId: null, pageIdx: 0, edit: false, panel: false, q: '', rlang: 'en', results: [], msg: '', calendarDate: new Date(), selectedDate: today(), categoryFilter: 'all', showPrice: false, link: null, priceMsg: '', valueBack: 'binders', sheet: null, newCard: false }

function normalize(d) {
  d.binders ||= []
  d.lang ||= 'en'
  d.events ||= []
  d.notes ||= []
  d.categories ||= [...DEFAULT_CATEGORIES]
  d.currency ||= 'EUR'
  d.theme ||= 'dark'
  d.prices ||= {}
  d.library ||= []
  d.teams ||= {}
  d.ratings ||= {}
  d.aspects ||= defaultAspects()
  return d
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY))
    if (d && Array.isArray(d.binders)) return normalize(d)
  } catch {}
  return normalize({})
}
function save() {
  data._rev = new Date().toISOString()
  localStorage.setItem(KEY, JSON.stringify(data))
  schedulePush()
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn) }
function today(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const dateOf = value => new Date(`${value}T12:00:00`)
const formatDate = value => dateOf(value).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
const money = value => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: data.currency || 'EUR' }).format(value || 0)
const categoryColor = category => {
  const colors = ['#e5502f', '#e3a24a', '#9a9ca3', '#27ae60', '#2d9cdb', '#c0392b']
  const i = Math.max(0, data.categories.indexOf(category))
  return colors[i % colors.length]
}
const icon = name => ({
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  notes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>',
  binders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5z"/><path d="M5 3a3 3 0 0 0 0 18M9 8h8M9 12h8M9 16h5"/></svg>',
  staraptor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 10.4c2.8-1 5.4-3.4 7.6-7.6.2 2 .2 3.6-.2 5.2l-2.2-.4.6 3.6-2.6-.8-.2 3.6-2.2-1.8"/><g transform="matrix(-1 0 0 1 24 0)"><path d="M15 10.4c2.8-1 5.4-3.4 7.6-7.6.2 2 .2 3.6-.2 5.2l-2.2-.4.6 3.6-2.6-.8-.2 3.6-2.2-1.8"/></g><path d="M9.2 8C9.2 5.4 10.4 4.4 12 4.4s2.8 1 2.8 3.6c0 2-1.2 3.4-2.8 4.8-1.6-1.4-2.8-2.8-2.8-4.8z"/><path d="M9.6 6C9.4 3.6 10.8 1.8 13.4 1.2c-1 1.2-1 2.4-.4 3.6"/><path d="M10.8 15 12 21l1.2-6"/></svg>',
  team: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20a6 6 0 0 1 12 0M15.4 14.4A5 5 0 0 1 21 19.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
})[name]

function renderShell(content, active) {
  document.documentElement.dataset.theme = data.theme
  document.documentElement.style.colorScheme = data.theme === 'dark' ? 'dark' : 'light'
  $app.innerHTML = `
    <header class="app-header">
      <a class="brand" href="#" id="brandHome">
        <img class="brand-logo" src="${BASE}logo.webp" alt="" width="36" height="36"><span>Raptor Rips</span>
      </a>
    </header>
    <main class="screen">${content}</main>
    <nav class="bottom-nav" aria-label="Navegação principal">
      <button data-tab="calendar" class="${active === 'calendar' ? 'active' : ''}">${icon('calendar')}<span>Calendário</span></button>
      <button data-tab="notes" class="${active === 'notes' ? 'active' : ''}">${icon('notes')}<span>Notas</span></button>
      <button data-tab="dashboard" class="home-tab ${active === 'dashboard' ? 'active' : ''}">${icon('home')}<span>Início</span></button>
      <button data-tab="pokemon" class="${active === 'binders' || active === 'pokemon' ? 'active' : ''}">${icon('staraptor')}<span>Pokémon</span></button>
      <button data-tab="profile" class="${active === 'profile' ? 'active' : ''}">${icon('profile')}<span>Perfil</span></button>
    </nav>
    `

  on('brandHome', 'click', e => { e.preventDefault(); view.page = 'dashboard'; view.profileOpen = false; render() })
  $app.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => { view.page = button.dataset.tab; render() })
  })
}

function renderProfile() {
  const ownedCards = data.binders.flatMap(b => b.pages.flatMap(p =>
    p.items.filter(item => item.t === 'card' && item.owned)))
  const totalValue = ownedCards.reduce((sum, item) => sum + (priceOf(item) ?? (Number(item.price) || 0)), 0)
  const syncText = sync.status === 'ok' ? `Sincronizado às ${new Date(sync.at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}.`
    : sync.status === 'pendente' ? 'A guardar na nuvem…'
    : sync.status === 'erro' ? `Erro de sincronização: ${sync.msg}` : 'Sem ligação à nuvem neste momento.'
  const accountHtml = `
    <section class="section-block account-section">
      <div class="section-heading"><div><p class="eyebrow">Sincronização</p><h2>Conta</h2></div></div>
      <p class="hint">${user ? `Sessão iniciada como ${esc(displayId(user.email))}. ${esc(syncText)}` : 'Sem sessão iniciada: os dados ficam só neste aparelho.'}</p>
      <div class="binder-actions">${user ? '<button id="syncNow" class="button-secondary">Sincronizar agora</button><button id="signOut" class="button-secondary">Terminar sessão</button>' : '<button id="goLogin" class="button-secondary">Entrar</button>'}</div>
    </section>`
  const content = `
    <section class="page-intro"><p class="eyebrow">A tua conta</p><h1>Perfil</h1><p>As tuas preferências e o resumo da tua coleção.</p></section>
    <section class="profile-summary">
      <div class="profile-avatar">${icon('profile')}</div>
      <div><p class="eyebrow">Colecionador</p><h2>O meu perfil</h2><p>${data.binders.length} ${data.binders.length === 1 ? 'binder' : 'binders'} · ${ownedCards.length} ${ownedCards.length === 1 ? 'carta adquirida' : 'cartas adquiridas'}</p></div>
    </section>
    <section class="section-block profile-collection">
      <div class="section-heading"><div><p class="eyebrow">Resumo da coleção</p><h2>Valor das cartas</h2></div></div>
      <div class="collection-value">
        <span>Valor total estimado</span><strong class="collection-total">${money(totalValue)}</strong>
      </div>
    </section>
    <section class="section-block preferences-section">
      <div class="section-heading"><div><p class="eyebrow">Personaliza a aplicação</p><h2>Aparência</h2></div></div>
      <div class="theme-setting">
        <span class="theme-icon">${icon(data.theme === 'dark' ? 'moon' : 'sun')}</span>
        <span class="theme-copy"><strong>${data.theme === 'dark' ? 'Modo noturno' : 'Modo claro'}</strong><small>${data.theme === 'dark' ? 'Confortável em ambientes escuros' : 'Visual luminoso para o dia'}</small></span>
        <button id="themeToggle" class="theme-toggle ${data.theme === 'dark' ? 'is-dark' : ''}" role="switch" aria-checked="${data.theme === 'dark'}" aria-label="Ativar modo ${data.theme === 'dark' ? 'claro' : 'noturno'}"><span></span></button>
      </div>
    </section>
    ${accountHtml}`
  renderShell(content, 'profile')
  on('themeToggle', 'click', () => {
    data.theme = data.theme === 'dark' ? 'light' : 'dark'
    save()
    renderProfile()
  })
  on('syncNow', 'click', async e => {
    e.target.disabled = true
    clearTimeout(pushTimer)
    try { await pullIfNewer() } catch (err) { sync.status = 'erro'; sync.msg = String(err.message || err) }
    render()
  })
  on('signOut', 'click', () => signOut())
  on('goLogin', 'click', () => renderLogin())
}

// cada item ocupa 1 slot, exceto fotos "largas" (span 2)
const spanOf = it => (it.t === 'photo' ? it.span : 1)
const used = items => items.reduce((n, it) => n + spanOf(it), 0)
function fits(items, cols, rows) {
  let pos = 0
  for (const it of items) {
    const span = spanOf(it)
    if ((pos % cols) + span > cols) return false // um filler largo não pode começar na última coluna
    pos += span
  }
  return pos <= cols * rows
}
const curBinder = () => data.binders.find(b => b.id === view.binderId)
const cardsOf = b => b.pages.flatMap(p => p.items).filter(i => i.t === 'card')

/* ---------- fotos (IndexedDB) ---------- */
const dbp = new Promise((resolve, reject) => {
  const r = indexedDB.open('pokebinder', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('photos')
  r.onsuccess = () => resolve(r.result)
  r.onerror = () => reject(r.error)
})
function idb(mode, fn) {
  return dbp.then(db => new Promise((resolve, reject) => {
    const t = db.transaction('photos', mode)
    const req = fn(t.objectStore('photos'))
    t.oncomplete = () => resolve(req.result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  }))
}
const urls = new Map()
const photoPath = key => (key.startsWith('seed/') ? `${user.id}/${key}` : `${user.id}/photos/${key}`)
// key = id de uma foto minha, ou "seed/img/p01_s1.webp" (imagens do binder PC)
async function photoUrl(key) {
  if (urls.has(key)) return urls.get(key)
  let blob = await idb('readonly', s => s.get(key)).catch(() => null)
  if (!blob && user) {
    try {
      const { data: file, error } = await cloud().download(photoPath(key))
      if (!error && file) { blob = file; await idb('readwrite', s => s.put(blob, key)).catch(() => {}) }
    } catch {}
  }
  if (!blob) return key.startsWith('seed/') ? BASE + key : '' // em desenvolvimento, usa a pasta public/seed se existir
  const u = URL.createObjectURL(blob)
  urls.set(key, u)
  return u
}
async function storePhoto(pid, blob) {
  await idb('readwrite', s => s.put(blob, pid))
  if (user) uploadPhoto(pid, blob)
}
async function uploadPhoto(pid, blob) {
  try {
    const { error } = await cloud().upload(`${user.id}/photos/${pid}`, blob, { contentType: blob.type || 'image/jpeg', upsert: true })
    if (error) throw error
  } catch { sync.status = 'erro'; sync.msg = 'Há fotos por enviar para a nuvem.' }
}
function forgetPhoto(pid) {
  const u = urls.get(pid)
  if (u) URL.revokeObjectURL(u)
  urls.delete(pid)
  if (user) cloud().remove([`${user.id}/photos/${pid}`]).catch(() => {})
  return idb('readwrite', s => s.delete(pid)).catch(() => {})
}
async function shrink(file, max = 1400) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85))
  return { blob, wide: bmp.width / bmp.height > 1.15 }
}
const pidInUse = pid => data.library.some(e => e.pid === pid) || data.binders.some(b => b.pages.some(p => p.items.some(i => i.pid === pid)))
async function releasePhoto(pid) { if (pid && !pidInUse(pid)) await forgetPhoto(pid) }
async function hydratePhotos() {
  await Promise.all([...$app.querySelectorAll('img[data-photo]')].map(async img => {
    const u = await photoUrl(img.dataset.photo)
    if (u && img.isConnected) img.src = u
  }))
}

/* ---------- conta e sincronização (Supabase) ---------- */
let user = null
let seedAvailable = false
let pushTimer = null
const sync = { status: 'offline', at: null, msg: '' }
const cloud = () => sb.storage.from('pokebinder')
const SYNCED_FLAG = 'pokebinder-synced'
const hasData = d => d.binders.length || d.notes.length || d.events.length || d.library.length

function schedulePush() {
  if (!user) return
  sync.status = 'pendente'
  clearTimeout(pushTimer)
  pushTimer = setTimeout(pushNow, 1500)
}
async function pushNow() {
  if (!user) return
  const { error } = await sb.from('app_state').upsert({ user_id: user.id, data, updated_at: data._rev || new Date().toISOString() })
  if (error) { sync.status = 'erro'; sync.msg = error.message; return }
  sync.status = 'ok'; sync.at = Date.now(); sync.msg = ''
  localStorage.setItem(SYNCED_FLAG, user.id)
}
// devolve true se trouxe dados mais recentes da nuvem
async function pullIfNewer() {
  const { data: row, error } = await sb.from('app_state').select('data, updated_at').maybeSingle()
  if (error) { sync.status = 'erro'; sync.msg = error.message; return false }
  if (!row) { data._rev ||= new Date().toISOString(); await pushNow(); return false } // primeira vez: envia o que há neste aparelho
  const remote = Date.parse(row.updated_at), local = Date.parse(data._rev || '1970-01-01')
  if (remote > local) {
    data = normalize(row.data)
    data._rev = row.updated_at
    localStorage.setItem(KEY, JSON.stringify(data))
    localStorage.setItem(SYNCED_FLAG, user.id)
    sync.status = 'ok'; sync.at = Date.now(); sync.msg = ''
    return true
  }
  if (local > remote) await pushNow()
  else { sync.status = 'ok'; sync.at = Date.now() }
  return false
}
// 1.ª sincronização neste aparelho: se houver dados dos dois lados, pergunta qual manter
async function firstSync() {
  const { data: row, error } = await sb.from('app_state').select('data, updated_at').maybeSingle()
  if (error) { sync.status = 'erro'; sync.msg = error.message; return }
  const neverSynced = localStorage.getItem(SYNCED_FLAG) !== user.id
  if (row && neverSynced && hasData(data) && row.data && row.data.binders && row.data.binders.length) {
    const useCloud = confirm('Há dados neste aparelho e também na tua conta.\n\nOK = usar os da conta (os deste aparelho são substituídos)\nCancelar = enviar os deste aparelho para a conta')
    if (useCloud) { data = normalize(row.data); data._rev = row.updated_at; localStorage.setItem(KEY, JSON.stringify(data)); localStorage.setItem(SYNCED_FLAG, user.id); sync.status = 'ok'; sync.at = Date.now() }
    else { data._rev = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(data)); await pushNow() }
    return
  }
  await pullIfNewer()
}
async function syncPhotos() {
  if (!user) return
  const pids = new Set([...data.library.map(e => e.pid), ...data.binders.flatMap(b => b.pages.flatMap(p => p.items.map(i => i.pid)))].filter(Boolean))
  if (!pids.size) return
  const { data: remote } = await cloud().list(`${user.id}/photos`, { limit: 1000 })
  const have = new Set((remote || []).map(f => f.name))
  for (const pid of pids) {
    if (have.has(pid)) continue
    const blob = await idb('readonly', s => s.get(pid)).catch(() => null)
    if (blob) await uploadPhoto(pid, blob)
  }
}
// descarrega em segundo plano as imagens do binder PC, para funcionarem sem rede
async function prefetchSeed() {
  const fila = [...new Set(data.binders.flatMap(b => b.pages.flatMap(p => p.items.map(i => i.src))).filter(k => k && k.startsWith('seed/')))]
  const worker = async () => {
    while (fila.length) {
      const k = fila.shift()
      const have = await idb('readonly', s => s.get(k)).catch(() => null)
      if (!have) await photoUrl(k)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
}
async function loadSeedJson() {
  if (user) {
    try {
      const { data: file, error } = await cloud().download(`${user.id}/seed/binder.json`)
      if (!error && file) return JSON.parse(await file.text())
    } catch {}
  }
  return (await fetch(`${BASE}seed/binder.json`)).json() // desenvolvimento: ficheiro local
}

// o Supabase só aceita email: o ID de utilizador é convertido num endereço interno (nunca recebe mensagens)
const ID_DOMAIN = 'pokebinder.app'
function emailFor(id) {
  const v = id.trim().toLowerCase()
  if (v.includes('@')) return v // contas antigas, criadas com um email verdadeiro
  return /^[a-z0-9._-]{3,24}$/.test(v) ? `${v}@${ID_DOMAIN}` : null
}
const displayId = email => (email && email.endsWith('@' + ID_DOMAIN) ? email.slice(0, -ID_DOMAIN.length - 1) : email || '')
async function dropForeignLocalData() { // dados locais de outra conta nunca passam para esta
  const prev = localStorage.getItem(SYNCED_FLAG)
  if (prev && prev !== user.id) {
    localStorage.removeItem(KEY); localStorage.removeItem(SYNCED_FLAG)
    await idb('readwrite', s => s.clear()).catch(() => {})
    urls.clear()
    data = load()
  }
}
function renderLogin(msg = '', mode = 'login', keep = '') {
  document.documentElement.dataset.theme = data.theme
  const signup = mode === 'signup'
  $app.innerHTML = `
    <main class="screen login">
      <section class="page-intro login-hero"><img class="login-logo" src="${BASE}logo.webp" alt="Raptor Rips"><h1>${signup ? 'Criar conta' : 'Entrar'}</h1>
        <p>${signup ? 'Escolhe um ID de utilizador e uma palavra-passe. Cada pessoa tem os seus binders privados.' : 'Os teus binders ficam guardados na tua conta, privados.'}</p></section>
      <form id="loginForm" class="login-form">
        <input name="username" type="text" value="${esc(keep)}" placeholder="ID de utilizador" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required />
        <input name="password" type="password" placeholder="Palavra-passe" autocomplete="${signup ? 'new-password' : 'current-password'}" required />
        ${signup ? '<input name="password2" type="password" placeholder="Repete a palavra-passe" autocomplete="new-password" required />' : ''}
        <button class="primary-button">${signup ? 'Criar conta' : 'Entrar'}</button>
        <p class="hint">${esc(msg)}</p>
        ${signup ? '<p class="hint">Atenção: não há recuperação de palavra-passe. Quando o browser perguntar, escolhe guardá-la.</p>' : ''}
      </form>
      <button id="switchMode" class="text-button" type="button">${signup ? 'Já tenho conta' : 'Criar uma conta nova'}</button>
    </main>`
  on('switchMode', 'click', () => renderLogin('', signup ? 'login' : 'signup'))
  on('loginForm', 'submit', async e => {
    e.preventDefault()
    const f = new FormData(e.target)
    const id = String(f.get('username')).trim(), password = String(f.get('password'))
    const email = emailFor(id)
    if (!email) return renderLogin('O ID deve ter 3 a 24 caracteres: letras, números, ponto, hífen ou _ (sem espaços).', mode, id)
    if (signup) {
      if (password.length < 8) return renderLogin('A palavra-passe precisa de pelo menos 8 caracteres.', mode, id)
      if (password !== String(f.get('password2'))) return renderLogin('As palavras-passe não coincidem.', mode, id)
      const { data: res, error } = await sb.auth.signUp({ email, password })
      if (error) return renderLogin(/registered|exists/i.test(error.message) ? 'Esse ID já existe. Escolhe outro.' : `Não foi possível criar a conta: ${error.message}`, mode, id)
      if (res.session) user = res.user
      else {
        const r = await sb.auth.signInWithPassword({ email, password })
        if (r.error || !r.data.user) return renderLogin('Conta criada, mas ainda não está ativa. Tenta entrar daqui a pouco.', 'login', id)
        user = r.data.user
      }
    } else {
      const { data: res, error } = await sb.auth.signInWithPassword({ email, password })
      if (error || !res || !res.user) return renderLogin('ID ou palavra-passe errados.', mode, id)
      user = res.user
    }
    $app.innerHTML = '<main class="screen"><p class="hint">A sincronizar…</p></main>'
    await dropForeignLocalData()
    await startSession()
  })
}
async function detectSeed() {
  try {
    const { data: files } = await cloud().list(`${user.id}/seed`, { limit: 20 })
    seedAvailable = (files || []).some(f => f.name === 'binder.json')
  } catch { seedAvailable = false }
}
async function startSession() {
  await detectSeed()
  try { await firstSync() } catch (e) { sync.status = 'erro'; sync.msg = String(e.message || e) }
  render()
  syncPhotos().catch(() => {})
  prefetchSeed().catch(() => {})
}
async function signOut() {
  if (!confirm('Terminar sessão neste aparelho? Os dados continuam guardados na tua conta.')) return
  clearTimeout(pushTimer)
  await pushNow()
  if (sync.status === 'erro' && !confirm('Há alterações que não foram enviadas. Terminar mesmo assim?')) return
  await sb.auth.signOut()
  seedAvailable = false
  localStorage.removeItem(KEY); localStorage.removeItem(SYNCED_FLAG)
  await idb('readwrite', s => s.clear()).catch(() => {})
  urls.clear()
  user = null
  data = load()
  view.page = 'dashboard'
  renderLogin()
}
async function boot() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('COLOCA')) {
    $app.innerHTML = '<main class="screen"><section class="page-intro"><h1>Falta configurar</h1><p>Abre o ficheiro <strong>src/config.js</strong> e escreve o endereço e a chave pública do teu projeto Supabase.</p></section></main>'
    return
  }
  $app.innerHTML = '<main class="screen"><p class="hint">A abrir…</p></main>'
  let session = null
  try { session = (await sb.auth.getSession()).data.session } catch {}
  if (!session) {
    if (!navigator.onLine && data.binders.length) return render() // sem rede: usa os dados deste aparelho
    return renderLogin()
  }
  user = session.user
  await startSession()
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !user || view.page === 'link') return
  try { if (await pullIfNewer()) render() } catch {}
})
window.addEventListener('online', () => { if (user) schedulePush() })
sb.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT' && user) { user = null; renderLogin() } })

/* ---------- operações ---------- */
function addItem(b, item) {
  let pg = b.pages[view.pageIdx]
  if (item.t === 'photo' && item.span === 2 && !fits([...pg.items, item], b.cols, b.rows)) item.span = 1
  if (!fits([...pg.items, item], b.cols, b.rows)) {
    pg = { items: [] } // página cheia: abre uma nova a seguir
    b.pages.splice(view.pageIdx + 1, 0, pg)
    view.pageIdx++
  }
  pg.items.push(item)
  save()
}

/* ---------- ecrãs ---------- */
function render() {
  if (view.page === 'calendar') return renderCalendar()
  if (view.page === 'notes') return renderNotes()
  if (view.page === 'binders') return renderBinders()
  if (view.page === 'binder') return renderBinder()
  if (view.page === 'link') return renderLink()
  if (['pokemon', 'team', 'teamEdit', 'rate'].includes(view.page)) return pk.render(view.page)
  if (view.page === 'value') return renderValue()
  if (view.page === 'profile') return renderProfile()
  renderDashboard()
}

function categoryOptions(selected = '') {
  return data.categories.map(category => `<option value="${esc(category)}" ${category === selected ? 'selected' : ''}>${esc(category)}</option>`).join('')
}

const noteTitle = note => note.title || note.text || 'Sem título'
const noteBody = note => note.body || ''
const noteDateLabel = note => note.dueDate ? ` · ${formatDate(note.dueDate)}` : ''
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]))
function sanitizeNoteHtml(value) {
  const parsed = new DOMParser().parseFromString(String(value), 'text/html')
  const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'P', 'DIV', 'BR'])
  const serialize = node => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || '')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const tag = node.tagName
    const content = [...node.childNodes].map(serialize).join('')
    if (!allowedTags.has(tag)) return content
    if (tag === 'BR') return '<br>'
    const alignment = node.style.textAlign === 'center' ? ' class="note-align-center"' : ''
    return `<${tag.toLowerCase()}${alignment}>${content}</${tag.toLowerCase()}>`
  }
  return [...parsed.body.childNodes].map(serialize).join('')
}
const noteBodyMarkup = note => note.bodyFormat === 'html'
  ? sanitizeNoteHtml(noteBody(note))
  : escapeHtml(noteBody(note)).replace(/\r?\n/g, '<br>')

function renderDashboard() {
  const date = new Date()
  const upcoming = [
    ...data.events.filter(event => event.date >= today()).map(event => ({ ...event, kind: 'event' })),
    ...data.notes.filter(note => !note.done && note.dueDate && note.dueDate >= today()).map(note => ({ ...note, title: noteTitle(note), date: note.dueDate, kind: 'note' }))
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
  const activeNotes = data.notes.filter(note => !note.done)
  const firstName = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  const content = `
    <section class="welcome">
      <p class="eyebrow">${esc(firstName)}</p>
      <h1>O teu dia, num só lugar.</h1>
      <p>Planos, lembretes e pequenas coisas que não queres esquecer.</p>
    </section>
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Centro de notificações</p><h2>A seguir</h2></div><button class="text-button" id="openCalendar">Ver calendário →</button></div>
      ${upcoming.length ? `<div class="notification-list">${upcoming.map(event => `
        <article class="notification-card">
          <span class="notification-mark" style="--category-color:${categoryColor(event.category)}">${icon('bell')}</span>
          <div class="notification-copy"><strong>${esc(event.title)}</strong><small>${event.kind === 'note' ? 'Lembrete' : 'Marcação'} · ${formatDate(event.date)}${event.date === today() ? ' · Hoje' : ''}</small></div>
          <span class="category-pill" style="--category-color:${categoryColor(event.category)}">${esc(event.category)}</span>
        </article>`).join('')}</div>` : `<div class="empty-card"><span class="empty-icon">${icon('calendar')}</span><strong>Agenda tranquila</strong><p>Os teus próximos eventos aparecem aqui.</p><button class="button-secondary" id="addFirstEvent">Adicionar uma data</button></div>`}
    </section>
    <section class="section-block notes-section">
      <div class="section-heading"><div><p class="eyebrow">As tuas ideias</p><h2>Notas</h2></div><div class="notes-heading-actions"><span class="count-badge">${activeNotes.length}</span><button class="text-button" id="openNotes">Ver todas →</button></div></div>
      ${data.notes.length ? `<div class="dashboard-notes">${data.notes.slice(0, 3).map(note => `
        <article class="dashboard-note ${note.done ? 'is-done' : ''}">
          <strong>${esc(noteTitle(note))}</strong>
          ${noteBody(note) ? `<div class="note-rich-content">${noteBodyMarkup(note)}</div>` : ''}
          <small>${esc(note.category || 'Pessoal')}${noteDateLabel(note)}</small>
        </article>`).join('')}</div>` : '<p class="empty-inline">As notas que criares aparecem aqui.</p>'}
      <button class="button-secondary notes-create-button" id="createNote">Criar nota</button>
    </section>
    <section class="collection-banner">
      <span class="collection-ball">✦</span><div><strong>Uma coleção em crescimento</strong><small>${data.binders.length} ${data.binders.length === 1 ? 'binder criado' : 'binders criados'}</small></div>
      <button class="text-button" id="openBinders">Explorar →</button>
    </section>`
  renderShell(content, 'dashboard')

  on('openCalendar', 'click', () => { view.page = 'calendar'; render() })
  on('addFirstEvent', 'click', () => { view.page = 'calendar'; render() })
  on('openBinders', 'click', () => { view.page = 'binders'; render() })
  on('openNotes', 'click', () => { view.page = 'notes'; render() })
  on('createNote', 'click', () => { view.page = 'notes'; render() })
}

function renderNotes() {
  const activeNotes = data.notes.filter(note => !note.done)
  const content = `
    <section class="page-intro"><p class="eyebrow">As tuas ideias</p><h1>Notas</h1><p>Guarda o que quiseres, com o detalhe que precisares.</p></section>
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Nova nota</p><h2>Escreve uma ideia</h2></div></div>
      <form class="note-form" id="newNote">
        <label for="noteTitle">Título</label>
        <input id="noteTitle" name="title" placeholder="Dá um título à nota" required>
        <label for="noteBody">Texto</label>
        <div class="note-toolbar" role="toolbar" aria-label="Formatação do texto">
          <button type="button" data-note-command="bold" aria-label="Negrito" title="Negrito"><strong>N</strong></button>
          <button type="button" data-note-command="italic" aria-label="Itálico" title="Itálico"><em>I</em></button>
          <button type="button" data-note-command="underline" aria-label="Sublinhado" title="Sublinhado"><u>S</u></button>
          <span class="note-toolbar-divider" aria-hidden="true"></span>
          <button type="button" data-note-command="insertUnorderedList" aria-label="Lista com pontos" title="Lista com pontos">• Lista</button>
          <button type="button" data-note-command="insertOrderedList" aria-label="Lista numerada" title="Lista numerada">1. Lista</button>
          <span class="note-toolbar-divider" aria-hidden="true"></span>
          <button type="button" data-note-command="justifyCenter" aria-label="Centrar texto" title="Centrar texto">≡</button>
        </div>
        <div id="noteBody" class="note-editor" contenteditable="true" role="textbox" aria-label="Texto da nota" aria-multiline="true" data-placeholder="Escreve aqui a tua nota, sem limite de tamanho…"></div>
        <div class="note-form-options">
          <label for="noteCategory">Categoria</label>
          <select id="noteCategory" name="category" aria-label="Categoria da nota">${categoryOptions(data.categories[0])}</select>
          <label class="note-date-field" for="noteDueDate"><span>Data (opcional)</span><input id="noteDueDate" name="dueDate" type="date" aria-label="Data de lembrete (opcional)"></label>
        </div>
        <button class="primary-button" type="submit">Guardar nota <span>+</span></button>
      </form>
    </section>
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Tudo guardado</p><h2>As minhas notas</h2></div><span class="count-badge">${activeNotes.length}</span></div>
      ${data.notes.length ? `<div class="saved-notes">${data.notes.map(note => `
        <article class="saved-note ${note.done ? 'is-done' : ''}">
          <div class="saved-note-heading">
            <button class="note-check ${note.done ? 'is-done' : ''}" data-note-toggle="${note.id}" aria-label="${note.done ? 'Reabrir nota' : 'Concluir nota'}" aria-pressed="${Boolean(note.done)}">${note.done ? '✓' : ''}</button>
            <h3>${esc(noteTitle(note))}</h3>
            <button class="note-delete" data-note-delete="${note.id}" aria-label="Apagar nota">×</button>
          </div>
          ${noteBody(note) ? `<div class="saved-note-body note-rich-content">${noteBodyMarkup(note)}</div>` : ''}
          <small>${esc(note.category || 'Pessoal')}${noteDateLabel(note)}</small>
        </article>`).join('')}</div>` : '<p class="empty-inline">Ainda não criaste nenhuma nota.</p>'}
    </section>`
  renderShell(content, 'notes')

  on('newNote', 'submit', e => {
    e.preventDefault()
    const form = new FormData(e.target)
    const title = String(form.get('title')).trim()
    if (!title) return
    const editor = document.getElementById('noteBody')
    data.notes.unshift({
      id: uid(),
      title,
      body: sanitizeNoteHtml(editor?.innerHTML || ''),
      bodyFormat: 'html',
      category: String(form.get('category')),
      dueDate: String(form.get('dueDate') || ''),
      done: false
    })
    save(); renderNotes()
  })
  const editor = document.getElementById('noteBody')
  editor?.addEventListener('paste', event => {
    event.preventDefault()
    document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') || '')
  })
  $app.querySelectorAll('[data-note-command]').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault())
    button.addEventListener('click', () => {
      editor?.focus()
      document.execCommand(button.dataset.noteCommand)
    })
  })
  $app.querySelectorAll('[data-note-toggle]').forEach(button => button.addEventListener('click', () => {
    const note = data.notes.find(item => item.id === button.dataset.noteToggle)
    if (note) note.done = !note.done
    save(); renderNotes()
  }))
  $app.querySelectorAll('[data-note-delete]').forEach(button => button.addEventListener('click', () => {
    data.notes = data.notes.filter(item => item.id !== button.dataset.noteDelete)
    save(); renderNotes()
  }))
}

function renderCalendar() {
  const month = new Date(view.calendarDate.getFullYear(), view.calendarDate.getMonth(), 1)
  const monthLabel = month.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
  const firstDay = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const monthEvents = data.events.filter(event => {
    const sameMonth = event.date.slice(0, 7) === today(month).slice(0, 7)
    return sameMonth && (view.categoryFilter === 'all' || event.category === view.categoryFilter)
  })
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push('<span class="calendar-day outside"></span>')
  for (let day = 1; day <= daysInMonth; day++) {
    const key = today(new Date(month.getFullYear(), month.getMonth(), day))
    const events = monthEvents.filter(event => event.date === key)
    cells.push(`<button class="calendar-day ${key === today() ? 'today' : ''} ${key === view.selectedDate ? 'selected' : ''}" data-date="${key}">
      <span>${day}</span>${events.length ? `<i class="day-dots">${events.slice(0, 3).map(event => `<b style="--category-color:${categoryColor(event.category)}"></b>`).join('')}</i>` : ''}
    </button>`)
  }
  while (cells.length % 7) cells.push('<span class="calendar-day outside"></span>')
  const selectedEvents = data.events.filter(event => event.date === view.selectedDate && (view.categoryFilter === 'all' || event.category === view.categoryFilter))
  const upcoming = data.events.filter(event => event.date >= today() && (view.categoryFilter === 'all' || event.category === view.categoryFilter))
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
  const content = `
    <section class="page-intro"><p class="eyebrow">Organiza o teu tempo</p><h1>Calendário</h1><p>Datas importantes, planos e tudo o que vem a seguir.</p></section>
    <section class="calendar-card">
      <div class="month-header"><button class="icon-button" id="prevMonth" aria-label="Mês anterior">‹</button><h2>${esc(monthLabel)}</h2><button class="icon-button" id="nextMonth" aria-label="Mês seguinte">›</button></div>
      <div class="calendar-grid weekday-labels">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => `<span>${day}${i === 0 ? '<i>eg</i>' : i === 1 ? '<i>er</i>' : i === 2 ? '<i>ua</i>' : i === 3 ? '<i>ui</i>' : i === 4 ? '<i>ex</i>' : i === 5 ? '<i>áb</i>' : '<i>om</i>'}</span>`).join('')}</div>
      <div class="calendar-grid">${cells.join('')}</div>
      <div class="calendar-legend"><span><i style="--category-color:#e5502f"></i> Os teus eventos</span><span>${monthEvents.length} ${monthEvents.length === 1 ? 'marcação' : 'marcações'} este mês</span></div>
    </section>
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Personaliza a tua agenda</p><h2>Marcações</h2></div></div>
      <form class="event-form" id="newEvent">
        <input name="title" placeholder="O que tens marcado?" required maxlength="100" aria-label="Título da marcação">
        <div class="form-row"><input name="date" type="date" value="${view.selectedDate}" required aria-label="Data">
          <select name="category" aria-label="Categoria">${categoryOptions(data.categories[0])}</select></div>
        <button class="primary-button">Adicionar à agenda <span>+</span></button>
      </form>
      <details class="category-manager"><summary>Gerir categorias</summary><form id="newCategory" class="category-form"><input name="name" placeholder="Nova categoria" maxlength="24" required><button class="button-secondary">Adicionar</button></form></details>
    </section>
    <section class="section-block">
      <div class="section-heading filter-heading"><div><p class="eyebrow">A tua agenda, filtrada</p><h2>Próximas marcações</h2></div>
        <select id="categoryFilter" aria-label="Filtrar por categoria"><option value="all">Todas</option>${categoryOptions(view.categoryFilter)}</select>
      </div>
      <div class="event-list">${upcoming.length ? upcoming.map(event => `
        <article class="event-card"><span class="event-date"><strong>${dateOf(event.date).getDate()}</strong><small>${dateOf(event.date).toLocaleDateString('pt-PT', { month: 'short' })}</small></span>
          <div class="event-details"><strong>${esc(event.title)}</strong><small><i style="--category-color:${categoryColor(event.category)}"></i>${esc(event.category)}${event.date === today() ? ' · Hoje' : ''}</small></div>
          <button class="note-delete" data-event-delete="${event.id}" aria-label="Apagar marcação">×</button></article>`).join('') : '<p class="empty-inline">Ainda não há marcações nesta categoria.</p>'}</div>
      ${selectedEvents.length ? `<div class="selected-day"><h3>Selecionado: ${formatDate(view.selectedDate)}</h3>${selectedEvents.map(event => `<p><span style="--category-color:${categoryColor(event.category)}"></span>${esc(event.title)} <small>${esc(event.category)}</small><button data-event-delete="${event.id}" aria-label="Apagar marcação">×</button></p>`).join('')}</div>` : ''}
    </section>`
  renderShell(content, 'calendar')

  on('prevMonth', 'click', () => { view.calendarDate = new Date(month.getFullYear(), month.getMonth() - 1, 1); renderCalendar() })
  on('nextMonth', 'click', () => { view.calendarDate = new Date(month.getFullYear(), month.getMonth() + 1, 1); renderCalendar() })
  $app.querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => {
    view.selectedDate = button.dataset.date
    renderCalendar()
  }))
  on('categoryFilter', 'change', e => { view.categoryFilter = e.target.value; renderCalendar() })
  on('newEvent', 'submit', e => {
    e.preventDefault()
    const form = new FormData(e.target)
    const title = String(form.get('title')).trim()
    if (!title) return
    data.events.push({ id: uid(), title, date: String(form.get('date')), category: String(form.get('category')) })
    view.selectedDate = String(form.get('date'))
    save(); renderCalendar()
  })
  on('newCategory', 'submit', e => {
    e.preventDefault()
    const form = new FormData(e.target)
    const name = String(form.get('name')).trim()
    if (!name || data.categories.some(category => category.toLocaleLowerCase() === name.toLocaleLowerCase())) return
    data.categories.push(name)
    save(); renderCalendar()
  })
  $app.querySelectorAll('[data-event-delete]').forEach(button => button.addEventListener('click', () => {
    data.events = data.events.filter(event => event.id !== button.dataset.eventDelete)
    save(); renderCalendar()
  }))
}

function renderBinders() {
  const opts = sel => [2, 3, 4, 5, 6].map(n => `<option ${n === sel ? 'selected' : ''}>${n}</option>`).join('')
  const binders = data.binders.map(b => {
    const cards = cardsOf(b), own = cards.filter(c => c.owned).length
    const pct = cards.length ? Math.round(own / cards.length * 100) : 0
    return `<button class="binder" data-id="${b.id}">
      <span class="binder-topline"><strong>${esc(b.name)}</strong><span class="binder-arrow">↗</span></span>
      <span class="binder-meta">${b.cols}×${b.rows} · ${b.pages.length} páginas · ${own}/${cards.length} cartas</span>
      <span class="bar"><i style="width:${pct}%"></i></span>
    </button>`
  }).join('')
  const content = `
    <button id="toHub" class="back-button">← Pokémon</button>
    <section class="page-intro"><p class="eyebrow">A tua coleção Pokémon</p><h1>Os meus binders</h1><p>Organiza, acompanha e completa as tuas coleções.</p></section>
    <form id="newBinder" class="create-binder-card">
      <label for="binderName">Criar binder</label>
      <div class="create-binder-row"><input id="binderName" name="name" placeholder="Ex.: Cartas favoritas" required>
        <select name="cols" aria-label="Colunas">${opts(3)}</select><span>×</span><select name="rows" aria-label="Linhas">${opts(3)}</select>
        <button class="primary-button">Criar</button></div>
      <small>Tamanho de cada página: colunas × linhas.</small>
    </form>
    <div class="binder-actions">
      ${seedAvailable && !data.binders.some(b => b.seed === 'pc') ? '<button id="importPC" class="button-secondary">Importar binder PC <span>40 páginas</span></button>' : ''}
      ${seedAvailable && data.binders.some(b => b.seed === 'pc' && (b.version || 1) < 3) ? '<button id="updPC" class="button-secondary">Atualizar binder PC</button>' : ''}
      ${data.binders.length ? '<button id="goValue" class="button-secondary">Valor da coleção</button>' : ''}
    </div>
    <section class="binder-list">${binders || '<div class="empty-card"><span class="empty-icon">▤</span><strong>A tua coleção começa aqui</strong><p>Cria o teu primeiro binder para começares a organizar cartas.</p></div>'}</section>`
  renderShell(content, 'binders')

  on('importPC', 'click', async e => {
    e.target.disabled = true
    e.target.textContent = 'A importar…'
    try {
      const b = await loadSeedJson()
      data.binders.push({ ...b, id: uid(), seed: 'pc' })
      save()
    } catch { alert('Não encontrei o binder PC no teu espaço privado (nem na pasta public/seed).') }
    render()
  })
  on('updPC', 'click', async e => {
    e.target.disabled = true
    try {
      const seed = await loadSeedJson()
      mergeSeed(data.binders.find(b => b.seed === 'pc'), seed)
      save()
    } catch { alert('Não encontrei o binder PC atualizado no teu espaço privado (nem na pasta public/seed).') }
    render()
  })
  on('toHub', 'click', () => { view.page = 'pokemon'; render() })
  on('goValue', 'click', () => { view.valueBack = 'binders'; view.page = 'value'; render() })
  on('newBinder', 'submit', e => {
    e.preventDefault()
    const f = new FormData(e.target)
    const name = String(f.get('name')).trim()
    if (!name) return
    data.binders.push({ id: uid(), name, cols: Number(f.get('cols')), rows: Number(f.get('rows')), pages: [{ items: [] }] })
    save(); renderBinders()
  })
  $app.querySelectorAll('.binder').forEach(el => {
    el.onclick = () => {
      view = { ...view, page: 'binder', binderId: el.dataset.id, pageIdx: 0, edit: false, panel: false, q: '', results: [], msg: '' }
      render()
    }
  })
}

function cell(it, i, edit) {
  const ctl = edit ? `<div class="ctl">
      <button data-act="left" data-i="${i}">◀</button>
      <button data-act="right" data-i="${i}">▶</button>
      ${it.t === 'photo' ? `<button data-act="span" data-i="${i}">${it.span === 2 ? '1×' : '2×'}</button>` : ''}
      ${it.t === 'card' ? `<button data-act="more" data-i="${i}" aria-label="Mais opções">⋯</button>` : ''}
      <button data-act="del" data-i="${i}">✕</button></div>` : ''
  if (it.t === 'card') {
    const pr = view.showPrice && !edit ? priceOf(it) : null
    return `<div class="cell card ${it.owned ? 'owned' : ''} ${edit && it.id ? 'linked' : ''}" data-i="${i}" title="${esc(it.name || 'Carta')}${it.lang ? ' (' + esc(it.lang) + ')' : ''}">
      ${imgTag(it, it.name || 'Carta')}${pr != null ? `<span class="price">${eur(pr)}</span>` : ''}${ctl}</div>`
  }
  if (it.t === 'photo') {
    const img = imgTag(it)
    return `<div class="cell photo w${it.span}" data-i="${i}">${img}${ctl}</div>`
  }
  return `<div class="cell blank" data-i="${i}">${ctl}</div>`
}

function renderBinder() {
  const b = curBinder()
  if (!b) { view.page = 'binders'; return render() }
  view.pageIdx = Math.min(Math.max(view.pageIdx, 0), b.pages.length - 1)
  const pg = b.pages[view.pageIdx]
  const cap = b.cols * b.rows
  const cards = cardsOf(b), own = cards.filter(c => c.owned).length
  const pct = cards.length ? Math.round(own / cards.length * 100) : 0
  const free = Math.max(cap - used(pg.items), 0)

  const sel = view.edit && view.sheet != null ? pg.items[view.sheet] : null
  const isManual = c => c.price > 0 && !(c.id && data.prices[pkey(c)] && data.prices[pkey(c)].v != null)
  const staleManual = c => !c.priceAt || Date.now() - c.priceAt > 30 * 864e5
  const sheetHtml = sel && sel.t === 'card' ? `
    <div class="sheet">
      <p><strong>${esc(sel.name || (sel.hint && sel.hint.n) || 'Carta')}</strong> <small>${esc(sel.lang || (sel.hint && sel.hint.l) || '')}${priceOf(sel) != null ? ' · ' + eur(priceOf(sel)) : ''}${isManual(sel) ? ' · à mão' + (sel.priceAt ? ' em ' + new Date(sel.priceAt).toLocaleDateString('pt-PT') : '') + (staleManual(sel) ? ' ⚠ confirma o preço' : '') : ''}</small></p>
      ${sel.custom ? '' : '<button id="shLink" class="button-secondary">Ligar ao TCGdex</button>'}
      <button id="shPrice" class="button-secondary">Preço à mão</button>
      <a class="button-secondary" target="_blank" rel="noopener" href="https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(sel.name || (sel.hint && sel.hint.n) || '')}">Ver no Cardmarket</a>
      <button id="shLib" class="button-secondary">Guardar na biblioteca</button>
      <button id="shClose" class="text-button">Fechar</button>
    </div>` : ''
  const libHtml = view.edit ? `
    <h3 class="subhead">Biblioteca (cartas guardadas e personalizadas)</h3>
    <p class="hint">${data.library.length ? 'Toca numa carta para a adicionar à página atual.' : 'Ainda está vazia. Guarda cartas dos teus binders (botão ⋯) ou cria uma com a tua foto.'}</p>
    <div class="rgrid" id="lib">${data.library.map(e => `<div class="cell card owned libitem" data-lid="${e.lid}">${imgTag(e, e.name)}<small>${esc(e.name)}</small><button class="libdel" data-del="${e.lid}" aria-label="Remover da biblioteca">✕</button></div>`).join('')}</div>
    <button id="toggleNew" class="button-secondary">${view.newCard ? 'Cancelar' : '+ Nova carta personalizada'}</button>
    ${view.newCard ? `<form id="newCard" class="newcard">
      <input name="name" placeholder="Nome da carta" required />
      <select name="lang">${LANGS.map(([c, n]) => `<option value="${c}" ${c === data.lang ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <input name="price" inputmode="decimal" placeholder="Preço em € (opcional)" />
      <label class="btn">Escolher foto<input name="photo" type="file" accept="image/*" required></label>
      <button>Guardar e adicionar à página</button>
    </form>` : ''}` : ''

  const content = `
    <div class="binder-topbar"><button id="back" class="back-button">← Todos os binders</button><button id="goValue" class="text-button">Valor da coleção →</button></div>
    <section class="page-intro binder-detail-heading"><p class="eyebrow">A tua coleção</p><h1>${esc(b.name)}</h1><p>${own}/${cards.length} cartas adquiridas (${pct}%)</p>
    <div class="bar"><i style="width:${pct}%"></i></div></section>

    <div class="nav binder-page-nav">
      <button id="prev" ${view.pageIdx === 0 ? 'disabled' : ''}>◀</button>
      <span>Página ${view.pageIdx + 1} / ${b.pages.length}</span>
      <button id="next" ${view.pageIdx === b.pages.length - 1 ? 'disabled' : ''}>▶</button>
      <button id="eur" class="${view.showPrice ? 'on' : ''}" aria-label="Mostrar preços">€</button>
      <button id="mode" class="${view.edit ? 'on' : ''}">${view.edit ? 'Concluir' : 'Editar'}</button>
    </div>

    <div class="page" style="--cols:${b.cols}">
      <div class="grid" id="grid">
        ${pg.items.map((it, i) => cell(it, i, view.edit)).join('')}
        ${'<div class="cell free"></div>'.repeat(free)}
      </div>
    </div>
    ${sheetHtml}

    ${view.edit ? `
      <div class="tools">
        <label class="btn">+ Fotos<input id="files" type="file" accept="image/*" multiple hidden></label>
        <button id="addBlank">+ Slot vazio</button>
        <button id="goLink">Ligar cartas</button>
        <button id="addPage">+ Página</button>
        <button id="allOwn">Todas adquiridas</button>
        <button id="noneOwn">Nenhuma adquirida</button>
        <button id="pgLeft" ${view.pageIdx === 0 ? 'disabled' : ''}>Mover página ◀</button>
        <button id="pgRight" ${view.pageIdx === b.pages.length - 1 ? 'disabled' : ''}>Mover página ▶</button>
        <button id="delPage" class="danger">Apagar página</button>
      </div>
      <details id="panel" ${view.panel ? 'open' : ''}>
        <summary>Adicionar carta</summary>
        <form id="search" class="row">
          <select name="lang">${LANGS.map(([c, n]) => `<option value="${c}" ${c === data.lang ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <input name="q" value="${esc(view.q)}" placeholder="Nome (em inglês ou na língua da carta)" />
          <button>Pesquisar</button>
        </form>
        <p class="hint">${esc(view.msg)}</p>
        <div class="rgrid" id="rgrid">
          ${view.results.map(c => `<div class="cell card owned res" data-id="${esc(c.id)}">
            <img src="${c.image}/low.webp" alt=""><small>${esc(c.name)}</small></div>`).join('')}
        </div>
        ${libHtml}
      </details>
      <button id="delBinder" class="danger">Apagar binder</button>` : ''}`
  renderShell(content, 'binders')

  on('back', 'click', () => { view.page = 'binders'; render() })
  on('prev', 'click', () => { view.pageIdx--; view.sheet = null; render() })
  on('next', 'click', () => { view.pageIdx++; view.sheet = null; render() })
  on('mode', 'click', () => { view.edit = !view.edit; view.sheet = null; render() })
  on('eur', 'click', () => { view.showPrice = !view.showPrice; render() })
  on('goValue', 'click', () => { view.valueBack = 'binder'; view.page = 'value'; render() })
  on('goLink', 'click', () => startLink(b, null))

  // toque numa carta (modo normal) = marcar/desmarcar como adquirida; botões no modo edição
  on('grid', 'click', async e => {
    const cellEl = e.target.closest('.cell[data-i]')
    if (!cellEl) return
    const i = Number(cellEl.dataset.i)
    const btn = e.target.closest('button[data-act]')
    if (!btn) {
      if (!view.edit && pg.items[i].t === 'card') { pg.items[i].owned = !pg.items[i].owned; save(); render() }
      return
    }
    const act = btn.dataset.act
    if (act === 'more') { view.sheet = i; return render() }
    const next = [...pg.items]
    let removed = null
    if (act === 'del') {
      removed = next[i]
      next.splice(i, 1)
    } else if (act === 'span') {
      next[i] = { ...next[i], span: next[i].span === 2 ? 1 : 2 }
    } else {
      const j = act === 'left' ? i - 1 : i + 1
      if (j < 0 || j >= next.length) return
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    if (!fits(next, b.cols, b.rows)) return alert('Não cabe nessa posição (um filler largo não pode começar na última coluna).')
    pg.items = next
    view.sheet = null
    save()
    if (removed && removed.pid) await releasePhoto(removed.pid)
    render()
  })

  on('files', 'change', async e => {
    for (const f of [...e.target.files]) {
      try {
        const { blob, wide } = await shrink(f)
        const pid = uid()
        await storePhoto(pid, blob)
        addItem(b, { t: 'photo', pid, span: wide ? 2 : 1 })
      } catch { alert('Não consegui ler a foto ' + f.name) }
    }
    render()
  })
  const movePage = d => {
    const j = view.pageIdx + d
    ;[b.pages[view.pageIdx], b.pages[j]] = [b.pages[j], b.pages[view.pageIdx]]
    view.pageIdx = j; save(); render()
  }
  on('pgLeft', 'click', () => movePage(-1))
  on('pgRight', 'click', () => movePage(1))
  on('allOwn', 'click', () => { cardsOf(b).forEach(c => { c.owned = true }); save(); render() })
  on('noneOwn', 'click', () => { cardsOf(b).forEach(c => { c.owned = false }); save(); render() })
  on('addBlank', 'click', () => { addItem(b, { t: 'blank' }); render() })
  on('addPage', 'click', () => { b.pages.splice(view.pageIdx + 1, 0, { items: [] }); view.pageIdx++; save(); render() })
  on('delPage', 'click', async () => {
    if (!confirm('Apagar esta página e o seu conteúdo?')) return
    const pids = pg.items.map(it => it.pid).filter(Boolean)
    if (b.pages.length === 1) pg.items = []
    else { b.pages.splice(view.pageIdx, 1); view.pageIdx = Math.max(0, view.pageIdx - 1) }
    view.sheet = null
    save()
    for (const pid of pids) await releasePhoto(pid)
    render()
  })
  on('delBinder', 'click', async () => {
    if (!confirm(`Apagar o binder "${b.name}" e todas as fotos?`)) return
    const pids = b.pages.flatMap(p => p.items).map(it => it.pid).filter(Boolean)
    data.binders = data.binders.filter(x => x.id !== b.id)
    save(); view.page = 'binders'
    for (const pid of pids) await releasePhoto(pid)
    render()
  })

  // pesquisa de cartas na língua escolhida
  on('panel', 'toggle', e => { view.panel = e.target.open })
  on('search', 'submit', async e => {
    e.preventDefault()
    const f = new FormData(e.target)
    const lang = f.get('lang'), q = f.get('q').trim()
    if (!q) return
    data.lang = lang; save()
    Object.assign(view, { q, rlang: lang, panel: true, msg: 'A pesquisar…', results: [] })
    renderBinder()
    try {
      const { list, via, native } = await searchCards(lang, q)
      view.results = list.slice(0, 120)
      view.msg = view.results.length ? 'Toca numa carta para a adicionar à página atual.' + viaNote(via, native) : 'Sem resultados nesta língua. Tenta o nome em inglês ou na língua da carta.'
    } catch { view.msg = 'Erro ao pesquisar.' }
    renderBinder()
  })
  on('rgrid', 'click', e => {
    const el = e.target.closest('.res'); if (!el) return
    const c = view.results.find(x => x.id === el.dataset.id)
    addItem(b, { t: 'card', id: c.id, name: c.name, lang: view.rlang, image: c.image, owned: false })
    view.msg = `Adicionada: ${c.name} (página ${view.pageIdx + 1})`
    renderBinder()
  })

  // folha de opções da carta (botão ⋯)
  on('shClose', 'click', () => { view.sheet = null; render() })
  on('shLink', 'click', () => startLink(b, sel))
  on('shPrice', 'click', () => {
    const v = prompt('Preço desta carta em euros (ex.: 12,50). Deixa vazio para remover.', sel.price ?? '')
    if (v === null) return
    const n = Number(String(v).replace(',', '.'))
    if (String(v).trim() === '') delete sel.price
    else if (n > 0) { sel.price = n; sel.priceAt = Date.now() }
    else return alert('Valor inválido.')
    if (String(v).trim() === '') delete sel.priceAt
    view.sheet = null; save(); render()
  })
  on('shLib', 'click', () => {
    const dup = data.library.some(e => (sel.pid && e.pid === sel.pid) || (sel.src && e.src === sel.src) || (sel.id && e.tid === sel.id && e.lang === sel.lang))
    if (dup) { view.sheet = null; render(); return alert('Esta carta já está na biblioteca.') }
    const name = prompt('Nome da carta na biblioteca:', sel.name || (sel.hint && sel.hint.n) || '')
    if (name === null) return
    data.library.push({ lid: uid(), name: name.trim() || 'Carta', lang: sel.lang || (sel.hint && sel.hint.l) || 'en', price: sel.price, priceAt: sel.priceAt, pid: sel.pid, src: sel.src, image: sel.image, tid: sel.id })
    view.sheet = null; view.panel = true; save(); render()
    alert('Guardada na biblioteca. Em qualquer binder: Editar → Adicionar carta → Biblioteca.')
  })

  // biblioteca e cartas personalizadas (com a tua foto)
  on('toggleNew', 'click', () => { view.newCard = !view.newCard; view.panel = true; render() })
  on('newCard', 'submit', async e => {
    e.preventDefault()
    const f = new FormData(e.target)
    const file = f.get('photo'), name = String(f.get('name')).trim()
    if (!name || !file || !file.size) return alert('Escreve o nome e escolhe uma foto.')
    try {
      const { blob } = await shrink(file)
      const pid = uid()
      await storePhoto(pid, blob)
      const price = Number(String(f.get('price')).replace(',', '.')) || undefined
      const lang = f.get('lang')
      const priceAt = price ? Date.now() : undefined
      data.library.push({ lid: uid(), name, lang, price, priceAt, pid })
      addItem(b, { t: 'card', custom: true, name, lang, price, priceAt, pid, owned: false })
      Object.assign(view, { newCard: false, panel: true, msg: `Adicionada: ${name} (página ${view.pageIdx + 1})` })
      save(); render()
    } catch { alert('Não consegui guardar a foto.') }
  })
  on('lib', 'click', async e => {
    const del = e.target.closest('.libdel')
    if (del) {
      if (!confirm('Remover esta carta da biblioteca? (não sai dos binders onde já está)')) return
      const gone = data.library.find(x => x.lid === del.dataset.del)
      data.library = data.library.filter(x => x.lid !== del.dataset.del)
      save()
      if (gone && gone.pid) await releasePhoto(gone.pid)
      view.panel = true; render(); return
    }
    const el = e.target.closest('.libitem'); if (!el) return
    const ent = data.library.find(x => x.lid === el.dataset.lid)
    addItem(b, { t: 'card', owned: false, custom: !ent.tid, name: ent.name, lang: ent.lang, price: ent.price, priceAt: ent.priceAt, pid: ent.pid, src: ent.src, image: ent.image, id: ent.tid })
    Object.assign(view, { panel: true, msg: `Adicionada: ${ent.name} (página ${view.pageIdx + 1})` })
    render()
  })

  hydratePhotos()
}

/* ---------- pesquisa de cartas: nome na língua da carta OU nome em inglês ---------- */
const asList = r => (Array.isArray(r) ? r : (r && Array.isArray(r.cards) ? r.cards : []))
async function listCards(lang, q) {
  try { return asList(await (await fetch(`${API}/${lang}/cards?name=${encodeURIComponent(q)}`)).json()).filter(c => c.image) } catch { return [] }
}
// nomes oficiais de cada Pokémon em várias línguas (PokéAPI, gratuita)
const POKEAPI = 'https://pokeapi.co/api/v2/pokemon-species/'
const PK_LANG = { ja: ['ja-Hrkt', 'ja'], 'zh-cn': ['zh-Hans'], 'zh-tw': ['zh-Hant'], ko: ['ko'], fr: ['fr'], de: ['de'], es: ['es'], it: ['it'] }
const NOISE = new Set(['v', 'vmax', 'vstar', 'vunion', 'ex', 'gx', 'tag', 'team', 'mega', 'hisuian', 'galarian', 'alolan', 'paldean', 'origin', 'forme', 'rapid', 'strike', 'single', 'radiant', 'the', 'of', 'and', '&'])
const SUFFIX = { v: 'V', vmax: 'VMAX', vstar: 'VSTAR', ex: 'ex', gx: 'GX' }
const speciesCache = new Map()
async function speciesNames(slug) {
  if (speciesCache.has(slug)) return speciesCache.get(slug)
  let names = null
  try {
    const r = await fetch(POKEAPI + slug)
    if (r.ok) { names = {}; for (const n of (await r.json()).names || []) names[n.language.name] = n.name }
  } catch {}
  speciesCache.set(slug, names)
  return names
}
// "Fuecoco" -> nome do Pokémon na língua escolhida (mantém V, VMAX, ex… se estiverem no nome inglês)
async function translateName(lang, q) {
  const words = q.toLowerCase().replace(/[^a-z0-9\s'.\-]/g, ' ').split(/\s+/).filter(Boolean)
  const suffix = SUFFIX[words[words.length - 1]] || ''
  for (const w of words.filter(w => !NOISE.has(w)).slice(0, 4)) {
    const names = await speciesNames(w.replace(/'s$/, '').replace(/['.]/g, ''))
    const native = names && (PK_LANG[lang] || []).map(k => names[k]).find(Boolean)
    if (native) return native + suffix
  }
  return null
}
// devolve { list, via, native }: 'nome' = como escreveste; 'traducao' = nome inglês traduzido para a língua escolhida
async function searchCards(lang, q) {
  const direct = await listCards(lang, q)
  if (direct.length || lang === 'en') return { list: direct, via: 'nome' }
  const native = await translateName(lang, q)
  if (native) {
    const list = await listCards(lang, native)
    if (list.length) return { list, via: 'traducao', native }
  }
  return { list: [], via: null }
}
const viaNote = (via, native) => (via === 'traducao' ? ` (nome inglês traduzido para ${native})` : '')

/* ---------- preços (Cardmarket via TCGdex) ---------- */
const eur = v => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0)
const pkey = it => `${it.lang || 'en'}:${it.id}`
const priceOf = it => {
  const p = it.id && data.prices[pkey(it)]
  if (p && p.v != null) return p.v
  const manual = Number(it.price) // preço escrito à mão (cartas que o TCGdex não tem)
  return manual > 0 ? manual : null
}
function pickPrice(cm) {
  if (!cm) return null
  for (const k of ['trend', 'avg', 'trend-holo', 'avg-holo', 'low']) if (typeof cm[k] === 'number') return cm[k]
  return null
}
async function fetchPrice(lang, id) {
  const c = await (await fetch(`${API}/${lang}/cards/${encodeURIComponent(id)}`)).json()
  const cm = c.pricing && c.pricing.cardmarket
  return { v: pickPrice(cm), upd: (cm && cm.updated) || null, at: Date.now() }
}
const fresh = p => p && Date.now() - p.at < 12 * 3600 * 1000
async function refreshPrices() {
  const keys = new Map()
  for (const b of data.binders) for (const c of cardsOf(b)) if (c.id) keys.set(pkey(c), [c.lang || 'en', c.id])
  const todo = [...keys].filter(([k]) => !fresh(data.prices[k]))
  if (!keys.size) { view.priceMsg = 'Ainda não há cartas ligadas. Abre um binder, toca em Editar e depois em Ligar cartas.'; return renderValue() }
  const total = todo.length
  if (!total) { view.priceMsg = 'Os preços já estão atualizados (últimas 12 horas).'; return renderValue() }
  let done = 0
  const worker = async () => {
    while (todo.length) {
      const [k, [lang, id]] = todo.shift()
      try { data.prices[k] = await fetchPrice(lang, id) } catch {}
      done++
      view.priceMsg = `A atualizar preços ${done}/${total}…`
      if (done % 6 === 0 && view.page === 'value') renderValue()
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  save()
  view.priceMsg = 'Preços atualizados.'
  if (view.page === 'value') renderValue()
}

function renderValue() {
  const sum = arr => arr.reduce((n, v) => n + (v ?? 0), 0)
  const rows = data.binders.map(b => {
    const cards = cardsOf(b)
    return {
      b, cards,
      owned: sum(cards.filter(c => c.owned).map(priceOf)),
      all: sum(cards.map(priceOf)),
      ownedN: cards.filter(c => c.owned).length,
      linked: cards.filter(c => c.id).length,
      linkable: cards.filter(c => !c.custom).length,
      noPrice: cards.filter(c => c.id && priceOf(c) == null).length
    }
  })
  const totalOwned = sum(rows.map(r => r.owned)), totalAll = sum(rows.map(r => r.all))
  const everyCard = data.binders.flatMap(cardsOf).filter(c => priceOf(c) != null)
  const ownedCards = everyCard.filter(c => c.owned)
  const top = (ownedCards.length ? ownedCards : everyCard).sort((a, c) => priceOf(c) - priceOf(a)).slice(0, 10)
  const upds = Object.values(data.prices).map(p => p.upd).filter(Boolean).sort()
  const manualCards = data.binders.flatMap(cardsOf).filter(c => c.price > 0 && !(c.id && data.prices[pkey(c)] && data.prices[pkey(c)].v != null))
  const oldManual = manualCards.filter(c => !c.priceAt || Date.now() - c.priceAt > 30 * 864e5).length
  const manualNote = manualCards.length ? ` ${manualCards.length} carta(s) com preço à mão${oldManual ? ` (${oldManual} com mais de 30 dias ou sem data: confirma no Cardmarket)` : ''}.` : ''
  const content = `
    <button id="back" class="back-button">← Voltar</button>
    <section class="page-intro"><p class="eyebrow">Cardmarket · preços em euros</p><h1>Valor da coleção</h1><p>Conta só as cartas ligadas ao TCGdex e marcadas como adquiridas.</p></section>
    <div class="collection-value"><span>Valor das cartas adquiridas</span><strong>${eur(totalOwned)}</strong><small>Com todas as cartas ligadas: ${eur(totalAll)}</small></div>
    <div class="binder-actions"><button id="refresh" class="primary-button">Atualizar preços</button></div>
    <p class="hint">${esc(view.priceMsg || (rows.some(r => r.linked) ? '' : 'Ainda não há cartas ligadas. Abre um binder, toca em Editar e depois em Ligar cartas.'))}${upds.length ? ` Dados do Cardmarket de ${esc(upds[upds.length - 1].slice(0, 10))}.` : ''}${manualNote}</p>
    <section class="binder-list">${rows.map(r => `<div class="binder">
      <span class="binder-topline"><strong>${esc(r.b.name)}</strong></span>
      <span class="binder-meta">${r.ownedN}/${r.cards.length} adquiridas · valor ${eur(r.owned)}</span>
      <span class="binder-meta">${r.linked}/${r.linkable} cartas ligadas${r.noPrice ? ` · ${r.noPrice} sem preço` : ''}</span>
    </div>`).join('')}</section>
    ${top.length ? `<section class="section-block"><div class="section-heading"><div><p class="eyebrow">Top 10</p><h2>${ownedCards.length ? 'Mais valiosas (adquiridas)' : 'Mais valiosas'}</h2></div></div>${top.map(c => `
      <div class="vrow">${imgTag(c)}<span>${esc(c.name || (c.hint && c.hint.n) || 'Carta')} <small>${esc(c.lang || 'en')}</small></span><strong>${eur(priceOf(c))}</strong></div>`).join('')}</section>` : ''}`
  renderShell(content, 'binders')
  hydratePhotos()
  on('back', 'click', () => { view.page = view.valueBack; render() })
  on('refresh', 'click', refreshPrices)
}

/* ---------- ligar cartas do binder ao TCGdex ---------- */
function pickNext(b, L) { return cardsOf(b).find(c => !c.id && !c.custom && !c.skip && !L.skipped.includes(c)) || null }
function startLink(b, item) {
  view.page = 'link'
  view.link = { bid: b.id, skipped: [], cur: item || null, lang: 'en', q: '', results: [], msg: '', token: 0 }
  if (!item) view.link.cur = pickNext(b, view.link)
  loadCurrent(b)
}
function loadCurrent(b) {
  const L = view.link, c = L.cur
  if (c) {
    L.lang = (c.hint && c.hint.l) || c.lang || data.lang || 'en'
    L.q = (c.hint && c.hint.n) || c.name || ''
  }
  L.results = []; L.msg = ''
  renderLink()
  if (c && L.q) linkSearch()
}
async function linkSearch() {
  const L = view.link, tok = ++L.token
  L.msg = 'A pesquisar…'; L.results = []
  renderLink()
  try {
    const { list, via, native } = await searchCards(L.lang, L.q)
    if (tok !== L.token) return
    L.results = list.slice(0, 120)
    L.msg = L.results.length ? 'Toca na carta igual à tua.' + viaNote(via, native) : 'Sem resultados: tenta o nome em inglês ou na língua da carta.'
  } catch { if (tok !== L.token) return; L.msg = 'Erro ao pesquisar.' }
  if (view.page === 'link') renderLink()
}
function renderLink() {
  const L = view.link
  const b = data.binders.find(x => x.id === L.bid)
  if (!b) { view.page = 'binders'; return render() }
  const cards = cardsOf(b).filter(c => !c.custom), linked = cards.filter(c => c.id).length
  const content = `
    <button id="stop" class="back-button">← Voltar ao binder</button>
    <section class="page-intro binder-detail-heading"><p class="eyebrow">${esc(b.name)}</p><h1>Ligar cartas</h1><p>${linked}/${cards.length} cartas ligadas</p>
    <div class="bar"><i style="width:${cards.length ? Math.round(linked / cards.length * 100) : 0}%"></i></div></section>
    ${L.cur ? `
      <div class="linkcur">
        ${imgTag(L.cur)}
        <div>
          <p class="hint">Esta é a carta do teu binder. Escolhe nos resultados a mesma carta (mesma arte e número).</p>
          <button id="skip" class="button-secondary">Saltar</button>
          <button id="ignore" class="button-secondary">Sem correspondência</button>
          <button id="manual" class="button-secondary">Preço à mão</button>
        </div>
      </div>
      <form id="lform" class="row">
        <select name="lang">${LANGS.map(([c, n]) => `<option value="${c}" ${c === L.lang ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <input name="q" value="${esc(L.q)}" placeholder="Nome (em inglês ou na língua da carta)" />
        <button>Pesquisar</button>
      </form>
      <p class="hint">${esc(L.msg)}</p>
      <div class="rgrid" id="lres">
        ${L.results.map(c => `<div class="cell card owned res" data-id="${esc(c.id)}"><img src="${c.image}/low.webp" alt=""><small>${esc(c.name)} · ${esc(c.localId ?? '')}</small></div>`).join('')}
      </div>` : '<div class="empty-card"><strong>Tudo ligado</strong><p>Não há mais cartas por ligar neste binder.</p></div>'}`
  renderShell(content, 'binders')
  hydratePhotos()
  on('stop', 'click', () => { view.page = 'binder'; render() })
  on('skip', 'click', () => { L.skipped.push(L.cur); L.cur = pickNext(b, L); loadCurrent(b) })
  on('ignore', 'click', () => { L.cur.skip = true; save(); L.cur = pickNext(b, L); loadCurrent(b) })
  on('manual', 'click', () => {
    const v = prompt('Preço desta carta em euros (ex.: 12,50). Deixa vazio para remover.', L.cur.price ?? '')
    if (v === null) return
    const n = Number(String(v).replace(',', '.'))
    if (String(v).trim() === '') delete L.cur.price
    else if (n > 0) { L.cur.price = n; L.cur.priceAt = Date.now() }
    else return alert('Valor inválido.')
    L.cur.skip = true
    save(); L.cur = pickNext(b, L); loadCurrent(b)
  })
  on('lform', 'submit', e => {
    e.preventDefault()
    const f = new FormData(e.target)
    L.lang = f.get('lang'); L.q = String(f.get('q')).trim()
    if (L.q) linkSearch()
  })
  on('lres', 'click', e => {
    const el = e.target.closest('.res'); if (!el) return
    const c = L.results.find(x => x.id === el.dataset.id)
    Object.assign(L.cur, { id: c.id, lang: L.lang, name: c.name, image: c.image })
    data.lang = L.lang
    save()
    L.cur = pickNext(b, L)
    loadCurrent(b)
  })
}

/* ---------- atualizar o binder PC importado com a versão nova do seed ---------- */
function mergeSeed(pc, seed) {
  if ((pc.version || 1) < 2) pc.pages.splice(24, 0, seed.pages[24]) // página 25 em falta (Hoenn)
  const hints = new Map()
  for (const p of seed.pages) for (const it of p.items) if (it.hint) hints.set(it.src, it.hint)
  for (const p of pc.pages) for (const it of p.items) if (it.src && !it.hint && hints.has(it.src)) it.hint = hints.get(it.src)
  pc.version = seed.version
}

const pk = createPokemon({ getData: () => data, save, renderShell, on, esc, uid, icon, view, render, root: () => $app, go: page => { view.page = page; render() } })
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {})
boot()
