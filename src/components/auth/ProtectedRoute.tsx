import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Define paths that should be publicly accessible
  const publicPaths = [
    /^\/games\/[^/]+$/, // Matches /games/{id} but not /games/create or other sub-routes
  ]

  // Check if current path should be public
  const isPublicPath = publicPaths.some(pathPattern => 
    pathPattern instanceof RegExp 
      ? pathPattern.test(location.pathname)
      : location.pathname === pathPattern
  )

  if (loading) {
    return null // Or a loading spinner
  }

  if (!user && !isPublicPath) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute 