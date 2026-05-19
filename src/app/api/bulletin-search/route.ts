import { tavily } from '@tavily/core'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 60

type BulletinType = 'camp' | 'tournament' | 'clinic' | 'coach'

type BulletinListing = {
  id?: string
  title: string
  type: BulletinType
  sport: string
  description?: string | null
  location_city?: string | null
  location_state?: string | null
  start_date?: string | null
  end_date?: string | null
  age_min?: number | null
  age_max?: number | null
  price?: number | null
  spots_remaining?: number | null
  registration_url?: string | null
  organizer?: string | null
  source_name?: string | null
  distance_estimate?: string | null
}

type CoachBulletinListing = BulletinListing & {
  id: string
  isVerified: true
  location_lat?: number | string | null
  location_lng?: number | string | null
  is_active?: boolean | null
}

type BulletinSearchBody = {
  city?: string
  state?: string
  sport?: string
  type?: string
  ageGroup?: string
  lat?: number
  lng?: number
  radiusMiles?: number
  forceRefresh?: boolean
}

type ClaudeContentBlock = {
  type: string
  text?: string
}

type TavilyClient = ReturnType<typeof tavily>
type TavilySearchResult = Awaited<ReturnType<TavilyClient['search']>>['results'][number]

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function numericCoordinate(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const NEARBY_CITIES: Record<string, string[]> = {
  SD: [
    'Sioux Falls SD',
    'Rapid City SD',
    'Minneapolis MN',
    'Omaha NE',
    'Fargo ND',
    'Sioux City IA',
    'Des Moines IA',
    'Kansas City MO',
    'Denver CO',
  ],
  MN: [
    'Minneapolis MN',
    'St Paul MN',
    'Rochester MN',
    'Fargo ND',
    'Sioux Falls SD',
    'Madison WI',
    'Milwaukee WI',
    'Chicago IL',
    'Des Moines IA',
  ],
  IA: [
    'Des Moines IA',
    'Cedar Rapids IA',
    'Davenport IA',
    'Omaha NE',
    'Kansas City MO',
    'Chicago IL',
    'Minneapolis MN',
    'St Louis MO',
  ],
  TX: ['Dallas TX', 'Houston TX', 'Austin TX', 'San Antonio TX', 'Oklahoma City OK', 'Tulsa OK'],
  CA: ['Los Angeles CA', 'San Francisco CA', 'San Diego CA', 'Sacramento CA', 'Las Vegas NV', 'Phoenix AZ'],
  FL: ['Miami FL', 'Orlando FL', 'Tampa FL', 'Jacksonville FL', 'Atlanta GA', 'Charlotte NC'],
  NY: ['New York NY', 'Buffalo NY', 'Philadelphia PA', 'Boston MA', 'Hartford CT', 'Baltimore MD'],
  IL: ['Chicago IL', 'Milwaukee WI', 'Indianapolis IN', 'St Louis MO', 'Detroit MI', 'Minneapolis MN'],
  OH: ['Columbus OH', 'Cleveland OH', 'Cincinnati OH', 'Pittsburgh PA', 'Detroit MI', 'Indianapolis IN'],
  CO: ['Denver CO', 'Colorado Springs CO', 'Boulder CO', 'Salt Lake City UT', 'Albuquerque NM', 'Kansas City MO'],
  WA: ['Seattle WA', 'Portland OR', 'Spokane WA', 'Vancouver BC', 'Sacramento CA'],
  GA: ['Atlanta GA', 'Charlotte NC', 'Nashville TN', 'Birmingham AL', 'Jacksonville FL', 'Columbia SC'],
  NC: ['Charlotte NC', 'Raleigh NC', 'Atlanta GA', 'Washington DC', 'Richmond VA', 'Columbia SC'],
  AZ: ['Phoenix AZ', 'Tucson AZ', 'Las Vegas NV', 'San Diego CA', 'Albuquerque NM', 'Denver CO'],
}

function getCitiesForRadius(city: string, state: string, radiusMiles: number): string[] {
  const regional = NEARBY_CITIES[state.toUpperCase()] || []
  const home = `${city} ${state}`.trim()
  if (radiusMiles <= 25) return [home]
  if (radiusMiles <= 75) return [home, ...regional.slice(0, 2)]
  if (radiusMiles <= 150) return [home, ...regional.slice(0, 4)]
  if (radiusMiles <= 300) return [home, ...regional.slice(0, 6)]
  return [home, ...regional]
}

function buildTavilyQueries(sport: string, type: string, cities: string[], year: number): string[] {
  const sportsList = !sport || sport === 'all' ? ['tennis', 'golf', 'basketball', 'pickleball'] : [sport]
  const typeLabel = type === 'all' ? 'camp OR tournament OR clinic' : type
  const queries: string[] = []
  const primaryCity = cities[0]

  sportsList.forEach(sportName => {
    queries.push(`${sportName} ${typeLabel} ${primaryCity} ${year} registration`)

    if (cities.length > 2) {
      const regionStr = cities.slice(1, 4).join(' OR ')
      queries.push(`${sportName} ${typeLabel} (${regionStr}) ${year}`)
    }

    const sportQueries: Record<string, string[]> = {
      tennis: [`USTA junior tennis tournament ${primaryCity} ${year}`, `tennis camp ${primaryCity} ${year}`],
      golf: [
        `junior golf tournament ${primaryCity} ${year}`,
        `PGA junior golf camp ${primaryCity} ${year}`,
        `First Tee ${primaryCity} ${year}`,
      ],
      basketball: [`AAU basketball tournament ${primaryCity} ${year}`, `youth basketball camp ${primaryCity} ${year}`],
      pickleball: [`pickleball tournament ${primaryCity} ${year}`, `USAPA pickleball ${primaryCity} ${year}`],
    }

    if (sportQueries[sportName]) queries.push(...sportQueries[sportName])
  })

  return queries
}

async function searchWithTavily(queries: string[]): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY || process.env.TAVILY_DEV_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY or TAVILY_DEV_KEY not set')

  const client = tavily({ apiKey })
  const allResults: TavilySearchResult[] = []
  const seen = new Set<string>()
  const topQueries = queries.slice(0, 4)
  const results = await Promise.allSettled(
    topQueries.map(query =>
      client.search(query, {
        searchDepth: 'advanced',
        maxResults: 5,
        includeAnswer: false,
        includeDomains: [
          'usta.com',
          'pgajuniorleague.com',
          'firsttee.org',
          'aausports.org',
          'pickleballtournaments.com',
          'usapickleball.org',
          'tennisrecruiting.net',
          'active.com',
          'sportsengine.com',
          'eventbrite.com',
          'leagueapps.com',
        ],
      }),
    ),
  )

  results.forEach(result => {
    if (result.status !== 'fulfilled') return
    result.value.results?.forEach(searchResult => {
      if (seen.has(searchResult.url)) return
      seen.add(searchResult.url)
      allResults.push(searchResult)
    })
  })

  return allResults
}

async function parseResultsWithClaude(
  searchResults: TavilySearchResult[],
  city: string,
  state: string,
  radiusMiles: number,
  sport: string,
  year: number,
): Promise<BulletinListing[]> {
  if (searchResults.length === 0 || !process.env.ANTHROPIC_API_KEY) return []

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const resultsText = searchResults
    .slice(0, 6)
    .map((result, index) =>
      `[${index + 1}] Title: ${result.title}\nURL: ${result.url}\nContent: ${result.content?.slice(0, 200)}`,
    )
    .join('\n\n')

  const prompt = `Extract sports events from these search results.
Location: ${city}, ${state} (within ${radiusMiles} miles)
Sport filter: ${sport === 'all' ? 'any sport' : sport}
Year: ${year}

Search results:
${resultsText}

Extract each distinct event and return a JSON array.
Only include REAL events with evidence in the results above.

[
  {
    "title": "exact event name",
    "type": "camp|tournament|clinic",
    "sport": "tennis|golf|basketball|pickleball|baseball",
    "description": "brief description from the content",
    "location_city": "city name",
    "location_state": "2-letter state",
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null",
    "age_min": null or number,
    "age_max": null or number,
    "price": null or number,
    "registration_url": "short URL under 80 chars - domain and path only, no query params",
    "organizer": "organization name",
    "source_name": "website domain",
    "distance_estimate": "~X miles from ${city} or Regional or Statewide"
  }
]

Rules:
- Skip events clearly outside the ${radiusMiles} mile radius
- Include events over the next 12 months - skip past events
- If the same event appears multiple times keep one entry
- Return ONLY the JSON array, no other text
- Return empty array [] if no valid events found
- CRITICAL: Keep ALL string values under 80 characters
- CRITICAL: Truncate registration_url to the domain + path only e.g. "https://usta.com/tournaments/sd-junior-open" never include long query strings or parameters
- CRITICAL: Write complete valid JSON only - if you cannot fit all events, return fewer events but keep them complete
- Return 5-8 events maximum - quality over quantity`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
        {
          role: 'assistant',
          content: '[',
        },
      ],
    })

    const text = message.content
      .map(block => {
        const contentBlock = block as ClaudeContentBlock
        return contentBlock.type === 'text' ? contentBlock.text || '' : ''
      })
      .join('')

    console.log('Claude raw response:', text.slice(0, 500))

    // Claude was prefilled with '[' so prepend it back.
    const cleaned = (`[${text}`)
      .replace(/```\s*$/i, '')
      .trim()

    let jsonStr = cleaned
    let parsed: unknown

    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      console.log('JSON truncated - attempting repair...')

      const lastComplete = jsonStr.lastIndexOf('},')
      const lastCompleteNoComma = jsonStr.lastIndexOf('}')

      if (lastComplete > 0) {
        jsonStr = jsonStr.substring(0, lastComplete + 1) + ']'
      } else if (lastCompleteNoComma > 0) {
        jsonStr = jsonStr.substring(0, lastCompleteNoComma + 1) + ']'
      } else {
        return []
      }

      try {
        parsed = JSON.parse(jsonStr)
        console.log('Repair successful')
      } catch {
        console.log('Repair failed - returning empty')
        return []
      }
    }

    console.log('JSON match found: true')
    console.log('Parsed listings count:', Array.isArray(parsed) ? parsed.length : undefined)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((listing): listing is BulletinListing => {
        if (!listing || typeof listing !== 'object') return false
        const maybe = listing as Partial<BulletinListing>
        return typeof maybe.title === 'string' && typeof maybe.type === 'string' && typeof maybe.sport === 'string'
      })
      .slice(0, 12)
  } catch (error) {
    console.error('Claude parse error:', error)
    return []
  }
}

function getFallbackListings(sport: string, type: string, city: string, state: string, year: number): BulletinListing[] {
  const all: BulletinListing[] = [
    {
      title: `USTA ${state} Junior Tournaments`,
      type: 'tournament',
      sport: 'tennis',
      description: `Official USTA sanctioned junior tennis tournaments across ${state} in ${year}. Search by age group and location.`,
      location_city: city,
      location_state: state,
      age_min: 10,
      age_max: 18,
      price: 35,
      registration_url: 'https://www.usta.com/en/home/play/junior-tennis/programs/national/junior-tournaments.html',
      organizer: 'USTA',
      source_name: 'usta.com',
      distance_estimate: 'Statewide',
    },
    {
      title: 'USTA Tennis Camps',
      type: 'camp',
      sport: 'tennis',
      description: 'Find USTA-affiliated tennis camps near you by location and age group.',
      location_city: city,
      location_state: state,
      age_min: 8,
      age_max: 18,
      price: 300,
      registration_url: 'https://www.usta.com/en/home/play/youth-tennis/programs/national/tennis-in-the-parks.html',
      organizer: 'USTA',
      source_name: 'usta.com',
      distance_estimate: 'Regional',
    },
    {
      title: 'PGA Junior League',
      type: 'camp',
      sport: 'golf',
      description: `Team golf for ages 13 and under. Find your local PGA Junior League chapter near ${city}.`,
      location_city: city,
      location_state: state,
      age_min: 5,
      age_max: 13,
      price: 175,
      registration_url: 'https://www.pgajuniorleague.com/find-a-chapter',
      organizer: 'PGA of America',
      source_name: 'pgajuniorleague.com',
      distance_estimate: 'Nearby',
    },
    {
      title: `First Tee - ${state}`,
      type: 'clinic',
      sport: 'golf',
      description: 'Life skills through golf for ages 5-18. Search for your nearest First Tee chapter.',
      location_city: city,
      location_state: state,
      age_min: 5,
      age_max: 18,
      price: 50,
      registration_url: 'https://firsttee.org/find-a-chapter/',
      organizer: 'First Tee',
      source_name: 'firsttee.org',
      distance_estimate: 'Statewide',
    },
    {
      title: 'AAU Basketball Tournaments',
      type: 'tournament',
      sport: 'basketball',
      description: `Find AAU basketball tournaments near ${city}. One of the largest youth sports organizations in the US.`,
      location_city: city,
      location_state: state,
      age_min: 8,
      age_max: 18,
      price: 45,
      registration_url: 'https://www.aausports.org/default.aspx?s=basketball',
      organizer: 'AAU',
      source_name: 'aausports.org',
      distance_estimate: 'Regional',
    },
    {
      title: 'Pickleball Tournaments Near You',
      type: 'tournament',
      sport: 'pickleball',
      description: 'Find USAPA sanctioned pickleball tournaments with an interactive map.',
      location_city: city,
      location_state: state,
      price: 35,
      registration_url: 'https://www.pickleballtournaments.com/tournamentmap.pl',
      organizer: 'USAPA',
      source_name: 'pickleballtournaments.com',
      distance_estimate: 'Regional',
    },
    {
      title: 'USA Pickleball Places to Play',
      type: 'clinic',
      sport: 'pickleball',
      description: `Find pickleball courts, clinics, and open play sessions near ${city}.`,
      location_city: city,
      location_state: state,
      price: 20,
      registration_url: 'https://www.usapickleball.org/places-to-play/',
      organizer: 'USA Pickleball',
      source_name: 'usapickleball.org',
      distance_estimate: 'Nearby',
    },
  ]

  return all.filter(listing => {
    if (sport !== 'all' && listing.sport !== sport) return false
    if (type !== 'all' && listing.type !== type) return false
    return true
  })
}

async function getFilteredCoachListings({
  supabase,
  sport,
  type,
  ageGroup,
  lat,
  lng,
  radiusMiles,
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  sport: string
  type: string
  ageGroup: string
  lat: number | null
  lng: number | null
  radiusMiles: number
}): Promise<CoachBulletinListing[]> {
  const { data: coachListings } = await supabase
    .from('bulletin_listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return ((coachListings || []) as CoachBulletinListing[])
    .filter(listing => {
      if (sport !== 'all' && listing.sport !== sport) return false
      if (type !== 'all' && listing.type !== type) return false
      if (ageGroup === 'under12' && listing.age_min && listing.age_min >= 12) return false
      if (ageGroup === '12-18' && ((listing.age_max && listing.age_max < 12) || (listing.age_min && listing.age_min > 18))) return false
      if (ageGroup === '18+' && listing.age_max && listing.age_max < 18) return false

      const listingLat = numericCoordinate(listing.location_lat)
      const listingLng = numericCoordinate(listing.location_lng)
      if (lat === null || lng === null || listingLat === null || listingLng === null) return true

      return haversineDistance(lat, lng, listingLat, listingLng) <= radiusMiles
    })
    .map(listing => {
      const listingLat = numericCoordinate(listing.location_lat)
      const listingLng = numericCoordinate(listing.location_lng)
      const distance =
        lat !== null && lng !== null && listingLat !== null && listingLng !== null
          ? haversineDistance(lat, lng, listingLat, listingLng)
          : null

      return {
        ...listing,
        isVerified: true,
        distance_estimate: distance !== null ? `~${distance} miles` : null,
      }
    })
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as BulletinSearchBody
  const city = body.city?.trim()
  const state = body.state?.trim() || ''
  const sport = body.sport || 'all'
  const type = body.type || 'all'
  const ageGroup = body.ageGroup || 'all'
  const hasUsableCoordinates =
    typeof body.lat === 'number' &&
    typeof body.lng === 'number' &&
    Number.isFinite(body.lat) &&
    Number.isFinite(body.lng) &&
    !(body.lat === 0 && body.lng === 0)
  const lat = hasUsableCoordinates ? body.lat! : null
  const lng = hasUsableCoordinates ? body.lng! : null
  const radiusMiles = typeof body.radiusMiles === 'number' && Number.isFinite(body.radiusMiles) ? body.radiusMiles : 50
  const forceRefresh = Boolean(body.forceRefresh)

  if (!city) {
    return NextResponse.json({ listings: [], coachListings: [], fromCache: false })
  }

  const supabase = await createServerSupabaseClient()
  const coachListings = await getFilteredCoachListings({
    supabase,
    sport,
    type,
    ageGroup,
    lat,
    lng,
    radiusMiles,
  })
  const cacheKey = `${city}-${state}-${sport}-${type}-${ageGroup}-${radiusMiles}mi`.toLowerCase().replace(/\s+/g, '-')

  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('bulletin_cache')
      .select('listings, cached_at')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (cached?.cached_at) {
      const cachedAt = new Date(cached.cached_at)
      const hoursSince = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60)

      if (hoursSince < 24) {
        return NextResponse.json({
          listings: cached.listings,
          coachListings,
          fromCache: true,
          cachedAt: cached.cached_at,
        })
      }
    }
  }

  const year = new Date().getFullYear()
  const cities = getCitiesForRadius(city, state, radiusMiles)
  const queries = buildTavilyQueries(sport, type, cities, year)
  let aiListings: BulletinListing[] = []

  try {
    const searchResults = await searchWithTavily(queries)
    console.log(`Tavily returned ${searchResults.length} results`)

    if (searchResults.length > 0) {
      aiListings = await parseResultsWithClaude(searchResults, city, state, radiusMiles, sport, year)
      console.log(`Claude extracted ${aiListings.length} events`)
    }

    if (aiListings.length === 0) {
      aiListings = getFallbackListings(sport, type, city, state, year)
    }
  } catch (error) {
    console.error('Search pipeline error:', error)
    aiListings = getFallbackListings(sport, type, city, state, year)
  }

  if (aiListings.length > 0) {
    await supabase.from('bulletin_cache').upsert(
      {
        cache_key: cacheKey,
        listings: aiListings,
        cached_at: new Date().toISOString(),
      },
      { onConflict: 'cache_key' },
    )
  }

  return NextResponse.json({
    listings: aiListings,
    coachListings,
    fromCache: false,
  })
}
