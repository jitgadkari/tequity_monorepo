"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AddSubscriptionModal from "@/components/AddSubscriptionModal";
import { useTheme } from "@/context/ThemeContext";

interface Subscription {
  id: string;
  dueDate: string;
  customerName: string;
  description: string;
  status: "upcoming" | "pending" | "paid";
  amount: string;
}

export default function SubscriptionsPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [currentPage, rowsPerPage, searchQuery]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/subscriptions?page=${currentPage}&limit=${rowsPerPage}&search=${searchQuery}`
      );
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
        setTotalCount(data.pagination.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "paid" }),
      });

      if (response.ok) {
        fetchSubscriptions();
      } else {
        alert("Failed to update subscription");
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      alert("Failed to update subscription");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  const handleSelectAll = () => {
    if (selectedRows.length === subscriptions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(subscriptions.map((s) => s.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  return (
    <div className={`flex min-h-screen ${isLight ? "bg-gray-50" : "bg-zinc-950"}`}>
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-[240px] overflow-x-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          {/* Page Title and Add Button */}
          <div className="flex items-center justify-between mb-6">
            <h1 className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              Subscriptions
            </h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Payment
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative w-full sm:w-64">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isLight ? "text-gray-400" : "text-zinc-500"
              }`} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                    : "border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-zinc-700"
                }`}
              />
            </div>
          </div>

          {/* Table */}
          <div className={`rounded-lg border overflow-hidden ${
            isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${
                    isLight ? "border-gray-200 bg-gray-50" : "border-zinc-800"
                  }`}>
                    <th className="px-6 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === subscriptions.length && subscriptions.length > 0}
                        onChange={handleSelectAll}
                        className={`h-4 w-4 rounded accent-blue-600 cursor-pointer ${
                          isLight ? "border-gray-300" : "border-zinc-600"
                        }`}
                      />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Due date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Customer
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Description
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Invoice Total
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isLight ? "divide-gray-100" : "divide-zinc-800/50"
                }`}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className={`text-sm ${isLight ? "text-gray-500" : "text-zinc-400"}`}>
                          Loading subscriptions...
                        </div>
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className={`text-sm ${isLight ? "text-gray-500" : "text-zinc-400"}`}>
                          No subscriptions found. Add your first payment entry!
                        </div>
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      className={`transition-colors ${
                        isLight ? "hover:bg-gray-50" : "hover:bg-zinc-800/30"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(subscription.id)}
                          onChange={() => handleSelectRow(subscription.id)}
                          className={`h-4 w-4 rounded accent-blue-600 cursor-pointer ${
                            isLight ? "border-gray-300" : "border-zinc-600"
                          }`}
                        />
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isLight ? "text-gray-700" : "text-zinc-300"
                      }`}>
                        {formatDate(subscription.dueDate)}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isLight ? "text-gray-700" : "text-zinc-300"
                      }`}>
                        {subscription.customerName}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isLight ? "text-gray-700" : "text-zinc-300"
                      }`}>
                        {subscription.description}
                      </td>
                      <td className="px-6 py-4">
                        {subscription.status === "paid" ? (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500 text-white">
                            Paid
                          </span>
                        ) : subscription.status === "pending" ? (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-500 text-white">
                            Pending
                          </span>
                        ) : (
                          <span className={`text-sm ${
                            isLight ? "text-gray-700" : "text-zinc-300"
                          }`}>
                            Upcoming
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isLight ? "text-gray-700" : "text-zinc-300"
                      }`}>
                        ${subscription.amount}
                      </td>
                      <td className="px-6 py-4">
                        {subscription.status !== "paid" ? (
                          <button
                            onClick={() => handleMarkAsPaid(subscription.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <span className={`text-sm ${
                            isLight ? "text-gray-400" : "text-zinc-600"
                          }`}>
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-6 py-4 ${
              isLight ? "border-gray-200" : "border-zinc-800"
            }`}>
              <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                {selectedRows.length} of {totalCount} row(s) selected.
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className={`text-sm whitespace-nowrap ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                    Rows per page
                  </span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={`rounded-md border px-3 py-1 text-sm focus:outline-none ${
                      isLight
                        ? "border-gray-300 bg-white text-gray-900 focus:border-gray-400"
                        : "border-zinc-800 bg-zinc-900 text-white focus:border-zinc-700"
                    }`}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className={`text-sm whitespace-nowrap ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`rounded-md p-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`rounded-md p-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`rounded-md p-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`rounded-md p-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Subscription Modal */}
      <AddSubscriptionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchSubscriptions();
        }}
      />
    </div>
  );
}
