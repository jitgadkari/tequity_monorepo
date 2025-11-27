"use client";

import React from "react";

interface DeleteModalProps {
  isOpen: boolean;
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteModal({
  isOpen,
  itemName,
  onCancel,
  onConfirm,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#09090B] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-1 text-gray-900 dark:text-white">
          Are you sure you want to delete &apos;{itemName}&apos;?
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This action can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27272A] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}
