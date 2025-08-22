import React from "react";
import { Link, useLocation } from "wouter";

export default function SideNavigation() {
  const [location] = useLocation();

  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/map", label: "Map View" },
    { href: "/tasks", label: "Tasks" },
    { href: "/reports", label: "Reports" },
  ];

  return (
    <aside id="side-nav" className="w-56 shrink-0 border-r bg-white hidden md:flex md:flex-col">
      <nav className="p-4 space-y-2 text-sm text-gray-700">
        {items.map((item) => {
          const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
          const className = `block px-2 py-1 rounded transition-colors ${
            isActive ? "bg-gray-100 text-gray-900 font-medium" : "hover:bg-gray-100"
          }`;
          return (
            <Link key={item.href} href={item.href} className={className} aria-current={isActive ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

