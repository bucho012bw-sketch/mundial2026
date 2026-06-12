export default async function handler(req, res) {
  const key = process.env.VITE_FOOTBALL_API_KEY
  if (!key) return res.status(500).json({ error: 'No API key' })

  try {
    const resp = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': key } }
    )
    const data = await resp.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
