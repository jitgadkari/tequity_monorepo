"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { X, CheckCircle } from "lucide-react";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomerModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    dbUrl: "",
    plan: "Basic Plan",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.companyName,
          email: formData.companyEmail,
          plan: formData.plan,
          ownerEmail: formData.companyEmail,
          dbUrl: formData.dbUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      // Success
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        companyName: "",
        companyEmail: "",
        dbUrl: "",
        plan: "Basic Plan",
      });
    } catch (err) {
      setError('Failed to create customer. Please try again.');
      console.error('Error creating customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError("");
    // Reset form
    setFormData({
      companyName: "",
      companyEmail: "",
      dbUrl: "",
      plan: "Basic Plan",
    });
  };

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
          <div
            className={`flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 z-10 ${
              isLight ? "bg-white border-b border-gray-200" : "bg-zinc-900 border-b border-zinc-800"
            }`}
          >
            <h2
              className={`text-xl font-semibold ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              Add Customer
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
            {/* Company Name */}
            <div>
              <label
                htmlFor="companyName"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                placeholder="Enter customer name"
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                required
              />
            </div>

            {/* Company Email */}
            <div>
              <label
                htmlFor="companyEmail"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Company Email
              </label>
              <input
                type="email"
                id="companyEmail"
                value={formData.companyEmail}
                onChange={(e) =>
                  setFormData({ ...formData, companyEmail: e.target.value })
                }
                placeholder="Enter company email"
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                required
              />
              <p
                className={`mt-2 text-sm ${
                  isLight ? "text-gray-600" : "text-zinc-400"
                }`}
              >
                This person will receive the email with a link to set up the
                platform.
              </p>
            </div>

            {/* Database URL */}
            <div>
              <label
                htmlFor="dbUrl"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Database URL
              </label>
              <input
                type="text"
                id="dbUrl"
                value={formData.dbUrl}
                onChange={(e) =>
                  setFormData({ ...formData, dbUrl: e.target.value })
                }
                placeholder="postgresql://user:pass@host:5432/dbname"
                className={`w-full rounded-md border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                required
              />
              <p
                className={`mt-2 text-sm ${
                  isLight ? "text-gray-600" : "text-zinc-400"
                }`}
              >
                PostgreSQL connection string for this customer's database.
              </p>
            </div>

            {/* Plan */}
            <div>
              <label
                htmlFor="plan"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Plan
              </label>
              <select
                id="plan"
                value={formData.plan}
                onChange={(e) =>
                  setFormData({ ...formData, plan: e.target.value })
                }
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                required
              >
                <option value="Basic Plan">Basic Plan</option>
                <option value="Standard Plan">Standard Plan</option>
                <option value="Premium Plan">Premium Plan</option>
                <option value="Pro Plan">Pro Plan</option>
                <option value="Enterprise Plan">Enterprise Plan</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

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
