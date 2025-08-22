import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useAuth from "@/hooks/useAuth";
import { LanguageSwitcher } from "./LanguageSwitcher";
import GeoPilotLogo from "../assets/GeoPilot Logo.png";

export default function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const toggleSidebar = () => {
    const sidebar = document.getElementById("side-nav");
    if (sidebar) {
      // Toggle the sidebar visibility
      sidebar.classList.toggle("hidden");
      
      if (!sidebar.classList.contains("hidden")) {
        // Show sidebar - add mobile styles and overlay
        sidebar.classList.add("block");
        
        // Remove any existing overlay first
        const existingOverlay = document.getElementById("mobile-nav-overlay");
        if (existingOverlay && existingOverlay.parentNode) {
          document.body.removeChild(existingOverlay);
        }
        
        // Add overlay for mobile
        const overlay = document.createElement("div");
        overlay.className = "fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden";
        overlay.id = "mobile-nav-overlay";
        document.body.appendChild(overlay);
        
        // Close sidebar when overlay is clicked
        overlay.addEventListener("click", () => {
          sidebar.classList.add("hidden");
          sidebar.classList.remove("block");
          if (overlay.parentNode) {
            document.body.removeChild(overlay);
          }
        });
      } else {
        // Hide sidebar - remove mobile styles and overlay
        sidebar.classList.remove("block");
        const overlay = document.getElementById("mobile-nav-overlay");
        if (overlay && overlay.parentNode) {
          document.body.removeChild(overlay);
        }
      }
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200 flex items-center justify-between px-4 h-14 z-10">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden mr-2" 
          onClick={toggleSidebar}
        >
          <i className="ri-menu-line text-xl"></i>
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="flex items-center">
          <img src={GeoPilotLogo} alt="GeoFieldX Logo" className="h-8 w-auto mr-2" />
          <h1 className="text-xl font-medium bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">GeoFieldX</h1>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <LanguageSwitcher />
        <div className="hidden md:flex items-center">
          <span className="text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">
            {user.role}
          </span>
          <span className="ml-2 text-sm font-medium">{user.name}</span>
        </div>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-primary-100 text-primary-600">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setLocation("/profile")}>
              <i className="ri-user-line mr-2"></i>
              <span>{t('common.profile')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/settings")}>
              <i className="ri-settings-3-line mr-2"></i>
              <span>{t('common.settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <i className="ri-logout-box-line mr-2"></i>
              <span>{t('auth.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
