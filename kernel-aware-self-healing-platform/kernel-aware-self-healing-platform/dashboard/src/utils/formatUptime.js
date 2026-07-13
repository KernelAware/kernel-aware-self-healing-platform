export function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const dDisplay = d > 0 ? `${d}d ` : ''
  const hDisplay = h > 0 ? `${String(h).padStart(2, '0')}h ` : ''
  const mDisplay = m > 0 ? `${String(m).padStart(2, '0')}m ` : ''
  const sDisplay = s > 0 ? `${String(s).padStart(2, '0')}s` : ''

  return (dDisplay + hDisplay + mDisplay + sDisplay).trim() || '0s'
}
