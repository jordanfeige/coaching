import CollegesRecruitingView from '@/components/player/recruiting/CollegesRecruitingView'
import { portalPageTitleStyle } from '@/lib/player-portal-styles'

export const dynamic = 'force-dynamic'

export default function RecruitingCollegesPage() {
  return (
    <div>
      <h1 style={portalPageTitleStyle}>Colleges</h1>
      <CollegesRecruitingView />
    </div>
  )
}
