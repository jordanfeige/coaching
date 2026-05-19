import Sidebar from '@/components/layout/Sidebar'
import PageBackground from '@/components/PageBackground'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <PageBackground mode="coach" style={{ flex: 1, minHeight: '100vh' }}>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-6 pb-8 pt-6 md:p-8 md:pb-8">{children}</div>
        </main>
      </PageBackground>
    </div>
  )
}
