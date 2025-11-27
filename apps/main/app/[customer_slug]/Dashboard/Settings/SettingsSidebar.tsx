"use client";

import { SettingsSection } from "./SettingsDialog";
import {
  FiUser,
  FiBell,
  FiShield,
  FiUsers,
  FiCreditCard,
} from "react-icons/fi";
import { MdOutlineFolderCopy } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const menuItems = [
  {
    id: "account" as SettingsSection,
    label: "Account",
    icon: FiUser,
  },
  {
    id: "preferences" as SettingsSection,
    label: "Preferences",
    icon: IoSettingsOutline,
  },
  {
    id: "notifications" as SettingsSection,
    label: "Notifications",
    icon: FiBell,
  },
  {
    id: "security" as SettingsSection,
    label: "Security",
    icon: FiShield,
  },
  {
    id: "dataroom" as SettingsSection,
    label: "Dataroom",
    icon: MdOutlineFolderCopy,
  },
  {
    id: "people" as SettingsSection,
    label: "People",
    icon: FiUsers,
  },
  {
    id: "billings" as SettingsSection,
    label: "Billings",
    icon: FiCreditCard,
  },
];

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <div className="w-full md:w-[180px] flex-shrink-0 md:h-full sm:bg-[#f4f4f5] bg-white dark:bg-[#09090B] p-4 md:rounded-tl-lg md:rounded-bl-lg rounded-tl-lg rounded-tr-lg md:rounded-tr-none border  dark:text-[#F4F4F5]">
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F4F4F5]">
          Settings
        </h2>
      </div>
      <nav className="grid grid-cols-3 gap-2 md:grid-cols-1 md:space-y-1 md:gap-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex flex-row items-center justify-start gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-2.5 rounded-md text-xs md:text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#FAFAFA] text-gray-900 dark:bg-[#27272A] dark:text-[#F4F4F5] dark:border-[#3F3F46]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-[#27272A] dark:text-[#F4F4F5] dark:hover:border-[#3F3F46] cursor-pointer"
              }`}
            >
              <Icon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0 cursor-pointer" />
              <span className="text-left leading-tight cursor-pointer">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}


