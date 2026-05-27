import { Outlet, useNavigate } from 'react-router'
import { Sidebar, SidebarToggle } from './Sidebar'
import { Topbar } from './Topbar'
import { useAppStore } from '../../stores/appStore'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export function AppShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const navigate = useNavigate()

  useKeyboardShortcuts({
    'mod+k': () => navigate('/search'),
  })

  return (
    <div className="h-screen flex overflow-hidden">
      <SidebarToggle />
      {sidebarOpen && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
