import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'restaurant_owner' | 'customer';
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo 
}) => {
  const { state, dispatch } = useApp();
  const user = state.user;
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple checks
    if (hasCheckedRef.current && isAuthorized) {
      return;
    }

    let isMounted = true;
    
    const checkAuth = async () => {
      const token = apiService.getToken();
      
      if (!token) {
        console.log('[ProtectedRoute] No token found, redirecting to login');
        if (isMounted) {
          setIsChecking(false);
          navigate('/login');
        }
        return;
      }

      // If user is already in context and role matches, authorize immediately
      if (user && user.role === requiredRole) {
        console.log('[ProtectedRoute] User already in context with correct role, authorizing');
        if (isMounted) {
          hasCheckedRef.current = true;
          setIsAuthorized(true);
          setIsChecking(false);
        }
        return;
      }

      // If user exists but role doesn't match, redirect immediately
      if (user && user.role !== requiredRole) {
        console.log('[ProtectedRoute] User role mismatch, redirecting. User role:', user.role, 'Required:', requiredRole);
        if (isMounted) {
          setIsChecking(false);
          if (user.role === 'admin') {
            navigate('/admin');
          } else if (user.role === 'restaurant_owner') {
            navigate('/restaurant-owner');
          } else {
            navigate('/dashboard');
          }
        }
        return;
      }

      // User not in context yet - decode JWT token to get role (instant, no API call)
      console.log('[ProtectedRoute] User not in context, decoding token...');
      
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const tokenRole = payload.role;
          const tokenUserId = payload.user_id;
          
          console.log('[ProtectedRoute] Decoded token - Role:', tokenRole, 'User ID:', tokenUserId, 'Required:', requiredRole);
          
          if (tokenRole && tokenUserId) {
            // Check role requirement
            if (requiredRole && tokenRole !== requiredRole) {
              // Role doesn't match, redirect immediately
              console.log('[ProtectedRoute] Token role mismatch, redirecting');
              if (isMounted) {
                setIsChecking(false);
                if (tokenRole === 'admin') {
                  navigate('/admin');
                } else if (tokenRole === 'restaurant_owner') {
                  navigate('/restaurant-owner');
                } else {
                  navigate('/dashboard');
                }
              }
              return;
            }
            
            // Role matches - authorize immediately
            console.log('[ProtectedRoute] Token role matches! Authorizing...');
            
            // Update context with token data
            dispatch({
              type: 'SET_USER',
              payload: {
                id: tokenUserId,
                email: payload.email || '',
                phone: payload.phone || '',
                name: 'User',
                role: tokenRole,
                isVerified: true,
                addresses: [],
                paymentMethods: [],
                createdAt: new Date(),
              },
            });
            
            // Set authorized state - use setTimeout to ensure state update happens
            if (isMounted) {
              console.log('[ProtectedRoute] Setting state: isAuthorized=true, isChecking=false');
              hasCheckedRef.current = true;
              setIsAuthorized(true);
              setIsChecking(false);
              console.log('[ProtectedRoute] State updated');
            }
            
            // Fetch full user details in background (non-blocking)
            setTimeout(() => {
              apiService.getUser(tokenUserId).then(userResponse => {
                if (userResponse.success && userResponse.data) {
                  dispatch({
                    type: 'SET_USER',
                    payload: {
                      id: userResponse.data.user_id,
                      email: userResponse.data.email || '',
                      phone: userResponse.data.phone || '',
                      name: userResponse.data.name,
                      role: userResponse.data.role as 'customer' | 'restaurant_owner' | 'admin',
                      isVerified: true,
                      addresses: [],
                      paymentMethods: [],
                      createdAt: new Date(),
                    },
                  });
                }
              }).catch(err => {
                console.warn('[ProtectedRoute] Failed to fetch user details:', err);
              });
            }, 100);
            
            return; // Exit early, no API call needed
          }
        }
      } catch (e) {
        console.error('[ProtectedRoute] Could not decode token:', e);
        // Fall through to API verification
      }
      
      // Fallback: API verification (only if token decode fails)
      console.log('[ProtectedRoute] Falling back to API verification...');
      try {
        const verifyResponse = await apiService.verifyToken(token);
        if (!isMounted) return;
        
        if (!verifyResponse.success || !verifyResponse.data?.valid || !verifyResponse.data?.user_id) {
          console.error('[ProtectedRoute] Token verification failed');
          apiService.setToken(null);
          if (isMounted) {
            setIsChecking(false);
            navigate('/login');
          }
          return;
        }

        const userResponse = await apiService.getUser(verifyResponse.data.user_id);
        if (!isMounted) return;
        
        if (!userResponse.success || !userResponse.data) {
          console.error('[ProtectedRoute] Failed to fetch user');
          apiService.setToken(null);
          if (isMounted) {
            setIsChecking(false);
            navigate('/login');
          }
          return;
        }

        const userRole = userResponse.data.role as 'customer' | 'restaurant_owner' | 'admin';

        dispatch({
          type: 'SET_USER',
          payload: {
            id: userResponse.data.user_id,
            email: userResponse.data.email || '',
            phone: userResponse.data.phone || '',
            name: userResponse.data.name,
            role: userRole,
            isVerified: true,
            addresses: [],
            paymentMethods: [],
            createdAt: new Date(),
          },
        });

        if (requiredRole && userRole !== requiredRole) {
          if (isMounted) {
            setIsChecking(false);
            if (userRole === 'admin') {
              navigate('/admin');
            } else if (userRole === 'restaurant_owner') {
              navigate('/restaurant-owner');
            } else {
              navigate('/dashboard');
            }
          }
          return;
        }

        if (isMounted) {
          hasCheckedRef.current = true;
          setIsAuthorized(true);
          setIsChecking(false);
        }
      } catch (error) {
        console.error('[ProtectedRoute] Auth check failed:', error);
        if (isMounted) {
          apiService.setToken(null);
          setIsChecking(false);
          navigate('/login');
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [requiredRole]); // Only check when requiredRole changes

  // Debug info
  console.log('[ProtectedRoute] Render:', { isChecking, isAuthorized, userRole: user?.role, requiredRole });

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-sm text-gray-400 mt-2">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    console.log('[ProtectedRoute] Not authorized, returning null');
    return null;
  }

  console.log('[ProtectedRoute] Authorized, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
