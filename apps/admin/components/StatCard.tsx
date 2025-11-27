"use client";

import { LucideIcon, TrendingUp } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  isPositive?: boolean;
}

export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
  isPositive = true,
}: StatCardProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-4 transition-colors ${
      isLight
        ? "border-gray-200 bg-white hover:shadow-md"
        : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80"
    }`}>
      <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${
        isLight ? "bg-blue-50" : "bg-blue-950/50"
      }`}>
        <Icon className={`h-5 w-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className={`text-2xl font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
            {value}
          </p>
          <p className={`text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
            {title}
          </p>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <span
            className={`text-xs font-medium ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {change}
          </span>
          <TrendingUp
            className={`h-3.5 w-3.5 flex-shrink-0 ${
              isPositive ? "text-green-600" : "text-red-600 rotate-180"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
