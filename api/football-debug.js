export default async function handler(req, res) {
  const key = process.env.VITE_FOOTBALL_API_KEY
  if (!key) return res.json({ error: 'Brak klucza API (VITE_FOOTBALL_API_KEY)' })

  try {
    const resp = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': key } }
    )
    const data = await resp.json()

    const finished = (data.matches || []).filter(m =>
      m.score?.fullTime?.home != null && m.score?.fullTime?.away != null
    )

    res.json({
      httpStatus: resp.status,
      apiError: data.message || data.error || null,
      competitionName: data.competition?.name || null,
      totalMatches: data.matches?.length ?? 0,
      matchesWithScore: finished.length,
      sample: finished.slice(0, 5).map(m => ({
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        score: m.score?.fullTime,
        status: m.status,
      })),
      unmappedNames: [...new Set(
        (data.matches || []).flatMap(m => [m.homeTeam?.name, m.awayTeam?.name])
      )].filter(Boolean).slice(0, 30),
    })
  } catch (e) {
    res.json({ error: e.message })
  }
}
