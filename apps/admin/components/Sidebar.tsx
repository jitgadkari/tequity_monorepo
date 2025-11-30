"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Settings,
  Receipt,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Tenants", icon: Building2, href: "/customers" },
  { name: "Subscriptions", icon: Receipt, href: "/subscriptions" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { openSettings } = useSettings();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div className={`flex h-screen w-[240px] flex-col border-r shadow-sm transition-transform duration-300 overflow-hidden ${
        isLight
          ? "border-gray-200 bg-[#fafafa]"
          : "border-zinc-800 bg-zinc-950"
      } ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 fixed z-50`}>
      {/* Header */}
      <div className={`border-b p-4 ${
        isLight ? "border-gray-200" : "border-zinc-800"
      }`}>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400"></div>
              <span className={`text-sm font-semibold ${
                isLight ? "text-gray-900" : "text-white"
              }`}>Lightning</span>
            </div>
            <span className={`text-[9px] uppercase tracking-widest ${
              isLight ? "text-gray-600" : "text-zinc-500"
            }`}>
              Control Center
            </span>
          </Link>
          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className={`lg:hidden rounded-md p-1 ${
              isLight ? "hover:bg-gray-200" : "hover:bg-zinc-800"
            }`}
          >
            <X className={`h-5 w-5 ${isLight ? "text-gray-600" : "text-zinc-400"}`} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onMobileClose}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                isActive
                  ? isLight
                    ? "bg-gray-200 text-gray-900"
                    : "bg-zinc-800 text-white"
                  : isLight
                  ? "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Settings Button */}
        <button
          onClick={() => {
            openSettings();
            onMobileClose?.();
          }}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
            isLight
              ? "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Footer - User Profile */}
      <div className={`border-t p-3 flex-shrink-0 ${
        isLight ? "border-gray-200" : "border-zinc-800"
      }`}>
        <button className={`flex w-full items-center gap-2 rounded-md p-2 transition-colors ${
          isLight
            ? "hover:bg-gray-100"
            : "hover:bg-zinc-900"
        }`}>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400">
            <img
              src="https://avatar.vercel.sh/john"
              alt="User"
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className={`text-sm font-semibold truncate ${
              isLight ? "text-gray-900" : "text-white"
            }`}>
              John Doe
            </p>
            <p className={`text-xs truncate ${
              isLight ? "text-gray-600" : "text-zinc-500"
            }`}>
              john.doe@cervais.com
            </p>
          </div>
          <ChevronsUpDown className={`h-4 w-4 flex-shrink-0 ${
            isLight ? "text-gray-500" : "text-zinc-500"
          }`} />
        </button>
      </div>
      </div>
    </>
  );
}
