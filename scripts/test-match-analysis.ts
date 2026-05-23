/**
 * Usage:
 *   npx tsx scripts/test-match-analysis.ts /path/to/match.mp4
 *
 * Requires dev server running and auth cookie from browser:
 *   DevTools → Application → Cookies → copy sb-*-auth-token value
 *
 *   MATCH_ANALYSIS_COOKIE="sb-xxx-auth-token=..." npx tsx scripts/test-match-analysis.ts ./match.mp4
 */

import fs from 'fs'
import path from 'path'

async function testMatchAnalysis() {
  const videoPath = process.argv[2]
  const baseUrl = process.env.MATCH_ANALYSIS_BASE_URL || 'http://localhost:3000'
  const cookie = process.env.MATCH_ANALYSIS_COOKIE

  if (!videoPath) {
    console.error(
      'Usage: MATCH_ANALYSIS_COOKIE="..." npx tsx scripts/test-match-analysis.ts /path/to/match.mp4',
    )
    process.exit(1)
  }

  if (!cookie) {
    console.error(
      'Set MATCH_ANALYSIS_COOKIE to your Supabase auth cookie from the browser.',
    )
    console.error(
      'Easier: visit http://localhost:3000/dashboard/match-analysis-test while signed in.',
    )
    process.exit(1)
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`File not found: ${videoPath}`)
    process.exit(1)
  }

  const fileBuffer = fs.readFileSync(videoPath)
  const fileSizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1)

  console.log(`Uploading ${path.basename(videoPath)} (${fileSizeMB}MB)...`)
  console.log('This may take 5–15 minutes for a full match.\n')

  const formData = new FormData()
  formData.append(
    'video',
    new Blob([fileBuffer], { type: 'video/mp4' }),
    path.basename(videoPath),
  )
  formData.append('opponent_name', process.env.MATCH_OPPONENT || 'M. Patel')
  formData.append(
    'match_context',
    process.env.MATCH_CONTEXT || '12U Boys Singles, L4 Tournament',
  )

  const startTime = Date.now()

  const response = await fetch(`${baseUrl}/api/match-analysis/test`, {
    method: 'POST',
    body: formData,
    headers: { Cookie: cookie },
  })

  const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1)
  console.log(`\nResponse in ${elapsedMin} min. Status: ${response.status}\n`)

  const result = await response.json()
  console.log(JSON.stringify(result, null, 2))

  const outputPath = `match-analysis-${Date.now()}.json`
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
  console.log(`\nSaved to ${outputPath}`)
}

testMatchAnalysis().catch(err => {
  console.error(err)
  process.exit(1)
})
