"use client";

import { useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

interface SuspendCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  customerName: string;
  currentStatus: "active" | "inactive" | "pending";
}

export default function SuspendCustomerModal({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  currentStatus,
}: SuspendCustomerModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const isActivating = currentStatus === 'inactive';

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal Dialog */}
        <div
          className={`w-full max-w-lg rounded-lg shadow-xl p-6 ${
            isLight ? "bg-white" : "bg-zinc-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Content */}
          <h2 className={`text-xl font-semibold mb-3 ${
            isLight ? "text-gray-900" : "text-white"
          }`}>
            {isActivating
              ? `Are you sure you want to activate ${customerName}?`
              : `Are you sure you want to suspend ${customerName}?`}
          </h2>

          <p className={`text-sm mb-6 ${
            isLight ? "text-gray-600" : "text-zinc-400"
          }`}>
            {isActivating
              ? 'Activating this Customer will restore access for all its users and enable full service availability.'
              : 'Suspending this Customer will immediately block all its users from logging in and accessing services.'}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className={`rounded-md border px-6 py-2 text-sm font-medium transition-colors ${
                isLight
                  ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`rounded-md px-6 py-2 text-sm font-medium text-white transition-colors ${
                isActivating
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isActivating ? 'Yes, Activate' : 'Yes, Suspend'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
