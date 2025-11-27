"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

export default function DeleteUserModal({ isOpen, onClose, onConfirm, userName }: DeleteUserModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Modal Dialog */}
        <div
          className={`w-full max-w-[364px] sm:max-w-md rounded-lg shadow-xl animate-in zoom-in-95 duration-300 ${
            isLight ? "bg-white" : "bg-zinc-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className={`flex items-center justify-between px-6 pt-6 pb-4 border-b ${
            isLight ? "border-gray-200" : "border-zinc-800"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                isLight ? "bg-red-100" : "bg-red-950/50"
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  isLight ? "text-red-600" : "text-red-500"
                }`} />
              </div>
              <h2 className={`text-xl font-semibold ${
                isLight ? "text-gray-900" : "text-white"
              }`}>
                Delete User
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`rounded-md p-1 transition-colors ${
                isLight
                  ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <p className={`text-sm mb-6 ${
              isLight ? "text-gray-600" : "text-zinc-400"
            }`}>
              Are you sure you want to delete <span className="font-semibold">{userName}</span>? This action cannot be undone.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={onConfirm}
                className={`w-full sm:w-auto rounded-md px-6 py-2.5 text-sm font-medium text-white transition-colors ${
                  isLight
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Delete User
              </button>
              <button
                onClick={onClose}
                className={`w-full sm:w-auto rounded-md border px-6 py-2.5 text-sm font-medium transition-colors ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
