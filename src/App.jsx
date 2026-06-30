import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import {
  GROUPS, FLAGS, FLAG_CODES, SHORT_NAMES, GROUP_LETTERS, ALL_TEAMS,
  SCORING_MATCHES, SCORING_BONUS, SCORING_KO, KO_MATCH_SLOTS,
  EMPTY_PRED, EMPTY_RESULTS, MATCHES, matchKey,
  GROUP_LOCK_UTC, KNOCKOUT_LOCK_UTC,
  isGroupLocked, isKnockoutLocked, isMatchLocked, getMatchLock, formatLockTime,
  getMatchKickoff, isMatchKickoffPassed,
  calcScore, teamLabel,
} from './data/schedule'

const ADMIN_PIN    = import.meta.env.VITE_ADMIN_PIN || '1234'

const USER_EMOJIS = {
  'magdalena': '🐱',
  'bartek': '🐶',
  'kris312': '🚌',
}
const getUserEmoji = (name) => USER_EMOJIS[name?.toLowerCase()] || null
const displayName = (name) => {
  const emoji = getUserEmoji(name)
  return emoji ? `${emoji} ${name}` : name
}

// Mapowanie angielskich nazw API → polskich nazw w aplikacji
const EN_TO_PL = {
  // Grupa A
  'Mexico':'Meksyk', 'South Africa':'RPA',
  'Korea Republic':'Korea Płd.', 'South Korea':'Korea Płd.',
  'Czechia':'Czechy', 'Czech Republic':'Czechy',
  // Grupa B
  'Canada':'Kanada',
  'Bosnia and Herzegovina':'Bośnia i Herc.', 'Bosnia & Herzegovina':'Bośnia i Herc.',
  'Bosnia-Herzegovina':'Bośnia i Herc.', 'Bosnia Herzegovina':'Bośnia i Herc.',
  'Qatar':'Katar', 'Switzerland':'Szwajcaria',
  // Grupa C
  'Brazil':'Brazylia', 'Morocco':'Maroko', 'Haiti':'Haiti', 'Scotland':'Szkocja',
  // Grupa D
  'United States':'USA', 'USA':'USA', 'US':'USA',
  'Paraguay':'Paragwaj', 'Australia':'Australia',
  'Turkey':'Turcja', 'Türkiye':'Turcja',
  // Grupa E
  'Germany':'Niemcy', 'Curaçao':'Curaçao', 'Curacao':'Curaçao',
  "Côte d'Ivoire":'Wybrzeże K.Śł.', 'Ivory Coast':'Wybrzeże K.Śł.',
  'Ecuador':'Ekwador',
  // Grupa F
  'Netherlands':'Holandia', 'Japan':'Japonia', 'Sweden':'Szwecja', 'Tunisia':'Tunezja',
  // Grupa G
  'Belgium':'Belgia', 'Egypt':'Egipt',
  'Iran':'Iran', 'IR Iran':'Iran', 'Islamic Republic of Iran':'Iran',
  'New Zealand':'Nowa Zelandia',
  // Grupa H
  'Spain':'Hiszpania',
  'Cape Verde Islands':'Cabo Verde', 'Cape Verde':'Cabo Verde', 'Cabo Verde':'Cabo Verde',
  'Saudi Arabia':'Arabia Saud.', 'Uruguay':'Urugwaj',
  // Grupa I
  'France':'Francja', 'Senegal':'Senegal',
  'Iraq':'Irak', 'Norway':'Norwegia',
  // Grupa J
  'Argentina':'Argentyna', 'Algeria':'Algieria', 'Austria':'Austria',
  'Jordan':'Jordania',
  // Grupa K
  'Portugal':'Portugalia',
  'DR Congo':'DR Kongo', 'Congo DR':'DR Kongo',
  'Democratic Republic of Congo':'DR Kongo', 'Congo, DR':'DR Kongo',
  'Uzbekistan':'Uzbekistan', 'Colombia':'Kolumbia',
  // Grupa L
  'England':'Anglia', 'Croatia':'Chorwacja', 'Ghana':'Ghana', 'Panama':'Panama',
}


// ─── Tema (light / dark) ──────────────────────────────────────────────────────
const PALETTES = {
  dark: {
    _light: false,
    pageBg:'#0b0f13',   headerBg:'linear-gradient(135deg,#07290a 0%,#0f4015 60%,#07290a 100%)',
    card:'#161d27',     card2:'#111820',    card3:'#0f1923',
    border:'#1e2d3d',   border2:'#2a3f55',
    text:'#e2e8f0',     text2:'#bcc6d4',    muted:'#6b7a8d',  dim:'#4a5568',
    gold:'#f0b429',     goldAcc:'#d4a017',  sky:'#67d7f5',
    green:'#4ade80',    red:'#f87171',
    input:'#1e2d3d',    input2:'#161d27',
    greenBg:'rgba(26,46,26,1)',   redBg:'rgba(58,26,26,1)',
    greenTx:'#4ade80',  redTx:'#f87171',
  },
  light: {
    _light: true,
    pageBg:'#b8c4d2',   headerBg:'linear-gradient(135deg,#1a5020 0%,#27753a 60%,#1a5020 100%)',
    card:'#f4f6fa',     card2:'#e6eaf2',    card3:'#d8dde8',
    border:'#b0bece',   border2:'#7e92a6',
    text:'#0d1b2a',     text2:'#1e3448',    muted:'#45607a',  dim:'#5e7888',
    gold:'#7a5000',     goldAcc:'#9a6500',  sky:'#005080',
    green:'#0e4a18',    red:'#6e0e0e',
    input:'#dde3ef',    input2:'#edf0f8',
    greenBg:'#b8d8c4',  redBg:'#d8b8b8',
    greenTx:'#0e4a18',  redTx:'#6e0e0e',
  },
}

const makeC = (p) => ({
  page:   { minHeight:'100vh', background:p.pageBg, fontFamily:"'Segoe UI',system-ui,sans-serif", color:p.text },
  header: { background:p.headerBg, padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center',
            borderBottom:'2px solid #d4a017', boxShadow:'0 4px 20px rgba(0,0,0,0.4)' },
  card:   (extra={}) => ({ background:p.card, borderRadius:12, padding:20,
            border:`1px solid ${p.border}`,
            boxShadow: p._light ? '0 2px 12px rgba(0,20,60,0.14)' : 'none',
            ...extra }),
  gold:   { color:p.gold },
  sky:    { color:p.sky },
  green:  { color:p.green },
  red:    { color:p.red },
  muted:  { color:p.muted },
  btn: (bg, cl, op=1) => ({
    border:'none', borderRadius:8, padding:'10px 18px',
    cursor: op < 1 ? 'not-allowed' : 'pointer',
    fontWeight:700, fontSize:14, transition:'all 0.15s',
    background:bg, color:cl, opacity:op,
  }),
  sel: { width:'100%', padding:'10px 12px', background:p.input, color:p.text,
         border:`1px solid ${p.border2}`, borderRadius:8, fontSize:14, cursor:'pointer' },
  inp: { width:'100%', padding:'13px 16px', background:p.input2, color:p.text,
         border:`2px solid ${p.border2}`, borderRadius:10, fontSize:16, boxSizing:'border-box', outline:'none' },
  p,
})

const _initDark = (() => { try { return localStorage.getItem('mundial_theme') !== 'light' } catch { return true } })()
let C = makeC(_initDark ? PALETTES.dark : PALETTES.light)

function formatTimeAgo(dt) {
  if (!dt) return null
  const mins = Math.floor((new Date() - dt) / 60000)
  if (mins < 1) return 'przed chwilą'
  if (mins < 60) return `${mins} min temu`
  return `${Math.floor(mins / 60)}h ${mins % 60}m temu`
}

function formatCountdown(dt) {
  const diff = dt - new Date()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 48) return `${Math.floor(h / 24)} dni`
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function Toast({ msg }) {
  return (
    <div style={{
      position:'fixed', top:20, left:'50%', transform:'translateX(-50%)',
      background:C.p.card2, color:C.p.text, padding:'12px 24px', borderRadius:10,
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:9999, fontWeight:600, fontSize:14,
      border:`1px solid ${C.p.border2}`,
    }}>{msg}</div>
  )
}

function LockBadge({ lockTime }) {
  const locked = new Date() >= lockTime
  if (locked) return (
    <span style={{fontSize:11, background:C.p.redBg, color:C.p.redTx, borderRadius:4, padding:'2px 8px'}}>
      🔒 Zablokowane
    </span>
  )
  return (
    <span style={{fontSize:11, background:C.p.greenBg, color:C.p.greenTx, borderRadius:4, padding:'2px 8px'}}>
      🟢 {formatLockTime(lockTime)}
    </span>
  )
}

function KnockoutDeadlineBanner() {
  const locked = new Date() >= KNOCKOUT_LOCK_UTC
  if (locked) return (
    <div style={{background:C.p.redBg, border:`1px solid ${C.p.redTx}`, borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:13, color:C.p.redTx}}>
      🔒 Typowanie zostało zablokowane — termin minął ({formatLockTime(KNOCKOUT_LOCK_UTC)}).
    </div>
  )
  return (
    <div style={{background:C.p.greenBg, border:`1px solid ${C.p.greenTx}`, borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:13, color:C.p.greenTx}}>
      ⏰ Typowanie możliwe do: <strong>{formatLockTime(KNOCKOUT_LOCK_UTC)}</strong>
    </div>
  )
}

function ScoreInput({ val, onChange, locked }) {
  return (
    <input
      type="text" inputMode="numeric" maxLength={2}
      disabled={locked}
      value={val}
      onChange={e => onChange(e.target.value.replace(/\D/g,''))}
      style={{
        width:48, textAlign:'center', padding:'8px 2px',
        background: locked ? C.p.card3 : C.p.input,
        color: locked ? C.p.dim : C.p.text,
        border:`1.5px solid ${val !== '' ? '#d4a017' : C.p.border2}`,
        borderRadius:8, fontSize:18, fontWeight:700, outline:'none',
        cursor: locked ? 'not-allowed' : 'auto',
      }}
    />
  )
}

function getMatchPts(predData, key, actualScores) {
  const actual = actualScores?.[key]
  if (!actual || actual.h === '' || actual.a === '') return null
  const p = predData?.matchScores?.[key]
  if (!p || p.h === '' || p.a === '') return null
  const ah = +actual.h, aa = +actual.a, ph = +p.h, pa = +p.a
  if (ph === ah && pa === aa) return 4
  const ar = Math.sign(ah - aa), pr = Math.sign(ph - pa)
  if (ar === pr) return (ah - aa) === (ph - pa) ? 3 : 2
  return 0
}

function Flag({ team, size = 20 }) {
  const code = FLAG_CODES[team]
  if (!code) return <span>🏳️</span>
  // flagcdn.com obsługuje tylko w20/w40/w80 — skalujemy przez CSS
  const src = size <= 24
    ? `https://flagcdn.com/w20/${code}.png`
    : size <= 48
    ? `https://flagcdn.com/w40/${code}.png`
    : `https://flagcdn.com/w80/${code}.png`
  return (
    <img
      src={src}
      alt={team}
      width={size}
      style={{ verticalAlign: 'middle', display: 'inline-block', marginRight: 3 }}
    />
  )
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
function Tip({ text, children }) {
  return (
    <span style={{position:'relative', display:'inline-block'}}
      onMouseEnter={e => {
        const tip = e.currentTarget.querySelector('[data-tip]')
        if (tip) tip.style.opacity = '1'
      }}
      onMouseLeave={e => {
        const tip = e.currentTarget.querySelector('[data-tip]')
        if (tip) tip.style.opacity = '0'
      }}>
      {children}
      <span data-tip style={{
        position:'absolute', top:'calc(100% + 6px)', left:'50%',
        transform:'translateX(-50%)',
        background:'#1a2535', color:'#e8edf0', fontSize:11, fontWeight:500,
        padding:'5px 10px', borderRadius:6, whiteSpace:'nowrap',
        border:'1px solid #2a3f55', pointerEvents:'none',
        opacity:0, transition:'opacity 0.15s', zIndex:999,
      }}>
        <span style={{
          position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)',
          width:0, height:0,
          borderLeft:'5px solid transparent', borderRight:'5px solid transparent',
          borderBottom:'5px solid #2a3f55',
        }}/>
        {text}
      </span>
    </span>
  )
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function NavBar({ username, view, setView, onLogout, saved, onAdminClick, isDark, onToggleTheme, C: _C }) {
  const CC = _C || C
  return (
    <div style={CC.header}>
      <div>
        <h2 style={{...CC.gold, margin:0, fontSize:17}}>⚽ Mundial 2026 · Typer</h2>
        {username && (
          <p style={{...CC.muted, margin:0, fontSize:11}}>
            Cześć, <strong style={{color:'#d4a017'}}>{displayName(username)}</strong>
            {saved ? ' · ✅ Zapisano' : ''}
          </p>
        )}
      </div>
      <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
        {username && view !== 'predict' && (
          <Tip text="Moje typowanie">
            <button onClick={() => setView('predict')} style={CC.btn('#d4a017','#000')}>✏️ Typowanie</button>
          </Tip>
        )}
        {view !== 'leaderboard' && (
          <Tip text="Ranking uczestników">
            <button onClick={() => setView('leaderboard')} style={CC.btn(CC.p.card2,CC.p.text2)}>📊 Ranking</button>
          </Tip>
        )}
        {view !== 'schedule' && (
          <Tip text="Terminarz">
            <button onClick={() => setView('schedule')} style={CC.btn(CC.p.card2,CC.p.sky)}>📅 Terminarz</button>
          </Tip>
        )}
        {view !== 'rules' && (
          <Tip text="Zasady i punktacja">
            <button onClick={() => setView('rules')} style={CC.btn(CC.p.card2,CC.p.muted)}>ℹ️</button>
          </Tip>
        )}
        <Tip text="Admin">
          <button onClick={onAdminClick}
            style={CC.btn(view==='admin'?'#d4a017':CC.p.card2, view==='admin'?'#000':CC.p.muted)}>⚙️</button>
        </Tip>
        <Tip text={isDark ? 'Jasny tryb' : 'Ciemny tryb'}>
          <button onClick={onToggleTheme} style={CC.btn(CC.p.card2, isDark ? '#f0b429' : '#374555')}>
            {isDark ? '☀️' : '🌙'}
          </button>
        </Tip>
        <Tip text="Wyloguj się">
          <button onClick={onLogout} style={CC.btn(CC.p.card2,CC.p.muted)}>🚪</button>
        </Tip>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark]   = useState(_initDark)
  const toggleTheme = () => {
    setIsDark(d => {
      const next = !d
      // update module-level C so all components (incl. Toast etc.) pick up new theme
      // eslint-disable-next-line no-global-assign
      C = makeC(next ? PALETTES.dark : PALETTES.light)
      localStorage.setItem('mundial_theme', next ? 'dark' : 'light')
      return next
    })
  }

  const [view, setView]       = useState('login')
  const [username, setUser]   = useState('')
  const [nameInput, setName]  = useState('')
  const [pinInput, setPinInput]   = useState('')
  const [userPin, setUserPin]     = useState('')
  const [loginErr, setLoginErr]   = useState('')
  const [step, setStep]       = useState(0)
  const [pred, setPred]       = useState(EMPTY_PRED)
  const [allPreds, setAll]    = useState([])
  const [results, setResults] = useState(EMPTY_RESULTS)
  const [resultsDraft, setResultsDraft] = useState(EMPTY_RESULTS)
  const [adminStep, setAdminStep] = useState(0)
  const [adminGroup, setAdminGroup] = useState(GROUP_LETTERS[0])
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPinInput, setAdminPinInput]   = useState('')
  const [adminErr, setAdminErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [schedGroup, setSchedGroup] = useState(GROUP_LETTERS[0])
  const [schedTab, setSchedTab]     = useState('group')
  const [toast, setToast]     = useState('')
  const [matchGroup, setMatchGroup] = useState(
    () => GROUP_LETTERS.find(g => !isMatchLocked(g, 1)) || GROUP_LETTERS[0]
  )
  const [, tick] = useState(0)
  const [rankTab, setRankTab] = useState('summary')
  const [lastSync, setLastSync] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [scorers, setScorers] = useState([])

  useEffect(() => {
    const id = setInterval(() => tick(n => n+1), 60_000)
    return () => clearInterval(id)
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  // ── Supabase ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('predictions').select('*').order('updated_at', { ascending: false })
    if (!error && data) setAll(data)
  }, [])

  const loadResults = useCallback(async () => {
    const { data, error } = await supabase
      .from('results').select('*').eq('id', 'current').maybeSingle()
    if (!error && data?.data) {
      const r = {
        ...EMPTY_RESULTS,
        ...data.data,
        matchScores:   { ...EMPTY_RESULTS.matchScores,   ...(data.data.matchScores  || {}) },
        groupWinners:  { ...EMPTY_RESULTS.groupWinners,  ...(data.data.groupWinners || {}) },
        semifinalists: data.data.semifinalists || ['','','',''],
        koMatches:     { ...(data.data.koMatches || {}) },
      }
      setResults(r)
      setResultsDraft(r)
    }
  }, [])

  const fetchAndSyncResults = useCallback(async () => {
    try {
      const res = await fetch('/api/football')
      if (!res.ok) return
      const payload = await res.json()
      const matches = payload.matches || []

      // ── Mecze grupowe ─────────────────────────────────────────────────────
      const matchLookup = Object.fromEntries([
        ...Object.entries(MATCHES).flatMap(([g, ms]) =>
          ms.map(m => [`${m.home}|${m.away}`, { key: matchKey(g, m), rev: false }])
        ),
        ...Object.entries(MATCHES).flatMap(([g, ms]) =>
          ms.map(m => [`${m.away}|${m.home}`, { key: matchKey(g, m), rev: true }])
        ),
      ])

      const FINISHED_STATUSES = ['FINISHED', 'AWARDED']
      const NOT_STARTED_STATUSES = ['SCHEDULED', 'TIMED', 'CANCELLED', 'POSTPONED']
      const newScores = {}
      for (const m of matches) {
        const apiHome = EN_TO_PL[m.homeTeam?.name] || EN_TO_PL[m.homeTeam?.shortName] || EN_TO_PL[m.homeTeam?.tla] || ''
        const apiAway = EN_TO_PL[m.awayTeam?.name] || EN_TO_PL[m.awayTeam?.shortName] || EN_TO_PL[m.awayTeam?.tla] || ''
        if (!apiHome || !apiAway) continue
        const entry = matchLookup[`${apiHome}|${apiAway}`]
        if (!entry) continue
        if (NOT_STARTED_STATUSES.includes(m.status)) {
          // Mecz nie zaczęty — wyczyść błędnie zapisany wynik
          newScores[entry.key] = { h: '', a: '' }
          continue
        }
        const ft = m.score?.fullTime
        if (ft?.home == null || ft?.away == null) continue
        const h = entry.rev ? String(ft.away) : String(ft.home)
        const a = entry.rev ? String(ft.home) : String(ft.away)
        newScores[entry.key] = { h, a }
      }

      // ── Mecze pucharowe (KO) — auto z API ────────────────────────────────
      const API_STAGE_TO_ROUND = {
        'LAST_32':              'R32',
        'ROUND_OF_32':          'R32',
        'LAST_16':              'R16',
        'ROUND_OF_16':          'R16',
        'QUARTER_FINALS':       'QF',
        'QUARTER_FINAL':        'QF',
        'LAST_8':               'QF',
        'SEMI_FINALS':          'SF',
        'SEMI_FINAL':           'SF',
        'LAST_4':               'SF',
        'THIRD_PLACE':          '3RD',
        'THIRD_PLACE_PLAY_OFF': '3RD',
        'PLAY_OFF_3RD_PLACE':   '3RD',
        'FINAL':                'FINAL',
      }
      const { data: resRow } = await supabase.from('results').select('*').eq('id', 'current').maybeSingle()
      const current = resRow?.data || {}
      const existingKO = { ...(current.koMatches || {}) }
      const koUpdates  = {}

      const koStagesSeen = new Set()
      for (const m of matches) {
        if (m.stage !== 'GROUP_STAGE') koStagesSeen.add(m.stage)
        const round = API_STAGE_TO_ROUND[m.stage]
        if (!round) continue
        const apiHome = EN_TO_PL[m.homeTeam?.name] || EN_TO_PL[m.homeTeam?.shortName] || EN_TO_PL[m.homeTeam?.tla] || ''
        const apiAway = EN_TO_PL[m.awayTeam?.name] || EN_TO_PL[m.awayTeam?.shortName] || EN_TO_PL[m.awayTeam?.tla] || ''
        if (!apiHome || !apiAway) {
          console.log('[KO sync] unmapped team:', m.homeTeam?.name, 'vs', m.awayTeam?.name, 'stage:', m.stage)
          continue
        }
        const isFinishedKO = FINISHED_STATUSES.includes(m.status)

        const slots = KO_MATCH_SLOTS.filter(s => s.round === round)
        let slotId = null, rev = false

        // Szukaj istniejącego slotu z tą parą drużyn
        for (const slot of slots) {
          const ex = existingKO[slot.id]
          if (!ex?.home) continue
          if (ex.home === apiHome && ex.away === apiAway) { slotId = slot.id; break }
          if (ex.home === apiAway && ex.away === apiHome) { slotId = slot.id; rev = true; break }
        }
        // Jeśli nowy mecz — zajmij pierwszy wolny slot tej rundy
        if (!slotId) {
          for (const slot of slots) {
            if (!existingKO[slot.id]?.home && !koUpdates[slot.id]?.home) { slotId = slot.id; break }
          }
        }
        if (!slotId) continue

        const home = rev ? apiAway : apiHome
        const away = rev ? apiHome : apiAway

        // Wynik tylko dla zakończonych meczów
        let scoreH, scoreA, adv = existingKO[slotId]?.adv || ''
        if (isFinishedKO) {
          const ft = m.score?.regularTime ?? m.score?.fullTime
          if (ft?.home != null) { scoreH = String(rev ? ft.away : ft.home); scoreA = String(rev ? ft.home : ft.away) }
          if (m.score?.winner === 'HOME_TEAM') adv = home
          else if (m.score?.winner === 'AWAY_TEAM') adv = away
        }

        koUpdates[slotId] = {
          ...(existingKO[slotId] || {}),
          home, away,
          kickoff: m.utcDate || existingKO[slotId]?.kickoff || null,
          ...(scoreH !== undefined ? { scoreH, scoreA } : {}),
          ...(adv ? { adv } : {}),
        }
      }

      if (koStagesSeen.size > 0)
        console.log('[KO sync] stages in API (non-group):', [...koStagesSeen], '| koUpdates:', Object.keys(koUpdates).length)

      // Auto-oblicz zwycięzców grup na podstawie zakończonych meczów
      const combinedScores = { ...(current.matchScores || {}), ...newScores }
      const autoGroupWinners = {}
      for (const [g, ms] of Object.entries(MATCHES)) {
        const pts = {}, gd = {}, gf = {}
        let allDone = true
        for (const m of ms) {
          const sc = combinedScores[matchKey(g, m)]
          if (!sc || sc.h === '' || sc.a === '') { allDone = false; break }
          const h = parseInt(sc.h), a = parseInt(sc.a)
          if (!pts[m.home]) { pts[m.home] = 0; gd[m.home] = 0; gf[m.home] = 0 }
          if (!pts[m.away]) { pts[m.away] = 0; gd[m.away] = 0; gf[m.away] = 0 }
          gf[m.home] += h; gd[m.home] += h - a
          gf[m.away] += a; gd[m.away] += a - h
          if (h > a) pts[m.home] += 3
          else if (h < a) pts[m.away] += 3
          else { pts[m.home] += 1; pts[m.away] += 1 }
        }
        if (!allDone) continue
        const winner = Object.keys(pts).sort((a, b) =>
          pts[b] !== pts[a] ? pts[b] - pts[a] :
          gd[b] !== gd[a] ? gd[b] - gd[a] :
          gf[b] - gf[a]
        )[0]
        if (winner) autoGroupWinners[g] = winner
      }

      // Auto-wykrywanie półfinalistów, finalistów i mistrza z wyników KO
      const mergedKO = { ...existingKO, ...koUpdates }
      const autoKOBonuses = {}
      const sfAdvs = ['qf_1','qf_2','qf_3','qf_4'].map(id => mergedKO[id]?.adv || '').filter(Boolean)
      if (sfAdvs.length > 0) autoKOBonuses.semifinalists = sfAdvs
      const f1 = mergedKO['sf_1']?.adv || ''
      const f2 = mergedKO['sf_2']?.adv || ''
      if (f1) autoKOBonuses.finalist1 = f1
      if (f2) autoKOBonuses.finalist2 = f2
      const winnerAdv = mergedKO['final']?.adv || ''
      if (winnerAdv) autoKOBonuses.winner = winnerAdv

      setLastSync(new Date())

      // Zapisuj do Supabase TYLKO gdy coś faktycznie się zmieniło
      const currentScores = current.matchScores || {}
      const hasGroupChanges = Object.entries(newScores).some(([key, val]) => {
        const cur = currentScores[key]
        return !cur || cur.h !== val.h || cur.a !== val.a
      })
      const currentKO = current.koMatches || {}
      const hasKOChanges = Object.entries(koUpdates).some(([id, val]) => {
        const cur = currentKO[id]
        if (!cur) return true
        return cur.home !== val.home || cur.away !== val.away ||
               cur.scoreH !== val.scoreH || cur.scoreA !== val.scoreA ||
               cur.adv !== val.adv || cur.kickoff !== val.kickoff
      })
      const currentGW = current.groupWinners || {}
      const hasGWChanges = Object.entries(autoGroupWinners).some(([g, w]) => currentGW[g] !== w)
      const hasKOBonusChanges = (
        (autoKOBonuses.semifinalists && JSON.stringify(autoKOBonuses.semifinalists) !== JSON.stringify(current.semifinalists)) ||
        (autoKOBonuses.finalist1 && autoKOBonuses.finalist1 !== current.finalist1) ||
        (autoKOBonuses.finalist2 && autoKOBonuses.finalist2 !== current.finalist2) ||
        (autoKOBonuses.winner && autoKOBonuses.winner !== current.winner)
      )
      if (!hasGroupChanges && !hasKOChanges && !hasGWChanges && !hasKOBonusChanges) return

      const merged = {
        ...EMPTY_RESULTS, ...current,
        matchScores:  { ...EMPTY_RESULTS.matchScores, ...(current.matchScores || {}), ...newScores },
        koMatches:    { ...(current.koMatches || {}), ...koUpdates },
        groupWinners: { ...(current.groupWinners || {}), ...autoGroupWinners },
        ...(autoKOBonuses.semifinalists ? { semifinalists: autoKOBonuses.semifinalists } : {}),
        ...(autoKOBonuses.finalist1    ? { finalist1:     autoKOBonuses.finalist1    } : {}),
        ...(autoKOBonuses.finalist2    ? { finalist2:     autoKOBonuses.finalist2    } : {}),
        ...(autoKOBonuses.winner       ? { winner:        autoKOBonuses.winner       } : {}),
      }
      const { error } = await supabase.from('results').upsert(
        { id: 'current', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      if (!error) await loadResults()
      else console.error('Supabase upsert error:', error)
    } catch (e) {
      console.error('Football API sync error:', e)
    }
  }, [loadResults])

  useEffect(() => {
    fetchAndSyncResults()
    const id = setInterval(fetchAndSyncResults, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchAndSyncResults])

  useEffect(() => {
    const fetchScorers = async () => {
      try {
        const r = await fetch('/api/scorers')
        const d = await r.json()
        if (d.scorers) setScorers(d.scorers)
      } catch {}
    }
    fetchScorers()
    const id = setInterval(fetchScorers, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { loadAll(); loadResults() }, [loadAll, loadResults])

  // ── Przywróć sesję po odświeżeniu ────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('mundial_session')
    if (!saved) return
    try {
      const { name, pin } = JSON.parse(saved)
      supabase.from('predictions').select('*').eq('username', name).maybeSingle()
        .then(({ data }) => {
          if (data?.data) {
            const storedPin = data.data.pin
            if (storedPin && storedPin !== pin) { localStorage.removeItem('mundial_session'); return }
            setPred({
              ...EMPTY_PRED, ...data.data,
              groupWinners:   { ...EMPTY_PRED.groupWinners,   ...(data.data.groupWinners   || {}) },
              matchScores:    { ...EMPTY_PRED.matchScores,    ...(data.data.matchScores    || {}) },
              koMatchScores:  { ...(data.data.koMatchScores  || {}) },
            })
            setSaved(true)
          }
          setUserPin(pin); setUser(name); setView('predict')
        })
    } catch { localStorage.removeItem('mundial_session') }
  }, [])

  useEffect(() => {
    const ch = supabase.channel('pred-ch')
      .on('postgres_changes', { event:'*', schema:'public', table:'predictions' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadAll])

  useEffect(() => {
    const ch = supabase.channel('results-ch')
      .on('postgres_changes', { event:'*', schema:'public', table:'results' }, loadResults)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadResults])

  // ── Login / save ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const name = nameInput.trim()
    const pin  = pinInput.trim()
    setLoginErr('')
    if (!name) return
    if (!/^\d{4}$/.test(pin)) { setLoginErr('PIN musi mieć dokładnie 4 cyfry.'); return }
    setLoading(true)
    const { data } = await supabase
      .from('predictions').select('*').eq('username', name).maybeSingle()
    setLoading(false)
    if (data?.data) {
      const storedPin = data.data.pin
      if (storedPin && storedPin !== pin) { setLoginErr('Nieprawidłowy PIN. Spróbuj ponownie.'); return }
      setPred({
        ...EMPTY_PRED, ...data.data,
        groupWinners:   { ...EMPTY_PRED.groupWinners,   ...(data.data.groupWinners   || {}) },
        matchScores:    { ...EMPTY_PRED.matchScores,    ...(data.data.matchScores    || {}) },
        koMatchScores:  { ...(data.data.koMatchScores  || {}) },
      })
      setSaved(true)
    } else {
      setPred(EMPTY_PRED); setSaved(false)
    }
    setUserPin(pin); setUser(name); setStep(0); setView('predict')
    localStorage.setItem('mundial_session', JSON.stringify({ name, pin }))
  }

  const handleSave = async (redirectAfter = true) => {
    setLoading(true)
    const { error } = await supabase.from('predictions').upsert(
      { username, data: { ...pred, pin: userPin }, updated_at: new Date().toISOString() },
      { onConflict:'username' }
    )
    if (!error) {
      setSaved(true); showToast('✅ Typowanie zapisane!')
      await loadAll()
      if (redirectAfter) setTimeout(() => setView('leaderboard'), 800)
    } else {
      showToast('❌ Błąd zapisu – spróbuj ponownie.'); console.error(error)
    }
    setLoading(false)
  }

  const handleSaveResults = async () => {
    setLoading(true)
    const { error } = await supabase.from('results').upsert(
      { id: 'current', data: resultsDraft, updated_at: new Date().toISOString() },
      { onConflict:'id' }
    )
    if (!error) {
      showToast('✅ Wyniki zapisane!')
      await loadResults()
    } else {
      showToast('❌ Błąd zapisu wyników.'); console.error(error)
    }
    setLoading(false)
  }

  const logout = () => {
    localStorage.removeItem('mundial_session')
    setView('login'); setUser(''); setName(''); setPinInput(''); setUserPin('')
    setSaved(false); setPred(EMPTY_PRED); setLoginErr('')
  }

  // ── Admin unlock ──────────────────────────────────────────────────────────
  const handleAdminClick = () => {
    if (view === 'admin') { setView(username ? 'predict' : 'leaderboard'); return }
    setAdminPinInput(''); setAdminErr(''); setShowAdminModal(true)
  }
  const handleAdminPin = () => {
    if (adminPinInput === ADMIN_PIN) {
      setShowAdminModal(false); setAdminStep(0); setView('admin')
    } else {
      setAdminErr('Nieprawidłowy PIN admina.')
    }
  }

  // ── Prediction mutators ───────────────────────────────────────────────────
  const setGW  = (g, t)   => { if (!isGroupLocked(g)) setPred(p => ({ ...p, groupWinners: {...p.groupWinners,[g]:t} })) }
  const setSF  = (i, t)   => { if (!isKnockoutLocked()) { const sf=[...pred.semifinalists]; sf[i]=t; setPred(p=>({...p,semifinalists:sf})) } }
  const setKey = (k, v)   => { if (!isKnockoutLocked()) setPred(p => ({...p,[k]:v})) }
  const setMatchScore = (g, m, side, val) => {
    if (isMatchKickoffPassed(g, m)) return
    setSaved(false)
    const key = matchKey(g, m)
    const num = val.replace(/\D/g,'')
    setPred(p => ({ ...p, matchScores: { ...p.matchScores, [key]: { ...(p.matchScores?.[key]||{h:'',a:''}), [side]: num } } }))
  }

  // ── Results mutators (admin) ───────────────────────────────────────────────
  const setResMatchScore = (g, m, side, val) => {
    const key = matchKey(g, m)
    const num = val.replace(/\D/g,'')
    setResultsDraft(r => ({ ...r, matchScores: { ...r.matchScores, [key]: { ...(r.matchScores?.[key]||{h:'',a:''}), [side]: num } } }))
  }
  const setResGW  = (g, t)   => setResultsDraft(r => ({ ...r, groupWinners: {...r.groupWinners, [g]:t} }))
  const setResSF  = (i, t)   => { const sf=[...resultsDraft.semifinalists]; sf[i]=t; setResultsDraft(r=>({...r,semifinalists:sf})) }
  const setResKey = (k, v)   => setResultsDraft(r => ({...r, [k]:v}))
  const setResKO  = (id, field, val) =>
    setResultsDraft(r => ({ ...r, koMatches: { ...r.koMatches, [id]: { ...(r.koMatches?.[id] || {}), [field]: val } } }))

  // ── Pred mutators (user) ──────────────────────────────────────────────────
  const setKOScore = (id, field, val) => {
    const num = val.replace(/\D/g,'')
    setPred(p => ({ ...p, koMatchScores: { ...p.koMatchScores, [id]: { ...(p.koMatchScores?.[id]||{h:'',a:'',adv:''}), [field]: num } } }))
    setSaved(false)
  }
  const setKOAdv = (id, val) => {
    setPred(p => ({ ...p, koMatchScores: { ...p.koMatchScores, [id]: { ...(p.koMatchScores?.[id]||{h:'',a:'',adv:''}), adv: val } } }))
    setSaved(false)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const matchFilled       = Object.values(pred.matchScores||{}).filter(s=>s.h!==''&&s.a!=='').length
  const doneCount         = GROUP_LETTERS.filter(g=>pred.groupWinners[g]).length
  const semifinalistsDone = pred.semifinalists.every(Boolean) && pred.finalist1 && pred.finalist2
  const championDone      = !!(pred.winner && pred.topScorerCountry)
  const knockoutLocked    = isKnockoutLocked()

  const resultsEntered = Object.values(results.matchScores||{}).filter(s=>s.h!==''&&s.a!=='').length

  const scoredPreds = allPreds
    .map(p => ({ ...p, score: calcScore(p.data || {}, results) }))
    .sort((a,b) => b.score.total - a.score.total)

  const getGroupStandings = (g) => {
    const teams = GROUPS[g].map(t => ({ name: t, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, mp: 0 }))
    MATCHES[g].forEach(m => {
      const s = results.matchScores?.[matchKey(g, m)]
      if (!s || s.h === '' || s.a === '') return
      const h = parseInt(s.h), a = parseInt(s.a)
      const home = teams.find(t => t.name === m.home)
      const away = teams.find(t => t.name === m.away)
      if (!home || !away) return
      home.gf += h; home.ga += a; home.gd += h - a; home.mp++
      away.gf += a; away.ga += h; away.gd += a - h; away.mp++
      if (h > a) { home.pts += 3; home.w++; away.l++ }
      else if (h < a) { away.pts += 3; away.w++; home.l++ }
      else { home.pts++; home.d++; away.pts++; away.d++ }
    })
    return teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  }

  const calcMaxPts = (pData) => {
    let max = 0
    for (const [key, actual] of Object.entries(results.matchScores || {})) {
      if (actual.h !== '' && actual.a !== '') continue
      const p = pData?.matchScores?.[key]
      if (p && p.h !== '' && p.a !== '') max += 4
    }
    GROUP_LETTERS.forEach(g => {
      if (!results.groupWinners?.[g] && pData?.groupWinners?.[g]) max += 3
    })
    const actualSFs = (results.semifinalists || []).filter(Boolean)
    ;(pData?.semifinalists || []).filter(Boolean).forEach(sf => {
      if (!actualSFs.includes(sf)) max += 3
    })
    ;[pData?.finalist1, pData?.finalist2].forEach(f => {
      if (f && ![results.finalist1, results.finalist2].includes(f)) max += 5
    })
    if (!results.winner && pData?.winner) max += 10
    if (!results.topScorerCountry && pData?.topScorerCountry) max += 5
    // KO mecze — każdy nierozstrzygnięty slot z typem daje maks 5 pkt
    Object.entries(results.koMatches || {}).forEach(([id, km]) => {
      if (!km?.home || !km?.away) return
      const hasResult = km.scoreH !== '' && km.scoreH != null && km.scoreA !== '' && km.scoreA != null
      if (hasResult) return
      const predKO = pData?.koMatchScores?.[id]
      if (predKO && predKO.h !== '' && predKO.a !== '') max += 5
    })
    return max
  }

  const getNextLock = () => {
    const now = new Date()
    const candidates = [
      ...GROUP_LETTERS.flatMap(g =>
        MATCHES[g].map(m => ({ time: getMatchKickoff(g, m), label: `Gr.${g} ${m.home}` }))
      ),
      { time: KNOCKOUT_LOCK_UTC, label: 'Bonus' },
    ]
    return candidates.filter(l => l.time > now).sort((a, b) => a.time - b.time)[0] || null
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN PIN MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  const AdminModal = showAdminModal && (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
    }}>
      <div style={{background:C.p.card3, border:'2px solid #d4a017', borderRadius:16,
                   padding:'32px 28px', maxWidth:340, width:'90%', textAlign:'center'}}>
        <div style={{fontSize:36, marginBottom:8}}>⚙️</div>
        <h3 style={{...C.gold, margin:'0 0 6px'}}>Panel Wyników</h3>
        <p style={{...C.muted, fontSize:13, margin:'0 0 20px'}}>Wpisz PIN admina</p>
        <input
          style={{...C.inp, textAlign:'center', letterSpacing:10, fontSize:22}}
          type="text" inputMode="numeric" maxLength={4}
          value={adminPinInput}
          onChange={e => { setAdminPinInput(e.target.value.replace(/\D/g,'')); setAdminErr('') }}
          onKeyDown={e => e.key==='Enter' && handleAdminPin()}
          autoFocus
          placeholder="• • • •"
        />
        {adminErr && <p style={{...C.red, fontSize:13, margin:'8px 0 0'}}>{adminErr}</p>}
        <div style={{display:'flex', gap:10, marginTop:16}}>
          <button onClick={() => setShowAdminModal(false)}
            style={{...C.btn(C.p.card2,C.p.text2), flex:1}}>Anuluj</button>
          <button onClick={handleAdminPin}
            style={{...C.btn('#d4a017','#000'), flex:1}}>Wejdź</button>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════
  const loginReady = nameInput.trim() && /^\d{4}$/.test(pinInput.trim())

  if (view === 'login') return (
    <div style={{...C.page, display:'flex', alignItems:'center', justifyContent:'center',
                 background:'radial-gradient(ellipse at 50% 0%,#0f4015 0%,#0b0f13 70%)'}}>
      {toast && <Toast msg={toast}/>}
      {AdminModal}
      <div style={{background:C.p.card3, border:'2px solid #d4a017', borderRadius:20,
                   padding:'40px 36px', maxWidth:420, width:'90%', textAlign:'center',
                   boxShadow:'0 24px 80px rgba(0,0,0,0.8)'}}>
        <div style={{fontSize:52}}>⚽</div>
        <h1 style={{...C.gold, fontSize:25, margin:'10px 0 4px'}}>Mundial 2026 · Typer</h1>
        <p style={{...C.muted, margin:'0 0 4px', fontSize:13}}>🇺🇸 USA · 🇨🇦 Kanada · 🇲🇽 Meksyk</p>
        <p style={{...C.muted, margin:'0 0 20px', fontSize:12}}>11 czerwca – 19 lipca 2026 · 48 drużyn · 104 mecze</p>

        <div style={{background:'#1a2535', border:`1px solid ${C.p.border2}`, borderRadius:10,
                     padding:'12px 16px', marginBottom:20, textAlign:'left'}}>
          <p style={{margin:'0 0 6px', fontSize:13, color:C.p.text, fontWeight:600}}>👋 Jak dołączyć?</p>
          <ul style={{...C.muted, margin:0, paddingLeft:18, fontSize:12, lineHeight:1.8}}>
            <li>Wpisz swój <strong style={{color:C.p.text}}>nick</strong></li>
            <li>Wymyśl <strong style={{color:C.p.text}}>4-cyfrowy PIN</strong> — zapamiętaj go!</li>
            <li>Pierwsze wejście <strong style={{color:'#4ade80'}}>tworzy konto</strong></li>
            <li>Kolejne wejścia wymagają <strong style={{color:C.p.text}}>tego samego PINu</strong></li>
          </ul>
        </div>

        <div style={{textAlign:'left', marginBottom:10}}>
          <label style={{...C.muted, fontSize:12, display:'block', marginBottom:5}}>Nick / imię</label>
          <input style={C.inp} value={nameInput}
            onChange={e => { setName(e.target.value); setLoginErr('') }}
            onKeyDown={e => e.key==='Enter' && loginReady && !loading && handleLogin()}
            placeholder="np. Marek, KrólStrzelców..." autoFocus />
        </div>

        <div style={{textAlign:'left', marginBottom: loginErr ? 8 : 20}}>
          <label style={{...C.muted, fontSize:12, display:'block', marginBottom:5}}>PIN (4 cyfry)</label>
          <input style={{...C.inp, letterSpacing:12, fontSize:22, textAlign:'center'}}
            type="text" inputMode="numeric" maxLength={4}
            value={pinInput}
            onChange={e => { setPinInput(e.target.value.replace(/\D/g,'')); setLoginErr('') }}
            onKeyDown={e => e.key==='Enter' && loginReady && !loading && handleLogin()}
            placeholder="1234" />
        </div>

        {loginErr && (
          <div style={{background:'#2a1010', border:'1px solid #5a2020', borderRadius:8,
                       padding:'10px 14px', marginBottom:14, fontSize:13, color:'#f87171', textAlign:'left'}}>
            ❌ {loginErr}
          </div>
        )}

        <button onClick={handleLogin} disabled={!loginReady || loading}
          style={{...C.btn('#d4a017','#000', loginReady&&!loading?1:0.4),
                  width:'100%', fontSize:16, padding:'14px'}}>
          {loading ? 'Sprawdzam...' : 'Wejdź i typuj! →'}
        </button>

        <div style={{marginTop:18, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{...C.muted, fontSize:12}}>👥 {allPreds.length} {allPreds.length===1?'typowanie':'typowań'}</span>
          <div style={{display:'flex', gap:12}}>
            <button onClick={() => setView('leaderboard')}
              style={{...C.btn('transparent','#d4a017'), padding:'4px 0', fontSize:13, textDecoration:'underline'}}>
              Podgląd rankingu →
            </button>
            <button onClick={() => setView('rules')}
              style={{...C.btn('transparent','#6b7a8d'), padding:'4px 0', fontSize:13}}>Punktacja</button>
          </div>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // RULES
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'rules') return (
    <div style={C.page}>
      {AdminModal}
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick} isDark={isDark} onToggleTheme={toggleTheme} C={C}/>
      <div style={{maxWidth:560, margin:'40px auto', padding:'0 20px'}}>
        <h2 style={{...C.gold, marginBottom:20}}>📋 Zasady punktacji</h2>

        <div style={C.card({marginBottom:16})}>
          <h4 style={{...C.sky, margin:'0 0 12px'}}>⚽ Typowanie wyników meczów</h4>
          {SCORING_MATCHES.map(({label,pts}) => (
            <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'center',
                                     padding:'10px 0', borderBottom:`1px solid ${C.p.border}`}}>
              <span style={{fontSize:14}}>{label}</span>
              <span style={{...C.sky, fontWeight:800, fontSize:17}}>{pts} pkt</span>
            </div>
          ))}
          <div style={{...C.muted, fontSize:12, marginTop:10}}>
            Maks. za mecze: 72 × 4 = <strong style={{color:'#67d7f5'}}>288 pkt</strong>
          </div>
        </div>

        <div style={C.card({marginBottom:16, border:'1px solid #2a4020'})}>
          <h4 style={{...C.gold, margin:'0 0 12px'}}>🏆 Punkty bonusowe</h4>
          {SCORING_BONUS.map(({label,pts}) => (
            <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'center',
                                     padding:'10px 0', borderBottom:`1px solid ${C.p.border}`}}>
              <span style={{fontSize:14}}>{label}</span>
              <span style={{...C.gold, fontWeight:800, fontSize:17}}>{pts} pkt</span>
            </div>
          ))}
          <div style={{...C.muted, fontSize:12, marginTop:10}}>
            Maks. bonusy: 12×3 + 4×3 + 2×5 + 10 + 5 = <strong style={{color:'#f0b429'}}>73 pkt</strong>
          </div>
        </div>

        <div style={C.card({marginBottom:16, border:`1px solid ${C.p.border2}`})}>
          <h4 style={{margin:'0 0 12px', color:'#f0b429'}}>🗓️ Mecze fazy pucharowej (KO)</h4>
          {SCORING_KO.map(({label,pts},i) => (
            <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'center',
                                     padding:'10px 0', borderBottom:`1px solid ${C.p.border}`}}>
              <span style={{fontSize:13, color:C.p.text2}}>{label}</span>
              <span style={{fontWeight:800, fontSize:17,
                color: i===0?C.p.green : i===1?C.p.sky : i===2?C.p.gold : C.p.dim}}>
                {pts > 0 ? `+${pts} pkt` : '0 pkt'}
              </span>
            </div>
          ))}
          <div style={{...C.muted, fontSize:12, marginTop:10, lineHeight:1.6}}>
            Maks. za KO: 32 mecze × 5 = <strong style={{color:'#f0b429'}}>160 pkt</strong><br/>
            <span style={{fontSize:11}}>
              Wynik po czasie regulaminowym (90 min + czas doliczony). Dogrywka / karne → tylko pole <em>"kto awansuje"</em>.
            </span>
          </div>
        </div>

        <div style={{...C.card({marginBottom:16, border:'1px solid #3a5020', background: C.p._light ? C.p.card : '#111c0f'}), textAlign:'center'}}>
          <div style={{...C.muted, fontSize:13}}>Maksimum łącznie</div>
          <div style={{...C.gold, fontSize:32, fontWeight:900, marginTop:4}}>521 pkt</div>
          <div style={{...C.muted, fontSize:11, marginTop:6}}>288 (mecze gr.) + 73 (bonusy) + 160 (KO mecze)</div>
        </div>

        <div style={{...C.card({marginTop:16, border:`1px solid ${C.p.border2}`})}}>
          <h4 style={{...C.green, margin:'0 0 10px'}}>🔒 Blokady typowania</h4>
          <ul style={{...C.muted, fontSize:13, lineHeight:1.9, margin:0, paddingLeft:18}}>
            <li><strong style={{color:C.p.text}}>Mecze kolejka 1</strong> → z kickoffem 1. meczu grupy</li>
            <li><strong style={{color:C.p.text}}>Mecze kolejka 2</strong> → ~5 dni po starcie grupy</li>
            <li><strong style={{color:C.p.text}}>Mecze kolejka 3</strong> → ~10 dni po starcie grupy</li>
            <li><strong style={{color:C.p.text}}>Zwycięzca grupy</strong> → z kickoffem 1. meczu grupy</li>
            <li><strong style={{color:C.p.text}}>Bonus pucharowy / Mistrz</strong> → 12 czerwca 20:00 CEST</li>
            <li><strong style={{color:C.p.text}}>Mecze KO (wyniki)</strong> → każdy mecz blokuje się indywidualnie z kickoffem</li>
          </ul>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // LEADERBOARD / RANKING
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'leaderboard') {
    const TABS = [
      { id:'summary',  label:'📊 Tabela' },
      { id:'md1',      label:'1. kolejka' },
      { id:'md2',      label:'2. kolejka' },
      { id:'md3',      label:'3. kolejka' },
      { id:'r32',      label:'1/16' },
      { id:'r16',      label:'1/8' },
      { id:'qf',       label:'Ćwierćfinał' },
      { id:'sf',       label:'Półfinał' },
      { id:'third',    label:'3. miejsce' },
      { id:'final',    label:'Finał' },
      { id:'bonus',    label:'🏆 Bonus' },
      { id:'scorers',  label:'⚽ Strzelcy' },
    ]
    const ptsColor   = pts => pts===4?'#4ade80':pts===3?'#67d7f5':pts===2?'#f0b429':pts===0?'#f87171':'#6b7a8d'
    const ptsBg      = pts => pts===4?'rgba(74,222,128,0.15)':pts===3?'rgba(103,215,245,0.12)':pts===2?'rgba(240,180,41,0.12)':pts===0?'rgba(248,113,113,0.12)':'transparent'
    const koPtsColor = pts => pts===5?'#4ade80':pts===4?'#a3e635':pts===3?'#67d7f5':pts===2?'#f0b429':pts===0?'#f87171':'#6b7a8d'
    const koPtsBg    = pts => pts===5?'rgba(74,222,128,0.15)':pts===4?'rgba(163,230,53,0.13)':pts===3?'rgba(103,215,245,0.12)':pts===2?'rgba(240,180,41,0.12)':pts===0?'rgba(248,113,113,0.12)':'transparent'

    const getKOMatchPts = (predData, slotId, km) => {
      if (!km?.home || !km?.away) return null
      if (km.scoreH === '' || km.scoreH == null || km.scoreA === '' || km.scoreA == null) return null
      const predKO = predData?.koMatchScores?.[slotId]
      if (!predKO || predKO.h === '' || predKO.a === '') return null
      const ah = parseInt(km.scoreH), aa = parseInt(km.scoreA)
      const ph = parseInt(predKO.h),   pa = parseInt(predKO.a)
      const actualAdv = ah > aa ? km.home : aa > ah ? km.away : (km.adv || '')
      const predAdv   = ph > pa ? km.home : pa > ph ? km.away : (predKO.adv || '')
      const exactScore = ph===ah && pa===aa
      const sameDiff   = (ph-pa) === (ah-aa)
      const correctAdv = !!(actualAdv && predAdv && predAdv===actualAdv)
      if (exactScore && correctAdv)    return 5
      if (sameDiff   && correctAdv)    return 4
      if (exactScore)                  return 3
      if (correctAdv || sameDiff)      return 2
      return 0
    }

    // Matchday tab renderer
    const MdTab = ({ md }) => {
      const mdMatches = GROUP_LETTERS.flatMap(g =>
        MATCHES[g].filter(m => m.matchday === md).map(m => ({ ...m, group: g, key: matchKey(g, m) }))
      )
      return (
        <div style={{overflowX:'auto'}}>
          <table style={{borderCollapse:'collapse', fontSize:12, minWidth:'100%'}}>
            <thead>
              <tr style={{background:C.p.card2}}>
                <th style={{padding:'6px 8px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap', position:'sticky', left:0, background:C.p.card2, zIndex:2}}>Mecz</th>
                <th style={{padding:'6px 6px', textAlign:'center', color:C.p.muted, whiteSpace:'nowrap', fontSize:11}}>Wynik</th>
                {scoredPreds.map(p => (
                  <th key={p.username} style={{padding:'6px 5px', textAlign:'center', color: p.username===username?C.p.gold:C.p.text, whiteSpace:'nowrap', maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', fontSize:11}}>
                    {p.username===username&&!getUserEmoji(p.username)?'👤 ':''}{displayName(p.username)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mdMatches.map(m => {
                const actual = results.matchScores?.[m.key]
                const hasResult = actual?.h !== '' && actual?.a !== ''
                return (
                  <tr key={m.key} style={{borderTop:`1px solid ${C.p.border}`}}>
                    <td style={{padding:'5px 8px', whiteSpace:'nowrap', position:'sticky', left:0, background:C.p.card, zIndex:1}}>
                      <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:9,borderRadius:3,padding:'1px 4px',marginRight:4}}>{m.group}</span>
                      <Flag team={m.home} size={18}/>
                      <span style={{color:C.p.text2, fontSize:11, fontWeight:600, marginRight:4}}>{SHORT_NAMES[m.home]||m.home}</span>
                      <span style={{color:C.p.dim, fontSize:10, marginRight:4}}>-</span>
                      <Flag team={m.away} size={18}/>
                      <span style={{color:C.p.text2, fontSize:11, fontWeight:600}}>{SHORT_NAMES[m.away]||m.away}</span>
                    </td>
                    <td style={{padding:'7px 8px', textAlign:'center', fontWeight:700, color: hasResult?'#4ade80':'#4a5568', whiteSpace:'nowrap'}}>
                      {hasResult ? `${actual.h}:${actual.a}` : '—'}
                    </td>
                    {scoredPreds.map(p => {
                      const locked = isMatchKickoffPassed(m.group, m)
                      const isMe = p.username === username
                      const visible = locked || isMe
                      const pred = p.data?.matchScores?.[m.key]
                      const hasPred = !!(pred && pred.h !== '' && pred.a !== '')
                      const pts = getMatchPts(p.data, m.key, results.matchScores)
                      if (!visible) return (
                        <td key={p.username} style={{padding:'6px', textAlign:'center'}}>
                          <span style={{color:C.p.border2, fontSize:12}}>🔒</span>
                        </td>
                      )
                      return (
                        <td key={p.username} style={{padding:'6px', textAlign:'center', background: pts !== null ? ptsBg(pts) : 'transparent'}}>
                          {hasPred
                            ? <span style={{fontWeight:600, color: pts !== null ? ptsColor(pts) : '#6b7a8d', whiteSpace:'nowrap'}}>
                                {pred.h}:{pred.a}
                                {pts !== null && <span style={{fontSize:10, marginLeft:3, opacity:0.8}}>{pts>0?`+${pts}`:''}</span>}
                              </span>
                            : <span style={{color:C.p.border2}}>—</span>
                          }
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{borderTop:'2px solid #d4a017', background:C.p.card2}}>
                <td colSpan={2} style={{padding:'8px 10px', color:'#d4a017', fontWeight:700, fontSize:12}}>Suma kolejka {md}</td>
                {scoredPreds.map(p => {
                  const sum = mdMatches.reduce((acc, m) => acc + (getMatchPts(p.data, m.key, results.matchScores) ?? 0), 0)
                  return (
                    <td key={p.username} style={{padding:'8px 6px', textAlign:'center', fontWeight:800, fontSize:14, color: sum>0?'#4ade80':'#4a5568'}}>
                      {sum > 0 ? sum : '—'}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )
    }

    // Bonus tab
    const allMd3Locked = GROUP_LETTERS.every(g => isMatchLocked(g, 3))

    const bonusRows = [
      ...GROUP_LETTERS.map(g => ({
        label: `Gr. ${g} — zwycięzca`, pts: 3,
        getVal: d => d?.groupWinners?.[g],
        getActual: () => results.groupWinners?.[g],
        isCorrect: d => results.groupWinners?.[g] && d?.groupWinners?.[g] === results.groupWinners?.[g],
        isVisible: () => isMatchLocked(g, 3),
      })),
      { label: 'Półfinaliści (×4)', pts: 3,
        getVal: d => (d?.semifinalists||[]).filter(Boolean).join(', ') || null,
        getActual: () => (results.semifinalists||[]).filter(Boolean).join(', ') || null,
        isCorrect: () => null,
        isVisible: () => allMd3Locked,
      },
      { label: 'Finalista 1', pts: 5,
        getVal: d => d?.finalist1 || null,
        getActual: () => results.finalist1 || null,
        isCorrect: d => results.finalist1 && [d?.finalist1, d?.finalist2].includes(results.finalist1),
        isVisible: () => allMd3Locked,
      },
      { label: 'Finalista 2', pts: 5,
        getVal: d => d?.finalist2 || null,
        getActual: () => results.finalist2 || null,
        isCorrect: d => results.finalist2 && [d?.finalist1, d?.finalist2].includes(results.finalist2),
        isVisible: () => allMd3Locked,
      },
      { label: '🏆 Mistrz Świata', pts: 10,
        getVal: d => d?.winner || null,
        getActual: () => results.winner || null,
        isCorrect: d => results.winner && d?.winner === results.winner,
        isVisible: () => allMd3Locked,
      },
      { label: '⚽ Top strzelec (kraj)', pts: 5,
        getVal: d => d?.topScorerCountry || null,
        getActual: () => results.topScorerCountry || null,
        isCorrect: d => results.topScorerCountry && d?.topScorerCountry === results.topScorerCountry,
        isVisible: () => allMd3Locked,
      },
    ]

    const BonusTab = () => (
      <div style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'collapse', fontSize:12, minWidth:'100%'}}>
          <thead>
            <tr style={{background:C.p.card2}}>
              <th style={{padding:'8px 10px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap', position:'sticky', left:0, background:C.p.card2, zIndex:2}}>Pytanie</th>
              <th style={{padding:'8px 8px', textAlign:'center', color:C.p.muted, whiteSpace:'nowrap'}}>Pkt</th>
              <th style={{padding:'8px 8px', textAlign:'center', color:'#4ade80', whiteSpace:'nowrap'}}>Wynik</th>
              {scoredPreds.map(p => (
                <th key={p.username} style={{padding:'8px 6px', textAlign:'center', color: p.username===username?C.p.gold:C.p.text, whiteSpace:'nowrap'}}>
                  {p.username===username&&!getUserEmoji(p.username)?'👤 ':''}{displayName(p.username)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bonusRows.map((row, ri) => {
              const actual = row.getActual()
              return (
                <tr key={ri} style={{borderTop:`1px solid ${C.p.border}`}}>
                  <td style={{padding:'7px 10px', whiteSpace:'nowrap', position:'sticky', left:0, background:C.p.card, zIndex:1, color:C.p.text2}}>{row.label}</td>
                  <td style={{padding:'7px 8px', textAlign:'center', color:'#f0b429', fontWeight:700}}>{row.pts}</td>
                  <td style={{padding:'7px 8px', textAlign:'center', color:'#4ade80', fontWeight:600}}>{actual ? teamLabel(actual) : '—'}</td>
                  {scoredPreds.map(p => {
                    const isMe = p.username === username
                    const visible = isMe || row.isVisible()
                    if (!visible) return (
                      <td key={p.username} style={{padding:'6px', textAlign:'center'}}>
                        <span style={{color:C.p.border2, fontSize:12}}>🔒</span>
                      </td>
                    )
                    const val = row.getVal(p.data)
                    const correct = row.isCorrect(p.data)
                    return (
                      <td key={p.username} style={{padding:'6px', textAlign:'center',
                          background: correct===true?'rgba(74,222,128,0.15)':correct===false?'rgba(248,113,113,0.12)':'transparent'}}>
                        {val
                          ? <span style={{color: correct===true?C.p.green:correct===false?C.p.red:C.p.text2, fontWeight:600, fontSize:11}}>
                              {teamLabel(val)}{correct===true?' ✓':correct===false?' ✗':''}
                            </span>
                          : <span style={{color:C.p.border2}}>—</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )

    return (
    <div style={C.page}>
      {toast && <Toast msg={toast}/>}
      {AdminModal}
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick} isDark={isDark} onToggleTheme={toggleTheme} C={C}/>
      <div style={{maxWidth:1400, margin:'24px auto', padding:'0 16px'}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap'}}>
          <h2 style={{...C.gold, margin:0}}>📊 Ranking ({allPreds.length})</h2>
          {resultsEntered > 0 && (
            <span style={{fontSize:12, background:'#1a2e1a', color:'#4ade80', borderRadius:4, padding:'2px 8px'}}>
              ✅ {resultsEntered}/72 wyników
            </span>
          )}
          <span style={{fontSize:11, background:'#0d1e30', color:'#67d7f5', borderRadius:4, padding:'2px 8px', border:'1px solid #1a3a50'}}>
            🔄 wyniki z API · auto co 10 min{lastSync ? ` · ostatnio: ${formatTimeAgo(lastSync)}` : ''}
          </span>
          {(() => { const nl = getNextLock(); return nl && formatCountdown(nl.time) ? (
            <span style={{fontSize:11, background:'#1a1f10', color:'#d4a017', borderRadius:4, padding:'2px 8px', border:'1px solid #2a3a10'}}>
              ⏳ {nl.label}: {formatCountdown(nl.time)}
            </span>
          ) : null })()}
        </div>

        {/* Tab navigation */}
        <div style={{display:'flex', gap:4, marginBottom:16, flexWrap:'wrap'}}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setRankTab(t.id)} style={{
              padding:'8px 16px', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer',
              background: rankTab===t.id?'#d4a017':'#161d27',
              color: rankTab===t.id?'#000':'#6b7a8d',
              border: `1px solid ${rankTab===t.id?'#d4a017':C.p.border}`,
            }}>{t.label}</button>
          ))}
        </div>

        {scoredPreds.length === 0 ? (
          <div style={{...C.card(), textAlign:'center', padding:60}}>
            <div style={{fontSize:48}}>🏟️</div>
            <p style={{...C.muted, marginTop:12}}>Brak typowań — bądź pierwszy!</p>
          </div>
        ) : (<>

          {/* ── TABELA (summary) ─────────────────────────────── */}
          {rankTab === 'summary' && (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', background:C.p.card, borderRadius:14, overflow:'hidden', fontSize:13}}>
                <thead>
                  <tr style={{background:C.p.card2}}>
                    <th style={{padding:'12px 16px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap'}}>#</th>
                    <th style={{padding:'12px 12px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap'}}>Uczestnik</th>
                    <th style={{padding:'12px 10px', color:'#67d7f5', textAlign:'center', whiteSpace:'nowrap'}}>⚽ Mecze</th>
                    <th style={{padding:'12px 10px', color:'#f0b429', textAlign:'center', whiteSpace:'nowrap'}}>🏆 Bonus</th>
                    <th style={{padding:'12px 10px', color:'#4ade80', textAlign:'center', whiteSpace:'nowrap', background:'rgba(74,222,128,0.07)'}}>Razem</th>
                    <th style={{padding:'12px 6px', color:C.p.dim, textAlign:'center', whiteSpace:'nowrap', fontSize:11}}>max+</th>
                    {[1,2,3].map(md => (
                      <th key={md} style={{padding:'12px 8px', color:C.p.muted, textAlign:'center', fontSize:11}}>K{md}</th>
                    ))}
                    {GROUP_LETTERS.map(g => (
                      <th key={g} style={{padding:'12px 4px', color: isGroupLocked(g)?'#f87171':'#6b7a8d', textAlign:'center', fontSize:11, whiteSpace:'nowrap'}}>
                        {isGroupLocked(g)?'🔒':''}{g}
                      </th>
                    ))}
                    <th style={{padding:'12px 6px', color:C.p.muted, textAlign:'center', fontSize:11}}>⚔️</th>
                    <th style={{padding:'12px 8px', color:'#d4a017', textAlign:'center', fontSize:12}}>🏆</th>
                  </tr>
                </thead>
                <tbody>
                  {scoredPreds.map((p, i) => {
                    const isMe = p.username === username
                    const { matchPts, bonusPts, total } = p.score
                    const maxRemaining = calcMaxPts(p.data)
                    const mdPts = [1,2,3].map(md =>
                      GROUP_LETTERS.flatMap(g => MATCHES[g].filter(m => m.matchday===md).map(m => ({...m, key:matchKey(g,m)})))
                        .reduce((acc,m) => acc + (getMatchPts(p.data, m.key, results.matchScores) ?? 0), 0)
                    )
                    return (
                      <tr key={i} style={{borderTop:`1px solid ${C.p.border}`, background: isMe?'rgba(212,160,23,0.06)':'transparent'}}>
                        <td style={{padding:'10px 16px', fontWeight:800, color: i===0?'#f0b429':i===1?'#aab4be':i===2?'#cd7f32':'#6b7a8d', fontSize:15}}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}
                        </td>
                        <td style={{padding:'10px 12px', fontWeight:700, whiteSpace:'nowrap', color: isMe?C.p.gold:C.p.text}}>
                          {isMe&&!getUserEmoji(p.username)?'👤 ':''}{displayName(p.username)}
                          <div style={{...C.muted, fontSize:10, fontWeight:400}}>
                            {p.updated_at ? new Date(p.updated_at).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : ''}
                          </div>
                        </td>
                        <td style={{padding:'8px', textAlign:'center'}}>
                          <span style={{fontWeight:700, fontSize:14, color: matchPts>0?'#67d7f5':'#2a3f55'}}>{matchPts}</span>
                        </td>
                        <td style={{padding:'8px', textAlign:'center'}}>
                          <span style={{fontWeight:700, fontSize:14, color: bonusPts>0?'#f0b429':'#2a3f55'}}>{bonusPts}</span>
                        </td>
                        <td style={{padding:'8px 12px', textAlign:'center', background:'rgba(74,222,128,0.04)'}}>
                          <span style={{fontWeight:800, fontSize:16, color: total>0?'#4ade80':'#2a3f55'}}>{total}</span>
                        </td>
                        <td style={{padding:'8px 6px', textAlign:'center'}}>
                          {maxRemaining > 0
                            ? <span style={{fontSize:11, color:C.p.dim, fontWeight:600}}>+{maxRemaining}</span>
                            : <span style={{fontSize:11, color:C.p.border2}}>—</span>}
                        </td>
                        {mdPts.map((pts, mi) => (
                          <td key={mi} style={{padding:'8px', textAlign:'center'}}>
                            <span style={{fontSize:12, fontWeight:700, color: pts>0?'#67d7f5':'#2a3f55'}}>{pts>0?pts:'—'}</span>
                          </td>
                        ))}
                        {GROUP_LETTERS.map(g => {
                          const groupStarted = isGroupLocked(g)
                          const t = p.data?.groupWinners?.[g]
                          const correct = results.groupWinners?.[g] && t === results.groupWinners[g]
                          return (
                            <td key={g} style={{padding:'8px 3px', textAlign:'center'}}>
                              {!groupStarted ? (
                                t
                                  ? <span style={{color:C.p.border2, fontSize:14, fontWeight:700}}>?</span>
                                  : <span style={{color:C.p.border2}}>—</span>
                              ) : t ? (
                                <span style={{opacity: correct?1:0.5, display:'inline-flex', flexDirection:'column', alignItems:'center', gap:1}}>
                                  <Flag team={t} size={16}/>
                                  <span style={{fontSize:8, color: correct?'#4ade80':'#6b7a8d', maxWidth:32, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{teamLabel(t)}</span>
                                </span>
                              ) : <span style={{color:C.p.border2}}>—</span>}
                            </td>
                          )
                        })}
                        <td style={{padding:'8px', textAlign:'center', fontSize:14}}>
                          {(p.data?.semifinalists||[]).filter(Boolean).length > 0
                            ? (p.data?.semifinalists||[]).filter(Boolean).map((t,j) => <Flag key={j} team={t} size={16}/>)
                            : <span style={{color:C.p.border2}}>—</span>}
                        </td>
                        <td style={{padding:'8px 10px', textAlign:'center', fontWeight:700, color:'#f0b429', whiteSpace:'nowrap', fontSize:13}}>
                          {p.data?.winner ? <><Flag team={p.data.winner} size={16}/>{teamLabel(p.data.winner)}</> : <span style={{color:C.p.border2}}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── KOLEJKI GRUPOWE ─────────────────────────────── */}
          {rankTab === 'md1' && <MdTab md={1}/>}
          {rankTab === 'md2' && <MdTab md={2}/>}
          {rankTab === 'md3' && <MdTab md={3}/>}

          {/* ── FAZY PUCHAROWE r32/r16/qf/third — placeholder ── */}
          {['r32','r16','qf','sf','third','final'].includes(rankTab) && (() => {
            const roundMap = { r32:'R32', r16:'R16', qf:'QF', sf:'SF', third:'3RD', final:'FINAL' }
            const round = roundMap[rankTab]
            const slots = KO_MATCH_SLOTS.filter(s => s.round === round)
            const activeSlots = slots.filter(s => results.koMatches?.[s.id]?.home)

            if (activeSlots.length === 0) {
              const labels = { r32:'Runda 32', r16:'1/8 finału', qf:'Ćwierćfinały', sf:'Półfinały', third:'Mecz o 3. miejsce', final:'Finał' }
              const dates  = { r32:'29 cze – 2 lip', r16:'4–7 lip', qf:'9–11 lip', sf:'14–15 lip', third:'18 lip', final:'19 lip' }
              return (
                <div style={{...C.card({border:`1px solid ${C.p.border}`}), textAlign:'center', padding:'40px 20px'}}>
                  <div style={{fontSize:36, marginBottom:12}}>⚽</div>
                  <div style={{...C.gold, fontWeight:800, fontSize:18, marginBottom:6}}>{labels[rankTab]}</div>
                  <div style={{...C.muted, fontSize:13, marginBottom:8}}>{dates[rankTab]}</div>
                  <div style={{color:C.p.dim, fontSize:13}}>Mecze pojawią się automatycznie gdy API poda pary drużyn.</div>
                </div>
              )
            }

            return (
              <div style={{overflowX:'auto'}}>
                <table style={{borderCollapse:'collapse', fontSize:12, minWidth:'100%'}}>
                  <thead>
                    <tr style={{background:C.p.card2}}>
                      <th style={{padding:'6px 10px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap', position:'sticky', left:0, background:C.p.card2, zIndex:2}}>Mecz</th>
                      <th style={{padding:'6px 8px', textAlign:'center', color:C.p.muted, whiteSpace:'nowrap', fontSize:11}}>Wynik (90')</th>
                      {scoredPreds.map(p => (
                        <th key={p.username} style={{padding:'6px 5px', textAlign:'center', color: p.username===username?C.p.gold:C.p.text, whiteSpace:'nowrap', maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', fontSize:11}}>
                          {p.username===username&&!getUserEmoji(p.username)?'👤 ':''}{displayName(p.username)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSlots.map(slot => {
                      const km = results.koMatches[slot.id]
                      const hasResult = km.scoreH !== '' && km.scoreH != null && km.scoreA !== '' && km.scoreA != null
                      const locked = km.kickoff ? new Date() >= new Date(km.kickoff) : false
                      return (
                        <tr key={slot.id} style={{borderTop:`1px solid ${C.p.border}`}}>
                          <td style={{padding:'6px 10px', whiteSpace:'nowrap', position:'sticky', left:0, background:C.p.card, zIndex:1}}>
                            <div style={{display:'flex', alignItems:'center', gap:5, flexWrap:'wrap'}}>
                              <Flag team={km.home} size={16}/>
                              <span style={{color:C.p.text2, fontWeight:600, fontSize:11}}>{SHORT_NAMES[km.home]||km.home}</span>
                              <span style={{color:C.p.dim, fontSize:10}}>–</span>
                              <Flag team={km.away} size={16}/>
                              <span style={{color:C.p.text2, fontWeight:600, fontSize:11}}>{SHORT_NAMES[km.away]||km.away}</span>
                            </div>
                          </td>
                          <td style={{padding:'7px 8px', textAlign:'center', fontWeight:700, color: hasResult?C.p.green:C.p.dim, whiteSpace:'nowrap'}}>
                            {hasResult
                              ? <>{km.scoreH}:{km.scoreA}{km.adv && parseInt(km.scoreH)===parseInt(km.scoreA) ? <span style={{fontSize:10, color:C.p.sky, marginLeft:4}}>({SHORT_NAMES[km.adv]||km.adv})</span> : ''}</>
                              : '—'}
                          </td>
                          {scoredPreds.map(p => {
                            const isMe = p.username === username
                            const visible = locked || isMe
                            if (!visible) return (
                              <td key={p.username} style={{padding:'6px', textAlign:'center'}}>
                                <span style={{color:C.p.border2, fontSize:12}}>🔒</span>
                              </td>
                            )
                            const predKO = p.data?.koMatchScores?.[slot.id]
                            const hasPred = !!(predKO && predKO.h !== '' && predKO.a !== '')
                            const pts = getKOMatchPts(p.data, slot.id, km)
                            const isDrawPred = hasPred && predKO.h === predKO.a
                            return (
                              <td key={p.username} style={{padding:'6px', textAlign:'center', background: pts !== null ? koPtsBg(pts) : 'transparent'}}>
                                {hasPred
                                  ? <span style={{fontWeight:600, color: pts !== null ? koPtsColor(pts) : C.p.muted, whiteSpace:'nowrap', fontSize:11}}>
                                      {predKO.h}:{predKO.a}
                                      {isDrawPred && predKO.adv && <span style={{fontSize:9, color:C.p.sky, marginLeft:2}}>({SHORT_NAMES[predKO.adv]||predKO.adv})</span>}
                                      {pts !== null && <span style={{fontSize:9, marginLeft:3, opacity:0.85}}>{pts>0?`+${pts}`:''}</span>}
                                    </span>
                                  : <span style={{color:C.p.border2}}>—</span>
                                }
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                  {activeSlots.some(s => {
                    const km = results.koMatches[s.id]
                    return km.scoreH !== '' && km.scoreH != null
                  }) && (
                    <tfoot>
                      <tr style={{borderTop:`2px solid ${C.p.gold}`, background:C.p.card2}}>
                        <td colSpan={2} style={{padding:'8px 10px', color:C.p.gold, fontWeight:700, fontSize:12}}>Suma runda</td>
                        {scoredPreds.map(p => {
                          const sum = activeSlots.reduce((acc, slot) => acc + (getKOMatchPts(p.data, slot.id, results.koMatches[slot.id]) ?? 0), 0)
                          return (
                            <td key={p.username} style={{padding:'8px 6px', textAlign:'center', fontWeight:800, fontSize:14,
                              color: sum>0?C.p.green:C.p.dim}}>
                              {sum > 0 ? sum : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )
          })()}

          {/* ── PÓŁFINAŁ — typowania półfinalistów ───────────── */}
          {rankTab === 'sf' && (() => {
            const sfVisible = allMd3Locked
            return (
              <div style={{overflowX:'auto'}}>
                <div style={{...C.muted, fontSize:12, marginBottom:10}}>14–15 lipca 2026</div>
                <table style={{borderCollapse:'collapse', fontSize:12, minWidth:'100%'}}>
                  <thead>
                    <tr style={{background:C.p.card2}}>
                      <th style={{padding:'8px 10px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap', position:'sticky', left:0, background:C.p.card2, zIndex:2}}>Uczestnik</th>
                      {[1,2,3,4].map(i => (
                        <th key={i} style={{padding:'8px 10px', textAlign:'center', color:C.p.muted}}>Półfinalista #{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderTop:`1px solid ${C.p.border2}`, background:C.p.card3}}>
                      <td style={{padding:'7px 10px', position:'sticky', left:0, background:C.p.card3, zIndex:1, color:'#4ade80', fontWeight:700}}>✅ Wynik</td>
                      {[0,1,2,3].map(i => (
                        <td key={i} style={{padding:'7px 10px', textAlign:'center', color:'#4ade80', fontWeight:700}}>
                          {results.semifinalists?.[i] ? <><Flag team={results.semifinalists[i]} size={14}/> {results.semifinalists[i]}</> : '—'}
                        </td>
                      ))}
                    </tr>
                    {scoredPreds.map(p => {
                      const isMe = p.username === username
                      const visible = isMe || sfVisible
                      return (
                        <tr key={p.username} style={{borderTop:`1px solid ${C.p.border}`, background: isMe?'rgba(212,160,23,0.05)':'transparent'}}>
                          <td style={{padding:'7px 10px', position:'sticky', left:0, background: isMe?'rgba(212,160,23,0.05)':C.p.card, zIndex:1, fontWeight:700, color: isMe?C.p.gold:C.p.text, whiteSpace:'nowrap'}}>
                            {isMe&&!getUserEmoji(p.username)?'👤 ':''}{displayName(p.username)}
                          </td>
                          {[0,1,2,3].map(i => {
                            if (!visible) return <td key={i} style={{padding:'6px', textAlign:'center'}}><span style={{color:C.p.border2}}>🔒</span></td>
                            const sf = p.data?.semifinalists?.[i]
                            const actualSFs = (results.semifinalists||[]).filter(Boolean)
                            const correct = sf && actualSFs.length > 0 ? actualSFs.includes(sf) : null
                            return (
                              <td key={i} style={{padding:'7px 10px', textAlign:'center', background: correct===true?'rgba(74,222,128,0.12)':correct===false?'rgba(248,113,113,0.08)':'transparent'}}>
                                {sf ? <span style={{color: correct===true?C.p.green:correct===false?C.p.red:C.p.text2, fontWeight:600}}>
                                  <Flag team={sf} size={14}/> {sf}{correct===true?' ✓':correct===false?' ✗':''}
                                </span> : <span style={{color:C.p.border2}}>—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* ── FINAŁ — typowania finalistów/mistrza ─────────── */}
          {rankTab === 'final' && (() => {
            const fnVisible = allMd3Locked
            const finalRows = [
              { label: 'Finalista 1', getVal: d => d?.finalist1, actual: results.finalist1,
                isCorrect: d => results.finalist1 && [d?.finalist1, d?.finalist2].includes(results.finalist1) },
              { label: 'Finalista 2', getVal: d => d?.finalist2, actual: results.finalist2,
                isCorrect: d => results.finalist2 && [d?.finalist1, d?.finalist2].includes(results.finalist2) },
              { label: '🏆 Mistrz Świata', getVal: d => d?.winner, actual: results.winner,
                isCorrect: d => results.winner && d?.winner === results.winner },
              { label: '⚽ Top strzelec (kraj)', getVal: d => d?.topScorerCountry, actual: results.topScorerCountry,
                isCorrect: d => results.topScorerCountry && d?.topScorerCountry === results.topScorerCountry },
            ]
            return (
              <div style={{overflowX:'auto'}}>
                <div style={{...C.muted, fontSize:12, marginBottom:10}}>19 lipca 2026 · MetLife Stadium</div>
                <table style={{borderCollapse:'collapse', fontSize:12, minWidth:'100%'}}>
                  <thead>
                    <tr style={{background:C.p.card2}}>
                      <th style={{padding:'8px 10px', textAlign:'left', color:'#d4a017', position:'sticky', left:0, background:C.p.card2, zIndex:2}}>Pytanie</th>
                      <th style={{padding:'8px 10px', textAlign:'center', color:'#4ade80'}}>Wynik</th>
                      {scoredPreds.map(p => (
                        <th key={p.username} style={{padding:'8px 8px', textAlign:'center', color: p.username===username?C.p.gold:C.p.text, whiteSpace:'nowrap'}}>
                          {p.username===username&&!getUserEmoji(p.username)?'👤 ':''}{displayName(p.username)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finalRows.map((row, ri) => (
                      <tr key={ri} style={{borderTop:`1px solid ${C.p.border}`}}>
                        <td style={{padding:'7px 10px', position:'sticky', left:0, background:C.p.card, zIndex:1, color:C.p.text2, whiteSpace:'nowrap'}}>{row.label}</td>
                        <td style={{padding:'7px 10px', textAlign:'center', color:'#4ade80', fontWeight:700}}>
                          {row.actual ? <><Flag team={row.actual} size={14}/> {teamLabel(row.actual)}</> : '—'}
                        </td>
                        {scoredPreds.map(p => {
                          const isMe = p.username === username
                          const visible = isMe || fnVisible
                          if (!visible) return <td key={p.username} style={{padding:'6px', textAlign:'center'}}><span style={{color:C.p.border2}}>🔒</span></td>
                          const val = row.getVal(p.data)
                          const correct = row.isCorrect(p.data)
                          return (
                            <td key={p.username} style={{padding:'7px 8px', textAlign:'center', background: correct===true?'rgba(74,222,128,0.12)':correct===false?'rgba(248,113,113,0.08)':'transparent'}}>
                              {val ? <span style={{color: correct===true?C.p.green:correct===false?C.p.red:C.p.text2, fontWeight:600}}>
                                <Flag team={val} size={14}/> {teamLabel(val)}{correct===true?' ✓':correct===false?' ✗':''}
                              </span> : <span style={{color:C.p.border2}}>—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* ── BONUS ────────────────────────────────────────── */}
          {rankTab === 'bonus' && <BonusTab/>}

          {/* ── STRZELCY ─────────────────────────────────────── */}
          {rankTab === 'scorers' && (
            <div>
              <div style={{...C.card({border:`1px solid ${C.p.border}`}), marginBottom:16}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:8}}>
                  <h3 style={{...C.gold, margin:0}}>⚽ Klasyfikacja strzelców</h3>
                  <span style={{fontSize:11, color:C.p.dim}}>MŚ 2026 · aktualizacja co 10 min</span>
                </div>
                <div style={{fontSize:12, color:'#f0b429', background:'rgba(240,180,41,0.08)', border:'1px solid rgba(240,180,41,0.2)', borderRadius:6, padding:'7px 12px', marginBottom:14}}>
                  ⚠️ Dane strzelców mogą być opóźnione o kilka godzin względem meczu — dostawca API (football-data.org) aktualizuje je z opóźnieniem. Wszystko uzupełni się automatycznie.
                </div>
                {scorers.length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px 20px', color:C.p.dim}}>
                    <div style={{fontSize:36, marginBottom:12}}>⚽</div>
                    <div style={{fontSize:14}}>Dane pojawią się po starcie turnieju (12 czerwca 2026)</div>
                  </div>
                ) : (
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                      <thead>
                        <tr style={{borderBottom:`2px solid ${C.p.border}`}}>
                          <th style={{padding:'8px 6px', textAlign:'left', color:C.p.muted, fontWeight:600, width:36}}>#</th>
                          <th style={{padding:'8px 6px', textAlign:'left', color:C.p.muted, fontWeight:600}}>Zawodnik</th>
                          <th style={{padding:'8px 6px', textAlign:'left', color:C.p.muted, fontWeight:600}}>Kraj</th>
                          <th style={{padding:'8px 6px', textAlign:'center', color:'#4ade80', fontWeight:700}}>⚽ Gole</th>
                          <th style={{padding:'8px 6px', textAlign:'center', color:C.p.muted, fontWeight:600}}>Asysty</th>
                          <th style={{padding:'8px 6px', textAlign:'center', color:C.p.dim, fontWeight:600}}>Karne</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scorers.map((s, i) => {
                          const teamNameEn = s.team?.name || ''
                          const isLeader = i === 0
                          return (
                            <tr key={s.player?.id || i} style={{
                              borderBottom:`1px solid ${C.p.border}`,
                              background: isLeader ? 'rgba(212,160,23,0.08)' : i % 2 === 0 ? 'transparent' : `${C.p.card2}44`,
                            }}>
                              <td style={{padding:'10px 6px', color: isLeader ? '#d4a017' : C.p.dim, fontWeight: isLeader ? 800 : 400, textAlign:'center'}}>
                                {isLeader ? '🥇' : i + 1}
                              </td>
                              <td style={{padding:'10px 6px', color:C.p.text, fontWeight: isLeader ? 700 : 400}}>
                                {s.player?.name || '—'}
                              </td>
                              <td style={{padding:'10px 6px'}}>
                                <span style={{display:'flex', alignItems:'center', gap:6}}>
                                  <Flag team={teamNameEn} size={16}/>
                                  <span style={{color:C.p.text2, fontSize:12}}>{teamLabel(EN_TO_PL[teamNameEn] || teamNameEn)}</span>
                                </span>
                              </td>
                              <td style={{padding:'10px 6px', textAlign:'center'}}>
                                <span style={{
                                  background: isLeader ? 'rgba(74,222,128,0.2)' : 'rgba(74,222,128,0.08)',
                                  color:'#4ade80', fontWeight:800, borderRadius:6, padding:'2px 10px', fontSize:14,
                                }}>{s.goals ?? 0}</span>
                              </td>
                              <td style={{padding:'10px 6px', textAlign:'center', color:C.p.muted}}>{s.assists ?? 0}</td>
                              <td style={{padding:'10px 6px', textAlign:'center', color:C.p.dim, fontSize:12}}>{s.penalties ?? 0}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {scorers.length > 0 && (() => {
                const leader = scorers[0]
                const leaderCountry = EN_TO_PL[leader?.team?.name] || leader?.team?.name || ''
                const typers = allPreds.filter(p => p.data?.topScorerCountry === leaderCountry)
                return (
                  <div style={{...C.card({border:'1px solid rgba(74,222,128,0.3)', background:'rgba(74,222,128,0.05)'})}}>
                    <div style={{...C.gold, fontWeight:700, marginBottom:8}}>
                      🎯 Kto trafił kraj lidera strzelców?
                    </div>
                    <div style={{color:C.p.muted, fontSize:12, marginBottom:10}}>
                      Aktualny lider: <strong style={{color:'#4ade80'}}>{leader.player?.name}</strong> ({teamLabel(leaderCountry)}, {leader.goals ?? 0} goli)
                    </div>
                    {typers.length === 0 ? (
                      <div style={{color:C.p.dim, fontSize:13}}>Nikt jeszcze nie wytypował {teamLabel(leaderCountry)} jako kraj top strzelca.</div>
                    ) : (
                      <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                        {typers.map(p => (
                          <span key={p.name} style={{background:'rgba(74,222,128,0.15)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.3)', borderRadius:6, padding:'4px 10px', fontSize:13, fontWeight:600}}>
                            ✅ {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

        </>)}

        {/* ── LEGENDA ─────────────────────────────────────────── */}
        <div style={{marginTop:20, background:'#0c1219', border:'1px solid #1a2535', borderRadius:10, padding:'12px 16px'}}>
          <div style={{color:C.p.dim, fontSize:11, fontWeight:700, marginBottom:10, letterSpacing:1}}>LEGENDA KOLUMN</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'7px 20px'}}>
            {[
              ['⚽ Mecze',     'Punkty za typowane wyniki meczów grupowych (maks. 72 × 4 = 288 pkt)'],
              ['🏆 Bonus',     'Punkty za zwycięzców grup, półfinalistów, finalistów, mistrza i top strzelca'],
              ['Razem',        'Łączna suma punktów – główna kolumna rankingu'],
              ['max+',         'Ile pkt MOŻESZ jeszcze zdobyć z już wpisanych typowań (optymistyczny potencjał)'],
              ['K1 / K2 / K3', 'Punkty zdobyte w kolejce 1, 2 i 3 fazy grupowej'],
              ['🔒 A – L',     'Typowany zwycięzca danej grupy; 🔒 = blokada minęła, ? = jeszcze ukryte'],
              ['⚔️',           'Typowani półfinaliści (4 drużyny) — ujawniane po zakończeniu fazy grupowej'],
              ['🏆 (ostatnia)','Typowany Mistrz Świata'],
            ].map(([col, desc]) => (
              <div key={col} style={{display:'flex', gap:8, alignItems:'baseline'}}>
                <span style={{color:'#d4a017', fontWeight:700, fontSize:11, whiteSpace:'nowrap', flexShrink:0}}>{col}</span>
                <span style={{color:'#3a4a5a', fontSize:11, lineHeight:1.4}}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:10, paddingTop:10, borderTop:'1px solid #141c28', display:'flex', flexWrap:'wrap', gap:12}}>
            {[['4 pkt','dokładny wynik'], ['3 pkt','różnica bramek'], ['2 pkt','prawidłowy typ (W/R/P)'], ['0 pkt','błędny typ']].map(([pts, label]) => (
              <span key={pts} style={{fontSize:11, color:'#3a4a5a'}}>
                <span style={{
                  fontWeight:800, marginRight:4,
                  color: pts==='4 pkt'?'#4ade80':pts==='3 pkt'?'#67d7f5':pts==='2 pkt'?'#f0b429':'#f87171'
                }}>{pts}</span>{label}
              </span>
            ))}
          </div>
        </div>

        <p style={{...C.muted, fontSize:11, textAlign:'center', marginTop:16}}>
          Finał: MetLife Stadium, New Jersey · 19 lipca 2026 · Punkty naliczane na bieżąco po każdym meczu
        </p>
      </div>
    </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN – wprowadzanie wyników
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'admin') return (
    <div style={C.page}>
      {toast && <Toast msg={toast}/>}
      {AdminModal}
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick} isDark={isDark} onToggleTheme={toggleTheme} C={C}/>
      <div style={{maxWidth:1000, margin:'0 auto', padding:'20px 16px 40px'}}>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap'}}>
          <h2 style={{...C.gold, margin:0}}>⚙️ Panel wyników</h2>
          <span style={{...C.muted, fontSize:13}}>
            {Object.values(resultsDraft.matchScores||{}).filter(s=>s.h!==''&&s.a!=='').length}/72 meczów
          </span>
          <button onClick={() => { fetchAndSyncResults().then(() => showToast('🔄 Synchronizacja zakończona!')) }}
            disabled={loading}
            style={{...C.btn(C.p.card2,C.p.sky), fontSize:12, padding:'6px 14px', marginLeft:'auto', opacity: loading?0.6:1}}>
            🔄 Odśwież z API
          </button>
          <button onClick={async () => {
            setDebugInfo('loading')
            const r = await fetch('/api/football-debug')
            const d = await r.json()
            setDebugInfo(d)
          }} style={{...C.btn(C.p.card2,'#f0b429'), fontSize:12, padding:'6px 14px'}}>
            🔍 Debug API
          </button>
          {lastSync && (
            <span style={{fontSize:11, color:C.p.dim}}>sync: {formatTimeAgo(lastSync)}</span>
          )}
        </div>

        {/* Debug info panel */}
        {debugInfo && debugInfo !== 'loading' && (
          <div style={{background:C.p.card3, border:`1px solid ${C.p.border2}`, borderRadius:8, padding:'14px 16px', marginBottom:16, fontSize:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{color:'#f0b429', fontWeight:700}}>🔍 Diagnostyka API football-data.org</span>
              <button onClick={() => setDebugInfo(null)} style={{...C.btn(C.p.card2,C.p.muted), fontSize:11, padding:'2px 8px'}}>✕</button>
            </div>
            {debugInfo.apiError
              ? <div style={{color:'#f87171', fontWeight:700}}>❌ Błąd API: {debugInfo.apiError}</div>
              : <>
                  <div style={{color:'#4ade80'}}>✅ HTTP {debugInfo.httpStatus} · Turniej: {debugInfo.competitionName || '?'}</div>
                  <div style={{color:C.p.text, marginTop:4}}>Mecze z API: <strong>{debugInfo.totalMatches}</strong> · z wynikami: <strong style={{color: debugInfo.matchesWithScore>0?'#4ade80':'#f87171'}}>{debugInfo.matchesWithScore}</strong></div>
                  {debugInfo.matchesWithScore > 0 && (
                    <div style={{marginTop:8}}>
                      <div style={{color:C.p.muted, marginBottom:4}}>Przykładowe wyniki z API:</div>
                      {debugInfo.sample.map((s,i) => (
                        <div key={i} style={{color:C.p.text2}}>{s.home} {s.score?.home}:{s.score?.away} {s.away} <span style={{color:C.p.dim}}>({s.status})</span></div>
                      ))}
                    </div>
                  )}
                  {debugInfo.unmappedNames?.length > 0 && (
                    <div style={{marginTop:8}}>
                      <div style={{color:C.p.muted, marginBottom:2}}>Nazwy drużyn w API (sprawdź mapowanie):</div>
                      <div style={{color:C.p.dim, fontSize:11}}>{debugInfo.unmappedNames.join(', ')}</div>
                    </div>
                  )}
                </>
            }
          </div>
        )}
        {debugInfo === 'loading' && (
          <div style={{...C.muted, fontSize:12, marginBottom:12}}>⏳ Sprawdzam API...</div>
        )}

        {/* Admin tabs */}
        <div style={{display:'flex', gap:4, marginBottom:20, flexWrap:'wrap'}}>
          {['⚽ Mecze','🏆 Grupy','⚔️ Bonus','🥇 Mistrz','🗓️ KO mecze'].map((label,i) => (
            <button key={i} onClick={()=>setAdminStep(i)} style={{
              flex:1, minWidth:80, padding:'10px 4px',
              background: adminStep===i?'#d4a017':'#161d27',
              color: adminStep===i?'#000':'#6b7a8d',
              border:`1px solid ${adminStep===i?'#d4a017':C.p.border}`,
              borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:adminStep===i?700:500,
            }}>{label}</button>
          ))}
        </div>

        {/* ── ADMIN: MECZE ── */}
        {adminStep === 0 && (<>
          <div style={{display:'flex', gap:4, flexWrap:'wrap', marginBottom:14}}>
            {GROUP_LETTERS.map(g => {
              const gF = MATCHES[g].filter(m => {
                const s = resultsDraft.matchScores?.[matchKey(g,m)]
                return s?.h!==''&&s?.a!==''
              }).length
              return (
                <button key={g} onClick={()=>setAdminGroup(g)} style={{
                  padding:'5px 13px', position:'relative',
                  background: adminGroup===g?'#d4a017':C.p.card2,
                  color: adminGroup===g?'#000':C.p.text,
                  border:`1px solid ${adminGroup===g?'#d4a017':C.p.border2}`,
                  borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:13,
                }}>
                  {g}
                  {gF>0 && (
                    <span style={{fontSize:9,position:'absolute',top:-5,right:-5,
                      background:gF===6?'#4ade80':'#d4a017',color:'#000',borderRadius:8,padding:'1px 5px',fontWeight:800}}>
                      {gF}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div style={C.card()}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
              <span style={{background:'#d4a017', color:'#000', fontWeight:800, fontSize:14, borderRadius:6, padding:'3px 14px'}}>
                GRUPA {adminGroup}
              </span>
              <span style={{...C.muted, fontSize:12, marginLeft:'auto'}}>
                {MATCHES[adminGroup].filter(m=>{const s=resultsDraft.matchScores?.[matchKey(adminGroup,m)];return s?.h!==''&&s?.a!==''}).length}/6
              </span>
            </div>
            {[1,2,3].map(md => (
              <div key={md} style={{paddingTop:md>1?14:0, borderTop:md>1?`1px solid ${C.p.border}`:'none', marginBottom:4}}>
                <div style={{...C.muted, fontSize:12, fontWeight:600, marginBottom:8}}>Kolejka {md}</div>
                {MATCHES[adminGroup].filter(m=>m.matchday===md).map(m => {
                  const key = matchKey(adminGroup, m)
                  const score = resultsDraft.matchScores?.[key] || {h:'',a:''}
                  const filled = score.h!==''&&score.a!==''
                  return (
                    <div key={key} style={{
                      display:'grid', gridTemplateColumns:'1fr auto 1fr',
                      alignItems:'center', gap:10, padding:'9px 6px', marginBottom:4,
                      background: filled?'rgba(74,222,128,0.05)':'transparent',
                      border: filled?'1px solid rgba(74,222,128,0.2)':'1px solid transparent',
                      borderRadius:8,
                    }}>
                      <span style={{textAlign:'right', fontSize:14, color: filled?C.p.text:C.p.text2, fontWeight:filled?600:400}}>
                        <Flag team={m.home}/>{teamLabel(m.home)}
                      </span>
                      <div style={{display:'flex', alignItems:'center', gap:5}}>
                        <ScoreInput val={score.h} onChange={v=>setResMatchScore(adminGroup,m,'h',v)} locked={false}/>
                        <span style={{...C.muted, fontWeight:800, fontSize:18}}>:</span>
                        <ScoreInput val={score.a} onChange={v=>setResMatchScore(adminGroup,m,'a',v)} locked={false}/>
                      </div>
                      <span style={{textAlign:'left', fontSize:14, color: filled?C.p.text:C.p.text2, fontWeight:filled?600:400}}>
                        <Flag team={m.away}/>{teamLabel(m.away)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>)}

        {/* ── ADMIN: GRUPY ── */}
        {adminStep === 1 && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:12}}>
            {GROUP_LETTERS.map(g => (
              <div key={g} style={C.card({border: resultsDraft.groupWinners[g]?'1px solid #4ade80':`1px solid ${C.p.border}`})}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                  <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:13,borderRadius:6,padding:'2px 10px'}}>GR {g}</span>
                  {resultsDraft.groupWinners[g] && (
                    <span style={{...C.green, fontSize:12, fontWeight:600, marginLeft:'auto'}}>
                      <Flag team={resultsDraft.groupWinners[g]} size={16}/>{teamLabel(resultsDraft.groupWinners[g])}
                    </span>
                  )}
                </div>
                {GROUPS[g].map(team => (
                  <label key={team} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, cursor:'pointer',
                    background: resultsDraft.groupWinners[g]===team?'rgba(74,222,128,0.1)':'transparent', marginBottom:3,
                  }}>
                    <input type="radio" name={`rg${g}`} checked={resultsDraft.groupWinners[g]===team}
                      onChange={() => setResGW(g, team)}
                      style={{accentColor:'#4ade80', width:16, height:16}}/>
                    <span style={{color: resultsDraft.groupWinners[g]===team?C.p.green:C.p.text2, fontSize:14}}>
                      <Flag team={team}/>{teamLabel(team)}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── ADMIN: PUCHAR ── */}
        {adminStep === 2 && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
            <div style={C.card()}>
              <h4 style={{...C.gold, margin:'0 0 14px'}}>⚔️ Cztery półfinaliści</h4>
              {[0,1,2,3].map(i => (
                <div key={i} style={{marginBottom:12}}>
                  <label style={{...C.muted, fontSize:11, display:'block', marginBottom:4}}>Półfinalista #{i+1}</label>
                  <select value={resultsDraft.semifinalists[i]} onChange={e=>setResSF(i,e.target.value)} style={C.sel}>
                    <option value="">— wybierz —</option>
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{teamLabel(t)}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={C.card()}>
              <h4 style={{...C.gold, margin:'0 0 14px'}}>🎖️ Finaliści</h4>
              {['finalist1','finalist2'].map((k,i) => (
                <div key={k} style={{marginBottom:12}}>
                  <label style={{...C.muted, fontSize:11, display:'block', marginBottom:4}}>Finalista #{i+1}</label>
                  <select value={resultsDraft[k]} onChange={e=>setResKey(k,e.target.value)} style={C.sel}>
                    <option value="">— wybierz —</option>
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{teamLabel(t)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ADMIN: MISTRZ ── */}
        {adminStep === 3 && (
          <div style={{maxWidth:480, display:'flex', flexDirection:'column', gap:16}}>
            <div style={C.card({border:'1px solid #3a5020', background:'#111c0f'})}>
              <h4 style={{...C.gold, margin:'0 0 12px'}}>🏆 Mistrz Świata 2026</h4>
              <select value={resultsDraft.winner} onChange={e=>setResKey('winner',e.target.value)}
                style={{...C.sel, border:'1px solid #3a5020'}}>
                <option value="">— wybierz —</option>
                {ALL_TEAMS.map(t=><option key={t} value={t}>{teamLabel(t)}</option>)}
              </select>
            </div>
            <div style={C.card({border:'1px solid #0e3050', background:'#0b1520'})}>
              <h4 style={{...C.sky, margin:'0 0 12px'}}>⚽ Kraj najlepszego strzelca</h4>
              <select value={resultsDraft.topScorerCountry} onChange={e=>setResKey('topScorerCountry',e.target.value)}
                style={{...C.sel, border:'1px solid #0e3050'}}>
                <option value="">— wybierz —</option>
                {ALL_TEAMS.map(t=><option key={t} value={t}>{teamLabel(t)}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── ADMIN: KO MECZE ── */}
        {adminStep === 4 && (() => {
          const rounds = [...new Set(KO_MATCH_SLOTS.map(s => s.round))]
          return (
            <div>
              <p style={{...C.muted, fontSize:12, marginBottom:16}}>
                Aktywuj slot wpisując drużyny i kickoff. Wynik + awansujący wpisz po meczu.
                Typowania graczy blokują się automatycznie w momencie kickoffu.
              </p>
              {rounds.map(round => {
                const slots = KO_MATCH_SLOTS.filter(s => s.round === round)
                return (
                  <div key={round} style={{marginBottom:20}}>
                    <div style={{fontSize:11, fontWeight:800, color:C.p.gold, letterSpacing:1, marginBottom:8}}>
                      {slots[0].label.toUpperCase()}
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:8}}>
                      {slots.map(slot => {
                        const km = resultsDraft.koMatches?.[slot.id] || {}
                        const active = !!(km.home && km.away)
                        const hasResult = active && (km.scoreH !== '' && km.scoreH != null && km.scoreA !== '' && km.scoreA != null)
                        const isDrawResult = hasResult && parseInt(km.scoreH) === parseInt(km.scoreA)
                        return (
                          <div key={slot.id} style={{
                            ...C.card({padding:'12px 14px'}),
                            border: `1px solid ${active ? C.p.border2 : C.p.border}`,
                            opacity: 1,
                          }}>
                            <div style={{display:'grid', gridTemplateColumns:'auto 1fr 1fr auto', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                              <span style={{fontSize:11, fontWeight:800, color:C.p.gold, minWidth:36}}>#{slot.num}</span>
                              <input placeholder="Drużyna gospodarzy" value={km.home||''}
                                onChange={e=>setResKO(slot.id,'home',e.target.value)}
                                style={{...C.inp, fontSize:12, padding:'6px 8px'}}/>
                              <input placeholder="Drużyna gości" value={km.away||''}
                                onChange={e=>setResKO(slot.id,'away',e.target.value)}
                                style={{...C.inp, fontSize:12, padding:'6px 8px'}}/>
                              <input type="datetime-local" value={km.kickoff ? new Date(km.kickoff).toISOString().slice(0,16) : ''}
                                onChange={e=>setResKO(slot.id,'kickoff', e.target.value ? new Date(e.target.value).toISOString() : '')}
                                style={{...C.inp, fontSize:11, padding:'6px 8px'}}/>
                            </div>
                            {active && (
                              <div style={{display:'flex', alignItems:'center', gap:10, marginTop:8, flexWrap:'wrap'}}>
                                <span style={{...C.muted, fontSize:11}}>Wynik (90 min):</span>
                                <input value={km.scoreH??''} onChange={e=>setResKO(slot.id,'scoreH',e.target.value.replace(/\D/g,''))}
                                  placeholder="G" style={{...C.inp, width:44, textAlign:'center', fontSize:14, fontWeight:700, padding:'4px'}}/>
                                <span style={{...C.muted, fontWeight:800}}>:</span>
                                <input value={km.scoreA??''} onChange={e=>setResKO(slot.id,'scoreA',e.target.value.replace(/\D/g,''))}
                                  placeholder="G" style={{...C.inp, width:44, textAlign:'center', fontSize:14, fontWeight:700, padding:'4px'}}/>
                                {isDrawResult && <>
                                  <span style={{...C.muted, fontSize:11}}>Awansuje:</span>
                                  <select value={km.adv||''} onChange={e=>setResKO(slot.id,'adv',e.target.value)}
                                    style={{...C.sel, fontSize:12, padding:'4px 8px'}}>
                                    <option value="">— wybierz —</option>
                                    <option value={km.home}>{teamLabel(km.home)}</option>
                                    <option value={km.away}>{teamLabel(km.away)}</option>
                                  </select>
                                </>}
                                {hasResult && !isDrawResult && (
                                  <span style={{fontSize:11, color:C.p.green}}>
                                    ✓ Awansuje: {teamLabel(parseInt(km.scoreH) > parseInt(km.scoreA) ? km.home : km.away)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        <div style={{marginTop:24, display:'flex', justifyContent:'flex-end', gap:12}}>
          <button onClick={() => setView('leaderboard')} style={C.btn(C.p.card2,C.p.text2)}>
            Podgląd rankingu →
          </button>
          <button onClick={handleSaveResults} disabled={loading}
            style={{...C.btn('#00c850','#fff'), padding:'12px 32px', fontSize:15, opacity:loading?0.7:1}}>
            {loading ? 'Zapisuję...' : '💾 Zapisz wyniki'}
          </button>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // TERMINARZ
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'schedule') {
    const standings = getGroupStandings(schedGroup)
    const qualifyBg = (i) => i === 0 ? 'rgba(212,160,23,0.1)' : i === 1 ? 'rgba(103,215,245,0.07)' : 'transparent'
    const qualifyBorder = (i) => i === 0 ? '2px solid #d4a017' : i === 1 ? '1px solid #2a4a5a' : '1px solid transparent'

    const MatchCard = ({ g, m }) => {
      const key = matchKey(g, m)
      const score = results.matchScores?.[key]
      const played = score?.h !== '' && score?.a !== ''
      const kickoff = getMatchKickoff(g, m)
      const upcoming = kickoff > new Date()
      const dateStr = kickoff.toLocaleString('pl-PL', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Warsaw' })
      return (
        <div style={{
          background: played ? 'rgba(74,222,128,0.06)' : upcoming ? 'rgba(103,215,245,0.05)' : 'rgba(240,180,41,0.05)',
          border: `1px solid ${played ? 'rgba(74,222,128,0.2)' : upcoming ? 'rgba(103,215,245,0.15)' : 'rgba(240,180,41,0.15)'}`,
          borderRadius: 10, padding: '12px 14px', marginBottom: 8,
        }}>
          <div style={{fontSize:10, color:C.p.dim, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span>📅 {dateStr} CEST</span>
            <span style={{
              fontSize:10, fontWeight:700, borderRadius:4, padding:'1px 7px',
              background: played ? 'rgba(74,222,128,0.15)' : upcoming ? 'rgba(103,215,245,0.12)' : 'rgba(240,180,41,0.12)',
              color: played ? '#4ade80' : upcoming ? '#67d7f5' : '#f0b429',
            }}>
              {played ? '✅ Zakończony' : upcoming ? '⏳ Nadchodzący' : '🔴 W trakcie/oczekuje'}
            </span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:8}}>
            <div style={{textAlign:'right', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6}}>
              <span style={{fontSize:13, fontWeight:700, color:C.p.text}}>{teamLabel(m.home)}</span>
              <Flag team={m.home} size={22}/>
            </div>
            <div style={{textAlign:'center', minWidth:80}}>
              {played
                ? <span style={{fontSize:22, fontWeight:900, color:'#4ade80', letterSpacing:2}}>{score.h} : {score.a}</span>
                : <span style={{fontSize:14, color:C.p.dim, fontWeight:600}}>vs</span>
              }
            </div>
            <div style={{textAlign:'left', display:'flex', alignItems:'center', gap:6}}>
              <Flag team={m.away} size={22}/>
              <span style={{fontSize:13, fontWeight:700, color:C.p.text}}>{teamLabel(m.away)}</span>
            </div>
          </div>
        </div>
      )
    }

    // ── Bracket constants ──────────────────────────────────────────────────────
    const KO_SLOT = 72   // base slot height for 1 R32 match
    const KO_CH   = 58   // card height
    const KO_CW   = 192  // card width
    const KO_GAP  = 40   // connector area between columns
    const KO_STEP = KO_CW + KO_GAP

    const koY = (r, i) => {
      const slotH = KO_SLOT * Math.pow(2, r)
      return i * slotH + (slotH - KO_CH) / 2
    }
    const koX = (r) => r * KO_STEP
    const koTotalH = 16 * KO_SLOT
    const koTotalW = 5 * KO_STEP - KO_GAP

    const kmCard = (slotId) => {
      const km = results.koMatches?.[slotId]
      if (!km?.home) return { home: null, away: null, score: null, adv: null }
      const hasScore = km.scoreH !== '' && km.scoreH != null
      return { home: km.home, away: km.away, adv: km.adv || null,
        score: hasScore ? { h: km.scoreH, a: km.scoreA } : null }
    }
    // Zwycięzca slotu (null jeśli mecz nierozegrany)
    const slotAdv = (slotId) => {
      const km = results.koMatches?.[slotId]
      if (!km?.home || km.scoreH === '' || km.scoreH == null) return null
      const h = parseInt(km.scoreH), a = parseInt(km.scoreA)
      return h > a ? km.home : a > h ? km.away : (km.adv || null)
    }
    // Infer kolejna runda — zbierz WSZYSTKICH awansujących z poprzedniej rundy, rozdziel po kolei
    const inferRound = (slots, prevSlots) => {
      // Najpierw zbierz drużyny już przypisane przez API do slotów tej rundy
      const usedInActual = new Set()
      slots.forEach(slotId => {
        const actual = kmCard(slotId)
        if (actual.home) { usedInActual.add(actual.home); if (actual.away) usedInActual.add(actual.away) }
      })
      // Zbierz wszystkich awansujących z poprzedniej rundy, którzy nie są jeszcze w slotach API
      const allAdvancers = prevSlots.map(id => slotAdv(id)).filter(t => t && !usedInActual.has(t))
      let pendingIdx = 0
      return slots.map(slotId => {
        const actual = kmCard(slotId)
        if (actual.home) return actual
        const home = allAdvancers[pendingIdx++] || null
        const away = allAdvancers[pendingIdx++] || null
        if (!home && !away) return { home: null, away: null, score: null, adv: null }
        return { home, away, score: null, adv: null, inferred: true }
      })
    }
    const r32ids = Array.from({length:16}, (_,i) => `r32_${i+1}`)
    const r16ids = Array.from({length:8},  (_,i) => `r16_${i+1}`)
    const qfids  = Array.from({length:4},  (_,i) => `qf_${i+1}`)
    const r16 = inferRound(r16ids, r32ids)
    const qf  = inferRound(qfids, r16ids)
    const sf  = inferRound(['sf_1','sf_2'], qfids)
    const fin = inferRound(['final'], ['sf_1','sf_2'])
    const koRoundsData = [
      { label: '1/16 FINAŁU',  date: '28 cze – 3 lip',  matches: Array.from({length:16}, (_,i) => kmCard(`r32_${i+1}`)) },
      { label: '1/8 FINAŁU',   date: '4 – 7 lip',       matches: r16 },
      { label: 'ĆWIERĆFINAŁY', date: '9 – 12 lip',      matches: qf },
      { label: 'PÓŁFINAŁY',    date: '14 – 15 lip',      matches: sf },
      { label: 'FINAŁ',        date: '19 lip · MetLife', matches: fin },
    ]

    const BracketCard = ({ match, r, i }) => {
      const { home, away, score, adv, inferred } = match
      const played = score != null && score.h != null && score.a != null
      const isFinal = r === 4
      const advTeam = played
        ? (+score.h > +score.a ? home : +score.a > +score.h ? away : (adv || null))
        : null
      return (
        <div style={{
          position: 'absolute', left: koX(r), top: koY(r, i),
          width: KO_CW, height: KO_CH,
          background: played ? '#0d1a0d' : home || away ? '#161d27' : '#10161f',
          border: `1px solid ${played ? '#2a4020' : inferred ? '#1a3020' : home || away ? '#253647' : '#141c28'}`,
          borderRadius: 8, overflow: 'hidden',
          boxShadow: isFinal ? '0 0 0 1px #d4a017' : 'none',
          opacity: inferred ? 0.75 : 1,
        }}>
          {[{ team: home, side: 'h' }, { team: away, side: 'a' }].map(({ team, side }, ti) => {
            const s = played ? score[side] : null
            const won = played && advTeam === team
            return (
              <div key={ti} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '0 8px', height: KO_CH / 2,
                borderBottom: ti === 0 ? '1px solid #0d1520' : 'none',
                background: won ? 'rgba(74,222,128,0.1)' : 'transparent',
              }}>
                {team ? (
                  <>
                    <Flag team={team} size={14}/>
                    <span style={{ fontSize: 11, fontWeight: won ? 700 : 500, color: won ? C.p.text : C.p.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {SHORT_NAMES[team] || team}
                    </span>
                    {s !== null && <span style={{ fontSize: 14, fontWeight: 900, color: won ? '#4ade80' : '#6b7a8d', minWidth: 16, textAlign: 'right' }}>{s}</span>}
                  </>
                ) : (
                  <>
                    <span style={{ display:'inline-block', width:14, height:10, background:'#1a2535', border:`1px solid ${C.p.border}`, borderRadius:2, flexShrink:0 }}/>
                    <span style={{ fontSize:10, color:'#253040', flex:1 }}>—</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    const koConnectors = []
    for (let r = 0; r < 4; r++) {
      const count = koRoundsData[r].matches.length
      for (let i = 0; i < count; i += 2) {
        const midX = koX(r) + KO_CW + KO_GAP / 2
        koConnectors.push({
          x1: koX(r) + KO_CW, midX, x2: koX(r + 1),
          y1: koY(r, i) + KO_CH / 2,
          y2: koY(r, i + 1) + KO_CH / 2,
          yn: koY(r + 1, i / 2) + KO_CH / 2,
        })
      }
    }

    return (
      <div style={C.page}>
        {toast && <Toast msg={toast}/>}
        {AdminModal}
        <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick} isDark={isDark} onToggleTheme={toggleTheme} C={C}/>
        <div style={{maxWidth:1100, margin:'0 auto', padding:'20px 16px 40px'}}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap'}}>
            <h2 style={{...C.gold, margin:0}}>📅 Terminarz MŚ 2026</h2>
            <span style={{...C.muted, fontSize:13}}>11 cze – 19 lip 2026</span>
          </div>

          {/* Główne zakładki */}
          <div style={{display:'flex', gap:6, marginBottom:20, flexWrap:'wrap'}}>
            {[['upcoming','⏰ Najbliższe mecze'],['group','⚽ Faza grupowa'],['knockout','⚔️ Faza pucharowa']].map(([id,lab]) => (
              <button key={id} onClick={()=>setSchedTab(id)} style={{
                padding:'10px 20px', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer',
                background: schedTab===id ? '#d4a017' : C.p.card2,
                color: schedTab===id ? '#000' : C.p.muted,
                border: `1px solid ${schedTab===id ? '#d4a017' : C.p.border}`,
              }}>{lab}</button>
            ))}
          </div>

          {/* ── NAJBLIŻSZE MECZE ── */}
          {schedTab === 'upcoming' && (() => {
            const now = new Date()
            const window24 = new Date(now.getTime() + 24 * 60 * 60 * 1000)
            const recentCutoff = new Date(now.getTime() - 3 * 60 * 60 * 1000)

            // Mecze grupowe
            const groupItems = GROUP_LETTERS.flatMap(g =>
              MATCHES[g].map(m => {
                const kickoff = getMatchKickoff(g, m)
                const score = results.matchScores?.[matchKey(g, m)]
                const played = !!(score?.h !== '' && score?.a !== '')
                return { id: matchKey(g,m), label: `GR ${g} · K${m.matchday}`, kickoff,
                  home: m.home, away: m.away,
                  scoreH: score?.h ?? null, scoreA: score?.a ?? null, played }
              })
            ).filter(x => (x.kickoff >= recentCutoff && x.kickoff <= window24) || (x.played && x.kickoff >= recentCutoff))

            // Mecze pucharowe
            const koItems = Object.entries(results.koMatches || {})
              .filter(([, km]) => km?.home && km?.away && km?.kickoff)
              .map(([id, km]) => {
                const kickoff = new Date(km.kickoff)
                const played = km.scoreH !== '' && km.scoreH != null
                const slot = KO_MATCH_SLOTS.find(s => s.id === id)
                return { id, label: slot ? `${slot.label} #${slot.num}` : id, kickoff,
                  home: km.home, away: km.away,
                  scoreH: played ? km.scoreH : null, scoreA: played ? km.scoreA : null,
                  adv: km.adv || null, played }
              })
              .filter(x => (x.kickoff >= recentCutoff && x.kickoff <= window24) || (x.played && x.kickoff >= recentCutoff))

            const upcoming = [...groupItems, ...koItems].sort((a, b) => a.kickoff - b.kickoff)
            const finished = upcoming.filter(x => x.played)
            const live     = upcoming.filter(x => !x.played && x.kickoff <= now)
            const coming   = upcoming.filter(x => !x.played && x.kickoff > now)

            const UpcomingCard = ({ id, label, kickoff, home, away, scoreH, scoreA, adv, played }) => {
              const isLive = !played && kickoff <= now
              const dateStr = kickoff.toLocaleString('pl-PL', { weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Warsaw' })
              const advTeam = played && scoreH != null
                ? (+scoreH > +scoreA ? home : +scoreA > +scoreH ? away : (adv || null))
                : null
              return (
                <div style={{
                  background: played ? C.p.greenBg : isLive ? 'rgba(240,180,41,0.08)' : C.p.card,
                  border: `1px solid ${played ? C.p.green+'44' : isLive ? '#f0b429aa' : C.p.border}`,
                  borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{minWidth: 90, flexShrink: 0, textAlign: 'center'}}>
                    <div style={{fontSize: 11, fontWeight: 800, color: C.p.gold, letterSpacing: 0.5}}>{label}</div>
                    <div style={{fontSize: 12, color: C.p.muted, marginTop: 2}}>{dateStr}</div>
                    <div style={{marginTop: 4}}>
                      {played
                        ? <span style={{fontSize: 10, fontWeight: 700, color: C.p.green, background: C.p.greenBg, borderRadius: 4, padding: '1px 6px'}}>✅ Zakończony</span>
                        : isLive
                          ? <span style={{fontSize: 10, fontWeight: 700, color: '#f0b429', background: 'rgba(240,180,41,0.15)', borderRadius: 4, padding: '1px 6px'}}>🔴 W trakcie</span>
                          : <span style={{fontSize: 10, fontWeight: 700, color: C.p.sky, background: 'rgba(103,215,245,0.1)', borderRadius: 4, padding: '1px 6px'}}>⏳ Nadchodzący</span>
                      }
                    </div>
                  </div>
                  <div style={{flex: 1, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8}}>
                    <div style={{textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8}}>
                      <span style={{fontSize: 15, fontWeight: 700, color: advTeam===home?C.p.green:C.p.text}}>{teamLabel(home)}</span>
                      <Flag team={home} size={26}/>
                    </div>
                    <div style={{textAlign: 'center', minWidth: 80}}>
                      {played && scoreH != null
                        ? <><span style={{fontSize: 26, fontWeight: 900, color: C.p.green, letterSpacing: 3}}>{scoreH}:{scoreA}</span>
                           {adv && scoreH === scoreA && <div style={{fontSize:10, color:C.p.sky, marginTop:2}}>({teamLabel(adv)})</div>}</>
                        : <span style={{fontSize: 16, color: C.p.dim, fontWeight: 700}}>vs</span>
                      }
                    </div>
                    <div style={{textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8}}>
                      <Flag team={away} size={26}/>
                      <span style={{fontSize: 15, fontWeight: 700, color: advTeam===away?C.p.green:C.p.text}}>{teamLabel(away)}</span>
                    </div>
                  </div>
                </div>
              )
            }

            if (upcoming.length === 0) return (
              <div style={{...C.card(), textAlign: 'center', padding: 40}}>
                <div style={{fontSize: 32, marginBottom: 12}}>📭</div>
                <div style={{color: C.p.muted, fontSize: 15}}>Brak meczów w najbliższych 24 godzinach</div>
              </div>
            )

            return (
              <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                {live.length > 0 && <>
                  <div style={{fontSize: 11, fontWeight: 800, color: '#f0b429', letterSpacing: 1, marginTop: 4, marginBottom: 2}}>🔴 TRWAJĄCE</div>
                  {live.map(x => <UpcomingCard key={x.id} {...x}/>)}
                </>}
                {coming.length > 0 && <>
                  <div style={{fontSize: 11, fontWeight: 800, color: C.p.sky, letterSpacing: 1, marginTop: live.length ? 16 : 4, marginBottom: 2}}>⏳ NADCHODZĄCE (następne 24 h)</div>
                  {coming.map(x => <UpcomingCard key={x.id} {...x}/>)}
                </>}
                {finished.length > 0 && <>
                  <div style={{fontSize: 11, fontWeight: 800, color: C.p.green, letterSpacing: 1, marginTop: (live.length || coming.length) ? 16 : 4, marginBottom: 2}}>✅ ZAKOŃCZONE (ostatnie 3 h)</div>
                  {finished.map(x => <UpcomingCard key={x.id} {...x}/>)}
                </>}
              </div>
            )
          })()}

          {/* ── TOP 5 STRZELCÓW (w zakładce Najbliższe) ── */}
          {schedTab === 'upcoming' && scorers.length > 0 && (
            <div style={{marginTop:24}}>
              <div style={{fontSize:11, fontWeight:800, color:C.p.gold, letterSpacing:1, marginBottom:10}}>⚽ TOP STRZELCY TURNIEJU</div>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {scorers.slice(0,5).map((s, i) => {
                  const tEn = s.team?.name || ''
                  return (
                  <div key={s.player?.id || i} style={{
                    display:'flex', alignItems:'center', gap:10,
                    background: i===0 ? 'rgba(212,160,23,0.1)' : C.p.card,
                    border:`1px solid ${i===0 ? 'rgba(212,160,23,0.3)' : C.p.border}`,
                    borderRadius:10, padding:'10px 14px',
                  }}>
                    <span style={{fontSize:13, fontWeight:800, color:i===0?'#d4a017':C.p.dim, minWidth:22, textAlign:'center'}}>
                      {i===0?'🥇':i+1}
                    </span>
                    <Flag team={tEn} size={20}/>
                    <span style={{flex:1, fontSize:14, fontWeight:i===0?700:400, color:C.p.text}}>{s.player?.name||'—'}</span>
                    <span style={{fontSize:11, color:C.p.muted}}>{tEn}</span>
                    <span style={{
                      fontSize:15, fontWeight:900, color:'#4ade80',
                      background:'rgba(74,222,128,0.12)', borderRadius:6, padding:'2px 10px', minWidth:32, textAlign:'center',
                    }}>{s.goals ?? 0} ⚽</span>
                  </div>
                )})}

                <div style={{textAlign:'right', marginTop:4}}>
                  <button onClick={()=>setView('leaderboard')} style={{fontSize:11, color:C.p.sky, background:'transparent', border:'none', cursor:'pointer', textDecoration:'underline'}}>
                    Zobacz pełną klasyfikację →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── FAZA GRUPOWA ── */}
          {schedTab === 'group' && (
            <div style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:16, alignItems:'start'}}>
              {/* Lewa kolumna: wybór grupy */}
              <div>
                <div style={{...C.muted, fontSize:11, fontWeight:700, marginBottom:8, letterSpacing:1}}>GRUPY</div>
                <div style={{display:'flex', flexDirection:'column', gap:4}}>
                  {GROUP_LETTERS.map(g => {
                    const st = getGroupStandings(g)
                    const played = MATCHES[g].filter(m => {const s=results.matchScores?.[matchKey(g,m)];return s?.h!==''&&s?.a!==''}).length
                    return (
                      <button key={g} onClick={()=>setSchedGroup(g)} style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'8px 12px', borderRadius:8, cursor:'pointer', textAlign:'left',
                        background: schedGroup===g ? 'rgba(212,160,23,0.15)' : '#161d27',
                        border: `1px solid ${schedGroup===g ? '#d4a017' : C.p.border}`,
                      }}>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:11,borderRadius:4,padding:'1px 7px'}}>GR {g}</span>
                          <div>
                            {st.slice(0,2).map(t => (
                              <div key={t.name} style={{display:'flex', alignItems:'center', gap:3}}>
                                <Flag team={t.name} size={12}/>
                                <span style={{fontSize:10, color: schedGroup===g?C.p.text:C.p.muted}}>{SHORT_NAMES[t.name]||t.name}</span>
                                <span style={{fontSize:10, color:'#d4a017', fontWeight:700}}>{t.pts}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <span style={{fontSize:10, color:C.p.dim}}>{played}/6</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Prawa kolumna: tabela + mecze */}
              <div>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
                  <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:16,borderRadius:8,padding:'4px 16px'}}>GRUPA {schedGroup}</span>
                </div>

                {/* Tabela grupy */}
                <div style={{...C.card({marginBottom:16, padding:0, overflow:'hidden'})}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                      <tr style={{background:C.p.card2}}>
                        {['#','Drużyna','M','W','R','P','G+','G-','GD','Pkt'].map(h => (
                          <th key={h} style={{padding:'8px 8px', color: h==='Pkt'?'#d4a017':'#6b7a8d', textAlign: h==='Drużyna'?'left':'center', fontWeight:700, fontSize:11}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((t, i) => (
                        <tr key={t.name} style={{borderTop:`1px solid ${C.p.border}`, background:qualifyBg(i), borderLeft:qualifyBorder(i)}}>
                          <td style={{padding:'8px 8px', textAlign:'center', color: i===0?'#d4a017':i===1?'#67d7f5':'#6b7a8d', fontWeight:700}}>{i+1}</td>
                          <td style={{padding:'8px 8px', whiteSpace:'nowrap', fontWeight:600, color:C.p.text}}>
                            <Flag team={t.name} size={18}/>{t.name}
                          </td>
                          {[t.mp,t.w,t.d,t.l,t.gf,t.ga].map((v,vi) => (
                            <td key={vi} style={{padding:'8px 6px', textAlign:'center', color: vi===0?C.p.text2:C.p.muted}}>{v}</td>
                          ))}
                          <td style={{padding:'8px 6px', textAlign:'center', color: t.gd>0?'#4ade80':t.gd<0?'#f87171':'#6b7a8d', fontWeight:600}}>{t.gd>0?`+${t.gd}`:t.gd}</td>
                          <td style={{padding:'8px 8px', textAlign:'center', fontWeight:900, fontSize:15, color: t.pts>0?'#d4a017':'#4a5568'}}>{t.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{padding:'6px 12px', display:'flex', gap:16, borderTop:`1px solid ${C.p.border}`}}>
                    <span style={{fontSize:10, color:'#d4a017'}}>━ 1. miejsce</span>
                    <span style={{fontSize:10, color:'#67d7f5'}}>━ 2. miejsce</span>
                    <span style={{fontSize:10, color:C.p.dim}}>odpadają</span>
                  </div>
                </div>

                {/* Mecze grupowe */}
                {[1,2,3].map(md => (
                  <div key={md} style={{marginBottom:16}}>
                    <div style={{...C.muted, fontSize:12, fontWeight:700, marginBottom:8, display:'flex', alignItems:'center', gap:8}}>
                      <span>KOLEJKA {md}</span>
                      {isMatchLocked(schedGroup, md)
                        ? <span style={{fontSize:10, color:'#f87171', background:'rgba(248,113,113,0.1)', borderRadius:4, padding:'1px 6px'}}>🔒 Zablokowane</span>
                        : <span style={{fontSize:10, color:'#4ade80', background:'rgba(74,222,128,0.08)', borderRadius:4, padding:'1px 6px'}}>🟢 Otwarte</span>
                      }
                    </div>
                    {MATCHES[schedGroup].filter(m=>m.matchday===md).map(m => (
                      <MatchCard key={matchKey(schedGroup,m)} g={schedGroup} m={m}/>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FAZA PUCHAROWA — BRACKET ── */}
          {schedTab === 'knockout' && (
            <div style={{ overflowX: 'auto', paddingBottom: 24 }}>
              {/* Nagłówki rund */}
              <div style={{ display: 'flex', marginBottom: 14, minWidth: koTotalW }}>
                {koRoundsData.map((round, r) => (
                  <div key={r} style={{ width: r < 4 ? KO_STEP : KO_CW, flexShrink: 0 }}>
                    <div style={{ color: '#d4a017', fontWeight: 800, fontSize: 11, letterSpacing: 0.5 }}>{round.label}</div>
                    <div style={{ color: '#4a5568', fontSize: 10, marginTop: 2 }}>{round.date}</div>
                  </div>
                ))}
              </div>

              {/* Drabinka */}
              <div style={{ position: 'relative', width: koTotalW, height: koTotalH }}>
                <svg style={{ position: 'absolute', top: 0, left: 0, width: koTotalW, height: koTotalH, overflow: 'visible', pointerEvents: 'none' }}>
                  {koConnectors.map((c, ci) => (
                    <g key={ci}>
                      <line x1={c.x1} y1={c.y1} x2={c.midX} y2={c.y1} stroke="#1e2d3d" strokeWidth="1.5"/>
                      <line x1={c.x1} y1={c.y2} x2={c.midX} y2={c.y2} stroke="#1e2d3d" strokeWidth="1.5"/>
                      <line x1={c.midX} y1={c.y1} x2={c.midX} y2={c.y2} stroke="#1e2d3d" strokeWidth="1.5"/>
                      <line x1={c.midX} y1={c.yn} x2={c.x2} y2={c.yn} stroke="#1e2d3d" strokeWidth="1.5"/>
                    </g>
                  ))}
                </svg>
                {koRoundsData.map((round, r) =>
                  round.matches.map((match, i) => (
                    <BracketCard key={`${r}-${i}`} match={match} r={r} i={i}/>
                  ))
                )}
              </div>

              {/* Mecz o 3. miejsce */}
              <div style={{ marginTop: 28 }}>
                <div style={{ color: '#6b7a8d', fontWeight: 700, fontSize: 11, marginBottom: 6 }}>MECZ O 3. MIEJSCE &nbsp;·&nbsp; 18 lip · Miami Gardens</div>
                <div style={{ width: KO_CW, background: '#10161f', border: '1px solid #141c28', borderRadius: 8, overflow: 'hidden', height: KO_CH }}>
                  {[0, 1].map(ti => (
                    <div key={ti} style={{ display: 'flex', alignItems: 'center', padding: '0 8px', height: KO_CH / 2, borderBottom: ti === 0 ? '1px solid #0d1520' : 'none' }}>
                      <span style={{ fontSize: 10, color: '#1e2d3d' }}>TBD</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mistrz */}
              {results.winner && (
                <div style={{ marginTop: 24, background: 'rgba(212,160,23,0.08)', border: '2px solid #d4a017', borderRadius: 12, padding: '16px 24px', display: 'inline-flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 32 }}>🏆</span>
                  <div>
                    <div style={{ color: '#6b7a8d', fontSize: 11, marginBottom: 4 }}>Mistrz Świata 2026</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Flag team={results.winner} size={28}/>
                      <span style={{ color: '#f0b429', fontWeight: 900, fontSize: 20 }}>{teamLabel(results.winner)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREDICT – 5 kroków
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={C.page}>
      {toast && <Toast msg={toast}/>}
      {AdminModal}
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick} isDark={isDark} onToggleTheme={toggleTheme} C={C}/>

      <div style={{maxWidth:1000, margin:'0 auto', padding:'20px 16px 40px'}}>

        {(() => { const nl = getNextLock(); const cd = nl && formatCountdown(nl.time); return cd ? (
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14, background:'#0f1a0a', border:'1px solid #2a3a10', borderRadius:8, padding:'8px 14px'}}>
            <span style={{fontSize:13}}>⏳</span>
            <span style={{fontSize:13, color:'#d4a017', fontWeight:600}}>Następna blokada:</span>
            <span style={{fontSize:13, color:C.p.text, fontWeight:700}}>{nl.label}</span>
            <span style={{fontSize:13, color:'#4ade80', fontWeight:800, marginLeft:4}}>za {cd}</span>
          </div>
        ) : null })()}

        <div style={{display:'flex', gap:4, marginBottom:24}}>
          {[
            {icon:'⚽', label:'Mecze',  ok: matchFilled > 0},
            {icon:'🏆', label:'Grupy',  ok: doneCount > 0},
            {icon:'⚔️', label:'Bonus',  ok: semifinalistsDone},
            {icon:'🗓️', label:'KO', sub:'Faza pucharowa', ok: Object.keys(pred.koMatchScores||{}).some(k=>{const s=pred.koMatchScores[k];return s?.h!==''&&s?.a!==''})},
            {icon:'🥇', label:'Mistrz', ok: championDone},
            {icon:'📋', label:'Zapis',  ok: false},
          ].map(({icon,label,sub,ok},i) => (
            <button key={i} onClick={()=>setStep(i)} style={{
              flex:1, minWidth:0, padding:'8px 4px',
              background: step===i?'#d4a017':ok?C.p.greenBg:C.p.card2,
              color: step===i?'#000':ok?C.p.green:C.p.muted,
              border:`1px solid ${step===i?'#d4a017':ok?C.p.border2:C.p.border}`,
              borderRadius:8, cursor:'pointer', fontWeight:step===i?700:500,
              display:'flex', flexDirection:'column', alignItems:'center', gap:1,
            }}>
              <span style={{fontSize:13}}>{icon} {label}{ok&&step!==i?' ✓':''}</span>
              {sub && <span style={{fontSize:9, opacity:0.7, fontWeight:400}}>{sub}</span>}
            </button>
          ))}
        </div>

        {/* ── KROK 0: MECZE ─────────────────────────────────────────────── */}
        {step === 0 && (<>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
            <h3 style={{margin:0}}>⚽ Wyniki meczów grupowych</h3>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <span style={{...C.muted, fontSize:13}}>{matchFilled}/72{matchFilled===72&&<span style={C.gold}> ✓</span>}</span>
              <button onClick={() => handleSave(false)} disabled={loading}
                style={{
                  padding:'8px 18px', borderRadius:8, fontWeight:700, fontSize:13,
                  cursor: loading ? 'default' : 'pointer',
                  border: '2px solid #00c850',
                  background: '#00c850',
                  color: '#000',
                  opacity: loading ? 0.7 : 1,
                  whiteSpace:'nowrap',
                }}>
                {loading ? 'Zapisuję...' : '💾 Zapisz typy'}
              </button>
            </div>
          </div>

          <div style={{display:'flex', gap:4, flexWrap:'wrap', marginBottom:14}}>
            {GROUP_LETTERS.map(g => {
              const gFilled = MATCHES[g].filter(m=>{const s=pred.matchScores?.[matchKey(g,m)];return s?.h!==''&&s?.a!==''}).length
              const allLocked = [1,2,3].every(md=>isMatchLocked(g,md))
              return (
                <button key={g} onClick={()=>setMatchGroup(g)} style={{
                  padding:'5px 13px', position:'relative',
                  background: matchGroup===g?'#d4a017':allLocked?C.p.redBg:C.p.card2,
                  color: matchGroup===g?'#000':allLocked?C.p.red:C.p.text,
                  border:'1px solid '+(matchGroup===g?'#d4a017':allLocked?C.p.redBg:C.p.border2),
                  borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:13,
                }}>
                  {g}
                  {gFilled>0&&<span style={{fontSize:9,position:'absolute',top:-5,right:-5,background:gFilled===6?'#4ade80':'#d4a017',color:'#000',borderRadius:8,padding:'1px 5px',fontWeight:800}}>{gFilled}</span>}
                </button>
              )
            })}
          </div>

          <div style={C.card()}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
              <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:14,borderRadius:6,padding:'3px 14px'}}>GRUPA {matchGroup}</span>
              <span style={{...C.muted, fontSize:12, marginLeft:'auto'}}>
                {MATCHES[matchGroup].filter(m=>{const s=pred.matchScores?.[matchKey(matchGroup,m)];return s?.h!==''&&s?.a!==''}).length}/6
              </span>
            </div>
            {[1,2,3].map(md => (
              <div key={md} style={{paddingTop:md>1?14:0,borderTop:md>1?`1px solid ${C.p.border}`:'none',marginBottom:4}}>
                <div style={{...C.muted, fontSize:12, fontWeight:600, marginBottom:10}}>Kolejka {md}</div>
                {MATCHES[matchGroup].filter(m=>m.matchday===md).map(m => {
                  const key   = matchKey(matchGroup, m)
                  const score = pred.matchScores?.[key]||{h:'',a:''}
                  const actual= results.matchScores?.[key]
                  const filled = score.h!==''&&score.a!==''
                  const hasResult = actual?.h!==''&&actual?.a!==''
                  const matchLocked = isMatchKickoffPassed(matchGroup, m)
                  const kickoff = getMatchKickoff(matchGroup, m)
                  let pts = null
                  if (hasResult && filled) {
                    const s = calcScore({matchScores:{[key]:score}},{matchScores:{[key]:actual}})
                    pts = s.matchPts
                  }
                  return (
                    <div key={key} style={{
                      display:'grid', gridTemplateColumns:'1fr auto 1fr',
                      alignItems:'center', gap:10, padding:'9px 6px', marginBottom:4,
                      background: filled?'rgba(212,160,23,0.05)':'transparent',
                      border: filled?'1px solid rgba(212,160,23,0.2)':'1px solid transparent',
                      borderRadius:8,
                    }}>
                      <span style={{textAlign:'right',fontSize:14,color:filled?C.p.text:matchLocked?C.p.dim:C.p.text2,fontWeight:filled?600:400}}>
                        <Flag team={m.home}/>{teamLabel(m.home)}
                      </span>
                      <div style={{display:'flex', alignItems:'center', gap:5, flexDirection:'column'}}>
                        <span style={{
                          fontSize:10, fontWeight:600,
                          color: matchLocked ? '#f87171' : '#4ade80',
                          background: matchLocked ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.08)',
                          borderRadius:4, padding:'2px 7px', whiteSpace:'nowrap',
                        }}>
                          {matchLocked ? '🔒 Zablokowane' : `📅 ${formatLockTime(kickoff)}`}
                        </span>
                        <div style={{display:'flex', alignItems:'center', gap:5}}>
                          <ScoreInput val={score.h} onChange={v=>setMatchScore(matchGroup,m,'h',v)} locked={matchLocked}/>
                          <span style={{...C.muted, fontWeight:800, fontSize:18}}>:</span>
                          <ScoreInput val={score.a} onChange={v=>setMatchScore(matchGroup,m,'a',v)} locked={matchLocked}/>
                        </div>
                        {hasResult && (
                          <div style={{display:'flex', alignItems:'center', gap:6, marginTop:2}}>
                            <span style={{fontSize:10, color:C.p.dim, fontWeight:500}}>wynik</span>
                            <span style={{
                              fontSize:15, fontWeight:800,
                              color: pts===4?'#4ade80': pts===3?'#67d7f5': pts===2?'#f0b429': pts===0?'#f87171':C.p.text2,
                              background: pts===4?'rgba(74,222,128,0.12)': pts===3?'rgba(103,215,245,0.12)': pts===2?'rgba(240,180,41,0.12)': pts===0?'rgba(248,113,113,0.12)':C.p.card3,
                              borderRadius:6, padding:'2px 8px',
                            }}>
                              {actual.h}:{actual.a}
                            </span>
                            {pts !== null
                              ? <span style={{fontWeight:700, fontSize:12,
                                  color: pts===4?'#4ade80': pts===3?'#67d7f5': pts===2?'#f0b429':'#f87171'}}>
                                  {pts>0?`+${pts} pkt`:'✗ 0 pkt'}
                                </span>
                              : <span style={{fontSize:11, color:C.p.dim}}>(brak typowania)</span>
                            }
                          </div>
                        )}
                      </div>
                      <span style={{textAlign:'left',fontSize:14,color:filled?C.p.text:matchLocked?C.p.dim:C.p.text2,fontWeight:filled?600:400}}>
                        <Flag team={m.away}/>{teamLabel(m.away)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div style={{display:'flex', justifyContent:'flex-end', marginTop:20}}>
            <button onClick={()=>setStep(1)} style={C.btn('#d4a017','#000')}>Dalej → Zwycięzcy grup</button>
          </div>
        </>)}

        {/* ── KROK 1: ZWYCIĘZCY GRUP ────────────────────────────────────── */}
        {step === 1 && (<>
          <KnockoutDeadlineBanner/>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16}}>
            <h3 style={{margin:0}}>🏆 Kto wygra każdą grupę?</h3>
            <span style={{...C.muted, fontSize:13}}>{doneCount}/12{doneCount===12&&<span style={C.gold}> ✓</span>}</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:12, marginBottom:20}}>
            {GROUP_LETTERS.map(g => {
              const locked = isGroupLocked(g)
              return (
                <div key={g} style={C.card({border:pred.groupWinners[g]?'1px solid #d4a017':`1px solid ${C.p.border}`,opacity:locked?0.75:1})}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                    <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:13,borderRadius:6,padding:'2px 10px'}}>GR {g}</span>
                    <LockBadge lockTime={GROUP_LOCK_UTC[g]}/>
                    {pred.groupWinners[g]&&<span style={{...C.gold,fontSize:12,fontWeight:600,marginLeft:'auto'}}><Flag team={pred.groupWinners[g]} size={16}/>{teamLabel(pred.groupWinners[g])}</span>}
                  </div>
                  {GROUPS[g].map(team => (
                    <label key={team} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,
                      cursor:locked?'not-allowed':'pointer',background:pred.groupWinners[g]===team?'rgba(212,160,23,0.1)':'transparent',marginBottom:3}}>
                      <input type="radio" name={`g${g}`} disabled={locked}
                        checked={pred.groupWinners[g]===team} onChange={()=>setGW(g,team)}
                        style={{accentColor:'#d4a017',width:16,height:16}}/>
                      <span style={{color:pred.groupWinners[g]===team?C.p.gold:locked?C.p.dim:C.p.text2,fontSize:14}}>
                        <Flag team={team}/>{teamLabel(team)}
                      </span>
                    </label>
                  ))}
                  {locked&&!pred.groupWinners[g]&&<p style={{...C.red,fontSize:12,marginTop:8,textAlign:'center'}}>⚠️ Nie wytypowano przed blokadą</p>}
                </div>
              )
            })}
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <button onClick={()=>setStep(0)} style={C.btn(C.p.card2,C.p.text2)}>← Mecze</button>
            <button onClick={()=>setStep(2)} style={C.btn('#d4a017','#000')}>Dalej → Faza pucharowa</button>
          </div>
        </>)}

        {/* ── KROK 2: FAZA PUCHAROWA ────────────────────────────────────── */}
        {step === 2 && (<>
          <KnockoutDeadlineBanner/>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:20}}>
            <h3 style={{margin:0}}>⚔️ Faza pucharowa</h3>
            <LockBadge lockTime={KNOCKOUT_LOCK_UTC}/>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20}}>
            <div style={C.card()}>
              <h4 style={{...C.gold,margin:'0 0 14px',fontSize:16}}>⚔️ Cztery półfinaliści</h4>
              {[0,1,2,3].map(i => (
                <div key={i} style={{marginBottom:12}}>
                  <label style={{...C.muted,fontSize:11,display:'block',marginBottom:4}}>Półfinalista #{i+1}</label>
                  <select disabled={knockoutLocked} value={pred.semifinalists[i]} onChange={e=>setSF(i,e.target.value)}
                    style={{...C.sel,opacity:knockoutLocked?0.5:1}}>
                    <option value="">— wybierz drużynę —</option>
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{teamLabel(t)}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={C.card()}>
              <h4 style={{...C.gold,margin:'0 0 14px',fontSize:16}}>🎖️ Finaliści</h4>
              {['finalist1','finalist2'].map((k,i) => (
                <div key={k} style={{marginBottom:12}}>
                  <label style={{...C.muted,fontSize:11,display:'block',marginBottom:4}}>Finalista #{i+1}</label>
                  <select disabled={knockoutLocked} value={pred[k]} onChange={e=>setKey(k,e.target.value)} style={{...C.sel,opacity:knockoutLocked?0.5:1}}>
                    <option value="">— wybierz drużynę —</option>
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{teamLabel(t)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <button onClick={()=>setStep(1)} style={C.btn(C.p.card2,C.p.text2)}>← Grupy</button>
            <button onClick={()=>setStep(3)} style={C.btn('#d4a017','#000')}>Dalej → KO mecze →</button>
          </div>
        </>)}

        {/* ── KROK 3: KO MECZE ──────────────────────────────────────────── */}
        {step === 3 && (() => {
          const activeKO = KO_MATCH_SLOTS.filter(s => {
            const km = results.koMatches?.[s.id]
            return km?.home && km?.away
          })
          return (<>
            <div style={{
              background:'rgba(220,38,38,0.15)', border:'2px solid #dc2626',
              borderRadius:10, padding:'12px 16px', marginBottom:18,
              display:'flex', alignItems:'center', gap:12,
            }}>
              <span style={{fontSize:28}}>💾</span>
              <div>
                <div style={{color:'#f87171', fontWeight:800, fontSize:15, marginBottom:2}}>
                  PAMIĘTAJ — wpisz typy i kliknij „Zapisz typy KO"!
                </div>
                <div style={{color:C.p.text2, fontSize:13}}>
                  Typy nie zapisują się automatycznie. Użyj przycisku na dole strony.
                </div>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <h3 style={{margin:'0 0 6px'}}>🗓️ Mecze fazy pucharowej</h3>
              <p style={{...C.muted, margin:0, fontSize:13}}>
                Typuj wynik po czasie regulaminowym (90 min + czas doliczony przez sędziego).
                Jeśli typujesz remis — wybierz kto awansuje (przez dogrywkę/karne).
              </p>
            </div>

            {/* Zasady punktacji */}
            <div style={{...C.card({marginBottom:20, padding:'14px 16px'}), border:`1px solid ${C.p.border2}`}}>
              <div style={{fontSize:12, fontWeight:800, color:C.p.gold, marginBottom:10, letterSpacing:0.5}}>
                📊 ZASADY PUNKTACJI — MECZE PUCHAROWE
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {SCORING_KO.map((s,i) => (
                  <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'6px 10px', borderRadius:6,
                    background: i===0?C.p.greenBg : i===1?'rgba(103,215,245,0.08)' : i===2?'rgba(212,160,23,0.08)' : C.p.card3,
                  }}>
                    <span style={{fontSize:12, color:C.p.text2}}>{s.label}</span>
                    <span style={{fontSize:14, fontWeight:800,
                      color: i===0?C.p.green : i===1?C.p.sky : i===2?C.p.gold : C.p.dim,
                      minWidth:40, textAlign:'right'}}>
                      {s.pts > 0 ? `+${s.pts} pkt` : '0 pkt'}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10, fontSize:11, color:C.p.muted, borderTop:`1px solid ${C.p.border}`, paddingTop:8}}>
                💡 Czas doliczony przez sędziego (np. 90+6 min) wlicza się do wyniku regulaminowego.
                Dogrywka i karne <strong style={{color:C.p.text}}>nie są typowane</strong> — tylko awansujący.
              </div>
            </div>

            {activeKO.length === 0 ? (
              <div style={{...C.card(), textAlign:'center', padding:40}}>
                <div style={{fontSize:32, marginBottom:12}}>⏳</div>
                <div style={{color:C.p.muted}}>Mecze fazy pucharowej pojawią się tutaj gdy znane będą drużyny (po zakończeniu fazy grupowej).</div>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {(() => {
                  const rounds = [...new Set(activeKO.map(s => s.round))]
                  return rounds.map(round => {
                    const roundSlots = activeKO.filter(s => s.round === round)
                    return (
                      <div key={round} style={{marginBottom:8}}>
                        <div style={{fontSize:11, fontWeight:800, color:C.p.gold, letterSpacing:1, marginBottom:8}}>
                          {roundSlots[0].label.toUpperCase()}
                        </div>
                        {roundSlots.map(slot => {
                          const km = results.koMatches[slot.id]
                          const kickoff = km.kickoff ? new Date(km.kickoff) : null
                          const locked  = kickoff ? new Date() >= kickoff : false
                          const predKO  = pred.koMatchScores?.[slot.id] || { h:'', a:'', adv:'' }
                          const filled  = predKO.h !== '' && predKO.a !== ''
                          const isDraw  = filled && predKO.h === predKO.a
                          const resKM   = results.koMatches?.[slot.id]
                          const hasResult = resKM && (resKM.scoreH !== '' && resKM.scoreH != null)
                          const dateStr = kickoff ? kickoff.toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Warsaw'}) : null

                          let pts = null
                          if (hasResult && filled) {
                            const ah = parseInt(resKM.scoreH), aa = parseInt(resKM.scoreA)
                            const ph = parseInt(predKO.h),     pa = parseInt(predKO.a)
                            const actualAdv = ah > aa ? km.home : aa > ah ? km.away : (resKM.adv||'')
                            const predAdv   = ph > pa ? km.home : pa > ph ? km.away : (predKO.adv||'')
                            const exactScore = ph===ah && pa===aa
                            const sameDiff   = (ph-pa) === (ah-aa)
                            const correctAdv = !!(actualAdv && predAdv && predAdv===actualAdv)
                            if (exactScore && correctAdv)  pts = 5
                            else if (sameDiff && correctAdv) pts = 4
                            else if (exactScore)            pts = 3
                            else if (correctAdv || sameDiff) pts = 2
                            else                            pts = 0
                          }

                          return (
                            <div key={slot.id} style={{
                              ...C.card({padding:'12px 16px'}),
                              border:`1px solid ${filled ? C.p.border2 : C.p.border}`,
                              opacity: locked && !filled ? 0.7 : 1,
                            }}>
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6}}>
                                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                                  <span style={{fontSize:11, fontWeight:800, color:C.p.gold}}>{slot.label} #{slot.num}</span>
                                  {dateStr && <span style={{fontSize:11, color:C.p.dim}}>📅 {dateStr} CEST</span>}
                                </div>
                                {locked
                                  ? <span style={{fontSize:10, fontWeight:700, color:C.p.red, background:C.p.redBg, borderRadius:4, padding:'2px 7px'}}>🔒 Zablokowane</span>
                                  : <span style={{fontSize:10, fontWeight:700, color:C.p.green, background:C.p.greenBg, borderRadius:4, padding:'2px 7px'}}>🟢 Otwarte</span>
                                }
                              </div>
                              <div style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:8}}>
                                <div style={{textAlign:'right', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6}}>
                                  <span style={{fontSize:14, fontWeight:700, color:C.p.text}}>{teamLabel(km.home)}</span>
                                  <Flag team={km.home} size={22}/>
                                </div>
                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                                    <ScoreInput val={predKO.h} onChange={v=>setKOScore(slot.id,'h',v)} locked={locked}/>
                                    <span style={{...C.muted, fontWeight:800, fontSize:18}}>:</span>
                                    <ScoreInput val={predKO.a} onChange={v=>setKOScore(slot.id,'a',v)} locked={locked}/>
                                  </div>
                                  {isDraw && !locked && (
                                    <select value={predKO.adv||''} onChange={e=>{setKOAdv(slot.id,e.target.value);setSaved(false)}}
                                      style={{...C.sel, fontSize:11, padding:'3px 6px', marginTop:2}}>
                                      <option value="">kto awansuje?</option>
                                      <option value={km.home}>{teamLabel(km.home)}</option>
                                      <option value={km.away}>{teamLabel(km.away)}</option>
                                    </select>
                                  )}
                                  {isDraw && locked && predKO.adv && (
                                    <span style={{fontSize:11, color:C.p.sky}}>↑ {teamLabel(predKO.adv)}</span>
                                  )}
                                </div>
                                <div style={{textAlign:'left', display:'flex', alignItems:'center', gap:6}}>
                                  <Flag team={km.away} size={22}/>
                                  <span style={{fontSize:14, fontWeight:700, color:C.p.text}}>{teamLabel(km.away)}</span>
                                </div>
                              </div>
                              {hasResult && (
                                <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.p.border}`}}>
                                  <span style={{fontSize:11, color:C.p.dim}}>wynik</span>
                                  <span style={{fontSize:16, fontWeight:800,
                                    color: pts===5?C.p.green: pts===4?'#a3e635': pts===3?C.p.sky: pts===2?C.p.gold: pts===0?C.p.red:C.p.text2,
                                    background: pts===5?C.p.greenBg: pts===4?'rgba(163,230,53,0.13)': pts===3?'rgba(103,215,245,0.12)': pts===2?'rgba(212,160,23,0.12)': pts===0?C.p.redBg:C.p.card3,
                                    borderRadius:6, padding:'2px 10px',
                                  }}>
                                    {resKM.scoreH}:{resKM.scoreA}
                                    {resKM.adv && parseInt(resKM.scoreH)===parseInt(resKM.scoreA) && ` (${teamLabel(resKM.adv)})`}
                                  </span>
                                  {pts !== null && filled
                                    ? <span style={{fontWeight:700, fontSize:13,
                                        color: pts>=4?C.p.green: pts===3?C.p.sky: pts===2?C.p.gold:C.p.red}}>
                                        {pts>0?`+${pts} pkt`:'✗ 0 pkt'}
                                      </span>
                                    : !filled && <span style={{fontSize:11, color:C.p.dim}}>(brak typowania)</span>
                                  }
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            <div style={{display:'flex', justifyContent:'space-between', marginTop:20, alignItems:'center'}}>
              <button onClick={()=>setStep(2)} style={C.btn(C.p.card2,C.p.text2)}>← Bonus puchar</button>
              <button onClick={()=>handleSave(false)} disabled={loading}
                style={{...C.btn('#00c850','#fff'), opacity:loading?0.7:1}}>
                {loading?'Zapisuję...':'💾 Zapisz typy KO'}
              </button>
              <button onClick={()=>setStep(4)} style={C.btn('#d4a017','#000')}>Dalej → Mistrz świata</button>
            </div>
          </>)
        })()}

        {/* ── KROK 4: MISTRZ ────────────────────────────────────────────── */}
        {step === 4 && (<>
          <KnockoutDeadlineBanner/>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:20}}>
            <h3 style={{margin:0}}>🥇 Mistrz Świata 2026</h3>
            <LockBadge lockTime={KNOCKOUT_LOCK_UTC}/>
          </div>
          <div style={{maxWidth:480, display:'flex', flexDirection:'column', gap:16, marginBottom:24}}>
            <div style={C.card({border:'1px solid #3a5020', background:'#111c0f'})}>
              <h4 style={{...C.gold,margin:'0 0 12px',fontSize:16}}>🏆 Kto zostanie Mistrzem Świata 2026?</h4>
              <select disabled={knockoutLocked} value={pred.winner} onChange={e=>setKey('winner',e.target.value)}
                style={{...C.sel,border:'1px solid #3a5020',fontSize:15,padding:'12px 14px',opacity:knockoutLocked?0.5:1}}>
                <option value="">— wybierz zwycięzcę —</option>
                {ALL_TEAMS.map(t=><option key={t} value={t}>{teamLabel(t)}</option>)}
              </select>
              {pred.winner&&<div style={{marginTop:14,textAlign:'center'}}><div style={{fontSize:52}}><Flag team={pred.winner} size={48}/></div><div style={{...C.gold,fontWeight:800,fontSize:22,marginTop:6}}>{teamLabel(pred.winner)}</div></div>}
            </div>
            <div style={C.card({border:'1px solid #0e3050', background:'#0b1520'})}>
              <h4 style={{...C.sky,margin:'0 0 12px',fontSize:16}}>⚽ Kraj najlepszego strzelca turnieju</h4>
              <select disabled={knockoutLocked} value={pred.topScorerCountry} onChange={e=>setKey('topScorerCountry',e.target.value)}
                style={{...C.sel,border:'1px solid #0e3050',fontSize:15,padding:'12px 14px',opacity:knockoutLocked?0.5:1}}>
                <option value="">— wybierz kraj —</option>
                {ALL_TEAMS.map(t=><option key={t} value={t}>{teamLabel(t)}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <button onClick={()=>setStep(3)} style={C.btn(C.p.card2,C.p.text2)}>← KO mecze</button>
            <button onClick={()=>setStep(5)} style={C.btn('#d4a017','#000')}>Dalej → Podsumowanie</button>
          </div>
        </>)}

        {/* ── KROK 5: PODSUMOWANIE ──────────────────────────────────────── */}
        {step === 5 && (<>
          <h3 style={{margin:'0 0 20px'}}>📋 Podsumowanie typowania</h3>
          <div style={C.card({marginBottom:14})}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:matchFilled>0?10:0}}>
              <span style={{...C.muted,fontSize:14}}>⚽ Wyniki meczów grupowych</span>
              <span style={{fontWeight:700,fontSize:14,color:matchFilled===72?'#4ade80':matchFilled>0?'#f0b429':'#6b7a8d'}}>{matchFilled}/72</span>
            </div>
            {matchFilled>0&&(
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {GROUP_LETTERS.map(g=>{
                  const gF=MATCHES[g].filter(m=>{const s=pred.matchScores?.[matchKey(g,m)];return s?.h!==''&&s?.a!==''}).length
                  return <span key={g} style={{fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:700,background:gF===6?'#1a2e1a':gF>0?'#1e2520':'#1e2d3d',color:gF===6?'#4ade80':gF>0?'#f0b429':'#6b7a8d'}}>{g}: {gF}/6</span>
                })}
              </div>
            )}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20}}>
            <div style={C.card()}>
              <h4 style={{...C.gold,margin:'0 0 12px',fontSize:14}}>🏆 Zwycięzcy grup</h4>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                {GROUP_LETTERS.map(g=>(
                  <div key={g} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 8px',background:isGroupLocked(g)?C.p.redBg:C.p.card2,borderRadius:5}}>
                    <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:10,borderRadius:3,padding:'1px 5px',minWidth:16,textAlign:'center'}}>{g}</span>
                    <span style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {pred.groupWinners[g]?<><Flag team={pred.groupWinners[g]} size={14}/>{teamLabel(pred.groupWinners[g])}</>:<span style={{color:isGroupLocked(g)?'#f87171':'#6b7a8d'}}>{isGroupLocked(g)?'⚠️':'—'}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={C.card()}>
                <h4 style={{...C.gold,margin:'0 0 8px',fontSize:14}}>⚔️ Półfinaliści</h4>
                {pred.semifinalists.map((t,i)=><div key={i} style={{color:C.p.text2,fontSize:13,marginBottom:3}}>#{i+1} {t?<><Flag team={t} size={14}/>{teamLabel(t)}</>:<span style={{color:C.p.border2}}>—</span>}</div>)}
              </div>
              <div style={C.card()}>
                <h4 style={{...C.gold,margin:'0 0 8px',fontSize:14}}>🎖️ Finał</h4>
                <div style={{color:C.p.text2,fontSize:13}}>{pred.finalist1?<><Flag team={pred.finalist1} size={14}/>{teamLabel(pred.finalist1)}</>:'—'}<span style={{color:C.p.border2}}> vs </span>{pred.finalist2?<><Flag team={pred.finalist2} size={14}/>{teamLabel(pred.finalist2)}</>:'—'}</div>
              </div>
              <div style={C.card({border:'1px solid #3a5020',background:'#111c0f'})}>
                <div style={{...C.muted,fontSize:11}}>🏆 MISTRZ ŚWIATA 2026</div>
                <div style={{...C.gold,fontSize:18,fontWeight:800,marginTop:4}}>{pred.winner?<><Flag team={pred.winner} size={16}/>{teamLabel(pred.winner)}</>:<span style={{color:C.p.border2,fontSize:13}}>Nie wybrano</span>}</div>
              </div>
              <div style={C.card({border:'1px solid #0e3050',background:'#0b1520'})}>
                <div style={{...C.muted,fontSize:11}}>⚽ KRAJ TOP STRZELCA</div>
                <div style={{...C.sky,fontSize:16,fontWeight:700,marginTop:4}}>{pred.topScorerCountry?<><Flag team={pred.topScorerCountry} size={16}/>{teamLabel(pred.topScorerCountry)}</>:<span style={{color:C.p.border2,fontSize:13}}>Nie wybrano</span>}</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <button onClick={()=>setStep(4)} style={C.btn(C.p.card2,C.p.text2)}>← Edytuj</button>
            <button onClick={handleSave} disabled={loading}
              style={{...C.btn('#00c850','#fff'),padding:'14px 36px',fontSize:16,boxShadow:'0 4px 20px rgba(0,200,80,0.3)',opacity:loading?0.7:1}}>
              {loading?'Zapisuję...':'💾 Zapisz i przejdź do rankingu!'}
            </button>
          </div>
        </>)}

      </div>
    </div>
  )
}
