import { RecruitingSubTabs } from '@/components/player/recruiting/RecruitingSubTabs'
import { portalPageWrapStyle } from '@/lib/player-portal-styles'

export default function RecruitingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={portalPageWrapStyle}>
      <RecruitingSubTabs />
      <main>{children}</main>
    </div>
  )
}
