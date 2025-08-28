import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import useAuth from "@/hooks/useAuth";
import AppHeader from "./AppHeader";
import SideNavigation from "./SideNavigation";

export function AuthenticatedRoutes({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Only redirect to login if we're not loading AND there's no user
    if (!isLoading && !user) {
      console.log('[AuthenticatedRoutes] No user after loading complete, redirecting to login');
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  // Show loading state while checking authentication
  // This prevents premature redirect on page refresh
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // If not loading but no user, we'll redirect via the effect
  // Return null to prevent flash of content
  if (!user) {
    return null;
  }

  // User is authenticated, render the layout with children
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <SideNavigation />
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
