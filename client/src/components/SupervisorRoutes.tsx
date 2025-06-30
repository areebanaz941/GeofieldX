import { useEffect } from "react";
import { useLocation } from "wouter";
import useAuth from "@/hooks/useAuth";

export function SupervisorRoutes({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "Supervisor")) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== "Supervisor") {
    return null; // Will redirect via the effect
  }

  return <>{children}</>;
}