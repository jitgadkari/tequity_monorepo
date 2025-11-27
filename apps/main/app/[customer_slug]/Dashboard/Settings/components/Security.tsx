"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Security() {
  const [allowPublicLinks, setAllowPublicLinks] = useState(false);
  const [onlyMembers, setOnlyMembers] = useState(true);
  const [allowExportDownload, setAllowExportDownload] = useState(true);
  const [disableOption, setDisableOption] = useState(false);
  const [allowMembers, setAllowMembers] = useState(true);
  const [deletePeriod, setDeletePeriod] = useState("30 days");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {/* <FiShield className="h-6 w-6 text-gray-700" /> */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Security
        </h2>
      </div>

      {/* Allow public links to files/folders */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Allow public links to files/folders
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Let users share selected dataroom items via public link.
          </p>
        </div>
        <button
          onClick={() => setAllowPublicLinks(!allowPublicLinks)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
            allowPublicLinks
              ? "bg-black dark:bg-white"
              : "bg-gray-300 dark:bg-[#27272A]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              allowPublicLinks
                ? "translate-x-6 dark:bg-black"
                : "translate-x-1 dark:bg-black"
            }`}
          />
        </button>
      </div>

      {/* Only allow members to see/share dataroom content */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Only allow members to see/share dataroom content
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Limit access to members only no external viewers.
          </p>
        </div>
        <button
          onClick={() => setOnlyMembers(!onlyMembers)}
          className={`relative inline-flex h-6 sm:w-11 w-12 items-center rounded-full cursor-pointer transition-colors ${
            onlyMembers
              ? "bg-black dark:bg-white"
              : "bg-gray-300 dark:bg-[#27272A]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              onlyMembers
                ? "translate-x-6 dark:bg-black"
                : "translate-x-1 dark:bg-black"
            }`}
          />
        </button>
      </div>

      {/* Allow users to export/download files */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Allow users to export/download files
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Enable downloads for all members and guests.
          </p>
        </div>
        <button
          onClick={() => setAllowExportDownload(!allowExportDownload)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
            allowExportDownload
              ? "bg-black dark:bg-white"
              : "bg-gray-300 dark:bg-[#27272A]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              allowExportDownload
                ? "translate-x-6 dark:bg-black"
                : "translate-x-1 dark:bg-black"
            }`}
          />
        </button>
      </div>

      {/* Disable */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Disable exporting for guests
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Only dataroom members with edit permissions can export.
          </p>
        </div>
        <button
          onClick={() => setDisableOption(!disableOption)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
            disableOption
              ? "bg-black dark:bg-white"
              : "bg-gray-300 dark:bg-[#27272A]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              disableOption
                ? "translate-x-6 dark:bg-black"
                : "translate-x-1 dark:bg-black"
            }`}
          />
        </button>
      </div>

      {/* Allow members */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Allow members to invite new guests
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Let workspace members invite external collaborators.
          </p>
        </div>
        <button
          onClick={() => setAllowMembers(!allowMembers)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
            allowMembers
              ? "bg-black dark:bg-white"
              : "bg-gray-300 dark:bg-[#27272A]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              allowMembers
                ? "translate-x-6 dark:bg-black"
                : "translate-x-1 dark:bg-black"
            }`}
          />
        </button>
      </div>

      {/* Data trash auto-delete period */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Data trash auto-delete period
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Set how long trashed files are kept before permanent removal.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="whitespace-nowrap flex items-center gap-2 px-4 py-2 text-sm transition-colors dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] rounded-md">
              {deletePeriod}
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-32 dark:bg-[#09090B] dark:text-white"
            align="end"
          >
            <DropdownMenuItem
              onClick={() => setDeletePeriod("7 days")}
              className="cursor-pointer"
            >
              7 days
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeletePeriod("30 days")}
              className="cursor-pointer"
            >
              30 days
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeletePeriod("60 days")}
              className="cursor-pointer"
            >
              60 days
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeletePeriod("90 days")}
              className="cursor-pointer"
            >
              90 days
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeletePeriod("Never")}
              className="cursor-pointer"
            >
              Never
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
