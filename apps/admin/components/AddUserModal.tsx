"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: { name: string; email: string; role: string }) => void;
}

export default function AddUserModal({ isOpen, onClose, onSave }: AddUserModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ name: "", email: "", role: "" });
    onClose();
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", role: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={handleClose}
      >
        {/* Modal Dialog */}
        <div
          className={`w-full max-w-[364px] sm:max-w-md rounded-lg shadow-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 ${
            isLight ? "bg-white" : "bg-zinc-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className={`flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 z-10 border-b ${
            isLight ? "bg-white border-gray-200" : "bg-zinc-900 border-zinc-800"
          }`}>
            <h2 className={`text-xl font-semibold ${
              isLight ? "text-gray-900" : "text-white"
            }`}>
              Add User
            </h2>
            <button
              onClick={handleClose}
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
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Name Field */}
            <div>
              <label
                htmlFor="userName"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Name
              </label>
              <input
                type="text"
                id="userName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter Name"
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="userEmail"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Email
              </label>
              <input
                type="email"
                id="userEmail"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter Email"
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                required
              />
            </div>

            {/* Role Field */}
            <div>
              <label
                htmlFor="userRole"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Role
              </label>
              <select
                id="userRole"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white focus:border-blue-500 focus:ring-blue-500/20"
                } ${!formData.role && (isLight ? "text-gray-400" : "text-zinc-500")}`}
                required
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="admin">Admin</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="submit"
                className={`w-full sm:w-auto rounded-md px-6 py-2.5 text-sm font-medium transition-colors ${
                  isLight
                    ? "bg-gray-900 hover:bg-gray-800 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleClose}
                className={`w-full sm:w-auto rounded-md border px-6 py-2.5 text-sm font-medium transition-colors ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
