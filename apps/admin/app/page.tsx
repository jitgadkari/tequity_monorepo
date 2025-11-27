"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import RevenueChart from "@/components/RevenueChart";
import SubscriptionChart from "@/components/SubscriptionChart";
import PlatformGrowthChart from "@/components/PlatformGrowthChart";
import DataTable from "@/components/DataTable";
import { useTheme } from "@/context/ThemeContext";
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  CreditCard,
  UserPlus,
  BarChart3,
  UserCircle,
} from "lucide-react";

export default function Home() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`flex min-h-screen ${isLight ? "bg-gray-50" : "bg-zinc-950"}`}>
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-[240px] overflow-x-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
          {/* Dashboard Title */}
          <h1 className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            Dashboard
          </h1>

          {/* Stats Grid - First Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Customers"
              value="248"
              change="-0.43"
              icon={Building2}
              isPositive={false}
            />
            <StatCard
              title="Total Users"
              value="1,204"
              change="2.59"
              icon={Users}
              isPositive={true}
            />
            <StatCard
              title="MRR"
              value="$89.42"
              change="0.95"
              icon={DollarSign}
              isPositive={true}
            />
            <StatCard
              title="ARR"
              value="$1.07M"
              change="0.43"
              icon={TrendingUp}
              isPositive={true}
            />
          </div>

          {/* Stats Grid - Second Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Subscriptions"
              value="248"
              change="0.43"
              icon={CreditCard}
              isPositive={true}
            />
            <StatCard
              title="Avg. Revenue Per User"
              value="$31.40"
              change="2.59"
              icon={UserCircle}
              isPositive={true}
            />
            <StatCard
              title="Monthly Growth Rate"
              value="-23.4%"
              change="-23.4%"
              icon={BarChart3}
              isPositive={false}
            />
            <StatCard
              title="New Customers"
              value="120"
              change="0.43"
              icon={UserPlus}
              isPositive={true}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RevenueChart />
            </div>
            <div className="xl:col-span-1">
              <SubscriptionChart />
            </div>
          </div>

          {/* Platform Growth Chart */}
          <PlatformGrowthChart />

          {/* Data Table */}
          <DataTable />
        </main>
      </div>
    </div>
  );
}
