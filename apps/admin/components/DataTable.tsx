"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface Transaction {
  id: number;
  dueDate: string;
  customer: string;
  description: string;
  status: "Upcoming" | "Paid";
  invoiceTotal: string;
  invoice: string;
}

const mockData: Transaction[] = [
  {
    id: 1,
    dueDate: "September 27, 2025",
    customer: "Acme Inc.",
    description: "Monthly Invoice",
    status: "Upcoming",
    invoiceTotal: "$150.00",
    invoice: "View Invoice",
  },
  {
    id: 2,
    dueDate: "April 18, 2025",
    customer: "Acme Inc.",
    description: "Monthly Invoice",
    status: "Paid",
    invoiceTotal: "$150.00",
    invoice: "View Invoice",
  },
  {
    id: 3,
    dueDate: "November 05, 2025",
    customer: "Acme Inc.",
    description: "Monthly Invoice",
    status: "Paid",
    invoiceTotal: "$150.00",
    invoice: "View Invoice",
  },
  {
    id: 4,
    dueDate: "December 01, 2025",
    customer: "Acme Inc.",
    description: "Monthly Invoice",
    status: "Paid",
    invoiceTotal: "$150.00",
    invoice: "View Invoice",
  },
  {
    id: 5,
    dueDate: "May 25, 2026",
    customer: "Acme Inc.",
    description: "Monthly Invoice",
    status: "Paid",
    invoiceTotal: "$150.00",
    invoice: "View Invoice",
  },
  {
    id: 6,
    dueDate: "February 20, 2026",
    customer: "Acme Inc.",
    description: "Monthly Invoice",
    status: "Paid",
    invoiceTotal: "$150.00",
    invoice: "View Invoice",
  },
  {
    id: 7,
    dueDate: "January 10, 2026",
    customer: "Acme Inc.",
    description: "Monthly Invoice",
    status: "Paid",
    invoiceTotal: "$150.00",
    invoice: "View Invoice",
  },
  {
    id: 8,
    dueDate: "October 15, 2025",
    customer: "Acme Inc.",
    description: "Monthly Invoice",
    status: "Paid",
    invoiceTotal: "$150.00",
    invoice: "View Invoice",
  },
];

export default function DataTable() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<"transactions" | "customers">("transactions");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [searchQuery, setSearchQuery] = useState("");

  const totalPages = Math.ceil(mockData.length / rowsPerPage);

  return (
    <div className={`flex flex-col rounded-lg border ${
      isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
    }`}>
      {/* Header with Tabs and Search */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b p-4 ${
        isLight ? "border-gray-200" : "border-zinc-800"
      }`}>
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "transactions"
                ? isLight
                  ? "bg-gray-100 text-gray-900"
                  : "bg-zinc-800 text-white"
                : isLight
                ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            Recent Transactions
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "customers"
                ? isLight
                  ? "bg-gray-100 text-gray-900"
                  : "bg-zinc-800 text-white"
                : isLight
                ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            Recent Customers
          </button>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
            isLight ? "text-gray-400" : "text-zinc-500"
          }`} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-md border py-2 pl-9 pr-4 text-sm focus:outline-none ${
              isLight
                ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                : "border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-zinc-700"
            }`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className={`border-b ${
              isLight
                ? "border-gray-200 bg-gray-50"
                : "border-zinc-800 bg-zinc-900/30"
            }`}>
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  className={`h-4 w-4 rounded accent-blue-600 cursor-pointer ${
                    isLight
                      ? "border-gray-300"
                      : "border-zinc-600"
                  }`}
                />
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                isLight ? "text-gray-600" : "text-zinc-500"
              }`}>
                Due date
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                isLight ? "text-gray-600" : "text-zinc-500"
              }`}>
                Customer
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                isLight ? "text-gray-600" : "text-zinc-500"
              }`}>
                Description
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                isLight ? "text-gray-600" : "text-zinc-500"
              }`}>
                Status
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                isLight ? "text-gray-600" : "text-zinc-500"
              }`}>
                Invoice Total
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                isLight ? "text-gray-600" : "text-zinc-500"
              }`}>
                Invoice
              </th>
            </tr>
          </thead>
          <tbody>
            {mockData.slice(0, rowsPerPage).map((row) => (
              <tr
                key={row.id}
                className={`border-b transition-colors ${
                  isLight
                    ? "border-gray-100 hover:bg-gray-50"
                    : "border-zinc-800/50 hover:bg-zinc-800/30"
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className={`h-4 w-4 rounded accent-blue-600 cursor-pointer ${
                      isLight
                        ? "border-gray-300"
                        : "border-zinc-600"
                    }`}
                  />
                </td>
                <td className={`px-4 py-3 text-sm ${
                  isLight ? "text-gray-700" : "text-zinc-300"
                }`}>
                  {row.dueDate}
                </td>
                <td className={`px-4 py-3 text-sm ${
                  isLight ? "text-gray-700" : "text-zinc-300"
                }`}>
                  {row.customer}
                </td>
                <td className={`px-4 py-3 text-sm ${
                  isLight ? "text-gray-700" : "text-zinc-300"
                }`}>
                  {row.description}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      row.status === "Paid"
                        ? isLight
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-green-950/50 text-green-400 border border-green-900"
                        : isLight
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        : "bg-yellow-950/50 text-yellow-400 border border-yellow-900"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className={`px-4 py-3 text-sm ${
                  isLight ? "text-gray-700" : "text-zinc-300"
                }`}>
                  {row.invoiceTotal}
                </td>
                <td className="px-4 py-3">
                  <button className={`text-sm hover:underline ${
                    isLight
                      ? "text-blue-600 hover:text-blue-700"
                      : "text-blue-400 hover:text-blue-300"
                  }`}>
                    {row.invoice}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t p-4 ${
        isLight ? "border-gray-200" : "border-zinc-800"
      }`}>
        <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
          {mockData.length} of {mockData.length} row(s) selected.
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className={`text-sm whitespace-nowrap ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
              Rows per page:
            </span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className={`rounded-md border px-2 py-1 text-sm focus:outline-none ${
                isLight
                  ? "border-gray-300 bg-white text-gray-900 focus:border-gray-400"
                  : "border-zinc-800 bg-zinc-950 text-white focus:border-zinc-700"
              }`}
            >
              <option value={8}>08</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
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
  );
}
