import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import useAuth from "@/hooks/useAuth";
import AppHeader from "./AppHeader";
import SideNavigation from "./SideNavigation";

export function AuthenticatedRoutes({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  const { t } = useTranslation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">{t('common.loading')}</div>;
  }

  if (!user) {
    return null; // Will redirect via the effect
  }

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