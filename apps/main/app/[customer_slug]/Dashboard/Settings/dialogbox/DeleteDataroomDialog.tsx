"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";

interface DeleteDataroomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDataroomDialog({ open, onOpenChange }: DeleteDataroomDialogProps) {
  useEffect(() => {
    if (open) {
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      const lastOverlay = overlays[overlays.length - 1] as HTMLElement;
      if (lastOverlay) lastOverlay.style.zIndex = '100';
    }
  }, [open]);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  const handleDelete = () => {
    if (confirmText !== "DELETE") {
      setError('Please type "DELETE" to confirm');
      return;
    }
    // Handle delete dataroom logic here
    console.log("Deleting dataroom");
    onOpenChange(false);
    setConfirmText("");
    setError("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setConfirmText("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[368px] sm:max-w-[425px] z-[100] !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] dark:bg-[#09090B] dark:border">
        <DialogHeader className="items-center font-bold">
          <DialogTitle>Delete Entire Dataroom</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 text-center dark:text-white dark:bg-[#09090B]">
          <div className="bg-red-50 border border-red-200 rounded-md p-3 dark:bg-[#09090B]">
            <p className="text-xs text-red-800 font-medium mb-1 dark:text-white">
              Warning: This action cannot be undone!
            </p>
            <p className="text-xs text-red-700 dark:text-[#A1A1AA]">
              This will permanently delete this dataroom and all its contents including chats, files, and user access.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-text" className="text-xs font-medium text-gray-900 dark:text-white">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              id="confirm-text"
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError("");
              }}
              className="text-xs w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-[#27272A] dark:text-white"
              placeholder="Type DELETE"
            />
            {error && <p className="text-xs text-red-600 dark:text-[#A1A1AA]">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-[#27272A] dark:hover:text-white transition-colors dark:border-[#27272A] dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
          >
            Delete Dataroom
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
