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
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
  B: ['Canada', 'Bosnia & Herz.', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['USA', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curaçao', "Côte d'Ivoire", 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'DR Congo', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Iraq', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

export const FLAGS = {
  Mexico: '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czech Republic': '🇨🇿',
  Canada: '🇨🇦', 'Bosnia & Herz.': '🇧🇦', Qatar: '🇶🇦', Switzerland: '🇨🇭',
  Brazil: '🇧🇷', Morocco: '🇲🇦', Haiti: '🇭🇹', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA: '🇺🇸', Paraguay: '🇵🇾', Australia: '🇦🇺', Türkiye: '🇹🇷',
  Germany: '🇩🇪', Curaçao: '🇨🇼', "Côte d'Ivoire": '🇨🇮', Ecuador: '🇪🇨',
  Netherlands: '🇳🇱', Japan: '🇯🇵', Sweden: '🇸🇪', Tunisia: '🇹🇳',
  Belgium: '🇧🇪', Egypt: '🇪🇬', Iran: '🇮🇷', 'New Zealand': '🇳🇿',
  Spain: '🇪🇸', 'Cabo Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', Uruguay: '🇺🇾',
  France: '🇫🇷', Senegal: '🇸🇳', 'DR Congo': '🇨🇩', Norway: '🇳🇴',
  Argentina: '🇦🇷', Algeria: '🇩🇿', Austria: '🇦🇹', Jordan: '🇯🇴',
  Portugal: '🇵🇹', Iraq: '🇮🇶', Uzbekistan: '🇺🇿', Colombia: '🇨🇴',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Croatia: '🇭🇷', Ghana: '🇬🇭', Panama: '🇵🇦',
}

export const GROUP_LETTERS = Object.keys(GROUPS)
export const ALL_TEAMS = [...new Set(Object.values(GROUPS).flat())].sort()

export const SCORING = [
  { label: 'Zwycięzca grupy (×12)', pts: 3 },
  { label: 'Półfinalista (×4)', pts: 3 },
  { label: 'Finalista (×2)', pts: 5 },
  { label: 'Mistrz świata', pts: 10 },
  { label: 'Kraj top strzelca', pts: 5 },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const isGroupLocked = (group) => new Date() >= GROUP_LOCK_UTC[group]
export const isKnockoutLocked = () => new Date() >= KNOCKOUT_LOCK_UTC

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
}
