"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// import { FiSearch } from "react-icons/fi";
import Image from "next/image";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";

// Command actions type
// type CommandAction = {
//   id: string;
//   name: string;
//   icon: React.ReactNode;
//   shortcut?: string;
//   group: string;
//   action: () => void;
// };

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders?: Array<{ id: string; name: string; fileCount?: number }>;
  files?: Array<{ id?: string; name: string; type: string; size?: number }>;
  onFileSelect?: (file: { id?: string; name: string; type: string; size?: number }) => void;
  onFolderSelect?: (folder: { id: string; name: string; fileCount?: number }) => void;
}

interface CategoryItem {
  id: number;
  name: string;
  icon: string;
}

interface FileItem {
  id: number;
  name: string;
  type: string;
  size: string;
}

// Helper function to get file icon based on file type
const getFileIcon = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return '/Files/PDF-icon.svg';
    case 'doc':
    case 'docx':
      return '/Files/Docs-icon.svg';
    case 'xls':
    case 'xlsx':
      return '/Files/XLS-icon.svg';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '/Files/JPG-icon.svg';
    case 'mp3':
    case 'wav':
    case 'aac':
      return '/Files/MP3-icon.svg';
    case 'zip':
    case 'rar':
    case '7z':
      return '/Files/ZIP-icon.svg';
    case 'txt':
      return '/Files/TXT-icon.svg';
    default:
      return '/file.svg';
  }
};

export function SearchDialog({ open, onOpenChange, folders = [], files = [], onFileSelect, onFolderSelect }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  // Convert folders to categories format
  const categories: CategoryItem[] = folders.length > 0
    ? folders.map((folder, index) => ({
      id: index + 1,
      name: folder.name,
      icon: "/Folder.svg",
    }))
    : [
      { id: 1, name: "Legal Agreements", icon: "/Folder.svg" },
      { id: 2, name: "Financial Statements", icon: "/Folder.svg" },
      { id: 3, name: "Team & HR Docs", icon: "/Folder.svg" },
    ];

  // Command actions
  // const commandActions: CommandAction[] = [
    // No command actions needed
  // ];

  // Group commands by their group
  // const commandGroups = commandActions.reduce<Record<string, CommandAction[]>>((groups, action) => {
  //   if (!groups[action.group]) {
  //     groups[action.group] = [];
  //   }
  //   groups[action.group].push(action);
  //   return groups;
  // }, {});


  // Helper function to format file size
  const formatSize = (bytes?: number): string => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  // Convert files to display format
  const allFiles: FileItem[] = files.length > 0
    ? files.map((file, index) => ({
      id: index + 1,
      name: file.name,
      type: file.type.toLowerCase(),
      size: formatSize(file.size),
    }))
    : [
      { id: 1, name: "Q3_Financial_Report_2025.pdf", type: "pdf", size: "2.4 MB" },
      { id: 2, name: "Annual_Overview_2024.xlsx", type: "xlsx", size: "3.8 MB" },
      { id: 3, name: "Budget_Analysis_March.docx", type: "docx", size: "1.2 MB" },
      { id: 4, name: "2025_Marketing_Strategy.zip", type: "zip", size: "5.1 MB" },
      { id: 5, name: "Project_Management_Guide.txt", type: "txt", size: "890 KB" },
    ];

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter files based on search query
  const filteredFiles = allFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if there are any search results
  const hasSearchQuery = searchQuery.trim() !== '';
  const hasResults = filteredCategories.length > 0 || filteredFiles.length > 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-transparent" />
        <DialogPrimitive.Content className="w-[95vw] sm:w-[600px] md:w-[600px] lg:w-[600px] h-[368px] max-w-[95vw] p-0 overflow-hidden fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 grid gap-4 rounded-lg border bg-white dark:bg-[#09090B] shadow-[0px_25px_50px_-12px_#00000040] dark:border-[var(--tokens-border,#3F3F46)] dark:border dark:text-white text-black [&_[cmdk-item]]:dark:hover:bg-[#27272A]">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Search for files, folders, and commands</DialogDescription>

        <div className="h-full flex flex-col overflow-hidden">
          <Command className="dark:bg-[#09090B]">
            <div className="px-3">
              <CommandInput
                placeholder="Search..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-12 border-0 ring-0 ring-offset-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none shadow-none bg-transparent"
                autoFocus
              />
            </div>

            <CommandList className="h-[calc(368px-56px)] overflow-y-auto">
              {hasSearchQuery && !hasResults && filteredFiles.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

              {/* Categories Section */}
              {filteredCategories.length > 0 && (
                <CommandGroup heading="Categories">
                  {filteredCategories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => {
                        console.log("Category selected:", category.name);
                        // Handle category selection
                        if (onFolderSelect) {
                          const folder = folders.find(f => f.name === category.name);
                          if (folder) {
                            onFolderSelect(folder);
                          }
                        } else {
                          // Fallback: dispatch custom event for folder selection
                          const folder = folders.find(f => f.name === category.name);
                          if (folder) {
                            window.dispatchEvent(new CustomEvent('selectFolder', { detail: folder }));
                          }
                        }
                        onOpenChange(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer text-black dark:text-white"
                    >
                      <div className="w-4 h-4 relative">
                        {/* Light mode icon */}
                        <div className="dark:hidden">
                          <Image
                            src="/white-folder.svg"
                            alt={category.name}
                            fill
                            className="object-contain"
                            style={{ filter: 'brightness(0) invert(0)' }}
                          />
                        </div>
                        {/* Dark mode icon */}
                        <div className="hidden dark:block">
                          <Image
                            src="/white-folder.svg"
                            alt={category.name}
                            fill
                            className="object-contain"
                            style={{ filter: 'brightness(0) invert(1)' }}
                          />
                        </div>
                      </div>
                      <span className="text-black dark:text-white">{category.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />
              {/* Files Section */}
              {filteredFiles.length > 0 && (
                <CommandGroup heading="Files">
                  {filteredFiles.map((file) => (
                    <CommandItem
                      key={file.id}
                      value={file.name}
                      onSelect={() => {
                        console.log("File selected:", file.name);
                        // Handle file selection
                        if (onFileSelect) {
                          const selectedFile = files.find(f => f.name === file.name);
                          if (selectedFile) {
                            onFileSelect(selectedFile);
                          }
                        } else {
                          // Fallback: dispatch custom event for file selection
                          const selectedFile = files.find(f => f.name === file.name);
                          if (selectedFile) {
                            window.dispatchEvent(new CustomEvent('selectFile', { detail: selectedFile }));
                          }
                        }
                        onOpenChange(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer text-black dark:text-white"
                    >
                      <Image
                        src={getFileIcon(file.name)}
                        alt={file.type}
                        width={16}
                        height={16}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-black dark:text-white">{file.name}</p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{file.size}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* No command actions */}
            </CommandList>
          </Command>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
}