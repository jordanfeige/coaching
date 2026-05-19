/** Full path format: `{bucket}/{path/in/bucket}` e.g. `videos/free-analysis/abc.mp4` */

export function fullStoragePath(bucket: string, pathInBucket: string) {
  const trimmed = pathInBucket.replace(/^\/+/, '')
  if (trimmed.startsWith(`${bucket}/`)) return trimmed
  return `${bucket}/${trimmed}`
}

export function parseStoragePath(fullPath: string): { bucket: string; path: string } {
  const trimmed = fullPath.trim().replace(/^\/+/, '')
  if (!trimmed) return { bucket: 'videos', path: '' }

  const slash = trimmed.indexOf('/')
  if (slash === -1) {
    // Legacy rows: path only, always in `videos` bucket (e.g. free-analysis/xxx.mp4)
    return { bucket: 'videos', path: trimmed }
  }

  const bucket = trimmed.slice(0, slash)
  const path = trimmed.slice(slash + 1)
  return { bucket, path }
}
