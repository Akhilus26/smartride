import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = getDefaultPath(userProfile.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function getDefaultPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'conductor':
      return '/conductor';
    case 'passenger':
    default:
      return '/passenger';
  }
}

export function RoleBasedRedirect() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultPath(userProfile.role)} replace />;
}
