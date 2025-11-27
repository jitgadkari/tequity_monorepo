"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useTheme } from "@/context/ThemeContext";

const data = [
  { name: "Basic", value: 36, color: "#3b82f6" },
  { name: "Premium", value: 25, color: "#f97316" },
  { name: "Standard", value: 24, color: "#22c55e" },
  { name: "Enterprise", value: 14, color: "#71717a" },
];

export default function SubscriptionChart() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`flex flex-col gap-6 rounded-lg border p-4 ${
      isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
    }`}>
      <h3 className={`text-lg font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
        Subscription Distribution
      </h3>

      <div className="flex flex-col items-center gap-6">
        {/* Donut Chart */}
        <div className="relative h-44 w-44 min-h-[176px] min-w-[176px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              248
            </span>
            <span className={`text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
              Active Subs
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-5">
          {data.map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-1.5 w-1.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className={`text-[9px] ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                  {item.name}
                </span>
              </div>
              <span className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
