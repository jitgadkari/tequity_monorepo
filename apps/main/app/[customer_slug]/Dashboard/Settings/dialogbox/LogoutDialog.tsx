"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect } from "react";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  useEffect(() => {
    if (open) {
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      const lastOverlay = overlays[overlays.length - 1] as HTMLElement;
      if (lastOverlay) lastOverlay.style.zIndex = '100';
    }
  }, [open]);
  const handleLogout = () => {
    // Handle logout logic here
    console.log("Logging out from all devices");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[368px] sm:max-w-[425px] z-[100] !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] dark:bg-[#09090B] dark:border">
        <DialogHeader className="items-center font-bold">
          <DialogTitle>Log out of all devices</DialogTitle>
        </DialogHeader>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-[#A1A1AA]">
            This will end your active sessions on every device.
          </p>
        </div>
        <div className="flex justify-between gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 w-full py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-[#27272A] dark:hover:text-white transition-colors dark:border-[#27272A] dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="px-4 w-full py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
          >
            Yes, Log out
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
