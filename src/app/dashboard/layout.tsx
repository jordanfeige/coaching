import Sidebar from '@/components/layout/Sidebar'
import { brand } from '@/lib/brand'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: brand.bg }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}