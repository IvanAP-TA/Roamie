import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSeo } from '@/hooks/useSeo'
import { Splash } from '@/components/layout/Splash'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  useSeo('app')

  if (loading) return <Splash />
  if (!session) {
    const next = location.pathname + location.search
    return <Navigate to={`/?next=${encodeURIComponent(next)}`} replace />
  }
  return <Outlet />
}
