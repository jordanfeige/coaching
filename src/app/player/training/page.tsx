import { TrainingPageContent } from '@/components/player/training/TrainingPageContent'
import { portalPageWrapStyle } from '@/lib/player-portal-styles'

export const dynamic = 'force-dynamic'

export default function TrainingPage() {
  return (
    <div style={{ ...portalPageWrapStyle, padding: '14px 16px 40px' }}>
      <TrainingPageContent />
    </div>
  )
}
