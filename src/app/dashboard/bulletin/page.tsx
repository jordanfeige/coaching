'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import UniversalVia from '@/components/UniversalVia'

const TEAL = 'hsl(168,62%,36%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'

type BulletinType = 'camp' | 'tournament' | 'clinic' | 'coach'

type BulletinListing = {
  id: string
  type: BulletinType
  title: string
  sport: string
  description?: string | null
  location_city?: string | null
  location_state?: string | null
  start_date?: string | null
  price?: number | null
  registration_url?: string | null
}

type BulletinForm = {
  type: BulletinType
  title: string
  sport: string
  description: string
  location_city: string
  location_state: string
  start_date: string
  end_date: string
  age_min: string
  age_max: string
  price: string
  spots_total: string
  registration_url: string
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
}

const defaultForm: BulletinForm = {
  type: 'camp',
  title: '',
  sport: 'tennis',
  description: '',
  location_city: '',
  location_state: '',
  start_date: '',
  end_date: '',
  age_min: '',
  age_max: '',
  price: '',
  spots_total: '',
  registration_url: '',
}

function numericValue(value: string, kind: 'int' | 'float') {
  if (!value) return null
  return kind === 'int' ? Number.parseInt(value, 10) : Number.parseFloat(value)
}

export default function CoachBulletinPage() {
  const [myListings, setMyListings] = useState<BulletinListing[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BulletinForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  const loadListings = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('bulletin_listings')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setMyListings((data || []) as BulletinListing[])
  }, [supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void loadListings()
    })
  }, [loadListings])

  async function handleSubmit() {
    if (!form.title || !form.sport || !form.type) {
      setError('Title, sport, and type are required')
      return
    }
    setSaving(true)
    setError('')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be signed in to post a listing')
      setSaving(false)
      return
    }
    const spotsTotal = numericValue(form.spots_total, 'int')
    let lat: number | null = null
    let lng: number | null = null

    if (form.location_city) {
      try {
        const city = encodeURIComponent(`${form.location_city} ${form.location_state}`.trim())
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`)
        const data = (await response.json()) as NominatimSearchResult[]
        if (data[0]?.lat && data[0]?.lon) {
          lat = Number.parseFloat(data[0].lat)
          lng = Number.parseFloat(data[0].lon)
        }
      } catch {
        // Geocoding failed; keep the listing searchable without radius coordinates.
      }
    }

    const { error: insertError } = await supabase.from('bulletin_listings').insert({
      coach_id: user.id,
      type: form.type,
      title: form.title,
      sport: form.sport,
      description: form.description || null,
      location_city: form.location_city || null,
      location_state: form.location_state || null,
      location_lat: lat,
      location_lng: lng,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      age_min: numericValue(form.age_min, 'int'),
      age_max: numericValue(form.age_max, 'int'),
      price: numericValue(form.price, 'float'),
      spots_total: spotsTotal,
      spots_remaining: spotsTotal,
      registration_url: form.registration_url || null,
      source: 'coach',
      is_active: true,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setForm(defaultForm)
      setShowForm(false)
      await loadListings()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('bulletin_listings').update({ is_active: false }).eq('id', id)
    await loadListings()
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    fontSize: 13,
    fontFamily: 'Arial, sans-serif',
    outline: 'none',
    color: TEXT,
    background: 'white',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: TEXT_SEC,
    display: 'block',
    marginBottom: 4,
  }

  return (
    <div style={{ color: TEXT, fontFamily: 'Arial, sans-serif' }}>
      <UniversalVia role="coach" pageContext={{ page: 'dashboard-home' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Bulletin</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
            Post camps, tournaments, and clinics for players to discover
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
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
          <Plus size={16} />
          Post listing
        </button>
      </div>

      {showForm && (
        <div
          style={{
            background: 'white',
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px', color: TEXT }}>New listing</h2>

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Field label="Type" labelStyle={labelStyle}>
              <select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as BulletinType })} style={inputStyle}>
                <option value="camp">Camp</option>
                <option value="tournament">Tournament</option>
                <option value="clinic">Clinic</option>
                <option value="coach">Coaching</option>
              </select>
            </Field>
            <Field label="Sport" labelStyle={labelStyle}>
              <select value={form.sport} onChange={event => setForm({ ...form, sport: event.target.value })} style={inputStyle}>
                <option value="tennis">🎾 Tennis</option>
                <option value="golf">⛳ Golf</option>
                <option value="basketball">🏀 Basketball</option>
                <option value="pickleball">🏓 Pickleball</option>
                <option value="baseball">⚾ Baseball</option>
              </select>
            </Field>
            <Field label="Title *" labelStyle={labelStyle} wide>
              <input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="e.g. Summer Tennis Intensive Camp" style={inputStyle} />
            </Field>
            <Field label="Description" labelStyle={labelStyle} wide>
              <textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Brief description of the event..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <TextInput label="City" value={form.location_city} onChange={value => setForm({ ...form, location_city: value })} placeholder="Sioux Falls" inputStyle={inputStyle} labelStyle={labelStyle} />
            <TextInput label="State" value={form.location_state} onChange={value => setForm({ ...form, location_state: value })} placeholder="SD" inputStyle={inputStyle} labelStyle={labelStyle} />
            <TextInput label="Start date" type="date" value={form.start_date} onChange={value => setForm({ ...form, start_date: value })} inputStyle={inputStyle} labelStyle={labelStyle} />
            <TextInput label="End date" type="date" value={form.end_date} onChange={value => setForm({ ...form, end_date: value })} inputStyle={inputStyle} labelStyle={labelStyle} />
            <TextInput label="Min age" type="number" value={form.age_min} onChange={value => setForm({ ...form, age_min: value })} placeholder="e.g. 10" inputStyle={inputStyle} labelStyle={labelStyle} />
            <TextInput label="Max age" type="number" value={form.age_max} onChange={value => setForm({ ...form, age_max: value })} placeholder="e.g. 18" inputStyle={inputStyle} labelStyle={labelStyle} />
            <TextInput label="Price ($)" type="number" value={form.price} onChange={value => setForm({ ...form, price: value })} placeholder="e.g. 299" inputStyle={inputStyle} labelStyle={labelStyle} />
            <TextInput label="Total spots" type="number" value={form.spots_total} onChange={value => setForm({ ...form, spots_total: value })} placeholder="e.g. 20" inputStyle={inputStyle} labelStyle={labelStyle} />
            <TextInput label="Registration URL" value={form.registration_url} onChange={value => setForm({ ...form, registration_url: value })} placeholder="https://..." inputStyle={inputStyle} labelStyle={labelStyle} wide />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: TEAL,
                color: 'white',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
                opacity: saving ? 0.7 : 1,
              }}
              type="button"
            >
              {saving ? 'Posting...' : 'Post listing'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setForm(defaultForm)
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: 'white',
                color: TEXT_SEC,
                border: `1px solid ${BORDER}`,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Your listings ({myListings.length})
        </p>

        {myListings.length === 0 ? (
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: '0 0 6px' }}>No listings yet</p>
            <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0 }}>
              Post a camp, clinic, or tournament to appear in player feeds
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myListings.map(listing => (
              <div
                key={listing.id}
                style={{
                  background: 'white',
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ fontSize: 24, flexShrink: 0 }}>{sportEmoji[listing.sport] || '🏅'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{listing.title}</div>
                  <div style={{ fontSize: 12, color: TEXT_SEC, marginTop: 2 }}>
                    {listing.type} · {listing.location_city || 'Location TBD'}
                    {listing.location_state ? `, ${listing.location_state}` : ''}
                    {listing.start_date ? ` · ${format(new Date(listing.start_date), 'MMM d, yyyy')}` : ''}
                    {listing.price ? ` · $${listing.price}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {listing.registration_url && (
                    <a
                      href={listing.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        border: `1px solid ${BORDER}`,
                        color: TEXT_SEC,
                        textDecoration: 'none',
                        background: 'white',
                      }}
                    >
                      <ExternalLink size={12} />
                      View
                    </a>
                  )}
                  <button
                    onClick={() => void handleDelete(listing.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid hsl(0,70%,85%)',
                      background: 'hsl(0,70%,97%)',
                      color: 'hsl(0,70%,55%)',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                    type="button"
                    aria-label={`Remove ${listing.title}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  labelStyle,
  wide,
  children,
}: {
  label: string
  labelStyle: React.CSSProperties
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  inputStyle,
  labelStyle,
  type = 'text',
  placeholder,
  wide,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
  type?: string
  placeholder?: string
  wide?: boolean
}) {
  return (
    <Field label={label} labelStyle={labelStyle} wide={wide}>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </Field>
  )
}
