import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import {
  GROUPS, FLAGS, FLAG_CODES, GROUP_LETTERS, ALL_TEAMS,
  SCORING_MATCHES, SCORING_BONUS,
  EMPTY_PRED, EMPTY_RESULTS, MATCHES, matchKey,
  GROUP_LOCK_UTC, KNOCKOUT_LOCK_UTC,
  isGroupLocked, isKnockoutLocked, isMatchLocked, getMatchLock, formatLockTime,
  getMatchKickoff, isMatchKickoffPassed,
  calcScore,
} from './data/schedule'

const ADMIN_PIN    = import.meta.env.VITE_ADMIN_PIN || '1234'

const USER_EMOJIS = {
  'Magdalena': '🐱',
}
const displayName = (name) => USER_EMOJIS[name] ? `${USER_EMOJIS[name]} ${name}` : name

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


// ─── CSS helpers ──────────────────────────────────────────────────────────────
const C = {
  page:   { minHeight:'100vh', background:'#0b0f13', fontFamily:"'Segoe UI',system-ui,sans-serif", color:'#e2e8f0' },
  header: { background:'linear-gradient(135deg,#07290a 0%,#0f4015 60%,#07290a 100%)',
            padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center',
            borderBottom:'2px solid #d4a017', boxShadow:'0 4px 24px rgba(0,0,0,0.6)' },
  card:   (extra={}) => ({ background:'#161d27', borderRadius:12, padding:20, border:'1px solid #1e2d3d', ...extra }),
  gold:   { color:'#f0b429' },
  sky:    { color:'#67d7f5' },
  green:  { color:'#4ade80' },
  red:    { color:'#f87171' },
  muted:  { color:'#6b7a8d' },
  btn: (bg, cl, op=1) => ({
    border:'none', borderRadius:8, padding:'10px 18px',
    cursor: op < 1 ? 'not-allowed' : 'pointer',
    fontWeight:700, fontSize:14, transition:'all 0.15s',
    background:bg, color:cl, opacity:op,
  }),
  sel: { width:'100%', padding:'10px 12px', background:'#1e2d3d', color:'#e2e8f0',
         border:'1px solid #2a3f55', borderRadius:8, fontSize:14, cursor:'pointer' },
  inp: { width:'100%', padding:'13px 16px', background:'#161d27', color:'#e2e8f0',
         border:'2px solid #2a3f55', borderRadius:10, fontSize:16, boxSizing:'border-box', outline:'none' },
}

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
      background:'#1e2d3d', color:'#e2e8f0', padding:'12px 24px', borderRadius:10,
      boxShadow:'0 8px 32px rgba(0,0,0,0.6)', zIndex:9999, fontWeight:600, fontSize:14,
      border:'1px solid #2a3f55',
    }}>{msg}</div>
  )
}

function LockBadge({ lockTime }) {
  const locked = new Date() >= lockTime
  if (locked) return (
    <span style={{fontSize:11, background:'#3a1a1a', color:'#f87171', borderRadius:4, padding:'2px 8px'}}>
      🔒 Zablokowane
    </span>
  )
  return (
    <span style={{fontSize:11, background:'#1a2e1a', color:'#4ade80', borderRadius:4, padding:'2px 8px'}}>
      🟢 {formatLockTime(lockTime)}
    </span>
  )
}

function KnockoutDeadlineBanner() {
  const locked = new Date() >= KNOCKOUT_LOCK_UTC
  if (locked) return (
    <div style={{background:'#2a0a0a', border:'1px solid #f87171', borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#f87171'}}>
      🔒 Typowanie zostało zablokowane — termin minął ({formatLockTime(KNOCKOUT_LOCK_UTC)}).
    </div>
  )
  return (
    <div style={{background:'#0d1f0d', border:'1px solid #4ade80', borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#4ade80'}}>
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
        background: locked ? '#0f1520' : '#1e2d3d',
        color: locked ? '#4a5568' : '#e2e8f0',
        border:`1.5px solid ${val !== '' ? '#d4a017' : '#2a3f55'}`,
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
  const h = Math.round(size * 0.75)
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}/${code}.png`}
      alt={team}
      width={size} height={h}
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
        background:'#1a2535', color:'#e2e8f0', fontSize:11, fontWeight:500,
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
function NavBar({ username, view, setView, onLogout, saved, onAdminClick }) {
  return (
    <div style={C.header}>
      <div>
        <h2 style={{...C.gold, margin:0, fontSize:17}}>⚽ Mundial 2026 · Typer</h2>
        {username && (
          <p style={{...C.muted, margin:0, fontSize:11}}>
            Cześć, <strong style={{color:'#d4a017'}}>{displayName(username)}</strong>
            {saved ? ' · ✅ Zapisano' : ''}
          </p>
        )}
      </div>
      <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
        {username && view !== 'predict' && (
          <Tip text="Moje typowanie">
            <button onClick={() => setView('predict')} style={C.btn('#d4a017','#000')}>✏️ Typowanie</button>
          </Tip>
        )}
        {view !== 'leaderboard' && (
          <Tip text="Ranking uczestników">
            <button onClick={() => setView('leaderboard')} style={C.btn('#1e2d3d','#ccc')}>📊 Ranking</button>
          </Tip>
        )}
        {view !== 'rules' && (
          <Tip text="Zasady i punktacja">
            <button onClick={() => setView('rules')} style={C.btn('#1e2d3d','#6b7a8d')}>ℹ️</button>
          </Tip>
        )}
        <Tip text="Admin">
          <button onClick={onAdminClick}
            style={C.btn(view==='admin'?'#d4a017':'#1e2d3d', view==='admin'?'#000':'#6b7a8d')}>⚙️</button>
        </Tip>
        <Tip text="Wyloguj się">
          <button onClick={onLogout} style={C.btn('#1e2d3d','#6b7a8d')}>🚪</button>
        </Tip>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
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
  const [toast, setToast]     = useState('')
  const [matchGroup, setMatchGroup] = useState(
    () => GROUP_LETTERS.find(g => !isMatchLocked(g, 1)) || GROUP_LETTERS[0]
  )
  const [, tick] = useState(0)
  const [rankTab, setRankTab] = useState('summary')
  const [lastSync, setLastSync] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

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

      // mapowanie w obu kierunkach — API WC nie ma "prawdziwego" home/away w fazie grup
      const matchLookup = Object.fromEntries([
        ...Object.entries(MATCHES).flatMap(([g, ms]) =>
          ms.map(m => [`${m.home}|${m.away}`, { key: matchKey(g, m), rev: false }])
        ),
        ...Object.entries(MATCHES).flatMap(([g, ms]) =>
          ms.map(m => [`${m.away}|${m.home}`, { key: matchKey(g, m), rev: true }])
        ),
      ])

      const newScores = {}
      for (const m of matches) {
        const apiHome = EN_TO_PL[m.homeTeam?.name] || EN_TO_PL[m.homeTeam?.shortName] || EN_TO_PL[m.homeTeam?.tla] || ''
        const apiAway = EN_TO_PL[m.awayTeam?.name] || EN_TO_PL[m.awayTeam?.shortName] || EN_TO_PL[m.awayTeam?.tla] || ''
        if (!apiHome || !apiAway) continue
        const entry = matchLookup[`${apiHome}|${apiAway}`]
        if (!entry) continue
        const ft = m.score?.fullTime
        if (ft?.home == null || ft?.away == null) continue
        // jeśli lookup był po odwróconej parze, zamieniamy wynik
        const h = entry.rev ? String(ft.away) : String(ft.home)
        const a = entry.rev ? String(ft.home) : String(ft.away)
        newScores[entry.key] = { h, a }
      }
      setLastSync(new Date())
      if (Object.keys(newScores).length === 0) return

      const { data } = await supabase.from('results').select('*').eq('id', 'current').maybeSingle()
      const current = data?.data || {}
      const merged = {
        ...EMPTY_RESULTS, ...current,
        matchScores: { ...EMPTY_RESULTS.matchScores, ...(current.matchScores || {}), ...newScores },
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
              groupWinners: { ...EMPTY_PRED.groupWinners, ...(data.data.groupWinners || {}) },
              matchScores:  { ...EMPTY_PRED.matchScores,  ...(data.data.matchScores  || {}) },
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
        groupWinners: { ...EMPTY_PRED.groupWinners, ...(data.data.groupWinners || {}) },
        matchScores:  { ...EMPTY_PRED.matchScores,  ...(data.data.matchScores  || {}) },
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
      <div style={{background:'#0f1923', border:'2px solid #d4a017', borderRadius:16,
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
            style={{...C.btn('#1e2d3d','#ccc'), flex:1}}>Anuluj</button>
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
      <div style={{background:'#0f1923', border:'2px solid #d4a017', borderRadius:20,
                   padding:'40px 36px', maxWidth:420, width:'90%', textAlign:'center',
                   boxShadow:'0 24px 80px rgba(0,0,0,0.8)'}}>
        <div style={{fontSize:52}}>⚽</div>
        <h1 style={{...C.gold, fontSize:25, margin:'10px 0 4px'}}>Mundial 2026 · Typer</h1>
        <p style={{...C.muted, margin:'0 0 4px', fontSize:13}}>🇺🇸 USA · 🇨🇦 Kanada · 🇲🇽 Meksyk</p>
        <p style={{...C.muted, margin:'0 0 20px', fontSize:12}}>11 czerwca – 19 lipca 2026 · 48 drużyn · 104 mecze</p>

        <div style={{background:'#1a2535', border:'1px solid #2a3f55', borderRadius:10,
                     padding:'12px 16px', marginBottom:20, textAlign:'left'}}>
          <p style={{margin:'0 0 6px', fontSize:13, color:'#e2e8f0', fontWeight:600}}>👋 Jak dołączyć?</p>
          <ul style={{...C.muted, margin:0, paddingLeft:18, fontSize:12, lineHeight:1.8}}>
            <li>Wpisz swój <strong style={{color:'#e2e8f0'}}>nick</strong></li>
            <li>Wymyśl <strong style={{color:'#e2e8f0'}}>4-cyfrowy PIN</strong> — zapamiętaj go!</li>
            <li>Pierwsze wejście <strong style={{color:'#4ade80'}}>tworzy konto</strong></li>
            <li>Kolejne wejścia wymagają <strong style={{color:'#e2e8f0'}}>tego samego PINu</strong></li>
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
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick}/>
      <div style={{maxWidth:560, margin:'40px auto', padding:'0 20px'}}>
        <h2 style={{...C.gold, marginBottom:20}}>📋 Zasady punktacji</h2>

        <div style={C.card({marginBottom:16})}>
          <h4 style={{...C.sky, margin:'0 0 12px'}}>⚽ Typowanie wyników meczów</h4>
          {SCORING_MATCHES.map(({label,pts}) => (
            <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'center',
                                     padding:'10px 0', borderBottom:'1px solid #1e2d3d'}}>
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
                                     padding:'10px 0', borderBottom:'1px solid #1e2d3d'}}>
              <span style={{fontSize:14}}>{label}</span>
              <span style={{...C.gold, fontWeight:800, fontSize:17}}>{pts} pkt</span>
            </div>
          ))}
          <div style={{...C.muted, fontSize:12, marginTop:10}}>
            Maks. bonusy: 12×3 + 4×3 + 2×5 + 10 + 5 = <strong style={{color:'#f0b429'}}>73 pkt</strong>
          </div>
        </div>

        <div style={{...C.card({border:'1px solid #3a5020', background:'#111c0f'}), textAlign:'center'}}>
          <div style={{...C.muted, fontSize:13}}>Maksimum łącznie</div>
          <div style={{...C.gold, fontSize:32, fontWeight:900, marginTop:4}}>361 pkt</div>
        </div>

        <div style={{...C.card({marginTop:16, border:'1px solid #1e3a1e'})}}>
          <h4 style={{...C.green, margin:'0 0 10px'}}>🔒 Blokady typowania</h4>
          <ul style={{...C.muted, fontSize:13, lineHeight:1.9, margin:0, paddingLeft:18}}>
            <li><strong style={{color:'#e2e8f0'}}>Mecze kolejka 1</strong> → z kickoffem 1. meczu grupy</li>
            <li><strong style={{color:'#e2e8f0'}}>Mecze kolejka 2</strong> → ~5 dni po starcie grupy</li>
            <li><strong style={{color:'#e2e8f0'}}>Mecze kolejka 3</strong> → ~10 dni po starcie grupy</li>
            <li><strong style={{color:'#e2e8f0'}}>Zwycięzca grupy</strong> → z kickoffem 1. meczu grupy</li>
            <li><strong style={{color:'#e2e8f0'}}>Faza pucharowa / Mistrz</strong> → 28 czerwca (Runda 32)</li>
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
    ]
    const ptsColor = pts => pts===4?'#4ade80':pts===3?'#67d7f5':pts===2?'#f0b429':pts===0?'#f87171':'#6b7a8d'
    const ptsBg    = pts => pts===4?'rgba(74,222,128,0.15)':pts===3?'rgba(103,215,245,0.12)':pts===2?'rgba(240,180,41,0.12)':pts===0?'rgba(248,113,113,0.12)':'transparent'

    // Matchday tab renderer
    const MdTab = ({ md }) => {
      const mdMatches = GROUP_LETTERS.flatMap(g =>
        MATCHES[g].filter(m => m.matchday === md).map(m => ({ ...m, group: g, key: matchKey(g, m) }))
      )
      return (
        <div style={{overflowX:'auto'}}>
          <table style={{borderCollapse:'collapse', fontSize:12, minWidth:'100%'}}>
            <thead>
              <tr style={{background:'#111820'}}>
                <th style={{padding:'8px 10px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap', position:'sticky', left:0, background:'#111820', zIndex:2}}>Mecz</th>
                <th style={{padding:'8px 8px', textAlign:'center', color:'#6b7a8d', whiteSpace:'nowrap'}}>Wynik</th>
                {scoredPreds.map(p => (
                  <th key={p.username} style={{padding:'8px 6px', textAlign:'center', color: p.username===username?'#d4a017':'#e2e8f0', whiteSpace:'nowrap', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis'}}>
                    {p.username===username?'👤 ':''}{displayName(p.username)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mdMatches.map(m => {
                const actual = results.matchScores?.[m.key]
                const hasResult = actual?.h !== '' && actual?.a !== ''
                return (
                  <tr key={m.key} style={{borderTop:'1px solid #1e2d3d'}}>
                    <td style={{padding:'7px 10px', whiteSpace:'nowrap', position:'sticky', left:0, background:'#161d27', zIndex:1}}>
                      <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:10,borderRadius:3,padding:'1px 5px',marginRight:5}}>{m.group}</span>
                      <Flag team={m.home} size={14}/><span style={{color:'#bcc6d4'}}>{m.home}</span>
                      <span style={{color:'#4a5568', margin:'0 4px'}}>vs</span>
                      <Flag team={m.away} size={14}/><span style={{color:'#bcc6d4'}}>{m.away}</span>
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
                          <span style={{color:'#2a3f55', fontSize:12}}>🔒</span>
                        </td>
                      )
                      return (
                        <td key={p.username} style={{padding:'6px', textAlign:'center', background: pts !== null ? ptsBg(pts) : 'transparent'}}>
                          {hasPred
                            ? <span style={{fontWeight:600, color: pts !== null ? ptsColor(pts) : '#6b7a8d', whiteSpace:'nowrap'}}>
                                {pred.h}:{pred.a}
                                {pts !== null && <span style={{fontSize:10, marginLeft:3, opacity:0.8}}>{pts>0?`+${pts}`:''}</span>}
                              </span>
                            : <span style={{color:'#2a3f55'}}>—</span>
                          }
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{borderTop:'2px solid #d4a017', background:'#111820'}}>
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
            <tr style={{background:'#111820'}}>
              <th style={{padding:'8px 10px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap', position:'sticky', left:0, background:'#111820', zIndex:2}}>Pytanie</th>
              <th style={{padding:'8px 8px', textAlign:'center', color:'#6b7a8d', whiteSpace:'nowrap'}}>Pkt</th>
              <th style={{padding:'8px 8px', textAlign:'center', color:'#4ade80', whiteSpace:'nowrap'}}>Wynik</th>
              {scoredPreds.map(p => (
                <th key={p.username} style={{padding:'8px 6px', textAlign:'center', color: p.username===username?'#d4a017':'#e2e8f0', whiteSpace:'nowrap'}}>
                  {p.username===username?'👤 ':''}{displayName(p.username)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bonusRows.map((row, ri) => {
              const actual = row.getActual()
              return (
                <tr key={ri} style={{borderTop:'1px solid #1e2d3d'}}>
                  <td style={{padding:'7px 10px', whiteSpace:'nowrap', position:'sticky', left:0, background:'#161d27', zIndex:1, color:'#bcc6d4'}}>{row.label}</td>
                  <td style={{padding:'7px 8px', textAlign:'center', color:'#f0b429', fontWeight:700}}>{row.pts}</td>
                  <td style={{padding:'7px 8px', textAlign:'center', color:'#4ade80', fontWeight:600}}>{actual || '—'}</td>
                  {scoredPreds.map(p => {
                    const isMe = p.username === username
                    const visible = isMe || row.isVisible()
                    if (!visible) return (
                      <td key={p.username} style={{padding:'6px', textAlign:'center'}}>
                        <span style={{color:'#2a3f55', fontSize:12}}>🔒</span>
                      </td>
                    )
                    const val = row.getVal(p.data)
                    const correct = row.isCorrect(p.data)
                    return (
                      <td key={p.username} style={{padding:'6px', textAlign:'center',
                          background: correct===true?'rgba(74,222,128,0.15)':correct===false?'rgba(248,113,113,0.12)':'transparent'}}>
                        {val
                          ? <span style={{color: correct===true?'#4ade80':correct===false?'#f87171':'#bcc6d4', fontWeight:600, fontSize:11}}>
                              {val}{correct===true?' ✓':correct===false?' ✗':''}
                            </span>
                          : <span style={{color:'#2a3f55'}}>—</span>
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
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick}/>
      <div style={{maxWidth:1400, margin:'24px auto', padding:'0 16px'}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap'}}>
          <h2 style={{...C.gold, margin:0}}>📊 Ranking ({allPreds.length})</h2>
          {resultsEntered > 0 && (
            <span style={{fontSize:12, background:'#1a2e1a', color:'#4ade80', borderRadius:4, padding:'2px 8px'}}>
              ✅ {resultsEntered}/72 wyników
            </span>
          )}
          {lastSync && (
            <span style={{fontSize:11, color:'#4a5568'}}>
              🔄 sync: {formatTimeAgo(lastSync)}
            </span>
          )}
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
              border: `1px solid ${rankTab===t.id?'#d4a017':'#1e2d3d'}`,
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
              <table style={{width:'100%', borderCollapse:'collapse', background:'#161d27', borderRadius:14, overflow:'hidden', fontSize:13}}>
                <thead>
                  <tr style={{background:'#111820'}}>
                    <th style={{padding:'12px 16px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap'}}>#</th>
                    <th style={{padding:'12px 12px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap'}}>Uczestnik</th>
                    <th style={{padding:'12px 10px', color:'#67d7f5', textAlign:'center', whiteSpace:'nowrap'}}>⚽ Mecze</th>
                    <th style={{padding:'12px 10px', color:'#f0b429', textAlign:'center', whiteSpace:'nowrap'}}>🏆 Bonus</th>
                    <th style={{padding:'12px 10px', color:'#4ade80', textAlign:'center', whiteSpace:'nowrap', background:'rgba(74,222,128,0.07)'}}>Razem</th>
                    <th style={{padding:'12px 6px', color:'#4a5568', textAlign:'center', whiteSpace:'nowrap', fontSize:11}}>max+</th>
                    {[1,2,3].map(md => (
                      <th key={md} style={{padding:'12px 8px', color:'#6b7a8d', textAlign:'center', fontSize:11}}>K{md}</th>
                    ))}
                    {GROUP_LETTERS.map(g => (
                      <th key={g} style={{padding:'12px 4px', color: isGroupLocked(g)?'#f87171':'#6b7a8d', textAlign:'center', fontSize:11, whiteSpace:'nowrap'}}>
                        {isGroupLocked(g)?'🔒':''}{g}
                      </th>
                    ))}
                    <th style={{padding:'12px 6px', color:'#6b7a8d', textAlign:'center', fontSize:11}}>⚔️</th>
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
                      <tr key={i} style={{borderTop:'1px solid #1e2d3d', background: isMe?'rgba(212,160,23,0.06)':'transparent'}}>
                        <td style={{padding:'10px 16px', fontWeight:800, color: i===0?'#f0b429':i===1?'#aab4be':i===2?'#cd7f32':'#6b7a8d', fontSize:15}}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}
                        </td>
                        <td style={{padding:'10px 12px', fontWeight:700, whiteSpace:'nowrap', color: isMe?'#d4a017':'#e2e8f0'}}>
                          {isMe?'👤 ':''}{displayName(p.username)}
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
                            ? <span style={{fontSize:11, color:'#4a5568', fontWeight:600}}>+{maxRemaining}</span>
                            : <span style={{fontSize:11, color:'#2a3f55'}}>—</span>}
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
                                  ? <span style={{color:'#2a3f55', fontSize:14, fontWeight:700}}>?</span>
                                  : <span style={{color:'#2a3f55'}}>—</span>
                              ) : t ? (
                                <span style={{opacity: correct?1:0.5, display:'inline-flex', flexDirection:'column', alignItems:'center', gap:1}}>
                                  <Flag team={t} size={16}/>
                                  <span style={{fontSize:8, color: correct?'#4ade80':'#6b7a8d', maxWidth:32, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t}</span>
                                </span>
                              ) : <span style={{color:'#2a3f55'}}>—</span>}
                            </td>
                          )
                        })}
                        <td style={{padding:'8px', textAlign:'center', fontSize:14}}>
                          {(p.data?.semifinalists||[]).filter(Boolean).length > 0
                            ? (p.data?.semifinalists||[]).filter(Boolean).map((t,j) => <Flag key={j} team={t} size={16}/>)
                            : <span style={{color:'#2a3f55'}}>—</span>}
                        </td>
                        <td style={{padding:'8px 10px', textAlign:'center', fontWeight:700, color:'#f0b429', whiteSpace:'nowrap', fontSize:13}}>
                          {p.data?.winner ? <><Flag team={p.data.winner} size={16}/>{p.data.winner}</> : <span style={{color:'#2a3f55'}}>—</span>}
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
          {['r32','r16','qf','third'].includes(rankTab) && (() => {
            const labels = { r32:'1/16 finału', r16:'1/8 finału', qf:'Ćwierćfinały', third:'Mecz o 3. miejsce' }
            const dates  = { r32:'28 cze – 4 lip', r16:'4–7 lip', qf:'9–12 lip', third:'18 lip' }
            return (
              <div style={{...C.card({border:'1px solid #1e2d3d'}), textAlign:'center', padding:'40px 20px'}}>
                <div style={{fontSize:36, marginBottom:12}}>⚽</div>
                <div style={{...C.gold, fontWeight:800, fontSize:18, marginBottom:6}}>{labels[rankTab]}</div>
                <div style={{...C.muted, fontSize:13, marginBottom:16}}>{dates[rankTab]}</div>
                <div style={{color:'#4a5568', fontSize:13}}>Typowanie meczów tej fazy pojawi się gdy znane będą pary</div>
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
                    <tr style={{background:'#111820'}}>
                      <th style={{padding:'8px 10px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap', position:'sticky', left:0, background:'#111820', zIndex:2}}>Uczestnik</th>
                      {[1,2,3,4].map(i => (
                        <th key={i} style={{padding:'8px 10px', textAlign:'center', color:'#6b7a8d'}}>Półfinalista #{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderTop:'1px solid #2a3f55', background:'#0d1520'}}>
                      <td style={{padding:'7px 10px', position:'sticky', left:0, background:'#0d1520', zIndex:1, color:'#4ade80', fontWeight:700}}>✅ Wynik</td>
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
                        <tr key={p.username} style={{borderTop:'1px solid #1e2d3d', background: isMe?'rgba(212,160,23,0.05)':'transparent'}}>
                          <td style={{padding:'7px 10px', position:'sticky', left:0, background: isMe?'rgba(212,160,23,0.05)':'#161d27', zIndex:1, fontWeight:700, color: isMe?'#d4a017':'#e2e8f0', whiteSpace:'nowrap'}}>
                            {isMe?'👤 ':''}{displayName(p.username)}
                          </td>
                          {[0,1,2,3].map(i => {
                            if (!visible) return <td key={i} style={{padding:'6px', textAlign:'center'}}><span style={{color:'#2a3f55'}}>🔒</span></td>
                            const sf = p.data?.semifinalists?.[i]
                            const actualSFs = (results.semifinalists||[]).filter(Boolean)
                            const correct = sf && actualSFs.length > 0 ? actualSFs.includes(sf) : null
                            return (
                              <td key={i} style={{padding:'7px 10px', textAlign:'center', background: correct===true?'rgba(74,222,128,0.12)':correct===false?'rgba(248,113,113,0.08)':'transparent'}}>
                                {sf ? <span style={{color: correct===true?'#4ade80':correct===false?'#f87171':'#bcc6d4', fontWeight:600}}>
                                  <Flag team={sf} size={14}/> {sf}{correct===true?' ✓':correct===false?' ✗':''}
                                </span> : <span style={{color:'#2a3f55'}}>—</span>}
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
                    <tr style={{background:'#111820'}}>
                      <th style={{padding:'8px 10px', textAlign:'left', color:'#d4a017', position:'sticky', left:0, background:'#111820', zIndex:2}}>Pytanie</th>
                      <th style={{padding:'8px 10px', textAlign:'center', color:'#4ade80'}}>Wynik</th>
                      {scoredPreds.map(p => (
                        <th key={p.username} style={{padding:'8px 8px', textAlign:'center', color: p.username===username?'#d4a017':'#e2e8f0', whiteSpace:'nowrap'}}>
                          {p.username===username?'👤 ':''}{displayName(p.username)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finalRows.map((row, ri) => (
                      <tr key={ri} style={{borderTop:'1px solid #1e2d3d'}}>
                        <td style={{padding:'7px 10px', position:'sticky', left:0, background:'#161d27', zIndex:1, color:'#bcc6d4', whiteSpace:'nowrap'}}>{row.label}</td>
                        <td style={{padding:'7px 10px', textAlign:'center', color:'#4ade80', fontWeight:700}}>
                          {row.actual ? <><Flag team={row.actual} size={14}/> {row.actual}</> : '—'}
                        </td>
                        {scoredPreds.map(p => {
                          const isMe = p.username === username
                          const visible = isMe || fnVisible
                          if (!visible) return <td key={p.username} style={{padding:'6px', textAlign:'center'}}><span style={{color:'#2a3f55'}}>🔒</span></td>
                          const val = row.getVal(p.data)
                          const correct = row.isCorrect(p.data)
                          return (
                            <td key={p.username} style={{padding:'7px 8px', textAlign:'center', background: correct===true?'rgba(74,222,128,0.12)':correct===false?'rgba(248,113,113,0.08)':'transparent'}}>
                              {val ? <span style={{color: correct===true?'#4ade80':correct===false?'#f87171':'#bcc6d4', fontWeight:600}}>
                                <Flag team={val} size={14}/> {val}{correct===true?' ✓':correct===false?' ✗':''}
                              </span> : <span style={{color:'#2a3f55'}}>—</span>}
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

        </>)}

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
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick}/>
      <div style={{maxWidth:1000, margin:'0 auto', padding:'20px 16px 40px'}}>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap'}}>
          <h2 style={{...C.gold, margin:0}}>⚙️ Panel wyników</h2>
          <span style={{...C.muted, fontSize:13}}>
            {Object.values(resultsDraft.matchScores||{}).filter(s=>s.h!==''&&s.a!=='').length}/72 meczów
          </span>
          <button onClick={() => { fetchAndSyncResults().then(() => showToast('🔄 Synchronizacja zakończona!')) }}
            disabled={loading}
            style={{...C.btn('#1e2d3d','#67d7f5'), fontSize:12, padding:'6px 14px', marginLeft:'auto', opacity: loading?0.6:1}}>
            🔄 Odśwież z API
          </button>
          <button onClick={async () => {
            setDebugInfo('loading')
            const r = await fetch('/api/football-debug')
            const d = await r.json()
            setDebugInfo(d)
          }} style={{...C.btn('#1e2d3d','#f0b429'), fontSize:12, padding:'6px 14px'}}>
            🔍 Debug API
          </button>
          {lastSync && (
            <span style={{fontSize:11, color:'#4a5568'}}>sync: {formatTimeAgo(lastSync)}</span>
          )}
        </div>

        {/* Debug info panel */}
        {debugInfo && debugInfo !== 'loading' && (
          <div style={{background:'#0a1520', border:'1px solid #2a3f55', borderRadius:8, padding:'14px 16px', marginBottom:16, fontSize:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{color:'#f0b429', fontWeight:700}}>🔍 Diagnostyka API football-data.org</span>
              <button onClick={() => setDebugInfo(null)} style={{...C.btn('#1e2d3d','#6b7a8d'), fontSize:11, padding:'2px 8px'}}>✕</button>
            </div>
            {debugInfo.apiError
              ? <div style={{color:'#f87171', fontWeight:700}}>❌ Błąd API: {debugInfo.apiError}</div>
              : <>
                  <div style={{color:'#4ade80'}}>✅ HTTP {debugInfo.httpStatus} · Turniej: {debugInfo.competitionName || '?'}</div>
                  <div style={{color:'#e2e8f0', marginTop:4}}>Mecze z API: <strong>{debugInfo.totalMatches}</strong> · z wynikami: <strong style={{color: debugInfo.matchesWithScore>0?'#4ade80':'#f87171'}}>{debugInfo.matchesWithScore}</strong></div>
                  {debugInfo.matchesWithScore > 0 && (
                    <div style={{marginTop:8}}>
                      <div style={{color:'#6b7a8d', marginBottom:4}}>Przykładowe wyniki z API:</div>
                      {debugInfo.sample.map((s,i) => (
                        <div key={i} style={{color:'#bcc6d4'}}>{s.home} {s.score?.home}:{s.score?.away} {s.away} <span style={{color:'#4a5568'}}>({s.status})</span></div>
                      ))}
                    </div>
                  )}
                  {debugInfo.unmappedNames?.length > 0 && (
                    <div style={{marginTop:8}}>
                      <div style={{color:'#6b7a8d', marginBottom:2}}>Nazwy drużyn w API (sprawdź mapowanie):</div>
                      <div style={{color:'#4a5568', fontSize:11}}>{debugInfo.unmappedNames.join(', ')}</div>
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
        <div style={{display:'flex', gap:4, marginBottom:20}}>
          {['⚽ Mecze','🏆 Grupy','⚔️ Puchar','🥇 Mistrz'].map((label,i) => (
            <button key={i} onClick={()=>setAdminStep(i)} style={{
              flex:1, padding:'10px 4px',
              background: adminStep===i?'#d4a017':'#161d27',
              color: adminStep===i?'#000':'#6b7a8d',
              border:`1px solid ${adminStep===i?'#d4a017':'#1e2d3d'}`,
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
                  background: adminGroup===g?'#d4a017':'#1e2d3d',
                  color: adminGroup===g?'#000':'#e2e8f0',
                  border:`1px solid ${adminGroup===g?'#d4a017':'#2a3f55'}`,
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
              <div key={md} style={{paddingTop:md>1?14:0, borderTop:md>1?'1px solid #1e2d3d':'none', marginBottom:4}}>
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
                      <span style={{textAlign:'right', fontSize:14, color: filled?'#e2e8f0':'#bcc6d4', fontWeight:filled?600:400}}>
                        <Flag team={m.home}/>{m.home}
                      </span>
                      <div style={{display:'flex', alignItems:'center', gap:5}}>
                        <ScoreInput val={score.h} onChange={v=>setResMatchScore(adminGroup,m,'h',v)} locked={false}/>
                        <span style={{...C.muted, fontWeight:800, fontSize:18}}>:</span>
                        <ScoreInput val={score.a} onChange={v=>setResMatchScore(adminGroup,m,'a',v)} locked={false}/>
                      </div>
                      <span style={{textAlign:'left', fontSize:14, color: filled?'#e2e8f0':'#bcc6d4', fontWeight:filled?600:400}}>
                        <Flag team={m.away}/>{m.away}
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
              <div key={g} style={C.card({border: resultsDraft.groupWinners[g]?'1px solid #4ade80':'1px solid #1e2d3d'})}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                  <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:13,borderRadius:6,padding:'2px 10px'}}>GR {g}</span>
                  {resultsDraft.groupWinners[g] && (
                    <span style={{...C.green, fontSize:12, fontWeight:600, marginLeft:'auto'}}>
                      <Flag team={resultsDraft.groupWinners[g]} size={16}/>{resultsDraft.groupWinners[g]}
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
                    <span style={{color: resultsDraft.groupWinners[g]===team?'#4ade80':'#bcc6d4', fontSize:14}}>
                      <Flag team={team}/>{team}
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
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
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
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
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
                {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={C.card({border:'1px solid #0e3050', background:'#0b1520'})}>
              <h4 style={{...C.sky, margin:'0 0 12px'}}>⚽ Kraj najlepszego strzelca</h4>
              <select value={resultsDraft.topScorerCountry} onChange={e=>setResKey('topScorerCountry',e.target.value)}
                style={{...C.sel, border:'1px solid #0e3050'}}>
                <option value="">— wybierz —</option>
                {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        )}

        <div style={{marginTop:24, display:'flex', justifyContent:'flex-end', gap:12}}>
          <button onClick={() => setView('leaderboard')} style={C.btn('#1e2d3d','#ccc')}>
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
  // PREDICT – 5 kroków
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={C.page}>
      {toast && <Toast msg={toast}/>}
      {AdminModal}
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved} onAdminClick={handleAdminClick}/>

      <div style={{maxWidth:1000, margin:'0 auto', padding:'20px 16px 40px'}}>

        {(() => { const nl = getNextLock(); const cd = nl && formatCountdown(nl.time); return cd ? (
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14, background:'#0f1a0a', border:'1px solid #2a3a10', borderRadius:8, padding:'8px 14px'}}>
            <span style={{fontSize:13}}>⏳</span>
            <span style={{fontSize:13, color:'#d4a017', fontWeight:600}}>Następna blokada:</span>
            <span style={{fontSize:13, color:'#e2e8f0', fontWeight:700}}>{nl.label}</span>
            <span style={{fontSize:13, color:'#4ade80', fontWeight:800, marginLeft:4}}>za {cd}</span>
          </div>
        ) : null })()}

        <div style={{display:'flex', gap:4, marginBottom:24}}>
          {[
            {icon:'⚽', label:'Mecze',  ok: matchFilled > 0},
            {icon:'🏆', label:'Grupy',  ok: doneCount > 0},
            {icon:'⚔️', label:'Puchar', ok: semifinalistsDone},
            {icon:'🥇', label:'Mistrz', ok: championDone},
            {icon:'📋', label:'Zapis',  ok: false},
          ].map(({icon,label,ok},i) => (
            <button key={i} onClick={()=>setStep(i)} style={{
              flex:1, minWidth:0, padding:'10px 4px',
              background: step===i?'#d4a017':ok?'#1a2e1a':'#161d27',
              color: step===i?'#000':ok?'#4ade80':'#6b7a8d',
              border:`1px solid ${step===i?'#d4a017':ok?'#2a4d2a':'#1e2d3d'}`,
              borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:step===i?700:500,
            }}>
              {icon} {label}{ok&&step!==i?' ✓':''}
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
                  background: matchGroup===g?'#d4a017':allLocked?'#1a1010':'#1e2d3d',
                  color: matchGroup===g?'#000':allLocked?'#f87171':'#e2e8f0',
                  border:'1px solid '+(matchGroup===g?'#d4a017':allLocked?'#3a1a1a':'#2a3f55'),
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
            {[1,2,3].map(md => {
              const mdFirstLock = getMatchLock(matchGroup, md)
              return (
                <div key={md} style={{paddingTop:md>1?14:0,borderTop:md>1?'1px solid #1e2d3d':'none',marginBottom:4}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                    <span style={{...C.muted, fontSize:12, fontWeight:600}}>Kolejka {md}</span>
                    <LockBadge lockTime={mdFirstLock}/>
                  </div>
                  {MATCHES[matchGroup].filter(m=>m.matchday===md).map(m => {
                    const key   = matchKey(matchGroup, m)
                    const score = pred.matchScores?.[key]||{h:'',a:''}
                    const actual= results.matchScores?.[key]
                    const filled = score.h!==''&&score.a!==''
                    const hasResult = actual?.h!==''&&actual?.a!==''
                    const matchLocked = isMatchKickoffPassed(matchGroup, m)
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
                        <span style={{textAlign:'right',fontSize:14,color:filled?'#e2e8f0':matchLocked?'#4a5568':'#bcc6d4',fontWeight:filled?600:400}}>
                          <Flag team={m.home}/>{m.home}
                        </span>
                        <div style={{display:'flex', alignItems:'center', gap:5, flexDirection:'column'}}>
                          <div style={{display:'flex', alignItems:'center', gap:5}}>
                            <ScoreInput val={score.h} onChange={v=>setMatchScore(matchGroup,m,'h',v)} locked={matchLocked}/>
                            <span style={{...C.muted, fontWeight:800, fontSize:18}}>:</span>
                            <ScoreInput val={score.a} onChange={v=>setMatchScore(matchGroup,m,'a',v)} locked={matchLocked}/>
                          </div>
                          {hasResult && (
                            <div style={{display:'flex', alignItems:'center', gap:6, marginTop:4}}>
                              <span style={{fontSize:10, color:'#4a5568', fontWeight:500}}>wynik</span>
                              <span style={{
                                fontSize:15, fontWeight:800,
                                color: pts===4?'#4ade80': pts===3?'#67d7f5': pts===2?'#f0b429': pts===0?'#f87171':'#e2e8f0',
                                background: pts===4?'rgba(74,222,128,0.12)': pts===3?'rgba(103,215,245,0.12)': pts===2?'rgba(240,180,41,0.12)': pts===0?'rgba(248,113,113,0.12)':'rgba(255,255,255,0.06)',
                                borderRadius:6, padding:'2px 8px',
                              }}>
                                {actual.h}:{actual.a}
                              </span>
                              {pts !== null
                                ? <span style={{fontWeight:700, fontSize:12,
                                    color: pts===4?'#4ade80': pts===3?'#67d7f5': pts===2?'#f0b429':'#f87171'}}>
                                    {pts>0?`+${pts} pkt`:'✗ 0 pkt'}
                                  </span>
                                : <span style={{fontSize:11, color:'#4a5568'}}>(brak typowania)</span>
                              }
                            </div>
                          )}
                        </div>
                        <span style={{textAlign:'left',fontSize:14,color:filled?'#e2e8f0':matchLocked?'#4a5568':'#bcc6d4',fontWeight:filled?600:400}}>
                          <Flag team={m.away}/>{m.away}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
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
                <div key={g} style={C.card({border:pred.groupWinners[g]?'1px solid #d4a017':'1px solid #1e2d3d',opacity:locked?0.75:1})}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                    <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:13,borderRadius:6,padding:'2px 10px'}}>GR {g}</span>
                    <LockBadge lockTime={GROUP_LOCK_UTC[g]}/>
                    {pred.groupWinners[g]&&<span style={{...C.gold,fontSize:12,fontWeight:600,marginLeft:'auto'}}><Flag team={pred.groupWinners[g]} size={16}/>{pred.groupWinners[g]}</span>}
                  </div>
                  {GROUPS[g].map(team => (
                    <label key={team} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,
                      cursor:locked?'not-allowed':'pointer',background:pred.groupWinners[g]===team?'rgba(212,160,23,0.1)':'transparent',marginBottom:3}}>
                      <input type="radio" name={`g${g}`} disabled={locked}
                        checked={pred.groupWinners[g]===team} onChange={()=>setGW(g,team)}
                        style={{accentColor:'#d4a017',width:16,height:16}}/>
                      <span style={{color:pred.groupWinners[g]===team?'#f0b429':locked?'#4a5568':'#bcc6d4',fontSize:14}}>
                        <Flag team={team}/>{team}
                      </span>
                    </label>
                  ))}
                  {locked&&!pred.groupWinners[g]&&<p style={{...C.red,fontSize:12,marginTop:8,textAlign:'center'}}>⚠️ Nie wytypowano przed blokadą</p>}
                </div>
              )
            })}
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <button onClick={()=>setStep(0)} style={C.btn('#1e2d3d','#ccc')}>← Mecze</button>
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
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
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
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <button onClick={()=>setStep(1)} style={C.btn('#1e2d3d','#ccc')}>← Grupy</button>
            <button onClick={()=>setStep(3)} style={C.btn('#d4a017','#000')}>Dalej → Mistrz świata</button>
          </div>
        </>)}

        {/* ── KROK 3: MISTRZ ────────────────────────────────────────────── */}
        {step === 3 && (<>
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
                {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              {pred.winner&&<div style={{marginTop:14,textAlign:'center'}}><div style={{fontSize:52}}><Flag team={pred.winner} size={48}/></div><div style={{...C.gold,fontWeight:800,fontSize:22,marginTop:6}}>{pred.winner}</div></div>}
            </div>
            <div style={C.card({border:'1px solid #0e3050', background:'#0b1520'})}>
              <h4 style={{...C.sky,margin:'0 0 12px',fontSize:16}}>⚽ Kraj najlepszego strzelca turnieju</h4>
              <select disabled={knockoutLocked} value={pred.topScorerCountry} onChange={e=>setKey('topScorerCountry',e.target.value)}
                style={{...C.sel,border:'1px solid #0e3050',fontSize:15,padding:'12px 14px',opacity:knockoutLocked?0.5:1}}>
                <option value="">— wybierz kraj —</option>
                {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <button onClick={()=>setStep(2)} style={C.btn('#1e2d3d','#ccc')}>← Puchar</button>
            <button onClick={()=>setStep(4)} style={C.btn('#d4a017','#000')}>Dalej → Podsumowanie</button>
          </div>
        </>)}

        {/* ── KROK 4: PODSUMOWANIE ──────────────────────────────────────── */}
        {step === 4 && (<>
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
                  <div key={g} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 8px',background:isGroupLocked(g)?'#1a1010':'#1e2d3d',borderRadius:5}}>
                    <span style={{background:'#d4a017',color:'#000',fontWeight:800,fontSize:10,borderRadius:3,padding:'1px 5px',minWidth:16,textAlign:'center'}}>{g}</span>
                    <span style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {pred.groupWinners[g]?<><Flag team={pred.groupWinners[g]} size={14}/>{pred.groupWinners[g]}</>:<span style={{color:isGroupLocked(g)?'#f87171':'#6b7a8d'}}>{isGroupLocked(g)?'⚠️':'—'}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={C.card()}>
                <h4 style={{...C.gold,margin:'0 0 8px',fontSize:14}}>⚔️ Półfinaliści</h4>
                {pred.semifinalists.map((t,i)=><div key={i} style={{color:'#bcc6d4',fontSize:13,marginBottom:3}}>#{i+1} {t?<><Flag team={t} size={14}/>{t}</>:<span style={{color:'#2a3f55'}}>—</span>}</div>)}
              </div>
              <div style={C.card()}>
                <h4 style={{...C.gold,margin:'0 0 8px',fontSize:14}}>🎖️ Finał</h4>
                <div style={{color:'#bcc6d4',fontSize:13}}>{pred.finalist1?<><Flag team={pred.finalist1} size={14}/>{pred.finalist1}</>:'—'}<span style={{color:'#2a3f55'}}> vs </span>{pred.finalist2?<><Flag team={pred.finalist2} size={14}/>{pred.finalist2}</>:'—'}</div>
              </div>
              <div style={C.card({border:'1px solid #3a5020',background:'#111c0f'})}>
                <div style={{...C.muted,fontSize:11}}>🏆 MISTRZ ŚWIATA 2026</div>
                <div style={{...C.gold,fontSize:18,fontWeight:800,marginTop:4}}>{pred.winner?<><Flag team={pred.winner} size={16}/>{pred.winner}</>:<span style={{color:'#2a3f55',fontSize:13}}>Nie wybrano</span>}</div>
              </div>
              <div style={C.card({border:'1px solid #0e3050',background:'#0b1520'})}>
                <div style={{...C.muted,fontSize:11}}>⚽ KRAJ TOP STRZELCA</div>
                <div style={{...C.sky,fontSize:16,fontWeight:700,marginTop:4}}>{pred.topScorerCountry?<><Flag team={pred.topScorerCountry} size={16}/>{pred.topScorerCountry}</>:<span style={{color:'#2a3f55',fontSize:13}}>Nie wybrano</span>}</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <button onClick={()=>setStep(3)} style={C.btn('#1e2d3d','#ccc')}>← Edytuj</button>
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
