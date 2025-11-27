"use client";

import { useTheme } from "@/context/ThemeContext";

interface DeleteCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  customerName: string;
}

export default function DeleteCustomerModal({
  isOpen,
  onClose,
  onConfirm,
  customerName,
}: DeleteCustomerModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

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
            Are you sure you want to delete {customerName}?
          </h2>

          <p className={`text-sm mb-6 ${
            isLight ? "text-gray-600" : "text-zinc-400"
          }`}>
            Permanently delete the Customer and all its data. This action is irreversible and cannot be undone.
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
              className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
