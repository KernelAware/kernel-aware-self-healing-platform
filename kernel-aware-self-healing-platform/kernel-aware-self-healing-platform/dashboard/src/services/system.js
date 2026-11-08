const DEFAULT_SYSTEM_ID = '1'

export function getConfiguredSystemId() {
  const configured = import.meta.env.VITE_SYSTEM_ID
  return String(configured || DEFAULT_SYSTEM_ID)
}

