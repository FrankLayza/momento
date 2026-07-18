// Implements LR-1 — no blockchain vocabulary in fan-facing strings
export const TEAM_TO_ISO: Record<string, string> = {
  Spain: 'es',
  Belgium: 'be',
  Argentina: 'ar',
  France: 'fr',
  England: 'gb-eng',
  Brazil: 'br',
  Germany: 'de',
  Portugal: 'pt',
  Netherlands: 'nl',
  Uruguay: 'uy',
  Switzerland: 'ch',
  Norway: 'no',
  Japan: 'jp',
  Morocco: 'ma',
  Senegal: 'sn',
  Vietnam: 'vn',
  Myanmar: 'mm',
  Australia: 'au',
  India: 'in',
  // Expand as TxLINE team names are confirmed
}

export function flagUrl(team: string, size: 20 | 40 | 80 | 160 = 40): string {
  const iso = TEAM_TO_ISO[team] ?? 'un'
  return `https://flagcdn.com/w${size}/${iso}.png`
}
