"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Moon, Sun, ChevronDown, Menu, LogOut, User } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAdmin } from "@/context/AdminContext";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/customers/new": "New Customer",
  "/subscriptions": "Subscriptions",
  "/billings": "Billings",
  "/operators": "Operators",
  "/settings": "Settings",
};

const breadcrumbMap: Record<string, Array<{ label: string; href: string }>> = {
  "/": [{ label: "Dashboard", href: "/" }],
  "/customers": [
    { label: "Dashboard", href: "/" },
    { label: "Customers", href: "/customers" },
  ],
  "/customers/new": [
    { label: "Dashboard", href: "/" },
    { label: "Customers", href: "/customers" },
    { label: "New Customer", href: "/customers/new" },
  ],
  "/subscriptions": [
    { label: "Dashboard", href: "/" },
    { label: "Subscriptions", href: "/subscriptions" },
  ],
  "/billings": [
    { label: "Dashboard", href: "/" },
    { label: "Billings", href: "/billings" },
  ],
  "/operators": [
    { label: "Dashboard", href: "/" },
    { label: "Operators", href: "/operators" },
  ],
  "/settings": [
    { label: "Dashboard", href: "/" },
    { label: "Settings", href: "/settings" },
  ],
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { admin, logout } = useAdmin();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const breadcrumbs = breadcrumbMap[pathname] || [{ label: "Dashboard", href: "/" }];
  const isLightTheme = theme === "light";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };

  return (
    <header className={`flex h-16 items-center justify-between border-b px-6 ${
      isLightTheme
        ? "border-gray-200 bg-white"
        : "border-zinc-800 bg-zinc-950"
    }`}>
      {/* Left side - Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className={`rounded-md p-2 lg:hidden ${
            isLightTheme ? "hover:bg-gray-100" : "hover:bg-zinc-900"
          }`}
        >
          <Menu className={`h-5 w-5 ${
            isLightTheme ? "text-gray-600" : "text-zinc-400"
          }`} />
        </button>
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-2">
              {index > 0 && (
                <span className={isLightTheme ? "text-gray-400" : "text-zinc-600"}>
                  /
                </span>
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className={`font-medium ${
                  isLightTheme ? "text-gray-900" : "text-zinc-100"
                }`}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={
                    isLightTheme
                      ? "text-gray-600 hover:text-gray-900"
                      : "text-zinc-400 hover:text-zinc-100"
                  }
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className={`rounded-md p-2 ${
            isLightTheme ? "hover:bg-gray-100" : "hover:bg-zinc-900"
          }`}
        >
          {isLightTheme ? (
            <Moon className="h-5 w-5 text-gray-600" />
          ) : (
            <Sun className="h-5 w-5 text-zinc-400" />
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`flex items-center gap-2 rounded-md px-2 py-1 ${
              isLightTheme ? "hover:bg-gray-100" : "hover:bg-zinc-900"
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
              {admin?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <ChevronDown className={`h-4 w-4 ${
              isLightTheme ? "text-gray-600" : "text-zinc-400"
            }`} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg border ${
              isLightTheme
                ? "bg-white border-gray-200"
                : "bg-zinc-900 border-zinc-800"
            } z-50`}>
              <div className={`px-4 py-3 border-b ${
                isLightTheme ? "border-gray-200" : "border-zinc-800"
              }`}>
                <p className={`text-sm font-medium ${
                  isLightTheme ? "text-gray-900" : "text-white"
                }`}>
                  {admin?.name || "Admin"}
                </p>
                <p className={`text-xs ${
                  isLightTheme ? "text-gray-500" : "text-zinc-400"
                }`}>
                  {admin?.email || ""}
                </p>
                <p className={`text-xs mt-1 ${
                  isLightTheme ? "text-gray-400" : "text-zinc-500"
                }`}>
                  Role: {admin?.role?.replace("_", " ") || "admin"}
                </p>
              </div>
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${
                    isLightTheme
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
