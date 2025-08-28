import React, { createContext, useState, useEffect, useRef } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { IUser, InsertUser } from "@shared/schema";

interface AuthContextType {
  user: IUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: InsertUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<IUser | null>(null);
  const PERSISTED_USER_KEY = 'auth_user';

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        // Wait a moment for extensions to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const userData = await getCurrentUser();
        // Add null check and validation
        if (userData && typeof userData === 'object') {
          console.log('[Auth] User authenticated successfully:', userData.username, 'Role:', userData.role);
          setUser(userData);
          userRef.current = userData;
          try {
            localStorage.setItem(PERSISTED_USER_KEY, JSON.stringify(userData));
          } catch (e) {
            console.warn('[Auth] Failed to persist user:', e);
          }
        } else {
          console.warn('[Auth] getCurrentUser returned invalid data:', userData);
          setUser(null);
          userRef.current = null;
          try { localStorage.removeItem(PERSISTED_USER_KEY); } catch {}
        }
      } catch (error: any) {
        // Check if this might be extension interference
        if (error?.message?.includes('401') || error?.message?.includes('Not authenticated')) {
          console.warn('[Auth] Authentication failed - user not logged in');
          setUser(null);
          userRef.current = null;
          try { localStorage.removeItem(PERSISTED_USER_KEY); } catch {}
        } else if (error?.stack?.includes('knowee-ai') || error?.stack?.includes('extension://')) {
          console.warn('[Extension] Auth check may have been interfered with by extension:', error);
          // Don't clear user for extension interference - keep existing state
        } else {
          console.warn('[Auth] Auth check failed with non-auth error:', error);
          // For other errors (network, server issues), don't clear user state
          // The user might still be authenticated, just having connectivity issues
          if (error?.message?.includes('500') || error?.message?.includes('Failed to fetch')) {
            console.warn('[Auth] Keeping user state due to potential connectivity issue');
          } else {
            // Only clear user for actual authentication failures
            console.warn('[Auth] Clearing user state due to unknown error');
            setUser(null);
            userRef.current = null;
            try { localStorage.removeItem(PERSISTED_USER_KEY); } catch {}
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Initial auth check
    // Hydrate from persisted user immediately to avoid redirect flicker
    try {
      const persisted = localStorage.getItem(PERSISTED_USER_KEY);
      if (persisted) {
        const parsed = JSON.parse(persisted) as IUser;
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
          userRef.current = parsed;
        }
      }
    } catch (e) {
      console.warn('[Auth] Failed to read persisted user:', e);
    }
    checkAuth();
    
    // Set up periodic auth validation (every 5 minutes)
    const authValidationInterval = setInterval(() => {
      // Use ref instead of state to avoid dependency issues
      if (userRef.current) {
        console.log('[Auth] Periodic validation check for user:', userRef.current.username);
        checkAuth();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(authValidationInterval);
    };
  }, []); // FIXED: Empty dependency array - only run once on mount

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiLogin(username, password);
      
      // Add validation for login response
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid login response');
      }
      
      // Safe destructuring with fallback
      const { user: userData } = response || {};
      
      if (!userData) {
        throw new Error('No user data in login response');
      }
      
      setUser(userData);
      userRef.current = userData;
      try {
        localStorage.setItem(PERSISTED_USER_KEY, JSON.stringify(userData));
      } catch (e) {
        console.warn('[Auth] Failed to persist user on login:', e);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiLogout();
      setUser(null);
      userRef.current = null;
      try { localStorage.removeItem(PERSISTED_USER_KEY); } catch {}
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: InsertUser) => {
    try {
      setIsLoading(true);
      const response = await apiRegister(data);
      
      // Add validation for register response
      if (!response || typeof response !== 'object') {
        console.warn('Invalid register response:', response);
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
