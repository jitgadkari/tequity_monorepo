"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface Customer {
  id: string;
  name: string;
}

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
}: AddSubscriptionModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    amount: "",
    dueDate: "",
    description: "",
    status: "upcoming",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setFormData({
          customerId: "",
          amount: "",
          dueDate: "",
          description: "",
          status: "upcoming",
        });
      } else {
        const data = await response.json();
        alert(data.error || "Failed to add subscription");
      }
    } catch (error) {
      console.error("Error adding subscription:", error);
      alert("Failed to add subscription");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full max-w-md rounded-lg ${
          isLight ? "bg-white" : "bg-zinc-900"
        } p-6 shadow-xl`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className={`text-xl font-semibold ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            Add Payment Entry
          </h2>
          <button
            onClick={onClose}
            className={`rounded-lg p-1 ${
              isLight
                ? "hover:bg-gray-100 text-gray-500"
                : "hover:bg-zinc-800 text-zinc-400"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Select */}
          <div>
            <label
              htmlFor="customerId"
              className={`block text-sm font-medium mb-1 ${
                isLight ? "text-gray-700" : "text-zinc-300"
              }`}
            >
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              id="customerId"
              value={formData.customerId}
              onChange={(e) =>
                setFormData({ ...formData, customerId: e.target.value })
              }
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? "border-gray-300 bg-white text-gray-900"
                  : "border-zinc-700 bg-zinc-800 text-white"
              }`}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className={`block text-sm font-medium mb-1 ${
                isLight ? "text-gray-700" : "text-zinc-300"
              }`}
            >
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
              placeholder="150.00"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
                  : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              }`}
            />
          </div>

          {/* Due Date */}
          <div>
            <label
              htmlFor="dueDate"
              className={`block text-sm font-medium mb-1 ${
                isLight ? "text-gray-700" : "text-zinc-300"
              }`}
            >
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? "border-gray-300 bg-white text-gray-900"
                  : "border-zinc-700 bg-zinc-800 text-white"
              }`}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className={`block text-sm font-medium mb-1 ${
                isLight ? "text-gray-700" : "text-zinc-300"
              }`}
            >
              Description <span className="text-red-500">*</span>
            </label>
            <input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              placeholder="Monthly Invoice"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
                  : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              }`}
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className={`block text-sm font-medium mb-1 ${
                isLight ? "text-gray-700" : "text-zinc-300"
              }`}
            >
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? "border-gray-300 bg-white text-gray-900"
                  : "border-zinc-700 bg-zinc-800 text-white"
              }`}
            >
              <option value="upcoming">Upcoming</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${
                isLight
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
