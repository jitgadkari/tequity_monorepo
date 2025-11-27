"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onClick?: () => void;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search",
  onFocus,
  onClick,
}: SearchBarProps) {
  return (
    <div className="max-auto w-full max-w-6xl">
      <div className="flex items-center gap-2 bg-muted px-3 py-2 w-full max-w-[794px] h-[36px] dark:bg-[#27272A] rounded-md">
        <Search
          className="size-4 text-muted-foreground flex-shrink-0"
          aria-hidden="true"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-none px-2 text-sm placeholder:text-muted-foreground focus-visible:ring-0 dark:bg-[#27272A] dark:text-white rounded-none shadow-none"
          aria-label="Search files"
          onClick={onClick}
          onFocus={onFocus}
        />
      </div>
    </div>
  );
}
