import {
  Document,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

export { PDFDownloadLink }

const TEAL = '#2D9B7F'
const TEAL_LIGHT = '#E1F5EE'
const BG = '#F5F4F0'
const BORDER = '#E5E7EB'
const TEXT = '#111827'
const TEXT_SEC = '#6B7280'
const RED = '#DC2626'
const RED_LIGHT = '#FEE2E2'
const AMBER = '#D97706'
const AMBER_LIGHT = '#FEF9C3'
const GREEN = '#16A34A'
const GREEN_LIGHT = '#F0FDF4'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: TEAL,
    margin: -40,
    marginBottom: 24,
    padding: 28,
    paddingBottom: 20,
  },
  headerWordmark: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerTagline: {
    fontSize: 10,
    color: '#DDF7EF',
    marginTop: 2,
  },
  headerMeta: {
    marginTop: 16,
    flexDirection: 'row',
  },
  headerMetaItem: {
    fontSize: 11,
    color: '#F2FFFB',
    marginRight: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  scoreCard: {
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreNumber: {
    fontSize: 52,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#E9FFF8',
    marginTop: 4,
  },
  scoreRating: {
    fontSize: 11,
    color: '#DDF7EF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 10,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: TEAL,
  },
  statLabel: {
    fontSize: 9,
    color: TEXT_SEC,
    marginTop: 2,
    textAlign: 'center',
  },
  strengthCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  strengthTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    marginBottom: 3,
  },
  strengthDesc: {
    fontSize: 10,
    color: TEXT_SEC,
    lineHeight: 1.5,
  },
  issueCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  issueTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  issueDesc: {
    fontSize: 10,
    color: TEXT_SEC,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  issueCue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  issueDrill: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  issueDrillTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEAL,
    marginBottom: 2,
  },
  issueDrillDesc: {
    fontSize: 9,
    color: TEXT_SEC,
    lineHeight: 1.5,
  },
  highlightBox: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  highlightLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 11,
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: TEXT_SEC,
  },
  footerBrand: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEAL,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})

type AnalysisIssue = {
  area?: string
  severity?: string
  what_i_see?: string
  consequence?: string
  simple_cue?: string
  drill?: string
  drill_sets_reps?: string
  drill_instruction?: string
  success_criteria?: string
}

type AnalysisStrength = {
  area?: string
  what_i_see?: string
  description?: string
  why_it_helps?: string
}

export type AnalysisPDF = {
  areas_to_improve?: AnalysisIssue[]
  strengths?: AnalysisStrength[]
  overall_rating?: string
  confidence?: string
  biggest_win?: string
  priority_focus?: string
  technique_notes?: string
}

interface PDFProps {
  analysis: AnalysisPDF
  playerName: string
  sport: string
  shotType?: string
  overallScore: number
  analyzedAt: string
}

function getSeverityColors(severity: string | undefined) {
  switch (severity) {
    case 'critical':
      return { bg: RED_LIGHT, border: RED, text: RED }
    case 'moderate':
      return { bg: AMBER_LIGHT, border: AMBER, text: AMBER }
    default:
      return { bg: '#F3F4F6', border: BORDER, text: TEXT_SEC }
  }
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Sport'
}

export function AnalysisPDFDocument({
  analysis,
  playerName,
  sport,
  shotType,
  overallScore,
  analyzedAt,
}: PDFProps) {
  const issues = analysis.areas_to_improve ?? []
  const criticalCount = issues.filter(issue => issue.severity === 'critical').length
  const moderateCount = issues.filter(issue => issue.severity === 'moderate').length
  const minorCount = issues.filter(issue => issue.severity === 'minor').length

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerWordmark}>Playvia</Text>
          <Text style={styles.headerTagline}>AI Coaching for Modern Athletes</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaItem}>{playerName}</Text>
            <Text style={styles.headerMetaItem}>·</Text>
            <Text style={styles.headerMetaItem}>
              {titleCase(sport)}
              {shotType ? ` - ${shotType}` : ''}
            </Text>
            <Text style={styles.headerMetaItem}>·</Text>
            <Text style={styles.headerMetaItem}>{analyzedAt}</Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreNumber}>{overallScore}</Text>
          <Text style={styles.scoreLabel}>Technique Score</Text>
          <Text style={styles.scoreRating}>
            {analysis.overall_rating || 'Developing'} · {analysis.confidence || 'standard'} confidence
          </Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { num: analysis.strengths?.length || 0, label: 'Strengths' },
            { num: criticalCount, label: 'Critical issues' },
            { num: moderateCount, label: 'Moderate issues' },
            { num: minorCount, label: 'Minor issues' },
          ].map(stat => (
            <View key={stat.label} style={styles.statBox}>
              <Text style={styles.statNumber}>{stat.num}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {analysis.biggest_win && (
          <View style={[styles.highlightBox, { backgroundColor: GREEN_LIGHT, borderLeftColor: GREEN }]}>
            <Text style={[styles.highlightLabel, { color: GREEN }]}>Biggest win</Text>
            <Text style={[styles.highlightText, { color: TEXT }]}>{analysis.biggest_win}</Text>
          </View>
        )}

        {analysis.priority_focus && (
          <View style={[styles.highlightBox, { backgroundColor: TEAL_LIGHT, borderLeftColor: TEAL }]}>
            <Text style={[styles.highlightLabel, { color: TEAL }]}>Priority focus this week</Text>
            <Text style={[styles.highlightText, { color: TEXT }]}>{analysis.priority_focus}</Text>
          </View>
        )}

        {(analysis.strengths?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Strengths</Text>
            {analysis.strengths!.map((strength, index) => (
              <View key={index} style={styles.strengthCard}>
                <Text style={styles.strengthTitle}>{strength.area || 'Strength'}</Text>
                <Text style={styles.strengthDesc}>
                  {strength.what_i_see || strength.description || 'Good movement pattern observed.'}
                </Text>
                {strength.why_it_helps && (
                  <Text style={[styles.strengthDesc, { marginTop: 4, fontStyle: 'italic' }]}>
                    Why it helps: {strength.why_it_helps}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {issues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Areas to improve</Text>
            {issues.map((issue, index) => {
              const colors = getSeverityColors(issue.severity)
              return (
                <View
                  key={index}
                  style={[styles.issueCard, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}
                >
                  <View style={[styles.badge, { backgroundColor: colors.border }]}>
                    <Text style={[styles.badgeText, { color: 'white' }]}>
                      {issue.severity || 'focus'}
                    </Text>
                  </View>
                  <Text style={[styles.issueTitle, { color: colors.text }]}>
                    {issue.area || 'Technique focus'}
                  </Text>
                  {issue.what_i_see && <Text style={styles.issueDesc}>{issue.what_i_see}</Text>}
                  {issue.consequence && (
                    <Text style={[styles.issueDesc, { fontStyle: 'italic' }]}>
                      Impact: {issue.consequence}
                    </Text>
                  )}
                  {issue.simple_cue && (
                    <View style={styles.issueCue}>
                      <Text style={{ fontSize: 10, color: TEXT }}>Cue: &quot;{issue.simple_cue}&quot;</Text>
                    </View>
                  )}
                  {issue.drill && (
                    <View style={styles.issueDrill}>
                      <Text style={styles.issueDrillTitle}>
                        Drill: {issue.drill}
                        {issue.drill_sets_reps ? ` - ${issue.drill_sets_reps}` : ''}
                      </Text>
                      {issue.drill_instruction && (
                        <Text style={styles.issueDrillDesc}>{issue.drill_instruction}</Text>
                      )}
                      {issue.success_criteria && (
                        <Text style={[styles.issueDrillDesc, { marginTop: 4, fontStyle: 'italic' }]}>
                          Success: {issue.success_criteria}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {analysis.technique_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical analysis</Text>
            <Text style={{ fontSize: 10, color: TEXT_SEC, lineHeight: 1.6 }}>
              {analysis.technique_notes}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Playvia · playvia.studio</Text>
          <Text style={styles.footerBrand}>AI Coaching for Modern Athletes</Text>
        </View>
      </Page>
    </Document>
  )
}
