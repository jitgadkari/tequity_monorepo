"use client";

import * as React from "react";
// import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  selectedCount?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  selectedCount = 0,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className={cn("flex items-center justify-between px-4 py-3 bg-white dark:bg-[#09090B] border-t border-gray-200 dark:border-[#27272A]", className)}>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <span>{selectedCount} of {totalItems} row(s) selected</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "px-3 py-1 border border-gray-300 rounded-md text-sm font-medium",
            currentPage === 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-[#18181B] dark:text-gray-600"
              : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#09090B] dark:text-white dark:border-gray-600 dark:hover:bg-[#18181B]"
          )}
        >
          Previous
        </button>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "px-3 py-1 border border-gray-300 rounded-md text-sm font-medium",
            currentPage === totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-[#18181B] dark:text-gray-600"
              : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#09090B] dark:text-white dark:border-gray-600 dark:hover:bg-[#18181B]"
          )}
        >
          Next
        </button>
      </div>
    </div>
  );
}
