"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { X } from "lucide-react";

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
    name: "",
    slug: "",
    useCase: "",
    companySize: "",
    industry: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !formData.slug) {
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name]);

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
          name: formData.name,
          slug: formData.slug || undefined,
          useCase: formData.useCase || undefined,
          companySize: formData.companySize || undefined,
          industry: formData.industry || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tenant');
      }

      // Success
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: "",
        slug: "",
        useCase: "",
        companySize: "",
        industry: "",
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant. Please try again.');
      console.error('Error creating tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError("");
    setFormData({
      name: "",
      slug: "",
      useCase: "",
      companySize: "",
      industry: "",
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
              Add Dataroom
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
                htmlFor="name"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Company Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter company name"
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label
                htmlFor="slug"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Slug
              </label>
              <input
                type="text"
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                }
                placeholder="company-slug"
                className={`w-full rounded-md border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
              <p
                className={`mt-2 text-sm ${
                  isLight ? "text-gray-600" : "text-zinc-400"
                }`}
              >
                URL-friendly identifier (auto-generated from name)
              </p>
            </div>

            {/* Use Case */}
            <div>
              <label
                htmlFor="useCase"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Use Case
              </label>
              <select
                id="useCase"
                value={formData.useCase}
                onChange={(e) =>
                  setFormData({ ...formData, useCase: e.target.value })
                }
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              >
                <option value="">Select use case</option>
                <option value="investor">Investor</option>
                <option value="single_firm">Single Firm</option>
              </select>
            </div>

            {/* Company Size */}
            <div>
              <label
                htmlFor="companySize"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Company Size
              </label>
              <select
                id="companySize"
                value={formData.companySize}
                onChange={(e) =>
                  setFormData({ ...formData, companySize: e.target.value })
                }
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              >
                <option value="">Select company size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
            </div>

            {/* Industry */}
            <div>
              <label
                htmlFor="industry"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Industry
              </label>
              <input
                type="text"
                id="industry"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                placeholder="e.g., Financial Services, Technology"
                className={`w-full rounded-md border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className={`rounded-md p-3 ${isLight ? "bg-red-50 border border-red-200" : "bg-red-950/50 border border-red-900"}`}>
                <p className={`text-sm ${isLight ? "text-red-600" : "text-red-400"}`}>{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:w-auto rounded-md px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  isLight
                    ? "bg-gray-900 hover:bg-gray-800 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {loading ? 'Creating...' : 'Create Dataroom'}
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
