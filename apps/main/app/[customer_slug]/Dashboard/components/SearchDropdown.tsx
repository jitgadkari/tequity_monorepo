import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "pdf" | "doc" | "xls" | "ppt" | "txt";
  section: string;
}

interface SearchDropdownProps {
  isOpen: boolean;
  searchQuery: string;
  onSelect: (item: FileItem) => void;
}

const fileIcons = {
  folder: (
    <div className="flex-shrink-0 relative" style={{ width: "30px", height: "30px" }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-5 h-5 relative">
          {/* Light mode icon */}
          <div className="dark:hidden">
            <Image
              src="/white-folder.svg"
              alt="Folder"
              fill
              className="object-contain"
              style={{ filter: 'brightness(0) invert(0)' }}
            />
          </div>
          {/* Dark mode icon */}
          <div className="hidden dark:block">
            <Image
              src="/white-folder.svg"
              alt="Folder"
              fill
              className="object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        </div>
      </div>
    </div>
  ),
  pdf: (
    <div
      className="flex-shrink-0 relative"
      style={{ width: "30px", height: "30px" }}
    >
      <Image
        src="/Files/PDF-icon.svg"
        alt="PDF"
        width={30}
        height={30}
        className="object-contain"
      />
    </div>
  ),
  doc: (
    <div
      className="flex-shrink-0 relative"
      style={{ width: "30px", height: "30px" }}
    >
      <Image
        src="/Files/Docs-icon.svg"
        alt="DOC"
        width={30}
        height={30}
        className="object-contain"
      />
    </div>
  ),
  xls: (
    <div 
      className="flex-shrink-0 relative"
      style={{ width: "30px", height: "30px" }}
    >
      <Image
        src="/Files/XLS-icon.svg"
        alt="XLS"
        width={30}
        height={30}
        className="object-contain"
      />
    </div>
  ),
  ppt: (
    <div
      className="flex-shrink-0 relative"
      style={{ width: "30px", height: "30px" }}
    >
      <Image
        src="/Files/PPT-icon.svg"
        alt="PPT"
        width={30}
        height={30}
        className="object-contain"
      />
    </div>
  ),
  txt: (
    <div
      className="flex-shrink-0 relative"
      style={{ width: "30px", height: "30px" }}
    >
      <Image
        src="/Files/TXT-icon.svg"
        alt="TXT"
        width={30}
        height={30}
        className="object-contain"
      />
    </div>
  ),
};

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  isOpen,
  searchQuery,

  onSelect,
}) => {
  // Sample data - replace with your actual data
  const files: FileItem[] = [
    { id: "1", name: "Legal Agreements", type: "folder", section: "Categories" },
    {
      id: "2",
      name: "Financial Statements",
      type: "folder",
      section: "Categories",
    },
    { id: "3", name: "Team & HR Docs", type: "folder", section: "Categories" },
    { id: "4", name: "Q4_Financial_Report.pdf", type: "pdf", section: "Files" },
    {
      id: "5",
      name: "Client_Proposal_Template.docx",
      type: "doc",
      section: "Files",
    },
    {
      id: "6",
      name: "Sales_Data_Analysis.xlsx",
      type: "xls",
      section: "Files",
    },
    {
      id: "7",
      name: "2023_Marketing_Strategy.pptx",
      type: "ppt",
      section: "Files",
    },
    {
      id: "8",
      name: "Project_Management_Guide.txt",
      type: "txt",
      section: "Files",
    },
  ];

  // Filter files based on search query if it exists
  const filteredFiles = searchQuery
    ? files.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files; // Show all files when search input is focused but no query

  // Group files by section
  const filesBySection = filteredFiles.reduce((acc, file) => {
    if (!acc[file.section]) {
      acc[file.section] = [];
    }
    acc[file.section].push(file);
    return acc;
  }, {} as Record<string, FileItem[]>);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-1 w-full max-w-[792px] max-h-[480px]",
        "bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden",
        "dark:bg-[#09090B] dark:border-[#3F3F46]",
        "border border-gray-200 dark:border-gray-800"
      )}
    >
      <div className="overflow-y-auto max-h-[480px]">
        {Object.entries(filesBySection).map(([section, sectionFiles]) => (
          <div
            key={section}
            className="border-b border-gray-100 last:border-b-0"
          >
            <div className="px-4 py-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider px-3 py-1.5">
                {section}
              </div>
              <div className="mt-1">
                {sectionFiles.map((file) => (
                  <button
                    key={file.id}
                    className={cn(
                      "w-full px-3 py-1 text-left text-sm flex items-center gap-3",
                      "hover:bg-gray-100 dark:hover:bg-[#27272A] hover:rounded-md",
                      "focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800",
                      "transition-colors duration-150",
                      "text-gray-900 dark:text-gray-100"
                    )}
                    onClick={() => onSelect(file)}
                  >
                    {fileIcons[file.type]}
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredFiles.length === 0 && (
          <div className="p-6 text-center text-black dark:text-gray-400">
            No results found 
          </div>
        )}
      </div>
    </div>
  );
};
