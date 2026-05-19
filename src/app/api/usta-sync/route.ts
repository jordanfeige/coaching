import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function extractUaid(input: string): string {
  if (!input) return ''
  const trimmed = input.trim()

  // Already a plain numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed

  // URL contains uaid= (may be encoded or not)
  const decoded = decodeURIComponent(decodeURIComponent(trimmed))
  const match = decoded.match(/uaid[=:](\d+)/)
  if (match?.[1]) return match[1]

  // Fallback: any 8-12 digit number in the string
  const numMatch = trimmed.match(/(\d{8,12})/)
  return numMatch?.[1] || trimmed
}

async function fetchUSTAEndpoint(
  type: string,
  body: object,
  apiKey: string,
): Promise<unknown> {
  const targetUrl = `https://www.usta.com/usta/api?type=${type}`

  const scraperUrl = new URL(
    'https://api.scraperapi.com/structured/render_json',
  )
  scraperUrl.searchParams.set('api_key', apiKey)
  scraperUrl.searchParams.set('url', targetUrl)
  scraperUrl.searchParams.set('country_code', 'us')
  scraperUrl.searchParams.set('keep_headers', 'true')

  const res = await fetch(scraperUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ScraperAPI-Target-URL': targetUrl,
      'X-ScraperAPI-Method': 'POST',
      'X-ScraperAPI-Body': JSON.stringify(body),
      'X-ScraperAPI-Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json, text/plain, */*',
        origin: 'https://www.usta.com',
        referer:
          'https://www.usta.com/en/home/play/player-search/profile.html',
        hash: 'undefined',
        'csrf-token': 'undefined',
      },
    }),
    cache: 'no-store',
  })

  const text = await res.text()
  console.log(
    `ScraperAPI ${type} status: ${res.status}`,
    text.slice(0, 300),
  )

  if (!res.ok) {
    throw new Error(
      `ScraperAPI error ${res.status}: ${text.slice(0, 200)}`,
    )
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 200)}`)
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { uaid: rawUaid, profileId } = await req.json()
  const uaid = extractUaid(String(rawUaid ?? ''))

  if (!uaid || !/^\d+$/.test(uaid)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid USTA player ID. Please paste the full USTA profile URL or just the numeric player ID.',
      },
      { status: 400 },
    )
  }

  try {
    const apiKey = process.env.SCRAPER_API_KEY || ''

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'ScraperAPI key not configured.',
          fallback: true,
          message: 'USTA sync unavailable. Enter WTN and rankings manually.',
        },
        { status: 200 },
      )
    }

    const [playerInfo, rankingsData] = await Promise.allSettled([
      fetchUSTAEndpoint(
        'playerInfo',
        {
          selection: { uaid },
          output: {
            ratings: 'true',
            extendedProfile: 'true',
            wtn: 'true',
          },
        },
        apiKey,
      ),
      fetchUSTAEndpoint(
        'playerRankings',
        {
          selection: { uaid },
        },
        apiKey,
      ),
    ])

    let wtnSingles: number | null = null
    let wtnDoubles: number | null = null
    let wtnConfidence: number | null = null
    let wtnLastUpdated: string | null = null
    let playerName: string | null = null
    let playerState: string | null = null
    let playerSection: string | null = null
    let gradYear: number | null = null

    if (playerInfo.status === 'fulfilled') {
      const raw = playerInfo.value as Record<string, unknown>

      const playerData =
        (raw?.data as Array<Record<string, unknown>> | undefined)?.[0] ||
        (
          (raw?.body as { data?: Array<Record<string, unknown>> })?.data?.[0]
        ) ||
        (
          (raw?.response as { data?: Array<Record<string, unknown>> })?.data?.[0]
        ) ||
        null

      if (playerData) {
        playerName = (playerData.name as string) || null
        playerState = (playerData.state as string) || null
        playerSection =
          (playerData.section as { name?: string } | undefined)?.name || null

        const ratings = playerData.ratings as
          | {
              wtn?: Array<Record<string, unknown>>
              wtn_ratings?: Array<Record<string, unknown>>
            }
          | undefined
        const wtnList = ratings?.wtn || ratings?.wtn_ratings || []

        const wtnSinglesData = wtnList.find(
          (w: Record<string, unknown>) =>
            w.type === 'SINGLE' || w.type === 'single',
        )
        const wtnDoublesData = wtnList.find(
          (w: Record<string, unknown>) =>
            w.type === 'DOUBLE' || w.type === 'double',
        )

        if (wtnSinglesData) {
          const singlesNum =
            wtnSinglesData.tennisNumber ?? wtnSinglesData.tennis_number
          wtnSingles =
            singlesNum != null && !Number.isNaN(Number(singlesNum))
              ? Number(singlesNum)
              : null
          const conf = wtnSinglesData.confidence
          wtnConfidence =
            conf != null && !Number.isNaN(Number(conf)) ? Number(conf) : null
          wtnLastUpdated =
            (wtnSinglesData.ratingDate as string) ||
            (wtnSinglesData.rating_date as string) ||
            null
        }
        if (wtnDoublesData) {
          const doublesNum =
            wtnDoublesData.tennisNumber ?? wtnDoublesData.tennis_number
          wtnDoubles =
            doublesNum != null && !Number.isNaN(Number(doublesNum))
              ? Number(doublesNum)
              : null
        }

        const extended = playerData.extendedProfile as
          | { highSchoolGraduatingYear?: number }
          | undefined
        const extendedSnake = playerData.extended_profile as
          | { high_school_graduating_year?: number }
          | undefined
        gradYear =
          extended?.highSchoolGraduatingYear ||
          extendedSnake?.high_school_graduating_year ||
          null
      } else {
        console.log(
          'playerInfo unexpected shape:',
          JSON.stringify(raw).slice(0, 300),
        )
      }
    }

    let nationalRank: number | null = null
    let sectionRank: number | null = null
    let districtRank: number | null = null
    let winRecord = 0
    let lossRecord = 0
    let ageCategory: string | null = null

    if (rankingsData.status === 'fulfilled') {
      const raw = rankingsData.value as Record<string, unknown>

      const rankings =
        (raw?.player as { rankings?: Array<Record<string, unknown>> })
          ?.rankings ||
        (
          raw?.body as {
            player?: { rankings?: Array<Record<string, unknown>> }
          }
        )?.player?.rankings ||
        (raw?.rankings as Array<Record<string, unknown>> | undefined) ||
        (
          raw?.data as {
            player?: { rankings?: Array<Record<string, unknown>> }
          }
        )?.player?.rankings ||
        []

      if (rankings.length === 0) {
        console.log(
          'rankingsData unexpected shape:',
          JSON.stringify(raw).slice(0, 300),
        )
      }

      const quotaRanking = rankings.find(
        (r: Record<string, unknown>) => r.listType === 'QUOTA',
      )
      const seedingRanking = rankings.find(
        (r: Record<string, unknown>) =>
          r.listType === 'SEEDING' && r.matchFormat === 'SINGLES',
      )
      const primaryRanking = quotaRanking || seedingRanking || rankings[0]

      if (primaryRanking) {
        const rank = primaryRanking.rank as Record<string, number> | undefined
        nationalRank = rank?.national ?? null
        sectionRank = rank?.section ?? null
        districtRank = rank?.district ?? null
        const record = primaryRanking.record as
          | { win?: number; loss?: number }
          | undefined
        winRecord = record?.win ?? 0
        lossRecord = record?.loss ?? 0
        ageCategory =
          `${primaryRanking.ageRestrictionModifier || ''} ${primaryRanking.ageRestriction || ''}`.trim() ||
          null
      }
    }

    if (profileId) {
      const updateData: Record<string, unknown> = {
        usta_uaid: uaid,
        last_synced_at: new Date().toISOString(),
        usta_rankings_raw:
          rankingsData.status === 'fulfilled' ? rankingsData.value : null,
      }

      if (wtnSingles !== null && !Number.isNaN(wtnSingles)) {
        updateData.wtn_singles = wtnSingles
        updateData.wtn_doubles = wtnDoubles
        updateData.wtn_confidence = wtnConfidence
        updateData.wtn_last_updated = wtnLastUpdated
      }
      if (nationalRank !== null) {
        updateData.usta_national_rank = nationalRank
        updateData.usta_section_rank = sectionRank
        updateData.usta_district_rank = districtRank
        updateData.usta_section = playerSection
        updateData.usta_state = playerState
        updateData.usta_age_category = ageCategory
        updateData.usta_win_record = winRecord
        updateData.usta_loss_record = lossRecord
      }
      if (gradYear) {
        updateData.grad_year = gradYear
      }

      await supabase
        .from('recruiting_profiles')
        .update(updateData)
        .eq('id', profileId)
    }

    return NextResponse.json({
      success: true,
      data: {
        playerName,
        wtnSingles,
        wtnDoubles,
        wtnConfidence,
        wtnLastUpdated,
        nationalRank,
        sectionRank,
        districtRank,
        winRecord,
        lossRecord,
        ageCategory,
        playerState,
        playerSection,
        gradYear,
      },
      _debug: {
        playerInfoStatus: playerInfo.status,
        rankingsStatus: rankingsData.status,
        playerInfoShape:
          playerInfo.status === 'fulfilled'
            ? Object.keys((playerInfo.value as Record<string, unknown>) || {})
            : null,
        rankingsShape:
          rankingsData.status === 'fulfilled'
            ? Object.keys((rankingsData.value as Record<string, unknown>) || {})
            : null,
      },
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('USTA sync failed')
    console.error('USTA sync error:', {
      message: err.message,
      uaid,
      stack: err.stack?.split('\n')[0],
    })

    return NextResponse.json(
      {
        success: false,
        error: err.message,
        fallback: true,
        uaid_received: rawUaid,
        uaid_extracted: uaid,
        message:
          'USTA sync unavailable. Enter rankings manually or try again.',
      },
      { status: 200 },
    )
  }
}
