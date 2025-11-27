"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

export function Preferences() {
  const [autoTimezone, setAutoTimezone] = useState(false);
  const [profileDiscoverable, setProfileDiscoverable] = useState(true);
  const { theme, setTheme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState("English(US)");
  const [selectedTimezone, setSelectedTimezone] = useState("UTC+05:30(IST)");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {/* <IoSettingsOutline className="h-6 w-6 text-gray-700" /> */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Preferences
        </h2>
      </div>

      {/* Appearance */}
      <div className="flex items-center justify-between dark:text-white">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Appearance
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Customize how Tequity looks on your device
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex font-semibold items-center gap-2 px-4 py-2 text-sm transition-colors dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] rounded-md">
              {theme === "system"
                ? "System"
                : theme === "dark"
                ? "Dark"
                : "Light"}
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-32 dark:bg-[#09090B] dark:text-white"
            align="end"
          >
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="cursor-pointer"
            >
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="cursor-pointer"
            >
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="cursor-pointer"
            >
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Language */}
      <div className="flex items-center justify-between dark:text-white">
        <div>
          <p className="text-sm font-normal text-gray-900 mb-1 dark:text-white">
            Language
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Change the language used in the user interface.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex font-semibold items-center gap-2 px-4 py-2 text-sm transition-colors dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] rounded-md">
              {selectedLanguage}
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-40 dark:bg-[#09090B] dark:text-white"
            align="end"
          >
            <DropdownMenuItem
              onClick={() => setSelectedLanguage("English(US)")}
              className="cursor-pointer"
            >
              English(US)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedLanguage("Spanish")}
              className="cursor-pointer"
            >
              Spanish
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedLanguage("French")}
              className="cursor-pointer"
            >
              French
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedLanguage("German")}
              className="cursor-pointer"
            >
              German
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedLanguage("Chinese")}
              className="cursor-pointer"
            >
              Chinese
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timezone */}
      <div className="flex items-center justify-between dark:text-white">
        <div>
          <p className="text-sm font-normal text-gray-900 mb-1 dark:text-white">
            Timezone
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Current timezone setting.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex font-semibold items-center gap-2 px-4 py-2 text-sm transition-colors dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] rounded-md">
              {selectedTimezone}
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-48 dark:bg-[#09090B] dark:text-white"
            align="end"
          >
            <DropdownMenuItem
              onClick={() => setSelectedTimezone("UTC+05:30(IST)")}
              className="cursor-pointer"
            >
              UTC+05:30(IST)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedTimezone("UTC+00:00(GMT)")}
              className="cursor-pointer"
            >
              UTC+00:00(GMT)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedTimezone("UTC-05:00(EST)")}
              className="cursor-pointer"
            >
              UTC-05:00(EST)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedTimezone("UTC-08:00(PST)")}
              className="cursor-pointer"
            >
              UTC-08:00(PST)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedTimezone("UTC+01:00(CET)")}
              className="cursor-pointer"
            >
              UTC+01:00(CET)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelectedTimezone("UTC+09:00(JST)")}
              className="cursor-pointer"
            >
              UTC+09:00(JST)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Auto Timezone */}
      <div className="flex items-center gap-2 justify-between dark:text-white ">
        <div>
          <p className="text-sm font-normal text-gray-900 mb-1 dark:text-white">
            Set timezone automatically using your location
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Reminders, notifications and emails are delivered based on your time
            zone.
          </p>
        </div>
        <button
          onClick={() => setAutoTimezone(!autoTimezone)}
          className={`relative inline-flex h-6 sm:w-11 w-16 items-center rounded-full cursor-pointer transition-colors ${
            autoTimezone
              ? "bg-black dark:bg-white"
              : "bg-gray-300 dark:bg-[#27272A]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoTimezone
                ? "translate-x-6 dark:bg-black"
                : "translate-x-1 dark:bg-black"
            }`}
          />
        </button>
      </div>

      {/* Profile Discoverability */}
      <div className="flex items-center gap-4 justify-between dark:text-white">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Profile discoverability
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Users with your email can see your name and profile picture when
            inviting you to a new workspace.
          </p>
        </div>
        <button
          onClick={() => setProfileDiscoverable(!profileDiscoverable)}
          className={`relative inline-flex h-6 sm:w-14 w-20  items-center rounded-full cursor-pointer transition-colors ${
            profileDiscoverable
              ? "bg-black dark:bg-white"
              : "bg-gray-300 dark:bg-[#27272A]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              profileDiscoverable
                ? "translate-x-6 dark:bg-black"
                : "translate-x-1 dark:bg-black"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
