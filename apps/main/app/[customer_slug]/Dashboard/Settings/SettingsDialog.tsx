"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { SettingsSidebar } from "./SettingsSidebar";
import { Account } from "./components/Account";
import { Preferences } from "./components/Preferences";
import { Notifications } from "./components/Notifications";
import { Security } from "./components/Security";
import { Dataroom } from "./components/Dataroom";
import { People } from "./components/People";
import { Billings } from "./components/Billings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type SettingsSection =
  | "account"
  | "preferences"
  | "notifications"
  | "security"
  | "dataroom"
  | "people"
  | "billings";

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return <Account />;
      case "preferences":
        return <Preferences />;
      case "notifications":
        return <Notifications />;
      case "security":
        return <Security />;
      case "dataroom":
        return <Dataroom />;
      case "people":
        return <People />;
      case "billings":
        return <Billings />;
      default:
        return <Account />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[368px] md:w-[720px] max-w-[368px] md:max-w-[720px] h-[500px] md:h-[500px] p-0 gap-0 [&>button:first-of-type]:hidden mt-20 md:mt-0 sm:mt-0 rounded-tl-lg rounded-tr-lg bg-white dark:!bg-[#09090B] dark:border-[#3F3F46] dark:border shadow-[0px_25px_50px_-12px_#00000040]">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-full relative">
          {/* Custom close button positioned at top-right */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-[100] rounded-full p-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4 cursor-pointer" />
            <span className="sr-only">Close</span>
          </button>

          {/* Sidebar */}
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          {/* Main Content */}
          <div className="flex-1 md:w-[540px] h-full overflow-y-auto p-4 md:p-6 bg-white dark:!bg-[#09090B] dark:!text-white rounded-br-lg rounded-bl-lg md:rounded-bl-none md:rounded-tr-lg md:rounded-br-lg dark:border">
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


