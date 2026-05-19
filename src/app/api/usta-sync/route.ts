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

  const res = await fetch('https://api.scraperapi.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      url: targetUrl,
      method: 'POST',
      body: JSON.stringify(body),
      headers: JSON.stringify({
        'Content-Type': 'application/json',
        accept: 'application/json, text/plain, */*',
        origin: 'https://www.usta.com',
        referer:
          'https://www.usta.com/en/home/play/player-search/profile.html',
        hash: 'undefined',
        'csrf-token': 'undefined',
      }),
      country_code: 'us',
      render: false,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ScraperAPI error ${res.status}: ${errText}`)
  }

  const text = await res.text()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `USTA returned non-JSON response: ${text.slice(0, 200)}`,
    )
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
      const payload = playerInfo.value as {
        data?: Array<Record<string, unknown>>
      }
      const p = payload?.data?.[0]
      if (p) {
        playerName = (p.name as string) ?? null
        playerState = (p.state as string) ?? null
        const section = p.section as { name?: string } | undefined
        playerSection = section?.name ?? null

        const ratings = p.ratings as
          | { wtn?: Array<Record<string, unknown>> }
          | undefined
        const wtnList = ratings?.wtn ?? []
        const wtnSinglesData = wtnList.find(w => w.type === 'SINGLE')
        const wtnDoublesData = wtnList.find(w => w.type === 'DOUBLE')

        if (wtnSinglesData) {
          wtnSingles = Number(wtnSinglesData.tennisNumber)
          wtnConfidence = Number(wtnSinglesData.confidence)
          wtnLastUpdated = (wtnSinglesData.ratingDate as string) ?? null
        }
        if (wtnDoublesData) {
          wtnDoubles = Number(wtnDoublesData.tennisNumber)
        }

        const extended = p.extendedProfile as
          | { highSchoolGraduatingYear?: number }
          | undefined
        gradYear = extended?.highSchoolGraduatingYear ?? null
      }
    }

    let nationalRank: number | null = null
    let sectionRank: number | null = null
    let districtRank: number | null = null
    let winRecord = 0
    let lossRecord = 0
    let ageCategory: string | null = null

    if (rankingsData.status === 'fulfilled') {
      const payload = rankingsData.value as {
        player?: { rankings?: Array<Record<string, unknown>> }
      }
      const rankings = payload?.player?.rankings ?? []
      const quotaRanking = rankings.find(r => r.listType === 'QUOTA')
      const seedingRanking = rankings.find(
        r => r.listType === 'SEEDING' && r.matchFormat === 'SINGLES',
      )
      const primaryRanking =
        quotaRanking ?? seedingRanking ?? rankings[0]

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
          `${primaryRanking.ageRestrictionModifier ?? ''} ${primaryRanking.ageRestriction ?? ''}`.trim()
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
