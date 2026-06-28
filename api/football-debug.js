export default async function handler(req, res) {
  const key = process.env.VITE_FOOTBALL_API_KEY
  if (!key) return res.json({ error: 'Brak klucza API (VITE_FOOTBALL_API_KEY)' })

  try {
    const resp = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': key } }
    )
    const data = await resp.json()
    const matches = data.matches || []

    const KNOWN_STAGES = new Set(['GROUP_STAGE'])
    const stagesFound = [...new Set(matches.map(m => m.stage))].sort()

    const finished = matches.filter(m =>
      m.score?.fullTime?.home != null && m.score?.fullTime?.away != null
    )

    const koMatches = matches.filter(m => !KNOWN_STAGES.has(m.stage))

    const allTeamNames = [...new Set(matches.flatMap(m => [m.homeTeam?.name, m.awayTeam?.shortName, m.awayTeam?.tla].filter(Boolean)))]

    res.json({
      httpStatus: resp.status,
      apiError: data.message || data.error || null,
      competitionName: data.competition?.name || null,
      totalMatches: matches.length,
      matchesWithScore: finished.length,
      stagesFound,
      koMatchCount: koMatches.length,
      koSample: koMatches.slice(0, 8).map(m => ({
        stage: m.stage,
        status: m.status,
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        utcDate: m.utcDate,
      })),
      sample: finished.slice(0, 5).map(m => ({
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        score: m.score?.fullTime,
        status: m.status,
        stage: m.stage,
      })),
    })
  } catch (e) {
    res.json({ error: e.message })
  }
}
