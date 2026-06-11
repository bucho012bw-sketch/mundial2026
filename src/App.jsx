import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import {
  GROUPS, FLAGS, GROUP_LETTERS, ALL_TEAMS, SCORING, EMPTY_PRED,
  MATCHES, matchKey,
  GROUP_LOCK_UTC, KNOCKOUT_LOCK_UTC,
  isGroupLocked, isKnockoutLocked, formatLockTime,
} from './data/schedule'

// ─── CSS helpers ──────────────────────────────────────────────────────────────
const C = {
  page:   { minHeight:'100vh', background:'#0b0f13', fontFamily:"'Segoe UI',system-ui,sans-serif", color:'#e2e8f0' },
  header: { background:'linear-gradient(135deg,#07290a 0%,#0f4015 60%,#07290a 100%)',
            padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center',
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

const f = (t) => t ? `${FLAGS[t]||'🏳️'} ${t}` : null

// ─── NAV ──────────────────────────────────────────────────────────────────────
function NavBar({ username, view, setView, onLogout, saved }) {
  return (
    <div style={C.header}>
      <div>
        <h2 style={{...C.gold, margin:0, fontSize:18}}>⚽ Mundial 2026 · Typer</h2>
        {username && (
          <p style={{...C.muted, margin:0, fontSize:12}}>
            Cześć, <strong style={{color:'#d4a017'}}>{username}</strong>
            {saved ? ' · ✅ Zapisano' : ''}
          </p>
        )}
      </div>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        {username && view !== 'predict' && (
          <button onClick={() => setView('predict')} style={C.btn('#d4a017','#000')}>✏️ Typowanie</button>
        )}
        {view !== 'leaderboard' && (
          <button onClick={() => setView('leaderboard')} style={C.btn('#1e2d3d','#ccc')}>📊 Ranking</button>
        )}
        {view !== 'rules' && (
          <button onClick={() => setView('rules')} style={C.btn('#1e2d3d','#6b7a8d')}>ℹ️</button>
        )}
        <button onClick={onLogout} style={C.btn('#1e2d3d','#6b7a8d')}>🚪</button>
      </div>
    </div>
  )
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
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

// ─── LOCK BADGE ───────────────────────────────────────────────────────────────
function LockBadge({ lockTime }) {
  const locked = new Date() >= lockTime
  if (locked) return (
    <span style={{fontSize:11, background:'#3a1a1a', color:'#f87171', borderRadius:4, padding:'2px 8px', marginLeft:6}}>
      🔒 Zablokowane
    </span>
  )
  return (
    <span style={{fontSize:11, background:'#1a2e1a', color:'#4ade80', borderRadius:4, padding:'2px 8px', marginLeft:6}}>
      🟢 Blokada: {formatLockTime(lockTime)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]         = useState('login')
  const [username, setUser]     = useState('')
  const [nameInput, setName]    = useState('')
  const [step, setStep]         = useState(0)
  const [pred, setPred]         = useState(EMPTY_PRED)
  const [allPreds, setAll]      = useState([])
  const [loading, setLoading]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const [toast, setToast]       = useState('')
  const [matchGroup, setMatchGroup] = useState(GROUP_LETTERS[0])
  const [, tick]                = useState(0)   // re-render for lock countdown

  // Tick every minute to update lock states
  useEffect(() => {
    const id = setInterval(() => tick(n => n+1), 60_000)
    return () => clearInterval(id)
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  // ── Supabase helpers ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error && data) setAll(data)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Realtime subscription – auto-refresh leaderboard
  useEffect(() => {
    const channel = supabase
      .channel('predictions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadAll])

  const handleLogin = async () => {
    const name = nameInput.trim()
    if (!name) return
    setUser(name)
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('username', name)
      .maybeSingle()
    if (data?.data) {
      setPred({
        ...EMPTY_PRED,
        ...data.data,
        groupWinners: { ...EMPTY_PRED.groupWinners, ...(data.data.groupWinners || {}) },
        matchScores:  { ...EMPTY_PRED.matchScores,  ...(data.data.matchScores  || {}) },
      })
      setSaved(true)
    } else {
      setPred(EMPTY_PRED)
      setSaved(false)
    }
    setStep(0)
    setView('predict')
  }

  const handleSave = async () => {
    setLoading(true)
    const payload = { username, data: pred, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('predictions')
      .upsert(payload, { onConflict: 'username' })
    if (!error) {
      setSaved(true)
      showToast('✅ Typowanie zapisane!')
      await loadAll()
      setTimeout(() => setView('leaderboard'), 800)
    } else {
      showToast('❌ Błąd zapisu – spróbuj ponownie.')
      console.error(error)
    }
    setLoading(false)
  }

  const logout = () => { setView('login'); setUser(''); setName(''); setSaved(false); setPred(EMPTY_PRED) }

  // ── Pred mutators ─────────────────────────────────────────────────────────────
  const setGW  = (g, t) => { if (!isGroupLocked(g)) setPred(p => ({ ...p, groupWinners: {...p.groupWinners, [g]:t} })) }
  const setSF  = (i, t) => { if (!isKnockoutLocked()) { const sf=[...pred.semifinalists]; sf[i]=t; setPred(p=>({...p,semifinalists:sf})) } }
  const setKey = (k, v) => { if (!isKnockoutLocked()) setPred(p => ({...p,[k]:v})) }
  const setMatchScore = (g, m, side, val) => {
    if (isGroupLocked(g)) return
    const key = matchKey(g, m)
    const num = val === '' ? '' : String(Math.max(0, parseInt(val) || 0))
    setPred(p => ({
      ...p,
      matchScores: {
        ...p.matchScores,
        [key]: { ...(p.matchScores?.[key] || { h: '', a: '' }), [side]: num },
      },
    }))
  }

  const doneCount    = GROUP_LETTERS.filter(g => pred.groupWinners[g]).length
  const matchFilled  = Object.values(pred.matchScores || {}).filter(s => s.h !== '' && s.a !== '').length
  const step0complete = GROUP_LETTERS
    .filter(g => !isGroupLocked(g))
    .every(g => pred.groupWinners[g])
    && GROUP_LETTERS.some(g => pred.groupWinners[g])
  const knockoutOk = pred.semifinalists.every(Boolean) && pred.finalist1 && pred.finalist2 && pred.winner && pred.topScorerCountry

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'login') return (
    <div style={{...C.page, display:'flex', alignItems:'center', justifyContent:'center',
                 background:'radial-gradient(ellipse at 50% 0%,#0f4015 0%,#0b0f13 70%)'}}>
      {toast && <Toast msg={toast}/>}
      <div style={{background:'#0f1923', border:'2px solid #d4a017', borderRadius:20,
                   padding:'44px 40px', maxWidth:420, width:'90%', textAlign:'center',
                   boxShadow:'0 24px 80px rgba(0,0,0,0.8)'}}>
        <div style={{fontSize:56}}>⚽</div>
        <h1 style={{...C.gold, fontSize:26, margin:'12px 0 4px'}}>Mundial 2026 · Typer</h1>
        <p style={{...C.muted, margin:'0 0 6px', fontSize:13}}>🇺🇸 USA · 🇨🇦 Kanada · 🇲🇽 Meksyk</p>
        <p style={{...C.muted, margin:'0 0 28px', fontSize:12}}>11 czerwca – 19 lipca 2026 · 48 drużyn · 104 mecze</p>

        <input
          style={C.inp}
          value={nameInput}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Twoje imię lub nick..."
          autoFocus
        />
        <button onClick={handleLogin} disabled={!nameInput.trim()}
          style={{...C.btn('#d4a017','#000',nameInput.trim()?1:0.45), width:'100%', marginTop:14, fontSize:16, padding:'14px'}}>
          Typuj! →
        </button>

        <div style={{marginTop:20, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{...C.muted, fontSize:12}}>👥 {allPreds.length} {allPreds.length===1?'typowanie':'typowań'}</span>
          <div style={{display:'flex', gap:12}}>
            <button onClick={() => setView('leaderboard')}
              style={{...C.btn('transparent','#d4a017'), padding:'4px 0', fontSize:13, textDecoration:'underline'}}>
              Podgląd →
            </button>
            <button onClick={() => setView('rules')}
              style={{...C.btn('transparent','#6b7a8d'), padding:'4px 0', fontSize:13}}>
              Punktacja
            </button>
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
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved}/>
      <div style={{maxWidth:560, margin:'40px auto', padding:'0 20px'}}>
        <h2 style={{...C.gold, marginBottom:8}}>📋 Zasady punktacji</h2>
        <p style={{...C.muted, fontSize:13, marginBottom:24}}>Punkty naliczane po zakończeniu turnieju (19 lipca 2026)</p>
        <div style={C.card({marginBottom:20})}>
          {SCORING.map(({label,pts}) => (
            <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'center',
                                     padding:'12px 0', borderBottom:'1px solid #1e2d3d'}}>
              <span style={{fontSize:15}}>{label}</span>
              <span style={{...C.gold, fontWeight:800, fontSize:18}}>{pts} pkt</span>
            </div>
          ))}
          <div style={{display:'flex', justifyContent:'space-between', paddingTop:14}}>
            <span style={{fontWeight:700}}>Maksymalnie możliwe</span>
            <span style={{...C.gold, fontWeight:800, fontSize:22}}>73 pkt</span>
          </div>
        </div>

        <div style={C.card({border:'1px solid #1e3a1e', marginBottom:16})}>
          <h4 style={{...C.green, margin:'0 0 10px'}}>🔒 Blokady typowania</h4>
          <ul style={{...C.muted, fontSize:13, lineHeight:1.9, margin:0, paddingLeft:18}}>
            <li><strong style={{color:'#e2e8f0'}}>Zwycięzca grupy</strong> → blokuje się z kickoffem 1. meczu grupy</li>
            <li><strong style={{color:'#e2e8f0'}}>Półfinały, finał, mistrz, top strzelec</strong> → blokuje się 28 czerwca (start Rundy 32)</li>
            <li>Po zalogowaniu zobaczysz kiedy blokuje się każda grupa</li>
          </ul>
        </div>

        <div style={C.card({border:'1px solid #1e2d3d'})}>
          <h4 style={{...C.gold, margin:'0 0 10px'}}>📅 Blokady grup (czas warszawski)</h4>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
            {GROUP_LETTERS.map(g => (
              <div key={g} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
                                   background: isGroupLocked(g)?'#1a1010':'#1e2d3d', borderRadius:6}}>
                <span style={{background:'#d4a017', color:'#000', fontWeight:800, fontSize:11,
                               borderRadius:4, padding:'1px 7px'}}>{g}</span>
                <span style={{fontSize:11, color: isGroupLocked(g)?'#f87171':'#4ade80'}}>
                  {isGroupLocked(g) ? '🔒 Zablokowane' : formatLockTime(GROUP_LOCK_UTC[g])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // LEADERBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'leaderboard') return (
    <div style={C.page}>
      {toast && <Toast msg={toast}/>}
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved}/>
      <div style={{maxWidth:1200, margin:'24px auto', padding:'0 16px'}}>
        <div style={{display:'flex', alignItems:'baseline', gap:12, marginBottom:20}}>
          <h2 style={{...C.gold, margin:0}}>Typowania ({allPreds.length})</h2>
          <span style={{...C.muted, fontSize:12}}>• aktualizuje się na żywo</span>
        </div>

        {allPreds.length === 0 ? (
          <div style={{...C.card(), textAlign:'center', padding:60}}>
            <div style={{fontSize:48}}>🏟️</div>
            <p style={{...C.muted, marginTop:12}}>Brak typowań — bądź pierwszy!</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', background:'#161d27',
                           borderRadius:14, overflow:'hidden', fontSize:13}}>
              <thead>
                <tr style={{background:'#111820'}}>
                  <th style={{padding:'12px 16px', textAlign:'left', color:'#d4a017', whiteSpace:'nowrap'}}>Gracz</th>
                  {GROUP_LETTERS.map(g => (
                    <th key={g} style={{padding:'12px 6px', color: isGroupLocked(g)?'#f87171':'#6b7a8d',
                                        textAlign:'center', fontSize:11, whiteSpace:'nowrap'}}>
                      {isGroupLocked(g)?'🔒':''} {g}
                    </th>
                  ))}
                  <th style={{padding:'12px 8px', color:'#6b7a8d', textAlign:'center', fontSize:11}}>⚔️ PF</th>
                  <th style={{padding:'12px 8px', color:'#6b7a8d', textAlign:'center', fontSize:11}}>🎖️ Fin</th>
                  <th style={{padding:'12px 8px', color:'#d4a017', textAlign:'center', fontSize:12}}>🏆 Mistrz</th>
                  <th style={{padding:'12px 8px', color:'#67d7f5', textAlign:'center', fontSize:11}}>⚽ Top</th>
                </tr>
              </thead>
              <tbody>
                {allPreds.map((p, i) => (
                  <tr key={i} style={{borderTop:'1px solid #1e2d3d',
                                       background: p.username===username?'rgba(212,160,23,0.05)':'transparent'}}>
                    <td style={{padding:'10px 16px', fontWeight:700, whiteSpace:'nowrap',
                                color: p.username===username?'#d4a017':'#e2e8f0'}}>
                      {p.username===username?'👤 ':''}{p.username}
                      <div style={{...C.muted, fontSize:10, fontWeight:400}}>
                        {p.updated_at ? new Date(p.updated_at).toLocaleString('pl-PL',{
                          day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'
                        }) : ''}
                      </div>
                    </td>
                    {GROUP_LETTERS.map(g => {
                      const t = p.data?.groupWinners?.[g]
                      return (
                        <td key={g} style={{padding:'8px 4px', textAlign:'center'}}>
                          {t
                            ? <span title={t} style={{fontSize:18, cursor:'help'}}>{FLAGS[t]||'🏳️'}</span>
                            : <span style={{color:'#2a3f55'}}>—</span>}
                        </td>
                      )
                    })}
                    <td style={{padding:'8px', textAlign:'center', fontSize:16}}>
                      {(p.data?.semifinalists||[]).filter(Boolean).map(t=>FLAGS[t]||'').join(' ')||<span style={{color:'#2a3f55'}}>—</span>}
                    </td>
                    <td style={{padding:'8px', textAlign:'center', fontSize:13}}>
                      {p.data?.finalist1 && p.data?.finalist2
                        ? <span style={{color:'#aab4be'}}>{FLAGS[p.data.finalist1]||''} vs {FLAGS[p.data.finalist2]||''}</span>
                        : <span style={{color:'#2a3f55'}}>—</span>}
                    </td>
                    <td style={{padding:'8px 12px', textAlign:'center', fontWeight:700, color:'#f0b429', whiteSpace:'nowrap', fontSize:14}}>
                      {p.data?.winner
                        ? `${FLAGS[p.data.winner]||''} ${p.data.winner}`
                        : <span style={{color:'#2a3f55'}}>—</span>}
                    </td>
                    <td style={{padding:'8px 12px', textAlign:'center', color:'#67d7f5', whiteSpace:'nowrap', fontSize:13}}>
                      {p.data?.topScorerCountry
                        ? `${FLAGS[p.data.topScorerCountry]||''} ${p.data.topScorerCountry}`
                        : <span style={{color:'#2a3f55'}}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{...C.muted, fontSize:11, textAlign:'center', marginTop:16}}>
          Finał: MetLife Stadium, New Jersey · 19 lipca 2026 · Punkty naliczone po turnieju
        </p>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // PREDICT
  // ═══════════════════════════════════════════════════════════════════════════
  const knockoutLocked = isKnockoutLocked()

  return (
    <div style={C.page}>
      {toast && <Toast msg={toast}/>}
      <NavBar username={username} view={view} setView={setView} onLogout={logout} saved={saved}/>

      <div style={{maxWidth:1000, margin:'0 auto', padding:'20px 16px 40px'}}>

        {/* Step tabs */}
        <div style={{display:'flex', gap:6, marginBottom:24, flexWrap:'wrap'}}>
          {[
            {icon:'🏆', label:'Grupy (A–L)',     ok: doneCount > 0},
            {icon:'⚽', label:'Mecze grupowe',    ok: matchFilled > 0},
            {icon:'⚔️', label:'Faza pucharowa',  ok: knockoutOk},
            {icon:'📋', label:'Podsumowanie',     ok: false},
          ].map(({icon,label,ok},i) => (
            <button key={i} onClick={()=>setStep(i)} style={{
              flex:1, minWidth:0, padding:'10px 6px',
              background: step===i?'#d4a017':ok?'#1a2e1a':'#161d27',
              color: step===i?'#000':ok?'#4ade80':'#6b7a8d',
              border:`1px solid ${step===i?'#d4a017':ok?'#2a4d2a':'#1e2d3d'}`,
              borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:step===i?700:500,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {icon} {label}{ok&&step!==i?' ✓':''}
            </button>
          ))}
        </div>

        {/* ── STEP 0: GRUPY ─────────────────────────────────────────────── */}
        {step === 0 && (<>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16}}>
            <h3 style={{margin:0}}>Kto wygra każdą grupę?</h3>
            <span style={{...C.muted, fontSize:13}}>
              {doneCount}/12 grup
              {doneCount === 12 && <span style={C.gold}> ✓ Komplet!</span>}
            </span>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(255px,1fr))', gap:12, marginBottom:20}}>
            {GROUP_LETTERS.map(g => {
              const locked = isGroupLocked(g)
              return (
                <div key={g} style={C.card({
                  border: pred.groupWinners[g] ? '1px solid #d4a017' : '1px solid #1e2d3d',
                  opacity: locked ? 0.75 : 1,
                })}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap'}}>
                    <span style={{background:'#d4a017', color:'#000', fontWeight:800, fontSize:13, borderRadius:6, padding:'2px 10px'}}>
                      GR {g}
                    </span>
                    <LockBadge lockTime={GROUP_LOCK_UTC[g]}/>
                    {pred.groupWinners[g] && (
                      <span style={{...C.gold, fontSize:12, fontWeight:600, marginLeft:'auto'}}>
                        {FLAGS[pred.groupWinners[g]]||''} {pred.groupWinners[g]}
                      </span>
                    )}
                  </div>

                  {GROUPS[g].map(team => (
                    <label key={team} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'8px 10px', borderRadius:8,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      background: pred.groupWinners[g]===team ? 'rgba(212,160,23,0.1)' : 'transparent',
                      marginBottom:3, transition:'background 0.1s',
                    }}>
                      <input
                        type="radio"
                        name={`g${g}`}
                        disabled={locked}
                        checked={pred.groupWinners[g]===team}
                        onChange={() => setGW(g, team)}
                        style={{accentColor:'#d4a017', width:16, height:16}}
                      />
                      <span style={{color: pred.groupWinners[g]===team?'#f0b429':locked?'#4a5568':'#bcc6d4', fontSize:14}}>
                        {FLAGS[team]||'🏳️'} {team}
                      </span>
                    </label>
                  ))}

                  {locked && !pred.groupWinners[g] && (
                    <p style={{...C.red, fontSize:12, marginTop:8, textAlign:'center'}}>
                      ⚠️ Nie wytypowano przed blokadą
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <button onClick={()=>setStep(1)} style={C.btn('#d4a017','#000')}>
              Dalej → Mecze grupowe
            </button>
          </div>
        </>)}

        {/* ── STEP 1: MECZE GRUPOWE ─────────────────────────────────────── */}
        {step === 1 && (<>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16}}>
            <h3 style={{margin:0}}>Wyniki meczów grupowych</h3>
            <span style={{...C.muted, fontSize:13}}>
              {matchFilled}/72 meczów
              {matchFilled === 72 && <span style={C.gold}> ✓ Komplet!</span>}
            </span>
          </div>

          {/* Zakładki grup */}
          <div style={{display:'flex', gap:4, flexWrap:'wrap', marginBottom:16}}>
            {GROUP_LETTERS.map(g => {
              const gFilled = MATCHES[g].filter(m => {
                const s = pred.matchScores?.[matchKey(g, m)]
                return s?.h !== '' && s?.a !== ''
              }).length
              const locked = isGroupLocked(g)
              return (
                <button key={g} onClick={() => setMatchGroup(g)} style={{
                  padding:'6px 12px',
                  background: matchGroup===g ? '#d4a017' : locked ? '#1a1010' : '#1e2d3d',
                  color: matchGroup===g ? '#000' : locked ? '#f87171' : '#e2e8f0',
                  border:'1px solid ' + (matchGroup===g ? '#d4a017' : locked ? '#3a1a1a' : '#2a3f55'),
                  borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:13,
                  position:'relative',
                }}>
                  {g}
                  {gFilled > 0 && (
                    <span style={{
                      fontSize:9, position:'absolute', top:-4, right:-4,
                      background: gFilled===6 ? '#4ade80' : '#d4a017',
                      color:'#000', borderRadius:8, padding:'1px 4px', fontWeight:800,
                    }}>{gFilled}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Mecze wybranej grupy */}
          <div style={C.card()}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap'}}>
              <span style={{background:'#d4a017', color:'#000', fontWeight:800, fontSize:14,
                             borderRadius:6, padding:'3px 12px'}}>GRUPA {matchGroup}</span>
              <LockBadge lockTime={GROUP_LOCK_UTC[matchGroup]}/>
              <span style={{...C.muted, fontSize:12, marginLeft:'auto'}}>
                {MATCHES[matchGroup].filter(m => {
                  const s = pred.matchScores?.[matchKey(matchGroup, m)]
                  return s?.h !== '' && s?.a !== ''
                }).length}/6 meczów
              </span>
            </div>

            {[1,2,3].map(md => (
              <div key={md}>
                <div style={{...C.muted, fontSize:11, padding:'8px 0 6px',
                             borderTop: md > 1 ? '1px solid #1e2d3d' : 'none',
                             marginTop: md > 1 ? 8 : 0}}>
                  Kolejka {md}
                </div>
                {MATCHES[matchGroup].filter(m => m.matchday === md).map(m => {
                  const key   = matchKey(matchGroup, m)
                  const score = pred.matchScores?.[key] || { h: '', a: '' }
                  const locked = isGroupLocked(matchGroup)
                  const filled = score.h !== '' && score.a !== ''
                  return (
                    <div key={key} style={{
                      display:'grid', gridTemplateColumns:'1fr auto 1fr',
                      alignItems:'center', gap:8, padding:'9px 4px',
                      borderBottom:'1px solid #1a2333',
                      background: filled ? 'rgba(212,160,23,0.04)' : 'transparent',
                      borderRadius:6, marginBottom:2,
                    }}>
                      <span style={{textAlign:'right', fontSize:13,
                                    color: filled ? '#e2e8f0' : '#8a9ab0', fontWeight: filled ? 600 : 400}}>
                        {FLAGS[m.home]||'🏳️'} {m.home}
                      </span>
                      <div style={{display:'flex', alignItems:'center', gap:4}}>
                        <input
                          type="number" min="0" max="30"
                          disabled={locked}
                          value={score.h}
                          onChange={e => setMatchScore(matchGroup, m, 'h', e.target.value)}
                          style={{
                            width:44, textAlign:'center', padding:'7px 4px',
                            background: locked ? '#111820' : '#1e2d3d', color:'#e2e8f0',
                            border:`1px solid ${filled ? '#d4a017' : '#2a3f55'}`,
                            borderRadius:6, fontSize:16, fontWeight:700,
                            opacity: locked ? 0.5 : 1, outline:'none',
                          }}
                        />
                        <span style={{...C.muted, fontWeight:800, fontSize:16}}>:</span>
                        <input
                          type="number" min="0" max="30"
                          disabled={locked}
                          value={score.a}
                          onChange={e => setMatchScore(matchGroup, m, 'a', e.target.value)}
                          style={{
                            width:44, textAlign:'center', padding:'7px 4px',
                            background: locked ? '#111820' : '#1e2d3d', color:'#e2e8f0',
                            border:`1px solid ${filled ? '#d4a017' : '#2a3f55'}`,
                            borderRadius:6, fontSize:16, fontWeight:700,
                            opacity: locked ? 0.5 : 1, outline:'none',
                          }}
                        />
                      </div>
                      <span style={{textAlign:'left', fontSize:13,
                                    color: filled ? '#e2e8f0' : '#8a9ab0', fontWeight: filled ? 600 : 400}}>
                        {m.away} {FLAGS[m.away]||'🏳️'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div style={{display:'flex', justifyContent:'space-between', marginTop:20}}>
            <button onClick={()=>setStep(0)} style={C.btn('#1e2d3d','#ccc')}>← Grupy</button>
            <button onClick={()=>setStep(2)} style={C.btn('#d4a017','#000')}>Dalej → Faza pucharowa</button>
          </div>
        </>)}

        {/* ── STEP 2: FAZA PUCHAROWA ────────────────────────────────────── */}
        {step === 2 && (<>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
            <h3 style={{margin:0}}>Faza pucharowa</h3>
            <LockBadge lockTime={KNOCKOUT_LOCK_UTC}/>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20}}>
            {/* Półfinały */}
            <div style={C.card()}>
              <h4 style={{...C.gold, margin:'0 0 14px', fontSize:16}}>⚔️ Cztery półfinały</h4>
              <p style={{...C.muted, fontSize:12, margin:'0 0 14px'}}>Które 4 drużyny dotrą do półfinałów?</p>
              {[0,1,2,3].map(i => (
                <div key={i} style={{marginBottom:12}}>
                  <label style={{...C.muted, fontSize:11, display:'block', marginBottom:4}}>Półfinalista #{i+1}</label>
                  <select
                    disabled={knockoutLocked}
                    value={pred.semifinalists[i]}
                    onChange={e=>setSF(i,e.target.value)}
                    style={{...C.sel, opacity:knockoutLocked?0.5:1, cursor:knockoutLocked?'not-allowed':'pointer'}}
                  >
                    <option value="">— wybierz drużynę —</option>
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{FLAGS[t]||'🏳️'} {t}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Finaliści + winner + top scorer */}
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              <div style={C.card()}>
                <h4 style={{...C.gold, margin:'0 0 12px', fontSize:16}}>🎖️ Finaliści</h4>
                {['finalist1','finalist2'].map((k,i)=>(
                  <div key={k} style={{marginBottom:12}}>
                    <label style={{...C.muted, fontSize:11, display:'block', marginBottom:4}}>Finalista #{i+1}</label>
                    <select
                      disabled={knockoutLocked}
                      value={pred[k]}
                      onChange={e=>setKey(k,e.target.value)}
                      style={{...C.sel, opacity:knockoutLocked?0.5:1}}
                    >
                      <option value="">— wybierz drużynę —</option>
                      {ALL_TEAMS.map(t=><option key={t} value={t}>{FLAGS[t]||'🏳️'} {t}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div style={C.card({border:'1px solid #3a5020', background:'#111c0f'})}>
                <h4 style={{...C.gold, margin:'0 0 10px', fontSize:15}}>🏆 Mistrz Świata 2026</h4>
                <select
                  disabled={knockoutLocked}
                  value={pred.winner}
                  onChange={e=>setKey('winner',e.target.value)}
                  style={{...C.sel, border:'1px solid #3a5020', opacity:knockoutLocked?0.5:1}}
                >
                  <option value="">— wybierz zwycięzcę —</option>
                  {ALL_TEAMS.map(t=><option key={t} value={t}>{FLAGS[t]||'🏳️'} {t}</option>)}
                </select>
              </div>

              <div style={C.card({border:'1px solid #0e3050', background:'#0b1520'})}>
                <h4 style={{...C.sky, margin:'0 0 10px', fontSize:15}}>⚽ Kraj najlepszego strzelca</h4>
                <select
                  disabled={knockoutLocked}
                  value={pred.topScorerCountry}
                  onChange={e=>setKey('topScorerCountry',e.target.value)}
                  style={{...C.sel, border:'1px solid #0e3050', opacity:knockoutLocked?0.5:1}}
                >
                  <option value="">— wybierz kraj —</option>
                  {ALL_TEAMS.map(t=><option key={t} value={t}>{FLAGS[t]||'🏳️'} {t}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{display:'flex', justifyContent:'space-between'}}>
            <button onClick={()=>setStep(1)} style={C.btn('#1e2d3d','#ccc')}>← Mecze</button>
            <button onClick={()=>setStep(3)} style={C.btn('#d4a017','#000')}>Dalej → Podsumowanie</button>
          </div>
        </>)}

        {/* ── STEP 3: PODSUMOWANIE ──────────────────────────────────────── */}
        {step === 3 && (<>
          <h3 style={{margin:'0 0 16px'}}>📋 Twoje typowanie – przegląd i zapis</h3>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24}}>
            <div style={C.card()}>
              <h4 style={{...C.gold, margin:'0 0 14px'}}>🏆 Zwycięzcy grup</h4>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
                {GROUP_LETTERS.map(g => (
                  <div key={g} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
                                       background: isGroupLocked(g)?'#1a1010':'#1e2d3d', borderRadius:6}}>
                    <span style={{background:'#d4a017', color:'#000', fontWeight:800, fontSize:10,
                                   borderRadius:4, padding:'1px 6px', minWidth:20, textAlign:'center'}}>{g}</span>
                    <span style={{fontSize:13, color:'#e2e8f0'}}>
                      {pred.groupWinners[g]
                        ? `${FLAGS[pred.groupWinners[g]]||''} ${pred.groupWinners[g]}`
                        : <span style={{color: isGroupLocked(g)?'#f87171':'#6b7a8d'}}>{isGroupLocked(g)?'⚠️ brak':'—'}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              <div style={C.card()}>
                <h4 style={{...C.gold, margin:'0 0 10px', fontSize:15}}>⚔️ Półfinaliści</h4>
                {pred.semifinalists.map((t,i)=>(
                  <div key={i} style={{color:'#bcc6d4', fontSize:14, marginBottom:4}}>
                    #{i+1} {t ? `${FLAGS[t]||''} ${t}` : <span style={{color:'#2a3f55'}}>—</span>}
                  </div>
                ))}
              </div>
              <div style={C.card()}>
                <h4 style={{...C.gold, margin:'0 0 10px', fontSize:15}}>🎖️ Finał</h4>
                <div style={{color:'#bcc6d4', fontSize:15}}>
                  {pred.finalist1?`${FLAGS[pred.finalist1]||''} ${pred.finalist1}`:'—'}
                  <span style={{color:'#2a3f55'}}> vs </span>
                  {pred.finalist2?`${FLAGS[pred.finalist2]||''} ${pred.finalist2}`:'—'}
                </div>
              </div>
              <div style={C.card({border:'1px solid #3a5020', background:'#111c0f'})}>
                <div style={{...C.muted, fontSize:11}}>🏆 MISTRZ ŚWIATA 2026</div>
                <div style={{...C.gold, fontSize:20, fontWeight:800, marginTop:4}}>
                  {pred.winner ? `${FLAGS[pred.winner]||''} ${pred.winner}` : <span style={{color:'#2a3f55', fontSize:14}}>Nie wybrano</span>}
                </div>
              </div>
              <div style={C.card({border:'1px solid #0e3050', background:'#0b1520'})}>
                <div style={{...C.muted, fontSize:11}}>⚽ KRAJ NAJLEPSZEGO STRZELCA</div>
                <div style={{...C.sky, fontSize:18, fontWeight:700, marginTop:4}}>
                  {pred.topScorerCountry ? `${FLAGS[pred.topScorerCountry]||''} ${pred.topScorerCountry}` : <span style={{color:'#2a3f55', fontSize:14}}>Nie wybrano</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <button onClick={()=>setStep(2)} style={C.btn('#1e2d3d','#ccc')}>← Edytuj</button>
            <button onClick={handleSave} disabled={loading}
              style={{...C.btn('#00c850','#fff'), padding:'14px 40px', fontSize:16,
                      boxShadow:'0 4px 20px rgba(0,200,80,0.3)', opacity:loading?0.7:1}}>
              {loading ? 'Zapisuję...' : '💾 Zapisz typowanie!'}
            </button>
          </div>
        </>)}
      </div>
    </div>
  )
}
