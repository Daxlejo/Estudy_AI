import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'

function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-text-primary">
      <TopBar />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
