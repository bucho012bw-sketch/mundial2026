// ─── BLOKADY TYPOWANIA ────────────────────────────────────────────────────────
// Blokada zwycięzcy grupy = kickoff pierwszego meczu w tej grupie (UTC)
// Źródło: FIFA official schedule / kickoffclock.com
//
// Matchday 1 group stage:
// A: Jun 11 19:00 – Mexico vs South Africa
// B: Jun 12 19:00 – Canada vs Bosnia & Herz.
// C: Jun 13 22:00 – Brazil vs Morocco
// D: Jun 13 01:00 – USA vs Paraguay
// E: Jun 14 17:00 – Germany vs Curaçao
// F: Jun 14 20:00 – Netherlands vs Japan
// G: Jun 15 22:00 – Belgium vs Egypt
// H: Jun 15 17:00 – Spain vs Cape Verde
// I: Jun 16 19:00 – France vs Senegal
// J: Jun 17 01:00 – Argentina vs Algeria
// K: Jun 17 17:00 – Portugal vs DR Congo
// L: Jun 17 20:00 – England vs Croatia
// ─────────────────────────────────────────────────────────────────────────────

export const GROUP_LOCK_UTC = {
  A: new Date('2026-06-11T19:00:00Z'),
  B: new Date('2026-06-12T19:00:00Z'),
  C: new Date('2026-06-13T22:00:00Z'),
  D: new Date('2026-06-13T01:00:00Z'),
  E: new Date('2026-06-14T17:00:00Z'),
  F: new Date('2026-06-14T20:00:00Z'),
  G: new Date('2026-06-15T22:00:00Z'),
  H: new Date('2026-06-15T17:00:00Z'),
  I: new Date('2026-06-16T19:00:00Z'),
  J: new Date('2026-06-17T01:00:00Z'),
  K: new Date('2026-06-17T17:00:00Z'),
  L: new Date('2026-06-17T20:00:00Z'),
}

// Typowania fazowe (półfinały, finaliści, mistrz, top strzelec)
// Blokada = start Rundy 32 = 28 czerwca 2026 00:00 UTC
export const KNOCKOUT_LOCK_UTC = new Date('2026-06-28T00:00:00Z')

// ─── DANE TURNIEJU ─────────────────────────────────────────────────────────────
export const GROUPS = {
  A: ['Meksyk', 'RPA', 'Korea Płd.', 'Czechy'],
  B: ['Kanada', 'Bośnia i Herc.', 'Katar', 'Szwajcaria'],
  C: ['Brazylia', 'Maroko', 'Haiti', 'Szkocja'],
  D: ['USA', 'Paragwaj', 'Australia', 'Turcja'],
  E: ['Niemcy', 'Curaçao', 'Wybrzeże K.Śł.', 'Ekwador'],
  F: ['Holandia', 'Japonia', 'Szwecja', 'Tunezja'],
  G: ['Belgia', 'Egipt', 'Iran', 'Nowa Zelandia'],
  H: ['Hiszpania', 'Cabo Verde', 'Arabia Saud.', 'Urugwaj'],
  I: ['Francja', 'Senegal', 'DR Kongo', 'Norwegia'],
  J: ['Argentyna', 'Algieria', 'Austria', 'Jordania'],
  K: ['Portugalia', 'Irak', 'Uzbekistan', 'Kolumbia'],
  L: ['Anglia', 'Chorwacja', 'Ghana', 'Panama'],
}

export const FLAGS = {
  Meksyk: '🇲🇽', RPA: '🇿🇦', 'Korea Płd.': '🇰🇷', Czechy: '🇨🇿',
  Kanada: '🇨🇦', 'Bośnia i Herc.': '🇧🇦', Katar: '🇶🇦', Szwajcaria: '🇨🇭',
  Brazylia: '🇧🇷', Maroko: '🇲🇦', Haiti: '🇭🇹', Szkocja: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA: '🇺🇸', Paragwaj: '🇵🇾', Australia: '🇦🇺', Turcja: '🇹🇷',
  Niemcy: '🇩🇪', Curaçao: '🇨🇼', 'Wybrzeże K.Śł.': '🇨🇮', Ekwador: '🇪🇨',
  Holandia: '🇳🇱', Japonia: '🇯🇵', Szwecja: '🇸🇪', Tunezja: '🇹🇳',
  Belgia: '🇧🇪', Egipt: '🇪🇬', Iran: '🇮🇷', 'Nowa Zelandia': '🇳🇿',
  Hiszpania: '🇪🇸', 'Cabo Verde': '🇨🇻', 'Arabia Saud.': '🇸🇦', Urugwaj: '🇺🇾',
  Francja: '🇫🇷', Senegal: '🇸🇳', 'DR Kongo': '🇨🇩', Norwegia: '🇳🇴',
  Argentyna: '🇦🇷', Algieria: '🇩🇿', Austria: '🇦🇹', Jordania: '🇯🇴',
  Portugalia: '🇵🇹', Irak: '🇮🇶', Uzbekistan: '🇺🇿', Kolumbia: '🇨🇴',
  Anglia: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Chorwacja: '🇭🇷', Ghana: '🇬🇭', Panama: '🇵🇦',
}

export const GROUP_LETTERS = Object.keys(GROUPS)
export const ALL_TEAMS = [...new Set(Object.values(GROUPS).flat())].sort()

// ─── MECZE GRUPOWE ────────────────────────────────────────────────────────────
// Standardowy round-robin dla 4 drużyn [T0,T1,T2,T3]:
//   MD1: T0vT1, T2vT3 | MD2: T0vT2, T1vT3 | MD3: T0vT3, T1vT2
export const MATCHES = Object.fromEntries(
  Object.entries(GROUPS).map(([g, [T0, T1, T2, T3]]) => [g, [
    { home: T0, away: T1, matchday: 1 },
    { home: T2, away: T3, matchday: 1 },
    { home: T0, away: T2, matchday: 2 },
    { home: T1, away: T3, matchday: 2 },
    { home: T0, away: T3, matchday: 3 },
    { home: T1, away: T2, matchday: 3 },
  ]])
)

export const matchKey = (g, m) => `${g}_${m.home}v${m.away}`

export const SCORING_MATCHES = [
  { label: 'Poprawny wynik meczu (wygrana / remis)', pts: 2 },
  { label: 'Dokładny wynik meczu', pts: 4 },
]

export const SCORING_BONUS = [
  { label: 'Zwycięzca grupy (×12) — BONUS', pts: 3 },
  { label: 'Półfinalista (×4) — BONUS', pts: 3 },
  { label: 'Finalista (×2) — BONUS', pts: 5 },
  { label: 'Mistrz świata — BONUS', pts: 10 },
  { label: 'Kraj top strzelca — BONUS', pts: 5 },
]

export const SCORING = [...SCORING_MATCHES, ...SCORING_BONUS]

export const EMPTY_RESULTS = {
  matchScores: Object.fromEntries(
    Object.entries(MATCHES).flatMap(([g, ms]) =>
      ms.map(m => [matchKey(g, m), { h: '', a: '' }])
    )
  ),
  groupWinners:    Object.fromEntries(GROUP_LETTERS.map(g => [g, ''])),
  semifinalists:   ['', '', '', ''],
  finalist1: '', finalist2: '', winner: '', topScorerCountry: '',
}

export function calcScore(pred, results) {
  if (!pred || !results) return { matchPts: 0, bonusPts: 0, total: 0 }
  let matchPts = 0, bonusPts = 0

  for (const [key, actual] of Object.entries(results.matchScores || {})) {
    if (actual.h === '' || actual.a === '') continue
    const up = pred.matchScores?.[key]
    if (!up || up.h === '' || up.a === '') continue
    const ah = parseInt(actual.h), aa = parseInt(actual.a)
    const uh = parseInt(up.h),     ua = parseInt(up.a)
    if (uh === ah && ua === aa) {
      matchPts += 4
    } else {
      const ar = ah > aa ? 1 : ah < aa ? -1 : 0
      const ur = uh > ua ? 1 : uh < ua ? -1 : 0
      if (ar === ur) matchPts += 2
    }
  }

  GROUP_LETTERS.forEach(g => {
    if (results.groupWinners?.[g] && pred.groupWinners?.[g] === results.groupWinners[g])
      bonusPts += 3
  })

  const actualSFs = (results.semifinalists || []).filter(Boolean)
  ;(pred.semifinalists || []).forEach(sf => {
    if (sf && actualSFs.includes(sf)) bonusPts += 3
  })

  const actualFs = [results.finalist1, results.finalist2].filter(Boolean)
  ;[pred.finalist1, pred.finalist2].forEach(f => {
    if (f && actualFs.includes(f)) bonusPts += 5
  })

  if (pred.winner && pred.winner === results.winner) bonusPts += 10
  if (pred.topScorerCountry && pred.topScorerCountry === results.topScorerCountry) bonusPts += 5

  return { matchPts, bonusPts, total: matchPts + bonusPts }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const isGroupLocked = (group) => new Date() >= GROUP_LOCK_UTC[group]
export const isKnockoutLocked = () => new Date() >= KNOCKOUT_LOCK_UTC

// Blokada konkretnej kolejki w grupie (MD1 = kickoff 1. meczu, MD2 = +5 dni, MD3 = +10 dni)
export const getMatchLock = (g, matchday) => {
  const base = GROUP_LOCK_UTC[g]
  if (matchday === 2) return new Date(base.getTime() + 5 * 24 * 60 * 60 * 1000)
  if (matchday === 3) return new Date(base.getTime() + 10 * 24 * 60 * 60 * 1000)
  return base
}
export const isMatchLocked = (g, matchday) => new Date() >= getMatchLock(g, matchday)

export const formatLockTime = (dt) => {
  if (!dt) return ''
  return dt.toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  }) + ' CET'
}

export const EMPTY_PRED = {
  groupWinners: Object.fromEntries(GROUP_LETTERS.map((g) => [g, ''])),
  semifinalists: ['', '', '', ''],
  finalist1: '',
  finalist2: '',
  winner: '',
  topScorerCountry: '',
  matchScores: Object.fromEntries(
    Object.entries(MATCHES).flatMap(([g, ms]) =>
      ms.map(m => [matchKey(g, m), { h: '', a: '' }])
    )
  ),
}
