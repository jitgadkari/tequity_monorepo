"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Search, ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle, Upload, Pencil, Trash2, AlertCircle, Loader2, Users, Copy, Check } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AddUserModal from "@/components/AddUserModal";
import EditUserModal from "@/components/EditUserModal";
import DeleteUserModal from "@/components/DeleteUserModal";
import SuspendCustomerModal from "@/components/SuspendCustomerModal";
import DeleteCustomerModal from "@/components/DeleteCustomerModal";
import { useTheme } from "@/context/ThemeContext";

interface Tenant {
  id: string;
  name: string;
  email: string;
  slug: string;
  plan: string;
  status: "active" | "inactive" | "pending";
  stage: string;
  rawStatus: string;
  lastActive: string;
  logo: string;
  logoColor: string;
  createdAt: string;
  updatedAt: string;
  // Provisioning details
  provisioningProvider: string | null;
  supabaseProjectRef: string | null;
  cloudSqlInstanceName: string | null;
  useCase: string | null;
  companySize: string | null;
  industry: string | null;
}

interface User {
  id: string;
  customerId: string;
  name: string;
  email: string;
  role: "admin" | "general";
  status: "active" | "inactive" | "pending";
  lastActive: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
  id: string;
  customerId: string;
  amount: string;
  dueDate: string;
  paymentDate: string | null;
  description: string;
  status: "upcoming" | "pending" | "paid";
  createdAt: string;
  updatedAt: string;
}

export default function TenantProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"users" | "provisioning" | "subscription" | "settings">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [setupUrlCopied, setSetupUrlCopied] = useState(false);

  // API state
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Users API state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersTotalCount, setUsersTotalCount] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [userActionLoading, setUserActionLoading] = useState(false);

  const [settingsData, setSettingsData] = useState({
    companyName: "",
    companyEmail: "",
    ownerEmail: "",
  });

  // Subscriptions API state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsTotalCount, setSubscriptionsTotalCount] = useState(0);

  // Calculate total pages from API data
  const totalPages = usersTotalPages;

  // Fetch tenant data from API
  useEffect(() => {
    const fetchTenant = async () => {
      if (!params.id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/customers/${params.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Tenant not found');
          } else {
            setError('Failed to load tenant');
          }
          return;
        }

        const data = await response.json();
        setTenant(data);
        setSettingsData({
          companyName: data.name,
          companyEmail: data.slug,
          ownerEmail: '',
        });
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError('Failed to load tenant');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [params.id]);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      if (!params.id || activeTab !== 'users') return;

      try {
        setUsersLoading(true);
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: rowsPerPage.toString(),
          ...(searchQuery && { search: searchQuery }),
        });

        const response = await fetch(`/api/customers/${params.id}/users?${queryParams}`);
        const data = await response.json();

        if (response.ok) {
          setUsers(data.users);
          setUsersTotalCount(data.pagination.totalCount);
          setUsersTotalPages(data.pagination.totalPages);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [params.id, activeTab, currentPage, rowsPerPage, searchQuery]);

  // Fetch subscriptions from API
  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!params.id || activeTab !== 'subscription') return;

      try {
        setSubscriptionsLoading(true);
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: rowsPerPage.toString(),
          customerId: params.id as string,
        });

        const response = await fetch(`/api/subscriptions?${queryParams}`);
        const data = await response.json();

        if (response.ok) {
          setSubscriptions(data.subscriptions || []);
          setSubscriptionsTotalCount(data.pagination.totalCount || 0);
        }
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
      } finally {
        setSubscriptionsLoading(false);
      }
    };

    fetchSubscriptions();
  }, [params.id, activeTab, currentPage, rowsPerPage]);

  const handleAddUser = async (userData: { name: string; email: string; role: string }) => {
    if (!params.id) return;

    setUserActionLoading(true);
    setUsersError(null);

    try {
      const response = await fetch(`/api/customers/${params.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user');
      }

      // Refresh users list
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
      });
      const refreshResponse = await fetch(`/api/customers/${params.id}/users?${queryParams}`);
      const data = await refreshResponse.json();

      if (refreshResponse.ok) {
        setUsers(data.users);
        setUsersTotalCount(data.pagination.totalCount);
        setUsersTotalPages(data.pagination.totalPages);
      }

      setSuccessMessage("User successfully added");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error adding user:', err);
      setUsersError(err instanceof Error ? err.message : 'Failed to add user. Please try again.');
      setTimeout(() => {
        setUsersError(null);
      }, 5000);
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleEditUser = async (userData: { name: string; email: string; role: string; status: string }) => {
    if (!selectedUser) return;

    // Check if downgrading last admin
    if (selectedUser.role === 'admin' && userData.role !== 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        setUsersError('Cannot downgrade the last admin user. Please assign another admin first.');
        setTimeout(() => setUsersError(null), 5000);
        return;
      }
    }

    setUserActionLoading(true);
    setUsersError(null);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      // Refresh users list
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
      });
      const refreshResponse = await fetch(`/api/customers/${params.id}/users?${queryParams}`);
      const data = await refreshResponse.json();

      if (refreshResponse.ok) {
        setUsers(data.users);
        setUsersTotalCount(data.pagination.totalCount);
        setUsersTotalPages(data.pagination.totalPages);
      }

      setSuccessMessage("User successfully updated");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error editing user:', err);
      setUsersError(err instanceof Error ? err.message : 'Failed to update user. Please try again.');
      setTimeout(() => {
        setUsersError(null);
      }, 5000);
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Check if deleting last admin
    if (selectedUser.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        setUsersError('Cannot delete the last admin user. Please assign another admin first.');
        setTimeout(() => setUsersError(null), 5000);
        setIsDeleteUserModalOpen(false);
        setSelectedUser(null);
        return;
      }
    }

    setUserActionLoading(true);
    setUsersError(null);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Refresh users list
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
      });
      const refreshResponse = await fetch(`/api/customers/${params.id}/users?${queryParams}`);
      const data = await refreshResponse.json();

      if (refreshResponse.ok) {
        setUsers(data.users);
        setUsersTotalCount(data.pagination.totalCount);
        setUsersTotalPages(data.pagination.totalPages);
      }

      setIsDeleteUserModalOpen(false);
      setSelectedUser(null);

      setSuccessMessage("User successfully deleted");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setUsersError(err instanceof Error ? err.message : 'Failed to delete user. Please try again.');
      setTimeout(() => {
        setUsersError(null);
      }, 5000);
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleSuspendTenant = async () => {
    if (!tenant) return;

    try {
      // Toggle between inactive and active
      const newStatus = tenant.status === 'inactive' ? 'active' : 'inactive';

      const response = await fetch(`/api/customers/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tenant status');
      }

      // Refresh tenant data
      const refreshResponse = await fetch(`/api/customers/${tenant.id}`);
      const updatedTenant = await refreshResponse.json();
      setTenant(updatedTenant);

      setSuccessMessage(
        newStatus === 'active'
          ? "Tenant successfully activated"
          : "Tenant successfully suspended"
      );
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating tenant status:', err);
      alert('Failed to update tenant status. Please try again.');
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenant) return;

    try {
      const response = await fetch(`/api/customers/${tenant.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tenant');
      }

      // Redirect to tenants list
      router.push("/customers");
    } catch (err) {
      console.error('Error deleting tenant:', err);
      alert('Failed to delete tenant. Please try again.');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`flex min-h-screen ${isLight ? "bg-gray-50" : "bg-zinc-950"}`}>
        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <div className="flex-1 flex flex-col lg:ml-[240px] overflow-x-hidden">
          <Header onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex items-center justify-center">
            <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
              Loading tenant...
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !tenant) {
    return (
      <div className={`flex min-h-screen ${isLight ? "bg-gray-50" : "bg-zinc-950"}`}>
        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <div className="flex-1 flex flex-col lg:ml-[240px] overflow-x-hidden">
          <Header onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-sm mb-4 ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                {error || 'Tenant not found'}
              </div>
              <button
                onClick={() => router.push("/customers")}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                  isLight
                    ? "bg-gray-900 hover:bg-gray-800"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Back to Tenants
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isLight ? "bg-gray-50" : "bg-zinc-950"}`}>
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-[240px] overflow-x-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {/* Breadcrumb - Desktop only */}
          <div className="hidden md:flex items-center gap-2 mb-6">
            <button
              onClick={() => router.push("/customers")}
              className={`p-1.5 rounded-md transition-colors ${
                isLight
                  ? "text-gray-600 hover:bg-gray-100"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className={`flex items-center gap-2 text-sm ${
              isLight ? "text-gray-600" : "text-zinc-400"
            }`}>
              <Link href="/customers" className="hover:underline">
                Tenants
              </Link>
              <span>›</span>
              <span className={isLight ? "text-gray-900" : "text-white"}>
                {tenant.name}
              </span>
            </div>
          </div>

          {/* Mobile Back Link */}
          <button
            onClick={() => router.push("/customers")}
            className={`md:hidden flex items-center gap-2 mb-4 text-sm ${
              isLight ? "text-gray-600" : "text-zinc-400"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </button>

          {/* Tenant Header */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div
                className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-xl text-white font-bold text-lg md:text-2xl"
                style={{ backgroundColor: tenant.logoColor }}
              >
                {tenant.logo}
              </div>
              <div>
                <h1 className={`text-lg md:text-2xl font-bold ${
                  isLight ? "text-gray-900" : "text-white"
                }`}>
                  {tenant.name}
                </h1>
                <p className={`text-xs md:text-sm ${
                  isLight ? "text-gray-600" : "text-zinc-400"
                }`}>
                  /{tenant.slug}
                </p>
              </div>
              {/* Status Badge */}
              <span
                className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                  tenant.status === "active"
                    ? isLight
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-green-950/50 text-green-400 border border-green-900"
                    : tenant.status === "pending"
                    ? isLight
                      ? "bg-orange-100 text-orange-700 border border-orange-200"
                      : "bg-orange-950/50 text-orange-400 border border-orange-900"
                    : isLight
                    ? "bg-gray-100 text-gray-700 border border-gray-200"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                {tenant.rawStatus || tenant.status}
              </span>
            </div>
          </div>

          {/* Tabs - Mobile: Full-width with underline, Desktop: Pill style */}
          {/* Mobile Tabs */}
          <div className={`md:hidden flex mb-4 -mx-4 px-4 border-b overflow-x-auto ${
            isLight ? "border-gray-200" : "border-zinc-800"
          }`}>
            {(["users", "provisioning", "subscription", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-medium transition-colors relative whitespace-nowrap px-2 ${
                  activeTab === tab
                    ? isLight
                      ? "text-gray-900"
                      : "text-white"
                    : isLight
                    ? "text-gray-500"
                    : "text-zinc-500"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                    isLight ? "bg-gray-900" : "bg-white"
                  }`} />
                )}
              </button>
            ))}
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex gap-1 mb-4">
            {(["users", "provisioning", "subscription", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? isLight
                      ? "bg-gray-100 text-gray-900"
                      : "bg-zinc-800 text-white"
                    : isLight
                    ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Search and Add User - Mobile: Stack, Desktop: Inline */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div className="relative flex-1 md:max-w-xs">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isLight ? "text-gray-400" : "text-zinc-500"
              }`} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                    : "border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-zinc-700"
                }`}
              />
            </div>
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className={`w-full md:w-auto rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                isLight
                  ? "bg-gray-900 hover:bg-gray-800"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              + Add User
            </button>
          </div>

          {/* Error Notification Banner */}
          {usersError && (
            <div className={`mb-4 rounded-lg border p-4 animate-in slide-in-from-top-2 ${
              isLight
                ? "border-red-200 bg-red-50"
                : "border-red-900 bg-red-950/50"
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  isLight ? "text-red-600" : "text-red-500"
                }`} />
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold mb-1 ${
                    isLight ? "text-red-800" : "text-red-400"
                  }`}>
                    Error
                  </h4>
                  <p className={`text-sm ${
                    isLight ? "text-red-700" : "text-red-300"
                  }`}>
                    {usersError}
                  </p>
                </div>
                <button
                  onClick={() => setUsersError(null)}
                  className={`p-1 rounded-md transition-colors ${
                    isLight
                      ? "text-red-600 hover:bg-red-100"
                      : "text-red-400 hover:bg-red-900/50"
                  }`}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Users - Mobile Cards / Desktop Table */}
          {activeTab === "users" && (
            <div className={`rounded-lg border overflow-hidden relative ${
              isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
            }`}>
              {/* Loading Overlay */}
              {userActionLoading && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className={`rounded-lg border px-6 py-4 shadow-xl ${
                    isLight
                      ? "border-gray-200 bg-white"
                      : "border-zinc-800 bg-zinc-900"
                  }`}>
                    <div className="flex items-center gap-3">
                      <Loader2 className={`h-5 w-5 animate-spin ${
                        isLight ? "text-gray-900" : "text-white"
                      }`} />
                      <span className={`text-sm font-medium ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        Processing...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                {users.length === 0 && !usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className={`rounded-full p-4 mb-4 ${
                      isLight ? "bg-gray-100" : "bg-zinc-800"
                    }`}>
                      <Users className={`h-8 w-8 ${
                        isLight ? "text-gray-400" : "text-zinc-500"
                      }`} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}>
                      No users yet
                    </h3>
                    <p className={`text-sm text-center mb-6 max-w-sm ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Get started by adding your first user to this customer account.
                    </p>
                    <button
                      onClick={() => setIsAddUserModalOpen(true)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                        isLight
                          ? "bg-gray-900 hover:bg-gray-800"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      + Add Your First User
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${
                        isLight ? "border-gray-200 bg-gray-50" : "border-zinc-800"
                      }`}>
                        <th className="px-6 py-3 text-left w-12">
                          <input
                            type="checkbox"
                            className={`h-4 w-4 rounded ${
                              isLight ? "border-gray-300 bg-white" : "border-zinc-700 bg-zinc-800"
                            }`}
                          />
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          User
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          Role
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          Status
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          Last Active
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      isLight ? "divide-gray-100" : "divide-zinc-800/50"
                    }`}>
                      {users.map((user) => (
                      <tr key={user.id} className={`transition-colors ${
                        isLight ? "hover:bg-gray-50" : "hover:bg-zinc-800/30"
                      }`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            className={`h-4 w-4 rounded ${
                              isLight ? "border-gray-300 bg-white" : "border-zinc-700 bg-zinc-800"
                            }`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold text-sm ${
                              isLight ? "bg-gray-400" : "bg-zinc-700"
                            }`}>
                              {user.avatar}
                            </div>
                            <div>
                              <div className={`text-sm font-medium ${
                                isLight ? "text-gray-900" : "text-white"
                              }`}>
                                {user.name}
                              </div>
                              <div className={`text-sm ${
                                isLight ? "text-gray-600" : "text-zinc-400"
                              }`}>
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-sm capitalize ${
                          isLight ? "text-gray-700" : "text-zinc-300"
                        }`}>
                          {user.role}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              user.status === "active"
                                ? isLight
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-green-950/50 text-green-400 border border-green-900"
                                : user.status === "pending"
                                ? isLight
                                  ? "bg-orange-100 text-orange-700 border border-orange-200"
                                  : "bg-orange-950/50 text-orange-400 border border-orange-900"
                                : isLight
                                ? "bg-gray-100 text-gray-700 border border-gray-200"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}
                          >
                            <span className="capitalize">{user.status}</span>
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          {new Date(user.lastActive).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditUserModalOpen(true);
                              }}
                              className={`p-2 rounded-md transition-colors ${
                                isLight
                                  ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                              }`}
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteUserModalOpen(true);
                              }}
                              className={`p-2 rounded-md transition-colors ${
                                isLight
                                  ? "text-red-600 hover:bg-red-50"
                                  : "text-red-500 hover:bg-red-950/50"
                              }`}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Mobile List */}
              <div className="md:hidden">
                {users.length === 0 && !usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className={`rounded-full p-4 mb-4 ${
                      isLight ? "bg-gray-100" : "bg-zinc-800"
                    }`}>
                      <Users className={`h-8 w-8 ${
                        isLight ? "text-gray-400" : "text-zinc-500"
                      }`} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}>
                      No users yet
                    </h3>
                    <p className={`text-sm text-center mb-6 max-w-sm ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Get started by adding your first user to this customer account.
                    </p>
                    <button
                      onClick={() => setIsAddUserModalOpen(true)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                        isLight
                          ? "bg-gray-900 hover:bg-gray-800"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      + Add Your First User
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className={`flex items-center px-4 py-3 border-b ${
                      isLight ? "border-gray-200 bg-gray-50" : "border-zinc-800"
                    }`}>
                      <div className="w-12">
                        <input
                          type="checkbox"
                          className={`h-4 w-4 rounded ${
                            isLight ? "border-gray-300 bg-white" : "border-zinc-700 bg-zinc-800"
                          }`}
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        <span className={`text-xs font-medium uppercase tracking-wider ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          User
                        </span>
                        <svg className={`w-3 h-3 ${isLight ? "text-gray-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      </div>
                      <div className="w-20 flex items-center gap-1">
                        <span className={`text-xs font-medium uppercase tracking-wider ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          Role
                        </span>
                        <svg className={`w-3 h-3 ${isLight ? "text-gray-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      </div>
                    </div>

                    {/* User Cards */}
                    {users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center px-4 py-3 border-b last:border-b-0 ${
                      isLight ? "border-gray-100" : "border-zinc-800/50"
                    }`}
                  >
                    <div className="w-12">
                      <input
                        type="checkbox"
                        className={`h-4 w-4 rounded ${
                          isLight ? "border-gray-300 bg-white" : "border-zinc-700 bg-zinc-800"
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold text-sm flex-shrink-0 ${
                        isLight ? "bg-gray-400" : "bg-zinc-700"
                      }`}>
                        {user.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${
                          isLight ? "text-gray-900" : "text-white"
                        }`}>
                          {user.name}
                        </div>
                        <div className={`text-xs truncate ${
                          isLight ? "text-gray-500" : "text-zinc-500"
                        }`}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm capitalize ${
                        isLight ? "text-gray-700" : "text-zinc-300"
                      }`}>
                        {user.role}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditUserModalOpen(true);
                        }}
                        className={`p-1.5 rounded-md transition-colors ${
                          isLight
                            ? "text-gray-600 hover:bg-gray-100"
                            : "text-zinc-400 hover:bg-zinc-800"
                        }`}
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDeleteUserModalOpen(true);
                        }}
                        className={`p-1.5 rounded-md transition-colors ${
                          isLight
                            ? "text-red-600 hover:bg-red-50"
                            : "text-red-500 hover:bg-red-950/50"
                        }`}
                        title="Delete user"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                    ))}
                  </>
                )}
              </div>

              {/* Pagination */}
              <div className={`flex flex-col md:flex-row items-center justify-between gap-4 border-t px-4 md:px-6 py-4 ${
                isLight ? "border-gray-200" : "border-zinc-800"
              }`}>
                {/* Mobile Pagination */}
                <div className="md:hidden w-full flex items-center justify-between">
                  <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 text-sm rounded-md border disabled:opacity-50 disabled:cursor-not-allowed ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 text-sm rounded-md border disabled:opacity-50 disabled:cursor-not-allowed ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>

                {/* Desktop Pagination */}
                <div className="hidden md:flex items-center justify-between w-full">
                  <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                    Showing {users.length} of {usersTotalCount} user(s).
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Rows per page
                      </span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                        className={`rounded-md border px-3 py-1 text-sm focus:outline-none ${
                          isLight
                            ? "border-gray-300 bg-white text-gray-900 focus:border-gray-400"
                            : "border-zinc-800 bg-zinc-900 text-white focus:border-zinc-700"
                        }`}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
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
            </div>
          )}

          {/* Provisioning Tab Content */}
          {activeTab === "provisioning" && (
            <div className="space-y-6">
              {/* Provisioning Status */}
              <div className={`rounded-lg border ${
                isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
              }`}>
                <div className={`border-b p-6 ${
                  isLight ? "border-gray-200" : "border-zinc-800"
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}>
                    Provisioning Status
                  </h3>
                  <p className={`mt-1 text-sm ${
                    isLight ? "text-gray-600" : "text-zinc-400"
                  }`}>
                    Infrastructure resources provisioned for this tenant.
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Provider */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isLight ? "text-gray-500" : "text-zinc-500"
                      }`}>
                        Provider
                      </label>
                      <p className={`text-sm font-medium ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        {tenant.provisioningProvider ? (
                          <span className="capitalize">{tenant.provisioningProvider}</span>
                        ) : (
                          <span className={isLight ? "text-gray-400" : "text-zinc-500"}>Not provisioned</span>
                        )}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isLight ? "text-gray-500" : "text-zinc-500"
                      }`}>
                        Status
                      </label>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          tenant.rawStatus === "active"
                            ? isLight
                              ? "bg-green-100 text-green-700"
                              : "bg-green-950/50 text-green-400"
                            : tenant.rawStatus === "provisioning"
                            ? isLight
                              ? "bg-blue-100 text-blue-700"
                              : "bg-blue-950/50 text-blue-400"
                            : isLight
                            ? "bg-gray-100 text-gray-700"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {tenant.rawStatus || "pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Resources */}
              <div className={`rounded-lg border ${
                isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
              }`}>
                <div className={`border-b p-6 ${
                  isLight ? "border-gray-200" : "border-zinc-800"
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}>
                    Database
                  </h3>
                  <p className={`mt-1 text-sm ${
                    isLight ? "text-gray-600" : "text-zinc-400"
                  }`}>
                    Dedicated database instance for this tenant.
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tenant.provisioningProvider === "supabase" && (
                      <>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${
                            isLight ? "text-gray-500" : "text-zinc-500"
                          }`}>
                            Supabase Project Ref
                          </label>
                          <p className={`text-sm font-mono ${
                            isLight ? "text-gray-900" : "text-white"
                          }`}>
                            {tenant.supabaseProjectRef || "—"}
                          </p>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${
                            isLight ? "text-gray-500" : "text-zinc-500"
                          }`}>
                            Supabase Dashboard
                          </label>
                          {tenant.supabaseProjectRef ? (
                            <a
                              href={`https://supabase.com/dashboard/project/${tenant.supabaseProjectRef}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-sm ${
                                isLight ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-300"
                              }`}
                            >
                              Open Dashboard →
                            </a>
                          ) : (
                            <span className={`text-sm ${isLight ? "text-gray-400" : "text-zinc-500"}`}>—</span>
                          )}
                        </div>
                      </>
                    )}

                    {tenant.provisioningProvider === "gcp" && (
                      <>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${
                            isLight ? "text-gray-500" : "text-zinc-500"
                          }`}>
                            Cloud SQL Instance
                          </label>
                          <p className={`text-sm font-mono ${
                            isLight ? "text-gray-900" : "text-white"
                          }`}>
                            {tenant.cloudSqlInstanceName || "—"}
                          </p>
                        </div>
                      </>
                    )}

                    {tenant.provisioningProvider === "mock" && (
                      <div className="col-span-2">
                        <div className={`rounded-lg p-4 ${
                          isLight ? "bg-yellow-50 border border-yellow-200" : "bg-yellow-950/30 border border-yellow-900"
                        }`}>
                          <p className={`text-sm ${
                            isLight ? "text-yellow-700" : "text-yellow-400"
                          }`}>
                            This tenant is using mock provisioning (development mode). No actual database resources have been created.
                          </p>
                        </div>
                      </div>
                    )}

                    {!tenant.provisioningProvider && (
                      <div className="col-span-2">
                        <div className={`rounded-lg p-4 ${
                          isLight ? "bg-gray-50 border border-gray-200" : "bg-zinc-800 border border-zinc-700"
                        }`}>
                          <p className={`text-sm ${
                            isLight ? "text-gray-600" : "text-zinc-400"
                          }`}>
                            No database has been provisioned for this tenant yet.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tenant Info */}
              <div className={`rounded-lg border ${
                isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
              }`}>
                <div className={`border-b p-6 ${
                  isLight ? "border-gray-200" : "border-zinc-800"
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}>
                    Tenant Info
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isLight ? "text-gray-500" : "text-zinc-500"
                      }`}>
                        Use Case
                      </label>
                      <p className={`text-sm capitalize ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        {tenant.useCase?.replace(/_/g, ' ') || "—"}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isLight ? "text-gray-500" : "text-zinc-500"
                      }`}>
                        Company Size
                      </label>
                      <p className={`text-sm ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        {tenant.companySize || "—"}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isLight ? "text-gray-500" : "text-zinc-500"
                      }`}>
                        Industry
                      </label>
                      <p className={`text-sm ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        {tenant.industry || "—"}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isLight ? "text-gray-500" : "text-zinc-500"
                      }`}>
                        Created
                      </label>
                      <p className={`text-sm ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isLight ? "text-gray-500" : "text-zinc-500"
                      }`}>
                        Last Updated
                      </label>
                      <p className={`text-sm ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        {new Date(tenant.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab Content */}
          {activeTab === "subscription" && (
            <div className={`rounded-lg border overflow-hidden ${
              isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${
                      isLight ? "border-gray-200 bg-gray-50" : "border-zinc-800"
                    }`}>
                      <th className="px-6 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          className={`h-4 w-4 rounded ${
                            isLight ? "border-gray-300 bg-white" : "border-zinc-700 bg-zinc-800"
                          }`}
                        />
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isLight ? "text-gray-600" : "text-zinc-400"
                      }`}>
                        Due date
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isLight ? "text-gray-600" : "text-zinc-400"
                      }`}>
                        Description
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isLight ? "text-gray-600" : "text-zinc-400"
                      }`}>
                        Status
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isLight ? "text-gray-600" : "text-zinc-400"
                      }`}>
                        Invoice Total
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isLight ? "text-gray-600" : "text-zinc-400"
                      }`}>
                        Invoice
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isLight ? "divide-gray-100" : "divide-zinc-800/50"
                  }`}>
                    {subscriptionsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className={`text-sm ${isLight ? "text-gray-500" : "text-zinc-400"}`}>
                            Loading subscriptions...
                          </div>
                        </td>
                      </tr>
                    ) : subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className={`text-sm ${isLight ? "text-gray-500" : "text-zinc-400"}`}>
                            No subscriptions found for this customer.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((subscription) => (
                        <tr key={subscription.id} className={`transition-colors ${
                          isLight ? "hover:bg-gray-50" : "hover:bg-zinc-800/30"
                        }`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className={`h-4 w-4 rounded ${
                                isLight ? "border-gray-300 bg-white" : "border-zinc-700 bg-zinc-800"
                              }`}
                            />
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isLight ? "text-gray-700" : "text-zinc-300"
                          }`}>
                            {new Date(subscription.dueDate).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isLight ? "text-gray-700" : "text-zinc-300"
                          }`}>
                            {subscription.description}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                subscription.status === "paid"
                                  ? "bg-green-500 text-white"
                                  : subscription.status === "pending"
                                  ? "bg-yellow-500 text-white"
                                  : isLight
                                  ? "text-gray-700"
                                  : "text-zinc-300"
                              }`}
                            >
                              {subscription.status === "paid" ? "Paid" : subscription.status === "pending" ? "Pending" : "Upcoming"}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isLight ? "text-gray-700" : "text-zinc-300"
                          }`}>
                            ${subscription.amount}
                          </td>
                          <td className="px-6 py-4">
                            <button className={`text-sm hover:underline ${
                              isLight
                                ? "text-blue-600 hover:text-blue-700"
                                : "text-blue-400 hover:text-blue-300"
                            }`}>
                              View Invoice
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className={`flex items-center justify-between border-t px-6 py-4 ${
                isLight ? "border-gray-200" : "border-zinc-800"
              }`}>
                <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                  0 of {subscriptionsTotalCount} row(s) selected.
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                      Rows per page
                    </span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className={`rounded-md border px-3 py-1 text-sm focus:outline-none ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-900 focus:border-gray-400"
                          : "border-zinc-800 bg-zinc-900 text-white focus:border-zinc-700"
                      }`}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                    Page {currentPage} of {Math.max(1, Math.ceil(subscriptionsTotalCount / rowsPerPage))}
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
                      disabled={currentPage === Math.ceil(subscriptionsTotalCount / rowsPerPage)}
                      className={`rounded-md p-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isLight
                          ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(subscriptionsTotalCount / rowsPerPage))}
                      disabled={currentPage === Math.ceil(subscriptionsTotalCount / rowsPerPage)}
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
          )}

          {/* Settings Tab Content */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Tenant Details Section */}
              <div className={`rounded-lg border ${
                isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
              }`}>
                <div className={`border-b p-6 ${
                  isLight ? "border-gray-200" : "border-zinc-800"
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}>
                    Tenant Details
                  </h3>
                  <p className={`mt-1 text-sm ${
                    isLight ? "text-gray-600" : "text-zinc-400"
                  }`}>
                    Edit the core profile information for this tenant.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={settingsData.companyName}
                        onChange={(e) => setSettingsData({ ...settingsData, companyName: e.target.value })}
                        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                          isLight
                            ? "border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/20"
                            : "border-zinc-700 bg-zinc-800 text-white focus:border-blue-500 focus:ring-blue-500/20"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}>
                        Slug (URL)
                      </label>
                      <div className={`w-full rounded-md border px-3 py-2 text-sm font-mono ${
                        isLight
                          ? "border-gray-300 bg-gray-50 text-gray-600"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      }`}>
                        /{tenant.slug}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenant Logo Section */}
              <div className={`rounded-lg border ${
                isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
              }`}>
                <div className={`border-b p-6 ${
                  isLight ? "border-gray-200" : "border-zinc-800"
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}>
                    Tenant Logo
                  </h3>
                  <p className={`mt-1 text-sm ${
                    isLight ? "text-gray-600" : "text-zinc-400"
                  }`}>
                    Logo used for branding and reports.
                  </p>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full text-white font-bold text-2xl"
                      style={{ backgroundColor: tenant.logoColor }}
                    >
                      {tenant.logo}
                    </div>
                    <div className="flex items-center gap-3">
                      <button className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}>
                        <Upload className="h-4 w-4" />
                        Upload New
                      </button>
                      <button className={`text-sm font-medium transition-colors ${
                        isLight
                          ? "text-red-600 hover:text-red-700"
                          : "text-red-400 hover:text-red-300"
                      }`}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Actions Section */}
              <div className={`rounded-lg border ${
                isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
              }`}>
                <div className={`border-b p-6 ${
                  isLight ? "border-gray-200" : "border-zinc-800"
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}>
                    Administrative Actions
                  </h3>
                  <p className={`mt-1 text-sm ${
                    isLight ? "text-gray-600" : "text-zinc-400"
                  }`}>
                    Manage the Customer's status. Actions here affect service availability and data retention.
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Suspend/Activate Tenant */}
                  <div>
                    <h4 className={`text-sm font-semibold mb-2 ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}>
                      {tenant.status === 'inactive' ? 'Activate Tenant' : 'Suspend Tenant'}
                    </h4>
                    <button
                      onClick={() => setIsSuspendModalOpen(true)}
                      className={`rounded-md px-6 py-2 text-sm font-medium text-white transition-colors mb-2 ${
                        tenant.status === 'inactive'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {tenant.status === 'inactive' ? 'Activate Tenant' : 'Suspend Tenant'}
                    </button>
                    <p className={`text-sm ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      {tenant.status === 'inactive'
                        ? 'Reactivate tenant access and restore full service availability.'
                        : 'Temporarily suspend all activity and block user access. This action can be reversed.'}
                    </p>
                  </div>

                  {/* Delete Tenant */}
                  <div>
                    <h4 className={`text-sm font-semibold mb-2 ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}>
                      Delete Tenant
                    </h4>
                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors mb-2"
                    >
                      Delete Tenant
                    </button>
                    <p className={`text-sm ${
                      isLight ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      Permanently delete the tenant and all its data. This action is irreversible.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSave={handleAddUser}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleEditUser}
        user={selectedUser}
      />

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={isDeleteUserModalOpen}
        onClose={() => {
          setIsDeleteUserModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
        userName={selectedUser?.name || ''}
      />

      {/* Suspend/Activate Tenant Modal */}
      <SuspendCustomerModal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        onConfirm={handleSuspendTenant}
        customerName={tenant.name}
        currentStatus={tenant.status}
      />

      {/* Delete Tenant Modal */}
      <DeleteCustomerModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTenant}
        customerName={tenant.name}
      />

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5">
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${
            isLight
              ? "border-green-200 bg-white"
              : "border-green-900 bg-zinc-900"
          }`}>
            <CheckCircle className={`h-5 w-5 ${
              isLight ? "text-green-600" : "text-green-500"
            }`} />
            <span className={`text-sm font-medium ${
              isLight ? "text-green-700" : "text-green-400"
            }`}>
              {successMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
