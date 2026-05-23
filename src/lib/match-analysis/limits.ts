/** Max Film Room raw match video upload (GCS + client/API validation). */
export const MAX_MATCH_VIDEO_BYTES = 5120 * 1024 * 1024 // 5 GB (5120 MB)

export const MAX_MATCH_VIDEO_MB = MAX_MATCH_VIDEO_BYTES / 1024 / 1024

/** User-facing size label for upload errors and hints. */
export const MAX_MATCH_VIDEO_LABEL = '5 GB'
