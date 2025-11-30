"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AddCustomerModal from "@/components/AddCustomerModal";
import { useTheme } from "@/context/ThemeContext";

interface Customer {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: "active" | "inactive" | "pending";
  stage: string;
  lastActive: string;
  logo: string;
  logoColor: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 7200) return '1 hour ago';
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return '1 day ago';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 1209600) return '1 week ago';
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  if (diffInSeconds < 5184000) return '1 month ago';
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
}

export default function CustomersPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // API state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: rowsPerPage.toString(),
          ...(searchQuery && { search: searchQuery }),
        });

        const response = await fetch(`/api/customers?${params}`);
        const data = await response.json();

        if (response.ok) {
          setCustomers(data.customers);
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [currentPage, rowsPerPage, searchQuery]);

  const handleAddCustomerSuccess = () => {
    setShowSuccess(true);
    // Refresh customers list
    const fetchCustomers = async () => {
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: rowsPerPage.toString(),
          ...(searchQuery && { search: searchQuery }),
        });
        const response = await fetch(`/api/customers?${params}`);
        const data = await response.json();
        if (response.ok) {
          setCustomers(data.customers);
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
        }
      } catch (error) {
        console.error('Failed to refresh customers:', error);
      }
    };
    fetchCustomers();

    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  return (
    <div className={`flex min-h-screen ${isLight ? "bg-gray-50" : "bg-zinc-950"}`}>
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-[240px] overflow-x-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          {/* Page Title */}
          <h1 className={`text-2xl font-bold mb-6 ${isLight ? "text-gray-900" : "text-white"}`}>
            Tenants
          </h1>

          {/* Search and Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  isLight ? "text-gray-400" : "text-zinc-500"
                }`} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full sm:w-60 rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none ${
                    isLight
                      ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                      : "border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-zinc-700"
                  }`}
                />
              </div>
              <button className={`flex items-center justify-center rounded-lg border p-2 ${
                isLight
                  ? "border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}>
                <Filter className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors text-center whitespace-nowrap ${
                isLight
                  ? "bg-gray-900 hover:bg-gray-800"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              + Add Tenant
            </button>
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
                        className={`h-4 w-4 rounded accent-blue-600 cursor-pointer ${
                          isLight ? "border-gray-300" : "border-zinc-600"
                        }`}
                      />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Tenant
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Stage
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Plan
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isLight ? "divide-gray-100" : "divide-zinc-800/50"
                }`}>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                          Loading tenants...
                        </div>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                          No tenants found
                        </div>
                      </td>
                    </tr>
                  ) : customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      className={`transition-colors cursor-pointer ${
                        isLight ? "hover:bg-gray-50" : "hover:bg-zinc-800/30"
                      }`}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={`h-4 w-4 rounded accent-blue-600 cursor-pointer ${
                            isLight ? "border-gray-300" : "border-zinc-600"
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-semibold text-sm"
                            style={{ backgroundColor: customer.logoColor }}
                          >
                            {customer.logo}
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${
                              isLight ? "text-gray-900" : "text-white"
                            }`}>
                              {customer.name}
                            </div>
                            <div className={`text-sm ${
                              isLight ? "text-gray-600" : "text-zinc-400"
                            }`}>
                              {customer.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            customer.stage === "ACTIVE"
                              ? isLight
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-green-950/50 text-green-400 border border-green-900"
                              : customer.stage === "PROVISIONING"
                              ? isLight
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-blue-950/50 text-blue-400 border border-blue-900"
                              : customer.stage === "PAYMENT_COMPLETED" || customer.stage === "PAYMENT_PENDING" || customer.stage === "PLAN_SELECTED"
                              ? isLight
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-purple-950/50 text-purple-400 border border-purple-900"
                              : isLight
                              ? "bg-orange-100 text-orange-700 border border-orange-200"
                              : "bg-orange-950/50 text-orange-400 border border-orange-900"
                          }`}
                        >
                          {customer.stage?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isLight ? "text-gray-700" : "text-zinc-300"
                      }`}>
                        {customer.plan}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            customer.status === "active"
                              ? isLight
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-green-950/50 text-green-400 border border-green-900"
                              : customer.status === "pending"
                              ? isLight
                                ? "bg-orange-100 text-orange-700 border border-orange-200"
                                : "bg-orange-950/50 text-orange-400 border border-orange-900"
                              : isLight
                              ? "bg-gray-100 text-gray-700 border border-gray-200"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isLight ? "text-gray-600" : "text-zinc-400"
                      }`}>
                        {formatRelativeTime(customer.lastActive)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-6 py-4 ${
              isLight ? "border-gray-200" : "border-zinc-800"
            }`}>
              <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                0 of {totalCount} row(s) selected.
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className={`text-sm whitespace-nowrap ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                    Rows per page
                  </span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
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

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddCustomerSuccess}
      />

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-[80] animate-in slide-in-from-bottom-5">
          <div
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${
              isLight
                ? "border-green-200 bg-white"
                : "border-green-900 bg-zinc-900"
            }`}
          >
            <CheckCircle
              className={`h-5 w-5 ${
                isLight ? "text-green-600" : "text-green-500"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                isLight ? "text-green-700" : "text-green-400"
              }`}
            >
              Tenant Successfully Created
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
