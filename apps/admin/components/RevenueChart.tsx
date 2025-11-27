"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";

const data = [
  { day: "Mon", revenue: 32000 },
  { day: "Tue", revenue: 36000 },
  { day: "Wed", revenue: 34000 },
  { day: "Thu", revenue: 38000 },
  { day: "Fri", revenue: 39000 },
  { day: "Sat", revenue: 40000 },
  { day: "Sun", revenue: 41500 },
];

export default function RevenueChart() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`flex flex-col rounded-lg border ${
      isLight
        ? "border-gray-200 bg-white"
        : "border-zinc-800 bg-zinc-900/50"
    }`}>
      <div className={`flex items-center justify-between p-4 border-b ${
        isLight ? "border-gray-200" : "border-zinc-800"
      }`}>
        <h3 className={`text-lg font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
          Revenue Growth
        </h3>
        <div className={`flex gap-0 rounded-md border overflow-hidden ${
          isLight ? "border-gray-200" : "border-zinc-800"
        }`}>
          <button className={`px-3 py-1.5 text-xs font-medium ${
            isLight
              ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
              : "bg-zinc-800 text-white hover:bg-zinc-700"
          }`}>
            1D
          </button>
          <button className={`px-3 py-1.5 text-xs font-medium ${
            isLight
              ? "text-gray-600 hover:bg-gray-100"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}>
            7D
          </button>
          <button className={`px-3 py-1.5 text-xs font-medium ${
            isLight
              ? "text-gray-600 hover:bg-gray-100"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}>
            1M
          </button>
        </div>
      </div>
      <div className="p-4 pt-2 min-h-[250px]">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isLight ? "#e5e7eb" : "#27272a"}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              stroke={isLight ? "#9ca3af" : "#52525b"}
              style={{ fontSize: "11px" }}
              tickLine={false}
            />
            <YAxis
              stroke={isLight ? "#9ca3af" : "#52525b"}
              style={{ fontSize: "11px" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isLight ? "#ffffff" : "#18181b",
                border: `1px solid ${isLight ? "#e5e7eb" : "#27272a"}`,
                borderRadius: "8px",
                color: isLight ? "#111827" : "#fff",
                fontSize: "12px",
              }}
              labelStyle={{ color: isLight ? "#6b7280" : "#a1a1aa" }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
