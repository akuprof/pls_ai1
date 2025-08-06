import React from 'react';
import { useAuth } from './AuthContext';
import { AuthPage } from './AuthForms';

export const ProtectedRoute = ({ children, requiredRoles = [], fallback = null }) => {
  const { user, userProfile, loading, hasAnyRole } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show auth page
  if (!user) {
    return <AuthPage />;
  }

  // If no roles required, allow access
  if (requiredRoles.length === 0) {
    return children;
  }

  // Check if user has required roles
  if (!hasAnyRole(requiredRoles)) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required roles: {requiredRoles.join(', ')}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Your roles: {userProfile?.roles?.join(', ') || 'None'}
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and has required roles
  return children;
};

// Convenience components for specific roles
export const DriverRoute = ({ children, fallback }) => (
  <ProtectedRoute requiredRoles={['driver', 'manager', 'admin']} fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export const ManagerRoute = ({ children, fallback }) => (
  <ProtectedRoute requiredRoles={['manager', 'admin']} fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export const AdminRoute = ({ children, fallback }) => (
  <ProtectedRoute requiredRoles={['admin']} fallback={fallback}>
    {children}
  </ProtectedRoute>
); 