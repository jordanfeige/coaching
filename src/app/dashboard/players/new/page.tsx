'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const WARM_BG = 'hsl(40,20%,97%)'

export default function NewPlayerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    sport: 'tennis',
    skill_level: 'beginner',
    age: '',
  })

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const age = parseInt(form.age, 10)
    await supabase.from('players').insert({
      name: form.name.trim(),
      email: form.email.trim() || null,
      sport: form.sport,
      skill_level: form.skill_level,
      age: Number.isNaN(age) ? null : age,
    })
    setSaving(false)
    router.push('/dashboard/players')
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 9,
    border: `0.5px solid ${BORDER}`,
    background: WARM_BG,
    fontSize: 13,
    color: TEXT,
    fontFamily: 'Arial, sans-serif',
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <Link
        href="/dashboard/players"
        style={{ fontSize: 13, color: TEXT_SEC, textDecoration: 'none' }}
      >
        ← Back to players
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: '16px 0 20px' }}>
        Add player
      </h1>
      <div
        style={{
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div>
          <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Name</label>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Email</label>
          <input
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Sport</label>
            <select
              value={form.sport}
              onChange={e => setForm({ ...form, sport: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="tennis">Tennis</option>
              <option value="golf">Golf</option>
              <option value="baseball">Baseball</option>
              <option value="basketball">Basketball</option>
              <option value="pickleball">Pickleball</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Level</label>
            <select
              value={form.skill_level}
              onChange={e => setForm({ ...form, skill_level: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="elite">Elite</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Age</label>
          <input
            type="number"
            value={form.age}
            onChange={e => setForm({ ...form, age: e.target.value })}
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !form.name.trim()}
          style={{
            marginTop: 8,
            padding: '11px',
            borderRadius: 10,
            background: saving ? '#ccc' : TEAL,
            border: 'none',
            color: 'white',
            fontSize: 13,
            fontWeight: 500,
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Add player'}
        </button>
      </div>
    </div>
  )
}
