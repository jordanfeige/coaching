/** Parse GCP_SERVICE_ACCOUNT_KEY (may be wrapped in quotes in .env). */
export function parseGcpServiceAccountKey(): object {
  let raw = process.env.GCP_SERVICE_ACCOUNT_KEY?.trim()
  if (!raw) {
    throw new Error('Missing GCP_SERVICE_ACCOUNT_KEY env var')
  }
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    raw = raw.slice(1, -1)
  }
  try {
    return JSON.parse(raw) as object
  } catch {
    throw new Error('GCP_SERVICE_ACCOUNT_KEY is not valid JSON')
  }
}
