// Raptor Rips · secção Pokémon: equipas favoritas por jogo, classificação de Pokémon e favoritos
// Os dados (nomes e imagens) vêm da PokéAPI, gratuita; as tuas escolhas ficam na tua conta.
const SPRITE = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
const ART = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
const DEX_URL = 'https://pokeapi.co/api/v2/pokemon-species?limit=1200'
const DEX_KEY = 'rr-dex-v1'

export const REGIONS = [
  { gen: 1, name: 'Kanto', from: 1, to: 151 },
  { gen: 2, name: 'Johto', from: 152, to: 251 },
  { gen: 3, name: 'Hoenn', from: 252, to: 386 },
  { gen: 4, name: 'Sinnoh', from: 387, to: 493 },
  { gen: 5, name: 'Unova', from: 494, to: 649 },
  { gen: 6, name: 'Kalos', from: 650, to: 721 },
  { gen: 7, name: 'Alola', from: 722, to: 809 },
  { gen: 8, name: 'Galar', from: 810, to: 905 },
  { gen: 9, name: 'Paldea', from: 906, to: 99999 }
]
export const GAMES = [
  { id: 'rby', gen: 1, name: 'Red / Blue / Yellow' },
  { id: 'gsc', gen: 2, name: 'Gold / Silver / Crystal' },
  { id: 'rse', gen: 3, name: 'Ruby / Sapphire / Emerald' },
  { id: 'frlg', gen: 3, name: 'FireRed / LeafGreen' },
  { id: 'dppt', gen: 4, name: 'Diamond / Pearl / Platinum' },
  { id: 'hgss', gen: 4, name: 'HeartGold / SoulSilver' },
  { id: 'bw', gen: 5, name: 'Black / White' },
  { id: 'b2w2', gen: 5, name: 'Black 2 / White 2' },
  { id: 'xy', gen: 6, name: 'X / Y' },
  { id: 'oras', gen: 6, name: 'Omega Ruby / Alpha Sapphire' },
  { id: 'sm', gen: 7, name: 'Sun / Moon' },
  { id: 'usum', gen: 7, name: 'Ultra Sun / Ultra Moon' },
  { id: 'lg', gen: 7, name: "Let's Go, Pikachu! / Eevee!" },
  { id: 'swsh', gen: 8, name: 'Sword / Shield' },
  { id: 'bdsp', gen: 8, name: 'Brilliant Diamond / Shining Pearl' },
  { id: 'pla', gen: 8, name: 'Legends: Arceus' },
  { id: 'sv', gen: 9, name: 'Scarlet / Violet' },
  { id: 'za', gen: 9, name: 'Legends: Z-A' },
  { id: 'dream', gen: 0, name: 'Equipa de sonho (todas as gerações)' }
]
export const defaultAspects = () => [
  { id: 'design', name: 'Design' },
  { id: 'fofura', name: 'Fofura' },
  { id: 'fixe', name: 'Fixe' },
  { id: 'forca', name: 'Força' },
  { id: 'nostalgia', name: 'Nostalgia' }
]

const SPECIAL = {
  'nidoran-f': 'Nidoran ♀', 'nidoran-m': 'Nidoran ♂', 'mr-mime': 'Mr. Mime', 'mime-jr': 'Mime Jr.', 'mr-rime': 'Mr. Rime',
  farfetchd: "Farfetch'd", sirfetchd: "Sirfetch'd", 'type-null': 'Type: Null', 'ho-oh': 'Ho-Oh', 'porygon-z': 'Porygon-Z',
  'jangmo-o': 'Jangmo-o', 'hakamo-o': 'Hakamo-o', 'kommo-o': 'Kommo-o', flabebe: 'Flabébé',
  'wo-chien': 'Wo-Chien', 'chien-pao': 'Chien-Pao', 'ting-lu': 'Ting-Lu', 'chi-yu': 'Chi-Yu'
}
const prettyName = slug => SPECIAL[slug] || slug.split('-').map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
export const regionOf = id => REGIONS.find(r => id >= r.from && id <= r.to) || REGIONS[REGIONS.length - 1]
const pad = id => String(id).padStart(3, '0')

export function createPokemon(ctx) {
  const { renderShell, on, esc, save, view, icon } = ctx
  const D = () => ctx.getData()
  const S = () => (view.pk ||= {
    gameId: null, slot: null, search: '', gen: 0, limit: 60,
    rate: { region: 0, only: true, cur: 0, manage: false, seg: 'rate', jump: '' },
    fav: { aspect: 'all' }
  })
  const root = () => ctx.root()

  /* ---------- lista de Pokémon (PokéAPI), guardada no aparelho ---------- */
  let dex = null, dexMap = new Map(), dexErr = false, dexLoading = null
  async function loadDex() {
    if (dex) return dex
    if (dexLoading) return dexLoading
    dexLoading = (async () => {
      let list = null
      try {
        const cached = JSON.parse(localStorage.getItem(DEX_KEY))
        if (Array.isArray(cached) && cached.length > 1000) list = cached.map(([id, name]) => ({ id, name }))
      } catch {}
      if (!list) {
        const r = await fetch(DEX_URL)
        if (!r.ok) throw new Error('dex')
        const j = await r.json()
        list = j.results
          .map(x => ({ id: Number((x.url.match(/\/(\d+)\/?$/) || [])[1]), name: prettyName(x.name) }))
          .filter(x => x.id > 0).sort((a, b) => a.id - b.id)
        try { localStorage.setItem(DEX_KEY, JSON.stringify(list.map(x => [x.id, x.name]))) } catch {}
      }
      dex = list; dexMap = new Map(list.map(p => [p.id, p]))
      return dex
    })()
    try { return await dexLoading } finally { dexLoading = null }
  }
  const nameOf = id => (dexMap.get(id) ? dexMap.get(id).name : `Pokémon ${id}`)
  function needDex(page) {
    if (dex) return true
    renderShell(`<div class="pk"><section class="page-intro"><p class="eyebrow">Pokémon</p><h1>${dexErr ? 'Sem ligação' : 'A carregar…'}</h1>
      <p class="hint">${dexErr ? 'Não consegui obter a lista de Pokémon. Verifica a ligação e tenta outra vez.' : 'A obter a lista de Pokémon (só a primeira vez).'}</p>
      ${dexErr ? '<button id="retryDex" class="button-secondary">Tentar outra vez</button> <button id="dexBack" class="text-button">← Voltar</button>' : ''}</section></div>`, 'pokemon')
    on('retryDex', 'click', () => { dexErr = false; ctx.render() })
    on('dexBack', 'click', () => go('pokemon'))
    if (!dexErr) loadDex().then(() => { if (view.page === page) ctx.render() }).catch(() => { dexErr = true; if (view.page === page) ctx.render() })
    return false
  }
  const go = page => ctx.go(page)
  const sprite = (id, cls = '') => `<img class="${cls}" loading="lazy" src="${SPRITE(id)}" alt="${esc(nameOf(id))}" width="64" height="64">`
  const art = (id, cls = '') => `<img class="${cls}" loading="lazy" src="${ART(id)}" alt="${esc(nameOf(id))}">`
  const intro = (eyebrow, title, text) => `<section class="page-intro"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${text ? `<p>${text}</p>` : ''}</section>`
  const back = (id, label) => `<button id="${id}" class="back-button">← ${label}</button>`

  /* ---------- menu Pokémon ---------- */
  function renderHub() {
    const d = D()
    const rated = Object.values(d.ratings).filter(r => Object.keys(r).length).length
    const teams = Object.values(d.teams).filter(t => t.some(Boolean)).length
    const card = (go, ic, title, sub) => `<button class="hub-card" data-go="${go}"><span class="hub-icon">${icon(ic)}</span><span class="hub-text"><strong>${title}</strong><small>${sub}</small></span><span class="hub-arrow">→</span></button>`
    renderShell(`<div class="pk">${intro('O mundo Pokémon', 'Pokémon', 'Coleção, equipas e favoritos num só lugar.')}
      <div class="hub-list">
        ${card('binders', 'binders', 'Os meus binders', `${d.binders.length} binder${d.binders.length === 1 ? '' : 's'} · cartas e valor`)}
        ${card('team', 'team', 'A minha equipa', `${teams} equipa${teams === 1 ? '' : 's'} · 6 Pokémon por jogo`)}
        ${card('rate', 'star', 'Classificar Pokémon', `${rated} classificado${rated === 1 ? '' : 's'} · descobre os teus favoritos`)}
      </div></div>`, 'pokemon')
    root().querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)))
  }

  /* ---------- equipas por geração / jogo ---------- */
  const teamOf = gameId => { const d = D(); return (d.teams[gameId] ||= [0, 0, 0, 0, 0, 0]) }
  function renderTeams() {
    if (!needDex('team')) return
    const d = D()
    const groups = [...REGIONS.map(r => ({ title: `Geração ${r.gen} · ${r.name}`, games: GAMES.filter(g => g.gen === r.gen) })), { title: 'Especial', games: GAMES.filter(g => g.gen === 0) }]
      .filter(g => g.games.length)
    const row = g => {
      const t = d.teams[g.id] || []
      return `<button class="team-row" data-game="${g.id}"><span class="team-name">${esc(g.name)}</span><span class="mini-row">${[0, 1, 2, 3, 4, 5].map(i => t[i] ? sprite(t[i], 'mini') : '<span class="mini empty"></span>').join('')}</span></button>`
    }
    renderShell(`<div class="pk">${back('backHub', 'Pokémon')}${intro('As tuas equipas', 'Equipa favorita', 'Escolhe os teus 6 Pokémon de cada jogo.')}
      ${groups.map(g => `<section class="section-block"><p class="eyebrow">${g.title}</p>${g.games.map(row).join('')}</section>`).join('')}</div>`, 'pokemon')
    on('backHub', 'click', () => go('pokemon'))
    root().querySelectorAll('[data-game]').forEach(b => b.addEventListener('click', () => { Object.assign(S(), { gameId: b.dataset.game, slot: null, search: '', gen: 0, limit: 60 }); go('teamEdit') }))
  }

  function renderTeamEdit() {
    if (!needDex('teamEdit')) return
    const s = S(), game = GAMES.find(g => g.id === s.gameId)
    if (!game) return go('team')
    const t = teamOf(game.id)
    const slots = t.map((id, i) => `<div class="slot ${s.slot === i ? 'sel' : ''}" data-slot="${i}">
        ${id ? `${art(id, 'slot-art')}<span class="slot-name">${esc(nameOf(id))}</span><button class="slot-x" data-clear="${i}" aria-label="Tirar">✕</button>` : '<span class="slot-plus">+</span><span class="slot-name muted">Escolher</span>'}</div>`).join('')
    const chips = `<button class="chip ${s.gen === 0 ? 'on' : ''}" data-gen="0">Todas</button>` + REGIONS.map(r => `<button class="chip ${s.gen === r.gen ? 'on' : ''}" data-gen="${r.gen}">${r.name}</button>`).join('')
    const picker = s.slot == null ? '<p class="hint">Toca num espaço para escolher um Pokémon.</p>' : `
      <section class="picker"><p class="eyebrow">Posição ${s.slot + 1}</p>
        <input id="pkSearch" class="pk-input" type="search" placeholder="Pesquisar por nome ou número" value="${esc(s.search)}" autocomplete="off" />
        <div class="chips">${chips}</div><div id="pkResults"></div></section>`
    renderShell(`<div class="pk">${back('backTeams', 'Equipas')}${intro(game.gen ? `Geração ${game.gen} · ${REGIONS.find(r => r.gen === game.gen).name}` : 'Especial', esc(game.name), 'A tua equipa de 6.')}
      <div class="team-grid">${slots}</div>${picker}</div>`, 'pokemon')
    on('backTeams', 'click', () => go('team'))
    root().querySelectorAll('[data-slot]').forEach(el => el.addEventListener('click', e => {
      const clear = e.target.closest('[data-clear]')
      if (clear) { t[Number(clear.dataset.clear)] = 0; save(); return ctx.render() }
      s.slot = s.slot === Number(el.dataset.slot) ? null : Number(el.dataset.slot); s.scroll = s.slot != null; ctx.render()
    }))
    if (s.slot == null) return
    root().querySelectorAll('[data-gen]').forEach(b => b.addEventListener('click', () => { s.gen = Number(b.dataset.gen); s.limit = 60; ctx.render() }))
    const paint = () => {
      const q = s.search.trim().toLowerCase()
      const list = dex.filter(p => (s.gen === 0 || regionOf(p.id).gen === s.gen) && (!q || p.name.toLowerCase().includes(q) || String(p.id) === q || pad(p.id).includes(q)))
      const shown = list.slice(0, s.limit)
      document.getElementById('pkResults').innerHTML = `<div class="pk-grid">${shown.map(p => `<button class="pk-cell ${t.includes(p.id) ? 'taken' : ''}" data-pick="${p.id}" ${t.includes(p.id) ? 'disabled' : ''}>${sprite(p.id)}<small>${esc(p.name)}</small></button>`).join('')}</div>
        ${list.length > shown.length ? `<button id="pkMore" class="button-secondary">Mostrar mais (${list.length - shown.length})</button>` : ''}${list.length ? '' : '<p class="hint">Nenhum Pokémon encontrado.</p>'}`
      document.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { t[s.slot] = Number(b.dataset.pick); s.slot = null; s.search = ''; save(); ctx.render() }))
      on('pkMore', 'click', () => { s.limit += 60; paint() })
    }
    if (s.scroll) { s.scroll = false; const pk = document.querySelector('.picker'); if (pk && pk.scrollIntoView) setTimeout(() => pk.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
    document.getElementById('pkSearch').addEventListener('input', e => { s.search = e.target.value; s.limit = 60; paint() })
    paint()
  }

  /* ---------- classificar ---------- */
  const aspectsOf = () => D().aspects
  const ratingsOf = id => D().ratings[id] || {}
  const isComplete = id => aspectsOf().every(a => ratingsOf(id)[a.id])
  const ratedAny = id => aspectsOf().some(a => ratingsOf(id)[a.id])
  const listFor = region => dex.filter(p => !region || regionOf(p.id).gen === region).map(p => p.id)
  function pickNext(list, cur, only) {
    const i = Math.max(0, list.indexOf(cur))
    for (let k = 1; k <= list.length; k++) {
      const id = list[(i + k) % list.length]
      if (!only || !isComplete(id)) return id
    }
    return list[i]
  }
  function renderRate() {
    if (!needDex('rate')) return
    const R = S().rate, d = D()
    if (R.seg === 'favs') return renderFavs()
    const list = listFor(R.region)
    if (!list.includes(R.cur)) R.cur = list.find(id => !isComplete(id)) || list[0]
    const doneN = list.filter(isComplete).length
    const reg = regionOf(R.cur)
    const chips = `<button class="chip ${R.region === 0 ? 'on' : ''}" data-region="0">Todas</button>` + REGIONS.map(r => `<button class="chip ${R.region === r.gen ? 'on' : ''}" data-region="${r.gen}">${r.name}</button>`).join('')
    const stars = a => `<div class="aspect-row"><span>${esc(a.name)}</span><div class="stars" data-aspect="${a.id}">${[1, 2, 3, 4, 5].map(v => `<button class="star ${v <= (ratingsOf(R.cur)[a.id] || 0) ? 'lit' : ''}" data-v="${v}" aria-label="${v} estrelas">★</button>`).join('')}</div></div>`
    const manage = R.manage ? `<section class="section-block manage"><p class="eyebrow">Aspetos</p>
        ${d.aspects.map(a => `<div class="manage-row"><span>${esc(a.name)}</span><button class="button-secondary" data-delaspect="${a.id}">Remover</button></div>`).join('')}
        <form id="addAspect" class="manage-add"><input name="n" class="pk-input" placeholder="Novo aspeto (ex.: Voz, Shiny, Anime…)" maxlength="24" required /><button class="button-secondary">Adicionar</button></form></section>` : ''
    renderShell(`<div class="pk">${back('backHub', 'Pokémon')}${intro('Os teus gostos', 'Classificar', 'Dá estrelas a cada Pokémon. No fim, descobre os teus favoritos.')}
      <div class="seg"><button class="on" data-seg="rate">Classificar</button><button data-seg="favs">Favoritos</button></div>
      <div class="chips">${chips}</div>
      <p class="hint" id="rateProgress">${doneN}/${list.length} completos${R.region ? ' · ' + REGIONS.find(r => r.gen === R.region).name : ''}</p>
      <section class="rate-card"><img class="rate-art" src="${ART(R.cur)}" alt="${esc(nameOf(R.cur))}">
        <p class="rate-id">#${pad(R.cur)} · ${reg.name}</p><h2>${esc(nameOf(R.cur))}</h2>
        ${d.aspects.map(stars).join('')}</section>
      <div class="rate-nav"><button id="prevP" class="button-secondary">← Anterior</button><button id="randP" class="button-secondary" aria-label="Aleatório">🎲</button><button id="nextP" class="primary-button">Seguinte →</button></div>
      <label class="only"><input type="checkbox" id="onlyNew" ${R.only ? 'checked' : ''}> Saltar os que já classifiquei</label>
      <form id="jumpForm" class="manage-add"><input name="q" class="pk-input" placeholder="Ir para um Pokémon (nome ou número)" value="${esc(R.jump)}" /><button class="button-secondary">Ir</button></form>
      <button id="toggleManage" class="text-button">${R.manage ? 'Fechar aspetos' : 'Gerir aspetos'}</button>${manage}</div>`, 'pokemon')
    on('backHub', 'click', () => go('pokemon'))
    root().querySelectorAll('[data-seg]').forEach(b => b.addEventListener('click', () => { R.seg = b.dataset.seg; ctx.render() }))
    root().querySelectorAll('[data-region]').forEach(b => b.addEventListener('click', () => { R.region = Number(b.dataset.region); R.cur = 0; ctx.render() }))
    // estrelas: atualizam sem recarregar a imagem
    root().querySelectorAll('.star').forEach(b => b.addEventListener('click', () => {
      const aspect = b.closest('.stars').dataset.aspect, v = Number(b.dataset.v)
      const r = (d.ratings[R.cur] ||= {})
      if (r[aspect] === v) delete r[aspect]; else r[aspect] = v
      if (!Object.keys(r).length) delete d.ratings[R.cur]
      save()
      b.closest('.stars').querySelectorAll('.star').forEach(x => x.classList.toggle('lit', Number(x.dataset.v) <= (r[aspect] || 0)))
      document.getElementById('rateProgress').textContent = `${list.filter(isComplete).length}/${list.length} completos${R.region ? ' · ' + REGIONS.find(x => x.gen === R.region).name : ''}`
    }))
    on('nextP', 'click', () => { R.cur = pickNext(list, R.cur, R.only); ctx.render() })
    on('prevP', 'click', () => { const i = list.indexOf(R.cur); R.cur = list[(i - 1 + list.length) % list.length]; ctx.render() })
    on('randP', 'click', () => { const pool = list.filter(id => !R.only || !isComplete(id)); const src = pool.length ? pool : list; R.cur = src[Math.floor(Math.random() * src.length)]; ctx.render() })
    on('onlyNew', 'change', e => { R.only = e.target.checked })
    on('jumpForm', 'submit', e => {
      e.preventDefault()
      const q = String(new FormData(e.target).get('q')).trim().toLowerCase(); R.jump = q
      const hit = dex.find(p => p.name.toLowerCase() === q || String(p.id) === q) || dex.find(p => p.name.toLowerCase().includes(q))
      if (hit) { R.region = 0; R.cur = hit.id; R.jump = ''; ctx.render() }
    })
    on('toggleManage', 'click', () => { R.manage = !R.manage; ctx.render() })
    on('addAspect', 'submit', e => {
      e.preventDefault()
      const n = String(new FormData(e.target).get('n')).trim()
      if (n && !d.aspects.some(a => a.name.toLowerCase() === n.toLowerCase())) { d.aspects.push({ id: ctx.uid(), name: n }); save() }
      ctx.render()
    })
    root().querySelectorAll('[data-delaspect]').forEach(b => b.addEventListener('click', () => {
      if (d.aspects.length <= 1) return alert('Tem de ficar pelo menos um aspeto.')
      const a = d.aspects.find(x => x.id === b.dataset.delaspect)
      if (!confirm(`Remover "${a.name}" e todas as estrelas dadas a esse aspeto?`)) return
      d.aspects = d.aspects.filter(x => x.id !== a.id)
      for (const id of Object.keys(d.ratings)) { delete d.ratings[id][a.id]; if (!Object.keys(d.ratings[id]).length) delete d.ratings[id] }
      save(); ctx.render()
    }))
  }

  /* ---------- favoritos ---------- */
  function scoreOf(id, aspect) {
    const r = ratingsOf(id)
    if (aspect === 'all') { const v = aspectsOf().map(a => r[a.id]).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
    return r[aspect] || null
  }
  function ranking(aspect, region = 0) {
    return Object.keys(D().ratings).map(Number)
      .filter(id => !region || regionOf(id).gen === region)
      .map(id => ({ id, s: scoreOf(id, aspect), o: scoreOf(id, 'all') || 0 }))
      .filter(x => x.s != null)
      .sort((a, b) => b.s - a.s || b.o - a.o || a.id - b.id)
  }
  const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1))
  function renderFavs() {
    const R = S().rate, F = S().fav, d = D()
    if (F.aspect !== 'all' && !d.aspects.some(a => a.id === F.aspect)) F.aspect = 'all'
    const total = Object.keys(d.ratings).length
    const hall = d.aspects.map(a => ({ a, top: ranking(a.id)[0] })).filter(x => x.top)
    const aspectName = F.aspect === 'all' ? 'Geral' : d.aspects.find(a => a.id === F.aspect).name
    const rank = ranking(F.aspect)
    const row = (x, i) => `<div class="fav-row"><span class="fav-rank">${i + 1}</span>${sprite(x.id, 'fav-img')}<span class="fav-name">${esc(nameOf(x.id))}<small>${regionOf(x.id).name}</small></span><span class="fav-score">★ ${fmt(x.s)}</span></div>`
    const regionBlocks = REGIONS.map(r => {
      const top = ranking(F.aspect, r.gen).slice(0, 3)
      return top.length ? `<div class="fav-region"><p class="eyebrow">${r.name}</p><div class="fav-top3">${top.map(x => `<div class="fav-mini">${sprite(x.id, 'fav-img')}<strong>${esc(nameOf(x.id))}</strong><small>★ ${fmt(x.s)}</small></div>`).join('')}</div></div>` : ''
    }).join('')
    const chips = `<button class="chip ${F.aspect === 'all' ? 'on' : ''}" data-fav="all">Geral</button>` + d.aspects.map(a => `<button class="chip ${F.aspect === a.id ? 'on' : ''}" data-fav="${a.id}">${esc(a.name)}</button>`).join('')
    renderShell(`<div class="pk">${back('backHub', 'Pokémon')}${intro('Os teus gostos', 'Favoritos', total ? `Com base nos ${total} Pokémon que classificaste.` : '')}
      <div class="seg"><button data-seg="rate">Classificar</button><button class="on" data-seg="favs">Favoritos</button></div>
      ${total ? `
      ${hall.length ? `<section class="section-block"><p class="eyebrow">O favorito de cada aspeto</p><div class="hall">${hall.map(x => `<div class="hall-card">${art(x.top.id, 'hall-art')}<small>${esc(x.a.name)}</small><strong>${esc(nameOf(x.top.id))}</strong></div>`).join('')}</div></section>` : ''}
      <section class="section-block"><p class="eyebrow">Ver por aspeto</p><div class="chips">${chips}</div>
        <h2 class="fav-title">Top 10 · ${esc(aspectName)}</h2>${rank.slice(0, 10).map(row).join('') || '<p class="hint">Ainda ninguém tem estrelas neste aspeto.</p>'}</section>
      <section class="section-block"><p class="eyebrow">Por região · ${esc(aspectName)}</p>${regionBlocks || '<p class="hint">Classifica Pokémon para veres os favoritos por região.</p>'}</section>`
      : '<div class="empty-card"><strong>Ainda não há favoritos</strong><p>Classifica alguns Pokémon e volta aqui.</p><button id="goRate" class="primary-button">Começar a classificar</button></div>'}</div>`, 'pokemon')
    on('backHub', 'click', () => go('pokemon'))
    on('goRate', 'click', () => { R.seg = 'rate'; ctx.render() })
    root().querySelectorAll('[data-seg]').forEach(b => b.addEventListener('click', () => { R.seg = b.dataset.seg; ctx.render() }))
    root().querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', () => { F.aspect = b.dataset.fav; ctx.render() }))
  }

  return {
    render(page) {
      if (page === 'pokemon') return renderHub()
      if (page === 'team') return renderTeams()
      if (page === 'teamEdit') return renderTeamEdit()
      if (page === 'rate') return renderRate()
    }
  }
}
