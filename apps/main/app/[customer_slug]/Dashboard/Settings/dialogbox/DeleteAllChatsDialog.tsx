"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect } from "react";

interface DeleteAllChatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAllChatsDialog({ open, onOpenChange }: DeleteAllChatsDialogProps) {
  useEffect(() => {
    if (open) {
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      const lastOverlay = overlays[overlays.length - 1] as HTMLElement;
      if (lastOverlay) lastOverlay.style.zIndex = '100';
    }
  }, [open]);
  const handleDelete = () => {
    // Handle delete all chats logic here
    console.log("Deleting all chats");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[368px] sm:max-w-[425px] z-[100] !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] dark:bg-[#09090B] dark:border">
        <DialogHeader className="items-center font-bold">
          <DialogTitle>Delete All Chats</DialogTitle>
        </DialogHeader>
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-3 dark:text-[#A1A1AA]">
            Are you sure you want to delete all chat history associated with this dataroom?
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
            onClick={handleDelete}
            className="px-4 w-full py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 dark:hover:text-white transition-colors"
          >
            Delete All Chats
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
