export type CuratedDrillSeed = {
  slug: string
  name: string
  primary_category: string
  drill_type: string
  checkpoints: string[]
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  bracket_recommendation: string
  utr_recommendation: string
  duration_minutes: number
  mode: 'solo' | 'partner' | 'coach_feed'
  requires: string[]
  description: string
  steps: string[]
  success_criteria: string
  coaching_cue: string
  source: string
}

export const CURATED_TENNIS_DRILLS_V1: CuratedDrillSeed[] = [
  {
    "slug": "spacing-step-then-swing",
    "name": "Spacing \u2014 Step Before Swing",
    "primary_category": "Forehand",
    "drill_type": "footwork",
    "checkpoints": [
      "footwork",
      "contact_point"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 12,
    "mode": "solo",
    "requires": [
      "balls",
      "cones"
    ],
    "description": "Build rhythm stepping into each forehand.",
    "steps": [
      "Build rhythm stepping into each forehand.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Step then swing \u2014 don't reach.",
    "coaching_cue": "Step then swing \u2014 don't reach.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "contact-in-front-checkpoint",
    "name": "Contact In Front Checkpoint",
    "primary_category": "Forehand",
    "drill_type": "shadow",
    "checkpoints": [
      "contact_point",
      "swing_path"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "solo",
    "requires": [
      "mirror"
    ],
    "description": "Pause at contact in front of body.",
    "steps": [
      "Pause at contact in front of body.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Meet the ball.",
    "coaching_cue": "Meet the ball.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "forehand-crosscourt-rally",
    "name": "Forehand Cross-Court Rally",
    "primary_category": "Forehand",
    "drill_type": "cross-court",
    "checkpoints": [
      "contact_point",
      "follow_through"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Sustained cross-court forehands for depth.",
    "steps": [
      "Sustained cross-court forehands for depth.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Shape to corner.",
    "coaching_cue": "Shape to corner.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "topspin-brush-wall",
    "name": "Topspin Brush \u2014 Wall",
    "primary_category": "Forehand",
    "drill_type": "wall",
    "checkpoints": [
      "swing_path",
      "follow_through"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "solo",
    "requires": [
      "wall",
      "balls"
    ],
    "description": "Wall rally brushing up for topspin.",
    "steps": [
      "Wall rally brushing up for topspin.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Brush up.",
    "coaching_cue": "Brush up.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "unit-turn-shadow",
    "name": "Unit Turn Shadow Series",
    "primary_category": "Forehand",
    "drill_type": "shadow",
    "checkpoints": [
      "unit_turn",
      "takeback"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 10,
    "mode": "solo",
    "requires": [],
    "description": "Groove shoulder turn without ball.",
    "steps": [
      "Groove shoulder turn without ball.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Turn together.",
    "coaching_cue": "Turn together.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "forehand-approach-volley",
    "name": "Approach + First Volley",
    "primary_category": "Forehand",
    "drill_type": "live-ball",
    "checkpoints": [
      "footwork",
      "contact_point"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 25,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Approach forehand then first volley.",
    "steps": [
      "Approach forehand then first volley.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Big first step.",
    "coaching_cue": "Big first step.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "forehand-inside-out-pattern",
    "name": "Inside-Out Forehand Pattern",
    "primary_category": "Forehand",
    "drill_type": "live-ball",
    "checkpoints": [
      "swing_path",
      "footwork"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Run around backhand for inside-out forehand.",
    "steps": [
      "Run around backhand for inside-out forehand.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Commit early.",
    "coaching_cue": "Commit early.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "forehand-consistency-basket",
    "name": "Forehand Basket \u2014 No Miss Zone",
    "primary_category": "Forehand",
    "drill_type": "coach_feed",
    "checkpoints": [
      "contact_point",
      "recovery"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 18,
    "mode": "coach_feed",
    "requires": [
      "balls"
    ],
    "description": "Feed to deep middle third.",
    "steps": [
      "Feed to deep middle third.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Depth first.",
    "coaching_cue": "Depth first.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "two-handed-backhand-wall",
    "name": "Two-Handed Backhand Wall Rally",
    "primary_category": "Backhand",
    "drill_type": "wall",
    "checkpoints": [
      "contact_point",
      "follow_through"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "solo",
    "requires": [
      "wall",
      "balls"
    ],
    "description": "Wall rally backhand only.",
    "steps": [
      "Wall rally backhand only.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Turn early.",
    "coaching_cue": "Turn early.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "backhand-crosscourt-depth",
    "name": "Backhand Cross-Court Depth",
    "primary_category": "Backhand",
    "drill_type": "cross-court",
    "checkpoints": [
      "contact_point",
      "swing_path"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Cross-court backhand for depth.",
    "steps": [
      "Cross-court backhand for depth.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Drive through.",
    "coaching_cue": "Drive through.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "one-handed-backhand-slice",
    "name": "One-Handed Slice Backhand",
    "primary_category": "Backhand",
    "drill_type": "live-ball",
    "checkpoints": [
      "swing_path",
      "contact_point"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 18,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Slice approach and neutralize.",
    "steps": [
      "Slice approach and neutralize.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: High to low.",
    "coaching_cue": "High to low.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "backhand-return-block",
    "name": "Backhand Return Block",
    "primary_category": "Backhand",
    "drill_type": "live-ball",
    "checkpoints": [
      "ready_position",
      "contact_point"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Block second-serve return.",
    "steps": [
      "Block second-serve return.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Meet early.",
    "coaching_cue": "Meet early.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "backhand-change-direction",
    "name": "Backhand Change of Direction",
    "primary_category": "Backhand",
    "drill_type": "live-ball",
    "checkpoints": [
      "footwork",
      "recovery"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Cross then down the line on call.",
    "steps": [
      "Cross then down the line on call.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Sell the cross.",
    "coaching_cue": "Sell the cross.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "backhand-topspin-drive",
    "name": "Backhand Topspin Drive",
    "primary_category": "Backhand",
    "drill_type": "cross-court",
    "checkpoints": [
      "swing_path",
      "follow_through"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 18,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Topspin backhand drive.",
    "steps": [
      "Topspin backhand drive.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Finish the swing.",
    "coaching_cue": "Finish the swing.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "serve-toss-hold",
    "name": "Serve Toss Hold",
    "primary_category": "Serve",
    "drill_type": "shadow",
    "checkpoints": [
      "toss",
      "head_position"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 10,
    "mode": "solo",
    "requires": [
      "balls"
    ],
    "description": "Hold toss at peak without hit.",
    "steps": [
      "Hold toss at peak without hit.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Release smooth.",
    "coaching_cue": "Release smooth.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "serve-target-zones",
    "name": "Serve Target Zones",
    "primary_category": "Serve",
    "drill_type": "live-ball",
    "checkpoints": [
      "contact_point",
      "follow_through"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "solo",
    "requires": [
      "balls",
      "targets"
    ],
    "description": "Serve to wide, body, T zones.",
    "steps": [
      "Serve to wide, body, T zones.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Pick a spot.",
    "coaching_cue": "Pick a spot.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "kick-second-serve",
    "name": "Kick Second Serve",
    "primary_category": "Serve",
    "drill_type": "live-ball",
    "checkpoints": [
      "swing_path",
      "contact_point"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 18,
    "mode": "solo",
    "requires": [
      "balls"
    ],
    "description": "Heavy spin second serve.",
    "steps": [
      "Heavy spin second serve.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Brush for height.",
    "coaching_cue": "Brush for height.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "serve-plus-one",
    "name": "Serve + One",
    "primary_category": "Serve",
    "drill_type": "match-sim",
    "checkpoints": [
      "recovery",
      "footwork"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 25,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Serve and play first ball.",
    "steps": [
      "Serve and play first ball.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Attack weak reply.",
    "coaching_cue": "Attack weak reply.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "flat-first-serve",
    "name": "Flat First Serve Build",
    "primary_category": "Serve",
    "drill_type": "live-ball",
    "checkpoints": [
      "contact_point",
      "pronation"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "solo",
    "requires": [
      "balls"
    ],
    "description": "Flat first serves building pace.",
    "steps": [
      "Flat first serves building pace.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Pronate through.",
    "coaching_cue": "Pronate through.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "serve-routine-reps",
    "name": "Serve Routine Reps",
    "primary_category": "Serve",
    "drill_type": "shadow",
    "checkpoints": [
      "ready_position",
      "toss"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 12,
    "mode": "solo",
    "requires": [
      "balls"
    ],
    "description": "Full pre-serve routine reps.",
    "steps": [
      "Full pre-serve routine reps.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Same routine.",
    "coaching_cue": "Same routine.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "wide-serve-attack",
    "name": "Wide Serve Attack Pattern",
    "primary_category": "Serve",
    "drill_type": "match-sim",
    "checkpoints": [
      "footwork",
      "contact_point"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 22,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Wide serve then forehand open court.",
    "steps": [
      "Wide serve then forehand open court.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Take space.",
    "coaching_cue": "Take space.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "serve-consistency-50",
    "name": "50 Serve Consistency",
    "primary_category": "Serve",
    "drill_type": "live-ball",
    "checkpoints": [
      "contact_point",
      "recovery"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 25,
    "mode": "solo",
    "requires": [
      "balls"
    ],
    "description": "50 serves in play challenge.",
    "steps": [
      "50 serves in play challenge.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: One ball focus.",
    "coaching_cue": "One ball focus.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "volley-catch-feed",
    "name": "Volley Catch Feed",
    "primary_category": "Volley",
    "drill_type": "coach_feed",
    "checkpoints": [
      "volley_contact",
      "ready_position"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 12,
    "mode": "coach_feed",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Catch feed on racket face.",
    "steps": [
      "Catch feed on racket face.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Soft hands.",
    "coaching_cue": "Soft hands.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "reflex-volley-wall",
    "name": "Reflex Volley \u2014 Wall",
    "primary_category": "Volley",
    "drill_type": "wall",
    "checkpoints": [
      "volley_contact",
      "recovery"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "solo",
    "requires": [
      "wall"
    ],
    "description": "Quick punch volleys off wall.",
    "steps": [
      "Quick punch volleys off wall.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Punch don't swing.",
    "coaching_cue": "Punch don't swing.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "approach-volley-transition",
    "name": "Approach Volley Transition",
    "primary_category": "Volley",
    "drill_type": "live-ball",
    "checkpoints": [
      "footwork",
      "volley_contact"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Approach then first volley.",
    "steps": [
      "Approach then first volley.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Split at net.",
    "coaching_cue": "Split at net.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "overhead-smash-feed",
    "name": "Overhead Smash Feed",
    "primary_category": "Volley",
    "drill_type": "coach_feed",
    "checkpoints": [
      "head_position",
      "contact_point"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "coach_feed",
    "requires": [
      "balls"
    ],
    "description": "Lob feed overhead smash.",
    "steps": [
      "Lob feed overhead smash.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Racket back early.",
    "coaching_cue": "Racket back early.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "doubles-poach-volley",
    "name": "Doubles Poach Volley",
    "primary_category": "Volley",
    "drill_type": "live-ball",
    "checkpoints": [
      "footwork",
      "ready_position"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Poach on cross return.",
    "steps": [
      "Poach on cross return.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Go on movement.",
    "coaching_cue": "Go on movement.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "split-step-shadow",
    "name": "Split-Step Shadow",
    "primary_category": "Footwork",
    "drill_type": "shadow",
    "checkpoints": [
      "split_step",
      "ready_position"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 10,
    "mode": "solo",
    "requires": [],
    "description": "Split on partner rhythm.",
    "steps": [
      "Split on partner rhythm.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Hop small.",
    "coaching_cue": "Hop small.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "cone-agility-ladder",
    "name": "Cone Agility Ladder",
    "primary_category": "Footwork",
    "drill_type": "footwork",
    "checkpoints": [
      "footwork",
      "recovery"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "solo",
    "requires": [
      "cones",
      "ladder"
    ],
    "description": "Lateral cones and ladder.",
    "steps": [
      "Lateral cones and ladder.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Light feet.",
    "coaching_cue": "Light feet.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "recovery-crossover",
    "name": "Recovery Crossover Steps",
    "primary_category": "Footwork",
    "drill_type": "footwork",
    "checkpoints": [
      "recovery",
      "footwork"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 12,
    "mode": "solo",
    "requires": [
      "cones"
    ],
    "description": "Wide ball crossover recovery.",
    "steps": [
      "Wide ball crossover recovery.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Crossover.",
    "coaching_cue": "Crossover.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "first-step-explosion",
    "name": "First Step Explosion",
    "primary_category": "Footwork",
    "drill_type": "footwork",
    "checkpoints": [
      "footwork",
      "ready_position"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "solo",
    "requires": [
      "cones"
    ],
    "description": "React to direction call.",
    "steps": [
      "React to direction call.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Explode.",
    "coaching_cue": "Explode.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "side-to-side-live",
    "name": "Side-to-Side Live Balls",
    "primary_category": "Footwork",
    "drill_type": "live-ball",
    "checkpoints": [
      "footwork",
      "recovery"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "coach_feed",
    "requires": [
      "balls"
    ],
    "description": "Alternating corner feeds.",
    "steps": [
      "Alternating corner feeds.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Recover center.",
    "coaching_cue": "Recover center.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "split-open-close",
    "name": "Split Open and Close",
    "primary_category": "Footwork",
    "drill_type": "footwork",
    "checkpoints": [
      "split_step",
      "footwork"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 12,
    "mode": "solo",
    "requires": [],
    "description": "Open load and close to net.",
    "steps": [
      "Open load and close to net.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Close straight.",
    "coaching_cue": "Close straight.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "defensive-scramble",
    "name": "Defensive Scramble",
    "primary_category": "Footwork",
    "drill_type": "live-ball",
    "checkpoints": [
      "recovery",
      "footwork"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 22,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Wide ball recovery focus.",
    "steps": [
      "Wide ball recovery focus.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: High and deep.",
    "coaching_cue": "High and deep.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "tiebreak-sim",
    "name": "Tiebreak Simulation",
    "primary_category": "Match Play",
    "drill_type": "match-sim",
    "checkpoints": [
      "head_position",
      "recovery"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 30,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Play tiebreak to 7.",
    "steps": [
      "Play tiebreak to 7.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: One point.",
    "coaching_cue": "One point.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "crosscourt-only-game",
    "name": "Cross-Court Only Game",
    "primary_category": "Match Play",
    "drill_type": "match-sim",
    "checkpoints": [
      "swing_path",
      "contact_point"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 25,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Game to 11 cross-court only.",
    "steps": [
      "Game to 11 cross-court only.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Shape cross.",
    "coaching_cue": "Shape cross.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "serve-return-game",
    "name": "Serve Return Game",
    "primary_category": "Match Play",
    "drill_type": "match-sim",
    "checkpoints": [
      "ready_position",
      "contact_point"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Returner starts 30-30.",
    "steps": [
      "Returner starts 30-30.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Early contact.",
    "coaching_cue": "Early contact.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "pressure-7-point",
    "name": "Pressure 7-Point Set",
    "primary_category": "Match Play",
    "drill_type": "match-sim",
    "checkpoints": [
      "head_position",
      "footwork"
    ],
    "skill_level": "advanced",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 20,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "First to 7 competitive.",
    "steps": [
      "First to 7 competitive.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Next point.",
    "coaching_cue": "Next point.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "between-point-routine",
    "name": "Between-Point Routine",
    "primary_category": "Mental",
    "drill_type": "shadow",
    "checkpoints": [
      "head_position",
      "ready_position"
    ],
    "skill_level": "beginner",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 10,
    "mode": "solo",
    "requires": [
      "towel",
      "balls"
    ],
    "description": "Full between-point ritual.",
    "steps": [
      "Full between-point ritual.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Same ritual.",
    "coaching_cue": "Same ritual.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "focus-breath-serve",
    "name": "Focus Breath Before Serve",
    "primary_category": "Mental",
    "drill_type": "shadow",
    "checkpoints": [
      "head_position",
      "toss"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 8,
    "mode": "solo",
    "requires": [
      "balls"
    ],
    "description": "Two breaths before serve.",
    "steps": [
      "Two breaths before serve.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: See the target.",
    "coaching_cue": "See the target.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  },
  {
    "slug": "mistake-reset-cue",
    "name": "Mistake Reset Cue",
    "primary_category": "Mental",
    "drill_type": "match-sim",
    "checkpoints": [
      "head_position",
      "recovery"
    ],
    "skill_level": "intermediate",
    "bracket_recommendation": "12U+",
    "utr_recommendation": "5.0-11.0",
    "duration_minutes": 15,
    "mode": "partner",
    "requires": [
      "balls",
      "partner"
    ],
    "description": "Physical reset after errors.",
    "steps": [
      "Physical reset after errors.",
      "Repeat with quality focus.",
      "Rest 30s between sets."
    ],
    "success_criteria": "Complete drill applying: Next point.",
    "coaching_cue": "Next point.",
    "source": "Playvia curated \u00b7 USTA developmental patterns"
  }
]
