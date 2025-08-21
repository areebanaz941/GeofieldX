import React from "react";

export default function SideNavigation() {
  return (
    <aside className="w-56 shrink-0 border-r bg-white hidden md:flex md:flex-col">
      <nav className="p-4 space-y-2 text-sm text-gray-700">
        <a href="/dashboard" className="block px-2 py-1 rounded hover:bg-gray-100">Dashboard</a>
        <a href="/map" className="block px-2 py-1 rounded hover:bg-gray-100">Map View</a>
        <a href="/tasks" className="block px-2 py-1 rounded hover:bg-gray-100">Tasks</a>
        <a href="/reports" className="block px-2 py-1 rounded hover:bg-gray-100">Reports</a>
      </nav>
    </aside>
  );
}

