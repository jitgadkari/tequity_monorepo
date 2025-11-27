"use client";

import { useState } from "react";
import { X, Settings as SettingsIcon, Users as UsersIcon, User as UserIcon, ChevronDown } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useTheme } from "@/context/ThemeContext";

type TabType = "general" | "people" | "account";

interface UserType {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

const mockUsers: UserType[] = [
  { id: 1, name: "John Doe", email: "john@email.com", role: "admin", avatar: "https://avatar.vercel.sh/john" },
  { id: 2, name: "Michael Johnson", email: "michael@email.com", role: "general" },
  { id: 3, name: "Emily Davis", email: "emily@email.com", role: "general", avatar: "https://avatar.vercel.sh/emily" },
  { id: 4, name: "Jane Smith", email: "jane@email.com", role: "financial" },
];

export default function SettingsPage() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // General tab states
  const [language, setLanguage] = useState("English (US)");
  const [timezone, setTimezone] = useState("UTC+05:30 (IST)");
  const [autoTimezone, setAutoTimezone] = useState(true);

  // Map theme to appearance display value (capitalize first letter)
  const appearance = theme.charAt(0).toUpperCase() + theme.slice(1);

  const handleAppearanceChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    if (lowerValue === "light" || lowerValue === "dark") {
      setTheme(lowerValue as "light" | "dark");
    }
  };

  // People tab states
  const [users, setUsers] = useState<UserType[]>(mockUsers);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showRemoveUserDialog, setShowRemoveUserDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserType | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");

  // Account tab states
  const [preferredName, setPreferredName] = useState("John Doe");
  const [email, setEmail] = useState("aditya.sharma.582@gmail.com");
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const tabs = [
    { id: "general" as TabType, label: "General", icon: SettingsIcon },
    { id: "people" as TabType, label: "People", icon: UsersIcon },
    { id: "account" as TabType, label: "Account", icon: UserIcon },
  ];

  const handleAddUser = () => {
    if (newUserEmail && newUserRole) {
      const newUser: UserType = {
        id: users.length + 1,
        name: newUserEmail.split("@")[0],
        email: newUserEmail,
        role: newUserRole,
      };
      setUsers([...users, newUser]);
      setShowAddUserDialog(false);
      setNewUserEmail("");
      setNewUserRole("");
    }
  };

  const handleRemoveUser = () => {
    if (userToRemove) {
      setUsers(users.filter((u) => u.id !== userToRemove.id));
      setShowRemoveUserDialog(false);
      setUserToRemove(null);
    }
  };

  const handleChangePassword = () => {
    if (oldPassword && newPassword && confirmPassword && newPassword === confirmPassword) {
      // Password change logic here
      setShowChangePasswordDialog(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className={`flex min-h-screen ${isLight ? "bg-gray-50" : "bg-zinc-950"}`}>
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-[240px] overflow-x-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {/* Settings Card */}
          <div className={`max-w-4xl mx-auto rounded-lg border ${
            isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900/50"
          }`}>
            {/* Tabs Navigation */}
            <div className={`border-b ${isLight ? "border-gray-200" : "border-zinc-800"}`}>
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? isLight
                            ? "border-gray-900 text-gray-900"
                            : "border-white text-white"
                          : isLight
                          ? "border-transparent text-gray-600 hover:text-gray-900"
                          : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <h2 className={`text-xl font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                    General
                  </h2>

                  {/* Appearance */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Appearance
                      </h3>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Customize how Tequity looks on your device.
                      </p>
                    </div>
                    <select
                      value={appearance}
                      onChange={(e) => handleAppearanceChange(e.target.value)}
                      className={`rounded-lg border px-4 py-2 text-sm focus:outline-none min-w-[150px] ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-900"
                          : "border-zinc-700 bg-zinc-800 text-white"
                      }`}
                    >
                      <option>Light</option>
                      <option>Dark</option>
                    </select>
                  </div>

                  {/* Language */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Language
                      </h3>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Change the language used in the user interface.
                      </p>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className={`rounded-lg border px-4 py-2 text-sm focus:outline-none min-w-[150px] ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-900"
                          : "border-zinc-700 bg-zinc-800 text-white"
                      }`}
                    >
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>

                  {/* Timezone */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Timezone
                      </h3>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Current timezone setting.
                      </p>
                    </div>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={autoTimezone}
                      className={`rounded-lg border px-4 py-2 text-sm focus:outline-none min-w-[200px] ${
                        autoTimezone ? "opacity-50 cursor-not-allowed" : ""
                      } ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-900"
                          : "border-zinc-700 bg-zinc-800 text-white"
                      }`}
                    >
                      <option>UTC+05:30 (IST)</option>
                      <option>UTC-05:00 (EST)</option>
                      <option>UTC+00:00 (GMT)</option>
                      <option>UTC+08:00 (SGT)</option>
                    </select>
                  </div>

                  {/* Auto Timezone Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Set timezone automatically using your location
                      </h3>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Reminders, notifications and emails are delivered based on your time zone.
                      </p>
                    </div>
                    <button
                      onClick={() => setAutoTimezone(!autoTimezone)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoTimezone ? "bg-blue-600" : isLight ? "bg-gray-300" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoTimezone ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* People Tab */}
              {activeTab === "people" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-xl font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                        All Users
                      </h2>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        List of registered accounts
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddUserDialog(true)}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Add User
                    </button>
                  </div>

                  {/* Users Table */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr,auto,auto] gap-4 pb-2 border-b px-4">
                      <span className={`text-xs font-medium uppercase ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        User
                      </span>
                      <span className={`text-xs font-medium uppercase ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Role
                      </span>
                      <span className="w-8"></span>
                    </div>
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className={`grid grid-cols-[1fr,auto,auto] gap-4 items-center py-3 px-4 rounded-lg transition-colors ${
                          isLight ? "hover:bg-gray-50" : "hover:bg-zinc-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              user.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                              {user.name}
                            </p>
                            <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm capitalize ${isLight ? "text-gray-700" : "text-zinc-300"}`}>
                          {user.role}
                        </span>
                        <button
                          onClick={() => {
                            setUserToRemove(user);
                            setShowRemoveUserDialog(true);
                          }}
                          className={`text-sm hover:opacity-70 ${isLight ? "text-gray-600" : "text-zinc-400"}`}
                        >
                          ⋯
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <h2 className={`text-xl font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                    Account
                  </h2>

                  {/* Profile Photo */}
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400">
                      <img
                        src="https://avatar.vercel.sh/john"
                        alt="Profile"
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="text-sm text-blue-600 hover:underline">Add photo</button>
                      <span className="text-sm text-gray-400">or</span>
                      <button className="text-sm text-red-600 hover:underline">Remove photo</button>
                    </div>
                  </div>

                  {/* Preferred Name */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                      Preferred Name
                    </label>
                    <input
                      type="text"
                      value={preferredName}
                      onChange={(e) => setPreferredName(e.target.value)}
                      className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-900"
                          : "border-zinc-700 bg-zinc-800 text-white"
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Email
                      </h3>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        {email}
                      </p>
                    </div>
                    <button className={`text-sm hover:underline ${isLight ? "text-gray-700" : "text-zinc-300"}`}>
                      Change Email
                    </button>
                  </div>

                  {/* Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Password
                      </h3>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Change your password to login to your account.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowChangePasswordDialog(true)}
                      className={`text-sm hover:underline ${isLight ? "text-gray-700" : "text-zinc-300"}`}
                    >
                      Change Password
                    </button>
                  </div>

                  {/* Log out of all devices */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Log out of all devices
                      </h3>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Log out of all active sessions besides this device.
                      </p>
                    </div>
                    <button className={`text-sm hover:underline ${isLight ? "text-gray-700" : "text-zinc-300"}`}>
                      Log out
                    </button>
                  </div>

                  {/* Disable Account */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Disable my account
                      </h3>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        This will temporarily disable your account and log you out from all sessions. You can reactivate it by logging in again.
                      </p>
                    </div>
                    <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                      Disable Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add User Dialog */}
      {showAddUserDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddUserDialog(false)}>
          <div
            className={`w-full max-w-md rounded-lg p-6 m-4 ${isLight ? "bg-white" : "bg-zinc-900"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                Add User
              </h3>
              <button onClick={() => setShowAddUserDialog(false)} className="hover:opacity-70">
                <X className={`h-5 w-5 ${isLight ? "text-gray-600" : "text-zinc-400"}`} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter Email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none ${
                    isLight
                      ? "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
                      : "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none ${
                    isLight
                      ? "border-gray-300 bg-white text-gray-900"
                      : "border-zinc-700 bg-zinc-800 text-white"
                  }`}
                >
                  <option value="">Select</option>
                  <option value="Admin">Admin</option>
                  <option value="General">General</option>
                  <option value="Financial">Financial</option>
                </select>
              </div>

              <button
                onClick={handleAddUser}
                disabled={!newUserEmail || !newUserRole}
                className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove User Dialog */}
      {showRemoveUserDialog && userToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRemoveUserDialog(false)}>
          <div
            className={`w-full max-w-md rounded-lg p-6 m-4 ${isLight ? "bg-white" : "bg-zinc-900"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
              Remove User
            </h3>
            <p className={`text-sm mb-6 ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
              Once you remove {userToRemove.name}, they'll lose access to all data. You can re-invite them anytime later.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRemoveUserDialog(false)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  isLight
                    ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveUser}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Dialog */}
      {showChangePasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowChangePasswordDialog(false)}>
          <div
            className={`w-full max-w-md rounded-lg p-6 m-4 ${isLight ? "bg-white" : "bg-zinc-900"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                Change Password
              </h3>
              <button onClick={() => setShowChangePasswordDialog(false)} className="hover:opacity-70">
                <X className={`h-5 w-5 ${isLight ? "text-gray-600" : "text-zinc-400"}`} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                  Old Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none ${
                    isLight
                      ? "border-gray-300 bg-white text-gray-900"
                      : "border-zinc-700 bg-zinc-800 text-white"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none ${
                    isLight
                      ? "border-gray-300 bg-white text-gray-900"
                      : "border-zinc-700 bg-zinc-800 text-white"
                  }`}
                />
                <p className={`text-xs mt-1 ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                  Use a password at least 15 letters long, or at least 8 characters long with both letters and numbers.
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none ${
                    isLight
                      ? "border-gray-300 bg-white text-gray-900"
                      : "border-zinc-700 bg-zinc-800 text-white"
                  }`}
                />
              </div>

              <button
                onClick={handleChangePassword}
                disabled={!oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
