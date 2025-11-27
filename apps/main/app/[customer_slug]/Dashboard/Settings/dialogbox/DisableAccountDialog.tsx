"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect } from "react";

interface DisableAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisableAccountDialog({ open, onOpenChange }: DisableAccountDialogProps) {
  useEffect(() => {
    if (open) {
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      const lastOverlay = overlays[overlays.length - 1] as HTMLElement;
      if (lastOverlay) lastOverlay.style.zIndex = '100';
    }
  }, [open]);
  const handleDisable = () => {
    // Handle disable account logic here
    console.log("Disabling account");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[368px] sm:max-w-[425px] z-[100] !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] dark:bg-[#09090B] dark:border">
        <DialogHeader className="items-center font-bold">
          <DialogTitle>Disable My Account</DialogTitle>
        </DialogHeader>
        <div className=" text-center">
          <p className="text-xs text-gray-600 mb-4 dark:text-[#A1A1AA]">
            This will temporarily disable your account and log you out from all sessions. You can reactivate it by logging in again.
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
            onClick={handleDisable}
            className="px-4 w-full py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 dark:hover:text-white transition-colors"
          >
            Disable Account
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
