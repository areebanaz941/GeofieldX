import React, { createContext, useState, useEffect } from "react";
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

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        // Wait a moment for extensions to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const userData = await getCurrentUser();
        // Add null check and validation
        if (userData && typeof userData === 'object') {
          console.log('[Auth] User authenticated successfully');
          setUser(userData);
        } else {
          console.warn('[Auth] getCurrentUser returned invalid data:', userData);
          setUser(null);
        }
      } catch (error: any) {
        // Check if this might be extension interference
        if (error?.message?.includes('401') || error?.message?.includes('Not authenticated')) {
          console.warn('[Auth] Authentication failed - user not logged in');
        } else if (error?.stack?.includes('knowee-ai') || error?.stack?.includes('extension://')) {
          console.warn('[Extension] Auth check may have been interfered with by extension:', error);
        } else {
          console.warn('[Auth] Auth check failed:', error);
        }
        // If error, user is not logged in
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

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
