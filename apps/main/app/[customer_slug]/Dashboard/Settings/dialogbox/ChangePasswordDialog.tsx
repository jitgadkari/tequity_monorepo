"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  useEffect(() => {
    // Increase z-index of overlay when dialog opens
    if (open) {
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      const lastOverlay = overlays[overlays.length - 1] as HTMLElement;
      if (lastOverlay) {
        lastOverlay.style.zIndex = '100';
      }
    }
  }, [open]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = () => {
    // Handle password change logic here
    console.log("Password change submitted");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[368px] sm:max-w-[425px] z-[100] !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] dark:bg-[#09090B] dark:border">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Change Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="current-password" className="text-sm font-medium text-gray-900 dark:text-white">
              Old Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 text-xs py-2 border border-gray-300 rounded-md dark:border-[#27272A] dark:text-white"
              placeholder="Enter old password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium text-gray-900 dark:text-white">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 text-xs py-2 border border-gray-300 rounded-md dark:border-[#27272A] dark:text-white"
              placeholder="Enter new password"
            />
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">Use a password at least 15 letters long, or at least 8 characters long with both letters and numbers</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-gray-900 dark:text-white">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 text-xs py-2 border border-gray-300 rounded-md dark:border-[#27272A] dark:text-white"
              placeholder="Confirm new password"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          {/* <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-[#27272A] dark:hover:text-white dark:border-[#27272A] transition-colors"
          >
            Cancel
          </button> */}
          <button
            onClick={handleSubmit}
            className="w-full px-4 border py-2 bg-black text-white dark:bg-[#09090B] dark:hover:bg-[#27272A] dark:hover:text-white dark:border-[#27272A] rounded-md text-sm hover:bg-gray-800 transition-colors"
          >
            Change Password
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
