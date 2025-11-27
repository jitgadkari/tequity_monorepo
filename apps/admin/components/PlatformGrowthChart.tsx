"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";

const data = [
  { date: "Mon", customers: 85, subscriptions: 115, users: 195 },
  { date: "Tue", customers: 88, subscriptions: 125, users: 210 },
  { date: "Wed", customers: 75, subscriptions: 135, users: 200 },
  { date: "Thu", customers: 90, subscriptions: 140, users: 220 },
  { date: "Fri", customers: 85, subscriptions: 130, users: 235 },
  { date: "Sat", customers: 95, subscriptions: 145, users: 250 },
  { date: "Sun", customers: 92, subscriptions: 150, users: 270 },
];

export default function PlatformGrowthChart() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`flex flex-col rounded-lg border ${
      isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
    }`}>
      <div className={`flex items-center justify-between p-4 border-b ${
        isLight ? "border-gray-200" : "border-zinc-800"
      }`}>
        <h3 className={`text-lg font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
          Platform Growth
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
      <div className="p-4 pt-2 min-h-[280px]">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} stackOffset="wiggle">
            <defs>
              <linearGradient id="colorOrg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isLight ? "#e5e7eb" : "#27272a"}
              vertical={false}
            />
            <XAxis
              dataKey="date"
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
            />
            <Legend
              wrapperStyle={{
                paddingTop: "16px",
                fontSize: "12px",
                color: isLight ? "#111827" : "#fff",
              }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="customers"
              stackId="1"
              stroke="#ec4899"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorOrg)"
              name="Customers"
            />
            <Area
              type="monotone"
              dataKey="subscriptions"
              stackId="1"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorSub)"
              name="Subscriptions"
            />
            <Area
              type="monotone"
              dataKey="users"
              stackId="1"
              stroke="#06b6d4"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorUsers)"
              name="Users"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
