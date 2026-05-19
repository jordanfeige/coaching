'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  DollarSign,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  Users,
} from 'lucide-react'
import ViaBar from '@/components/ViaBar'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayersForUser, type LinkedPlayer } from '@/lib/linked-player'

const TEAL = 'hsl(168,62%,36%)'
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const CARD = 'white'

type BulletinType = 'camp' | 'tournament' | 'clinic' | 'coach'

type LocationState = {
  city: string
  state: string
  lat: number
  lng: number
}

type Filters = {
  sport: string
  type: string
  radiusMiles: string
  age: string
}

type BulletinListing = {
  id?: string
  type: BulletinType
  title: string
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
  source_name?: string | null
  organizer?: string | null
  distance_estimate?: string | null
  isVerified?: boolean
}

type NominatimResponse = {
  address?: {
    city?: string
    town?: string
    village?: string
    state_code?: string
    state?: string
  }
}

type NominatimSearchResult = {
  lat?: string
  lon?: string
}

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
  all: '🏅',
}

const typeColors: Record<string, { bg: string; color: string }> = {
  camp: { bg: '#E1F5EE', color: '#0F6E56' },
  tournament: { bg: '#FAEEDA', color: '#854F0B' },
  clinic: { bg: '#EEEDFE', color: '#534AB7' },
  coach: { bg: '#E6F1FB', color: '#185FA5' },
}

function formatAge(min?: number | null, max?: number | null) {
  if (!min && !max) return 'All ages'
  if (min && max) return `Ages ${min}-${max}`
  if (min) return `${min}+`
  if (max) return `Under ${max}`
  return 'All ages'
}

function formatDate(start?: string | null, end?: string | null) {
  if (!start) return null
  const startLabel = format(new Date(start), 'MMM d')
  if (!end || end === start) return startLabel
  return `${startLabel}-${format(new Date(end), 'MMM d, yyyy')}`
}

function formatPrice(price?: number | null) {
  if (!price) return 'Free'
  return `$${price}`
}

export default function BulletinPage() {
  const [listings, setListings] = useState<BulletinListing[]>([])
  const [coachListings, setCoachListings] = useState<BulletinListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [location, setLocation] = useState<LocationState | null>(null)
  const [manualCity, setManualCity] = useState('')
  const [locationError, setLocationError] = useState('')
  const [filters, setFilters] = useState<Filters>({
    sport: 'all',
    type: 'all',
    radiusMiles: '50',
    age: 'all',
  })
  const [fromCache, setFromCache] = useState(false)
  const [player, setPlayer] = useState<LinkedPlayer | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const searchListings = useCallback(
    async (forceRefresh: boolean, nextFilters = filters, nextLocation = location) => {
      if (!nextLocation) return
      setSearching(true)
      try {
        const response = await fetch('/api/bulletin-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: nextLocation.city,
            state: nextLocation.state,
            lat: nextLocation.lat,
            lng: nextLocation.lng,
            sport: nextFilters.sport,
            type: nextFilters.type,
            ageGroup: nextFilters.age,
            radiusMiles: Number.parseInt(nextFilters.radiusMiles, 10),
            forceRefresh,
          }),
        })
        const data = (await response.json()) as {
          listings?: BulletinListing[]
          coachListings?: BulletinListing[]
          fromCache?: boolean
        }
        console.log('API response:', JSON.stringify(data, null, 2).slice(0, 500))
        console.log('listings count:', data.listings?.length)
        console.log('coachListings count:', data.coachListings?.length)
        setListings(data.listings || [])
        setCoachListings(data.coachListings || [])
        setFromCache(Boolean(data.fromCache))
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setSearching(false)
        setLoading(false)
      }
    },
    [filters, location],
  )

  useEffect(() => {
    queueMicrotask(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const linkedPlayers = await getLinkedPlayersForUser(supabase, user.id)
      setPlayer(linkedPlayers[0] || null)
    })
  }, [supabase])

  useEffect(() => {
    if (!navigator.geolocation) {
      queueMicrotask(() => {
        setLocationError('Location not supported by your browser')
        setLoading(false)
      })
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        queueMicrotask(async () => {
          const { latitude, longitude } = position.coords
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            )
            const data = (await response.json()) as NominatimResponse
            const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown'
            const state = data.address?.state_code || data.address?.state || ''
            setLocation({ city, state, lat: latitude, lng: longitude })
          } catch {
            setLocationError('Could not determine your city')
            setLoading(false)
          }
        })
      },
      () => {
        setLocationError('Location access denied - enter your city manually')
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    if (!location) return
    queueMicrotask(() => {
      void searchListings(false)
    })
  }, [location, searchListings])

  function applyFilter(key: keyof Filters, value: string) {
    const nextFilters = { ...filters, [key]: value }
    setFilters(nextFilters)
    if (location) void searchListings(true, nextFilters, location)
  }

  async function submitManualLocation() {
    if (!manualCity.trim()) return
    let lat = 0
    let lng = 0
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualCity.trim())}&format=json&limit=1`,
      )
      const data = (await response.json()) as NominatimSearchResult[]
      if (data[0]?.lat && data[0]?.lon) {
        lat = Number.parseFloat(data[0].lat)
        lng = Number.parseFloat(data[0].lon)
      }
    } catch {
      // Manual city can still be used for web search even if geocoding fails.
    }
    setLocation({
      city: manualCity.trim(),
      state: '',
      lat,
      lng,
    })
    setLocationError('')
  }

  function parseDistance(estimate?: string | null): number {
    if (!estimate) return 9999
    const match = estimate.match(/(\d+)/)
    return match ? Number.parseInt(match[1], 10) : 9999
  }

  const allListings = [
    ...coachListings.map(listing => ({ ...listing, isVerified: true })),
    ...listings.map(listing => ({ ...listing, isVerified: false })),
  ].sort((a, b) => {
    if (a.isVerified && !b.isVerified) return -1
    if (!a.isVerified && b.isVerified) return 1
    return parseDistance(a.distance_estimate) - parseDistance(b.distance_estimate)
  })
  const verifiedListings = allListings.filter(listing => listing.isVerified)
  const webListings = allListings.filter(listing => !listing.isVerified)

  const card = {
    background: CARD,
    border: `0.5px solid ${BORDER}`,
    borderRadius: 14,
    overflow: 'hidden' as const,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  }

  return (
    <div style={{ color: TEXT, fontFamily: 'Arial, sans-serif' }}>
      {player && (
        <ViaBar
          role="player"
          playerContext={{
            id: player.id,
            name: player.name,
            sport: player.sport || 'tennis',
            skillLevel: player.skill_level,
          }}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Bulletin</h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
          {location
            ? `Camps, tournaments and clinics near ${location.city}${location.state ? `, ${location.state}` : ''}`
            : locationError || 'Getting your location...'}
          {fromCache && <span style={{ marginLeft: 8, fontSize: 11, color: TEXT_MUTED }}>· Cached results</span>}
        </p>
        {location && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              background: TEAL_LIGHT,
              border: '0.5px solid hsl(168,62%,70%)',
              fontSize: 12,
              color: TEAL,
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            <MapPin size={12} />
            Within {filters.radiusMiles} miles of {location.city}
            {location.state ? `, ${location.state}` : ''}
            <button
              onClick={() => {
                setLocation(null)
                setLocationError('Enter your city manually')
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: TEAL,
                fontSize: 11,
                padding: 0,
                marginLeft: 4,
              }}
              type="button"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {locationError && !location && (
        <div
          style={{
            ...card,
            padding: '14px 16px',
            marginBottom: 16,
            borderColor: 'hsl(38,92%,70%)',
            background: 'hsl(38,92%,97%)',
          }}
        >
          <p style={{ fontSize: 13, color: 'hsl(38,92%,35%)', margin: 0 }}>{locationError}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              placeholder="Enter your city..."
              value={manualCity}
              onChange={event => setManualCity(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') void submitManualLocation()
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
                fontSize: 13,
                fontFamily: 'Arial, sans-serif',
                outline: 'none',
              }}
            />
            <button
              onClick={() => void submitManualLocation()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: TEAL,
                color: 'white',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
              type="button"
            >
              Search
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['all', 'tennis', 'golf', 'basketball', 'pickleball'].map(sport => (
            <button
              key={sport}
              onClick={() => applyFilter('sport', sport)}
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
                border: `0.5px solid ${filters.sport === sport ? TEAL : BORDER}`,
                background: filters.sport === sport ? TEAL_LIGHT : CARD,
                color: filters.sport === sport ? TEAL : TEXT_SEC,
              }}
              type="button"
            >
              {sportEmoji[sport]} {sport === 'all' ? 'All sports' : sport}
            </button>
          ))}
        </div>

        <select
          value={filters.type}
          onChange={event => applyFilter('type', event.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            border: `0.5px solid ${BORDER}`,
            fontSize: 12,
            background: CARD,
            color: TEXT,
            fontFamily: 'Arial, sans-serif',
            cursor: 'pointer',
          }}
        >
          <option value="all">All types</option>
          <option value="camp">Camps</option>
          <option value="tournament">Tournaments</option>
          <option value="clinic">Clinics</option>
          <option value="coach">Coaches</option>
        </select>

        <select
          value={filters.age}
          onChange={event => applyFilter('age', event.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            border: `0.5px solid ${BORDER}`,
            fontSize: 12,
            background: CARD,
            color: TEXT,
            fontFamily: 'Arial, sans-serif',
            cursor: 'pointer',
          }}
        >
          <option value="all">All ages</option>
          <option value="under12">Under 12</option>
          <option value="12-18">Ages 12-18</option>
          <option value="18+">18+</option>
        </select>

        <select
          value={filters.radiusMiles}
          onChange={event => applyFilter('radiusMiles', event.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            border: `0.5px solid ${BORDER}`,
            fontSize: 12,
            background: 'white',
            color: TEXT,
            fontFamily: 'Arial, sans-serif',
            cursor: 'pointer',
          }}
        >
          <option value="10">Within 10 miles</option>
          <option value="25">Within 25 miles</option>
          <option value="50">Within 50 miles</option>
          <option value="100">Within 100 miles</option>
          <option value="200">Within 200 miles</option>
          <option value="300">Within 300 miles</option>
          <option value="500">Within 500 miles</option>
        </select>

        <button
          onClick={() => void searchListings(true)}
          disabled={searching || !location}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 8,
            border: `0.5px solid ${BORDER}`,
            background: CARD,
            color: TEXT_SEC,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
            opacity: searching ? 0.5 : 1,
          }}
          type="button"
        >
          <RefreshCw size={12} style={{ animation: searching ? 'spin 1s linear infinite' : 'none' }} />
          {searching ? 'Searching...' : 'Refresh'}
        </button>
      </div>

      {(loading || searching) && allListings.length === 0 && (
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `2px solid ${BORDER}`,
              borderTopColor: TEAL,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0 }}>
            Searching for events near {location?.city || 'you'}...
          </p>
        </div>
      )}

      {!loading && !location && !locationError && (
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>Allow location access</p>
          <p style={{ fontSize: 13, color: TEXT_SEC, margin: '6px 0 0' }}>
            We need your location to find nearby events
          </p>
        </div>
      )}

      {!loading && allListings.length > 0 && (
        <>
          {verifiedListings.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: TEAL,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: '0 0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                ✓ Verified listings
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {verifiedListings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} isVerified />
                ))}
              </div>
            </div>
          )}

          {webListings.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: TEXT_MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: '0 0 10px',
                }}
              >
                Nearby events
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {webListings.map((listing, index) => (
                  <ListingCard key={`${listing.title}-${index}`} listing={listing} isVerified={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !searching && location && allListings.length === 0 && (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: '0 0 6px' }}>
            No events found near {location.city}
          </p>
          <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0 }}>
            Try expanding your filters or refreshing to search again
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function ListingCard({ listing, isVerified }: { listing: BulletinListing; isVerified: boolean }) {
  const typeStyle = typeColors[listing.type] || typeColors.clinic
  const emoji = sportEmoji[listing.sport] || '🏅'
  const dateStr = formatDate(listing.start_date, listing.end_date)

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={event => {
        event.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
        event.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={event => {
        event.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
        event.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div
        style={{
          height: 80,
          background: typeStyle.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          position: 'relative',
        }}
      >
        {emoji}
        {isVerified && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 20,
              background: TEAL,
              color: 'white',
            }}
          >
            ✓ Verified
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 20,
              background: typeStyle.bg,
              color: typeStyle.color,
              textTransform: 'capitalize',
            }}
          >
            {listing.type}
          </span>
          {listing.source_name && <span style={{ fontSize: 10, color: TEXT_MUTED, marginLeft: 6 }}>{listing.source_name}</span>}
        </div>

        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: '0 0 8px', lineHeight: 1.3 }}>
          {listing.title}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {dateStr && (
            <MetaRow icon={<Calendar size={11} />}>{dateStr}</MetaRow>
          )}
          {(listing.location_city || listing.organizer) && (
            <MetaRow icon={<MapPin size={11} />}>
              {listing.location_city || listing.organizer}
              {listing.location_state ? `, ${listing.location_state}` : ''}
            </MetaRow>
          )}
          {listing.distance_estimate && (
            <MetaRow icon={<Navigation size={11} />}>{listing.distance_estimate} away</MetaRow>
          )}
          {(listing.age_min || listing.age_max) && (
            <MetaRow icon={<Users size={11} />}>{formatAge(listing.age_min, listing.age_max)}</MetaRow>
          )}
          {listing.price !== null && listing.price !== undefined && (
            <MetaRow icon={<DollarSign size={11} />}>
              {formatPrice(listing.price)}
              {listing.spots_remaining ? (
                <span style={{ color: listing.spots_remaining <= 3 ? 'hsl(0,70%,55%)' : TEXT_MUTED }}>
                  {' '}· {listing.spots_remaining} spots left
                </span>
              ) : null}
            </MetaRow>
          )}
        </div>

        <a
          href={listing.registration_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            marginTop: 12,
            padding: '8px',
            borderRadius: 8,
            background: listing.registration_url ? TEAL : 'hsl(30,10%,93%)',
            color: listing.registration_url ? 'white' : 'hsl(220,10%,55%)',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: 'Arial, sans-serif',
            pointerEvents: listing.registration_url ? 'auto' : 'none',
          }}
        >
          {listing.registration_url ? (
            <>
              <ExternalLink size={12} /> Register →
            </>
          ) : (
            'No link available'
          )}
        </a>
      </div>
    </div>
  )
}

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: TEXT_SEC }}>
      {icon}
      <span>{children}</span>
    </div>
  )
}
