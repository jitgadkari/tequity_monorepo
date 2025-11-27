"use client";

import { useTheme } from "@/context/ThemeContext";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
}: ConfirmationModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[70] bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-md rounded-md border p-6 flex flex-col gap-4 pointer-events-auto ${
            isLight
              ? "bg-white border-gray-200"
              : "bg-zinc-900 border-zinc-800"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Content */}
          <div className="flex flex-col gap-2 text-center">
            <h2 className={`text-base font-semibold ${
              isLight ? "text-gray-900" : "text-white"
            }`}>
              {title}
            </h2>
            <p className={`text-sm ${
              isLight ? "text-gray-600" : "text-zinc-400"
            }`}>
              {description}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={`flex-1 h-9 rounded-md border px-4 text-sm font-medium transition-colors ${
                isLight
                  ? "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                  : "border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 h-9 rounded-md px-4 text-sm font-medium text-white transition-colors bg-[#EF4444] hover:bg-[#DC2626]"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
