import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type YouTubeSearchItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    thumbnails?: {
      medium?: { url?: string }
      default?: { url?: string }
      high?: { url?: string }
    }
  }
}

function buildSearchQuery(sport?: string, issueArea?: string) {
  const sportKey = (sport || 'tennis').toLowerCase()
  const issue = issueArea || 'technique'

  if (sportKey === 'golf') return `${issue} golf swing fix PGA coaching`
  if (sportKey === 'baseball') return `${issue} baseball mechanics fix coaching`
  if (sportKey === 'basketball') return `${issue} basketball technique fix coaching`
  return `${issue} tennis technique fix coaching drill`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY is not configured', videos: [] }, { status: 500 })
  }

  try {
    const { sport, issueArea } = await req.json()
    const params = new URLSearchParams({
      part: 'snippet',
      q: buildSearchQuery(sport, issueArea),
      type: 'video',
      videoCategoryId: '17',
      maxResults: '3',
      relevanceLanguage: 'en',
      key: apiKey,
    })

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`)
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'YouTube search failed')
    }

    const videos = ((payload.items || []) as YouTubeSearchItem[])
      .map(item => ({
        videoId: item.id?.videoId || '',
        title: item.snippet?.title || 'Coaching video',
        thumbnail: item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.default?.url ||
          '',
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        description: item.snippet?.description || '',
      }))
      .filter(video => video.videoId)
      .slice(0, 3)

    return NextResponse.json({ videos })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to find coaching videos'
    console.error('[youtube-coaching]', message)
    return NextResponse.json({ error: message, videos: [] }, { status: 500 })
  }
}
