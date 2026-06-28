// ─── BLOKADY TYPOWANIA ────────────────────────────────────────────────────────
// Kickoffy wszystkich meczy grupowych (UTC). Źródło: oficjalny terminarz FIFA.
// times[0] = mecz gdzie T0 gra u siebie (T0 = GROUPS[g][0])
// times[1] = drugi mecz w kolejce (T0 nie gra lub gra na wyjeździe w MD2/MD3)
// MD3 — oba mecze zawsze jednocześnie (reguła FIFA)
export const MATCHDAY_KICKOFFS = {
  A: {
    1: [new Date('2026-06-11T19:00:00Z'), new Date('2026-06-12T02:00:00Z')],
    2: [new Date('2026-06-19T01:00:00Z'), new Date('2026-06-18T16:00:00Z')], // Meksyk-Korea 03:00, Czechy-RPA 18:00 CEST
    3: [new Date('2026-06-25T01:00:00Z'), new Date('2026-06-25T01:00:00Z')],
  },
  B: {
    1: [new Date('2026-06-12T19:00:00Z'), new Date('2026-06-13T19:00:00Z')],
    2: [new Date('2026-06-18T22:00:00Z'), new Date('2026-06-18T19:00:00Z')], // Kanada-Katar 00:00, Bośnia-Szwajc 21:00 CEST
    3: [new Date('2026-06-24T19:00:00Z'), new Date('2026-06-24T19:00:00Z')],
  },
  C: {
    1: [new Date('2026-06-13T22:00:00Z'), new Date('2026-06-14T01:00:00Z')],
    2: [new Date('2026-06-20T00:30:00Z'), new Date('2026-06-19T22:00:00Z')], // Brazylia-Haiti 02:30, Maroko-Szkocja 00:00 CEST
    3: [new Date('2026-06-24T22:00:00Z'), new Date('2026-06-24T22:00:00Z')],
  },
  D: {
    1: [new Date('2026-06-13T01:00:00Z'), new Date('2026-06-13T04:00:00Z')],
    2: [new Date('2026-06-19T19:00:00Z'), new Date('2026-06-20T03:00:00Z')], // USA-Australia 21:00, Turcja-Paragwaj 05:00 CEST
    3: [new Date('2026-06-26T02:00:00Z'), new Date('2026-06-26T02:00:00Z')],
  },
  E: {
    1: [new Date('2026-06-14T17:00:00Z'), new Date('2026-06-14T23:00:00Z')],
    2: [new Date('2026-06-20T20:00:00Z'), new Date('2026-06-21T00:00:00Z')], // Niemcy-WKŚ 22:00, Ekwador-Curaçao 02:00 CEST
    3: [new Date('2026-06-25T20:00:00Z'), new Date('2026-06-25T20:00:00Z')], // 22:00 CEST
  },
  F: {
    1: [new Date('2026-06-14T22:00:00Z'), new Date('2026-06-15T02:00:00Z')],
    2: [new Date('2026-06-20T17:00:00Z'), new Date('2026-06-21T04:00:00Z')], // Holandia-Szwecja 19:00, Tunezja-Japonia 06:00 CEST
    3: [new Date('2026-06-25T23:00:00Z'), new Date('2026-06-25T23:00:00Z')],
  },
  G: {
    1: [new Date('2026-06-15T19:00:00Z'), new Date('2026-06-16T01:00:00Z')],
    2: [new Date('2026-06-21T19:00:00Z'), new Date('2026-06-22T01:00:00Z')], // Belgia-Iran 21:00, NZ-Egipt 03:00 CEST
    3: [new Date('2026-06-27T03:00:00Z'), new Date('2026-06-27T03:00:00Z')],
  },
  H: {
    1: [new Date('2026-06-15T16:00:00Z'), new Date('2026-06-15T22:00:00Z')],
    2: [new Date('2026-06-21T16:00:00Z'), new Date('2026-06-21T22:00:00Z')],
    3: [new Date('2026-06-27T00:00:00Z'), new Date('2026-06-27T00:00:00Z')],
  },
  I: {
    1: [new Date('2026-06-16T19:00:00Z'), new Date('2026-06-16T22:00:00Z')],
    2: [new Date('2026-06-22T21:00:00Z'), new Date('2026-06-23T00:00:00Z')],
    3: [new Date('2026-06-26T19:00:00Z'), new Date('2026-06-26T19:00:00Z')],
  },
  J: {
    1: [new Date('2026-06-17T01:00:00Z'), new Date('2026-06-17T04:00:00Z')],
    2: [new Date('2026-06-22T17:00:00Z'), new Date('2026-06-23T03:00:00Z')],
    3: [new Date('2026-06-28T02:00:00Z'), new Date('2026-06-28T02:00:00Z')],
  },
  K: {
    1: [new Date('2026-06-17T17:00:00Z'), new Date('2026-06-18T02:00:00Z')],
    2: [new Date('2026-06-23T17:00:00Z'), new Date('2026-06-24T02:00:00Z')],
    3: [new Date('2026-06-27T23:30:00Z'), new Date('2026-06-27T23:30:00Z')],
  },
  L: {
    1: [new Date('2026-06-17T20:00:00Z'), new Date('2026-06-17T23:00:00Z')],
    2: [new Date('2026-06-23T20:00:00Z'), new Date('2026-06-23T23:00:00Z')],
    3: [new Date('2026-06-27T21:00:00Z'), new Date('2026-06-27T21:00:00Z')],
  },
}

// GROUP_LOCK_UTC = najwcześniejszy kickoff MD2 w grupie (blokada typów)
export const GROUP_LOCK_UTC = Object.fromEntries(
  Object.entries(MATCHDAY_KICKOFFS).map(([g, mds]) => [g, mds[1][0] < mds[1][1] ? mds[1][0] : mds[1][1]])
)

// Typowania fazowe (półfinały, finaliści, mistrz, top strzelec)
// Blokada = 12 czerwca 2026 20:00 CET (18:00 UTC)
export const KNOCKOUT_LOCK_UTC = new Date('2026-06-12T18:00:00Z')

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
  I: ['Francja', 'Senegal', 'Irak', 'Norwegia'],
  J: ['Argentyna', 'Algieria', 'Austria', 'Jordania'],
  K: ['Portugalia', 'DR Kongo', 'Uzbekistan', 'Kolumbia'],
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

export const FLAG_CODES = {
  // polskie nazwy
  Meksyk: 'mx', RPA: 'za', 'Korea Płd.': 'kr', Czechy: 'cz',
  Kanada: 'ca', 'Bośnia i Herc.': 'ba', Katar: 'qa', Szwajcaria: 'ch',
  Brazylia: 'br', Maroko: 'ma', Haiti: 'ht', Szkocja: 'gb-sct',
  USA: 'us', Paragwaj: 'py', Australia: 'au', Turcja: 'tr',
  Niemcy: 'de', Curaçao: 'cw', 'Wybrzeże K.Śł.': 'ci', Ekwador: 'ec',
  Holandia: 'nl', Japonia: 'jp', Szwecja: 'se', Tunezja: 'tn',
  Belgia: 'be', Egipt: 'eg', Iran: 'ir', 'Nowa Zelandia': 'nz',
  Hiszpania: 'es', 'Cabo Verde': 'cv', 'Arabia Saud.': 'sa', Urugwaj: 'uy',
  Francja: 'fr', Senegal: 'sn', 'DR Kongo': 'cd', Norwegia: 'no',
  Argentyna: 'ar', Algieria: 'dz', Austria: 'at', Jordania: 'jo',
  Portugalia: 'pt', Irak: 'iq', Uzbekistan: 'uz', Kolumbia: 'co',
  Anglia: 'gb-eng', Chorwacja: 'hr', Ghana: 'gh', Panama: 'pa',
  // angielskie nazwy API (dla klasyfikacji strzelców)
  Mexico: 'mx', 'South Africa': 'za', 'Korea Republic': 'kr', 'South Korea': 'kr',
  Czechia: 'cz', 'Czech Republic': 'cz',
  Canada: 'ca', 'Bosnia and Herzegovina': 'ba', 'Bosnia & Herzegovina': 'ba',
  'Bosnia-Herzegovina': 'ba', 'Bosnia Herzegovina': 'ba',
  Qatar: 'qa', Switzerland: 'ch',
  Brazil: 'br', Morocco: 'ma', Scotland: 'gb-sct',
  'United States': 'us', Paraguay: 'py', Turkey: 'tr', 'Türkiye': 'tr',
  Germany: 'de', 'Côte d\'Ivoire': 'ci', 'Ivory Coast': 'ci', Ecuador: 'ec',
  Netherlands: 'nl', Japan: 'jp', Sweden: 'se', Tunisia: 'tn',
  Belgium: 'be', Egypt: 'eg', 'IR Iran': 'ir', 'New Zealand': 'nz',
  Spain: 'es', 'Cape Verde': 'cv', 'Saudi Arabia': 'sa', Uruguay: 'uy',
  France: 'fr', Iraq: 'iq', Norway: 'no',
  Argentina: 'ar', Algeria: 'dz', Jordan: 'jo',
  Portugal: 'pt', 'DR Congo': 'cd', 'Congo DR': 'cd',
  Colombia: 'co', England: 'gb-eng', Croatia: 'hr',
}

export const SHORT_NAMES = {
  Meksyk:'MEX', RPA:'RPA', 'Korea Płd.':'KOR', Czechy:'CZE',
  Kanada:'KAN', 'Bośnia i Herc.':'BIH', Katar:'QAT', Szwajcaria:'SUI',
  Brazylia:'BRA', Maroko:'MAR', Haiti:'HAI', Szkocja:'SCO',
  USA:'USA', Paragwaj:'PAR', Australia:'AUS', Turcja:'TUR',
  Niemcy:'GER', Curaçao:'CUW', 'Wybrzeże K.Śł.':'CIV', Ekwador:'ECU',
  Holandia:'NED', Japonia:'JPN', Szwecja:'SWE', Tunezja:'TUN',
  Belgia:'BEL', Egipt:'EGY', Iran:'IRN', 'Nowa Zelandia':'NZL',
  Hiszpania:'ESP', 'Cabo Verde':'CPV', 'Arabia Saud.':'KSA', Urugwaj:'URU',
  Francja:'FRA', Senegal:'SEN', Irak:'IRQ', Norwegia:'NOR',
  Argentyna:'ARG', Algieria:'ALG', Austria:'AUT', Jordania:'JOR',
  Portugalia:'POR', 'DR Kongo':'COD', Uzbekistan:'UZB', Kolumbia:'COL',
  Anglia:'ENG', Chorwacja:'CRO', Ghana:'GHA', Panama:'PAN',
}

export const GROUP_LETTERS = Object.keys(GROUPS)
export const ALL_TEAMS = [...new Set(Object.values(GROUPS).flat())].sort()

const DISPLAY_NAMES = { 'Cabo Verde': 'Zielony Przylądek' }
export const teamLabel = (name) => DISPLAY_NAMES[name] ?? name

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
  { label: 'Poprawna wygrana/remis + różnica bramek', pts: 3 },
  { label: 'Dokładny wynik meczu', pts: 4 },
]

export const SCORING_BONUS = [
  { label: 'Zwycięzca grupy (×12) — BONUS', pts: 3 },
  { label: 'Półfinalista (×4) — BONUS', pts: 3 },
  { label: 'Finalista (×2) — BONUS', pts: 5 },
  { label: 'Mistrz świata — BONUS', pts: 10 },
  { label: 'Kraj top strzelca — BONUS', pts: 5 },
]

export const SCORING_KO = [
  { label: 'Dokładny wynik (90 min + czas dolicz.) + poprawny awansujący',         pts: 5 },
  { label: 'Ta sama różnica bramek + poprawny awansujący',                          pts: 4 },
  { label: 'Dokładny wynik (90 min + czas dolicz.), błędny awansujący',            pts: 3 },
  { label: 'Ta sama różnica bramek (zły awansujący) LUB zły wynik, dobry awansujący', pts: 2 },
  { label: 'Oba błędne',                                                             pts: 0 },
]

export const SCORING = [...SCORING_MATCHES, ...SCORING_BONUS]

// ─── MECZE PUCHAROWE — SLOTY ──────────────────────────────────────────────────
// 32 sloty (R32×16, R16×8, QF×4, SF×2, 3.miejsce×1, Finał×1)
// Admin aktywuje slot wpisując drużyny + kickoff w panelu admina
export const KO_MATCH_SLOTS = [
  ...Array.from({ length: 16 }, (_, i) => ({ id: `r32_${i+1}`, round: 'R32',   label: 'Runda 32',          num: i+1 })),
  ...Array.from({ length:  8 }, (_, i) => ({ id: `r16_${i+1}`, round: 'R16',   label: '1/8 Finału',        num: i+1 })),
  ...Array.from({ length:  4 }, (_, i) => ({ id: `qf_${i+1}`,  round: 'QF',    label: 'Ćwierćfinał',       num: i+1 })),
  ...Array.from({ length:  2 }, (_, i) => ({ id: `sf_${i+1}`,  round: 'SF',    label: 'Półfinał',          num: i+1 })),
  { id: 'third', round: '3RD',   label: 'Mecz o 3. miejsce', num: 1 },
  { id: 'final', round: 'FINAL', label: 'Finał',             num: 1 },
]

export const EMPTY_RESULTS = {
  matchScores: Object.fromEntries(
    Object.entries(MATCHES).flatMap(([g, ms]) =>
      ms.map(m => [matchKey(g, m), { h: '', a: '' }])
    )
  ),
  groupWinners:    Object.fromEntries(GROUP_LETTERS.map(g => [g, ''])),
  semifinalists:   ['', '', '', ''],
  finalist1: '', finalist2: '', winner: '', topScorerCountry: '',
  koMatches: {}, // { 'r32_1': { home, away, kickoff, scoreH, scoreA, adv } }
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
      if (ar === ur) {
        if ((ah - aa) === (uh - ua)) matchPts += 3
        else matchPts += 2
      }
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

  // Mecze pucharowe: wynik po czasie regulaminowym + awansujący
  const koMatches = results.koMatches || {}
  Object.entries(koMatches).forEach(([id, match]) => {
    if (!match?.home || !match?.away) return
    if (match.scoreH === '' || match.scoreH == null || match.scoreA === '' || match.scoreA == null) return
    const predKO = pred.koMatchScores?.[id]
    if (!predKO || predKO.h === '' || predKO.a === '') return
    const ah = parseInt(match.scoreH), aa = parseInt(match.scoreA)
    const ph = parseInt(predKO.h),     pa = parseInt(predKO.a)
    const actualAdv = ah > aa ? match.home : aa > ah ? match.away : (match.adv || '')
    const predAdv   = ph > pa ? match.home : pa > ph ? match.away : (predKO.adv || '')
    const exactScore = ph === ah && pa === aa
    const sameDiff   = (ph - pa) === (ah - aa)
    const correctAdv = !!(actualAdv && predAdv && predAdv === actualAdv)
    if (exactScore && correctAdv)        matchPts += 5
    else if (sameDiff && correctAdv)     matchPts += 4
    else if (exactScore)                 matchPts += 3
    else if (correctAdv || sameDiff)     matchPts += 2
  })

  return { matchPts, bonusPts, total: matchPts + bonusPts }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const isGroupLocked = (group) => new Date() >= GROUP_LOCK_UTC[group]
export const isKnockoutLocked = () => new Date() >= KNOCKOUT_LOCK_UTC

// Blokada kolejki = kickoff najwcześniejszego meczu w danej kolejce
export const getMatchLock = (g, matchday) => {
  const [t0, t1] = MATCHDAY_KICKOFFS[g][matchday]
  return t0 < t1 ? t0 : t1
}
export const isMatchLocked = (g, matchday) => new Date() >= getMatchLock(g, matchday)

// Blokada konkretnego meczu = jego własny kickoff
export const getMatchKickoff = (g, m) => {
  const idx = m.home === GROUPS[g][0] ? 0 : 1
  return MATCHDAY_KICKOFFS[g][m.matchday][idx]
}
export const isMatchKickoffPassed = (g, m) => new Date() >= getMatchKickoff(g, m)

export const formatLockTime = (dt) => {
  if (!dt) return ''
  return dt.toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  }) + ' CEST'
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
  koMatchScores: {}, // sparse: { 'r32_1': { h, a, adv } }
}
