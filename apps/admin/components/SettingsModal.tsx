"use client";

import { useState } from "react";
import { X, Settings as SettingsIcon, Users as UsersIcon, User as UserIcon, MoreHorizontal } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import ConfirmationModal from "./ConfirmationModal";

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

export default function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<TabType>("general");

  // General tab states
  const [language, setLanguage] = useState("English (US)");
  const [timezone, setTimezone] = useState("UTC+05:30 (IST)");
  const [autoTimezone, setAutoTimezone] = useState(true);

  // Map theme to appearance display value
  const appearance = theme.charAt(0).toUpperCase() + theme.slice(1);

  const handleAppearanceChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    if (lowerValue === "light" || lowerValue === "dark") {
      setTheme(lowerValue as "light" | "dark");
    }
  };

  // People tab states
  const [users, setUsers] = useState<UserType[]>(mockUsers);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showRemoveUserDialog, setShowRemoveUserDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserType | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Account tab states
  const [preferredName, setPreferredName] = useState("John Doe");
  const [email, setEmail] = useState("aditya.sharma.582@gmail.com");
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Confirmation modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDisableAccountModal, setShowDisableAccountModal] = useState(false);

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
      setShowChangePasswordDialog(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={closeSettings}
      />

      {/* Modal - Centered with padding on all screen sizes */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-md md:max-w-4xl h-[90vh] md:h-[600px] rounded-xl shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col md:flex-row overflow-hidden pointer-events-auto ${
            isLight ? "bg-white" : "bg-zinc-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Header with Close Button and Tabs */}
          <div className={`md:hidden flex flex-col border-b ${isLight ? "border-gray-200" : "border-zinc-800"}`}>
            {/* Close Button and Title */}
            <div className="flex items-center justify-between p-4">
              <h2 className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <button
                onClick={closeSettings}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                  isLight ? "hover:bg-gray-100" : "hover:bg-zinc-800"
                }`}
              >
                <X className={`h-5 w-5 ${isLight ? "text-gray-900" : "text-white"}`} />
              </button>
            </div>

            {/* Mobile Tabs - Horizontal */}
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? isLight
                          ? "border-gray-900 text-gray-900"
                          : "border-white text-white"
                        : isLight
                        ? "border-transparent text-gray-500"
                        : "border-transparent text-zinc-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Left Sidebar */}
          <div className={`hidden md:flex md:w-[180px] flex-col flex-shrink-0 ${
            isLight ? "bg-[#fafafa]" : "bg-zinc-950"
          }`}>
            {/* Close Button */}
            <div className="p-2">
              <button
                onClick={closeSettings}
                className={`flex items-center justify-center w-[34px] h-[34px] rounded-md transition-colors ${
                  isLight ? "hover:bg-gray-200" : "hover:bg-zinc-800"
                }`}
              >
                <X className={`h-4 w-4 ${isLight ? "text-gray-900" : "text-white"}`} />
              </button>
            </div>

            {/* Desktop Tabs - Vertical */}
            <div className="flex flex-col gap-1 p-2 flex-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                      activeTab === tab.id
                        ? isLight
                          ? "bg-gray-200 text-gray-900"
                          : "bg-zinc-800 text-white"
                        : isLight
                        ? "text-gray-700 hover:bg-gray-100"
                        : "text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-5 md:p-6 overflow-y-auto flex-1">
              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-5 md:space-y-6">
                  <div className={`hidden md:block pb-3 border-b ${isLight ? "border-gray-200" : "border-zinc-800"}`}>
                    <h2 className={`text-lg font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                      General
                    </h2>
                  </div>

                  {/* Appearance */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Appearance
                      </h3>
                      <p className={`text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Customize how Tequity looks on your device.
                      </p>
                    </div>
                    <select
                      value={appearance}
                      onChange={(e) => handleAppearanceChange(e.target.value)}
                      className={`w-full md:w-auto rounded-lg md:rounded-md border px-4 py-2 text-sm focus:outline-none ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-900"
                          : "border-zinc-700 bg-zinc-800 text-white"
                      }`}
                    >
                      <option>System</option>
                      <option>Light</option>
                      <option>Dark</option>
                    </select>
                  </div>

                  {/* Language */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Language
                      </h3>
                      <p className={`text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Change the language used in the user interface.
                      </p>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className={`w-full md:w-auto rounded-lg md:rounded-md border px-4 py-2 text-sm focus:outline-none ${
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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Timezone
                      </h3>
                      <p className={`text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Current timezone setting.
                      </p>
                    </div>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={autoTimezone}
                      className={`w-full md:w-auto rounded-lg md:rounded-md border px-4 py-2 text-sm focus:outline-none ${
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
                  <div className="flex items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Set timezone automatically using your location
                      </h3>
                      <p className={`text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Reminders, notifications and emails are delivered based on your time zone.
                      </p>
                    </div>
                    <button
                      onClick={() => setAutoTimezone(!autoTimezone)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
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
                <div className="space-y-4">
                  <div className={`hidden md:block pb-3 border-b ${isLight ? "border-gray-200" : "border-zinc-800"}`}>
                    <h2 className={`text-lg font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                      People
                    </h2>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-0">
                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                        All Users
                      </h3>
                      <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-zinc-500"}`}>
                        List of registered accounts
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddUserDialog(true)}
                      className={`w-full md:w-auto rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        isLight
                          ? "bg-gray-900 text-white hover:bg-gray-800"
                          : "bg-white text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      Add User
                    </button>
                  </div>

                  {/* Mobile: Users Cards */}
                  <div className="md:hidden space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className={`rounded-lg border p-3 flex items-center gap-3 ${
                          isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900"
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleUserSelection(user.id)}
                          className={`flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0 ${
                            selectedUsers.includes(user.id)
                              ? "bg-blue-600 border-blue-600"
                              : isLight
                              ? "border-gray-300 bg-white"
                              : "border-zinc-600 bg-zinc-800"
                          }`}
                        >
                          {selectedUsers.includes(user.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        {/* Avatar */}
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0 ${
                          user.avatar ? "" : isLight ? "bg-gray-200 text-gray-900" : "bg-zinc-800 text-white"
                        }`}>
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            user.name.charAt(0)
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                            {user.name}
                          </p>
                          <p className={`text-xs truncate ${isLight ? "text-gray-500" : "text-zinc-500"}`}>
                            {user.email}
                          </p>
                        </div>

                        {/* Role */}
                        <div className={`text-xs px-2 py-1 rounded capitalize ${isLight ? "text-gray-700" : "text-zinc-300"}`}>
                          {user.role}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Users Table */}
                  <div className={`hidden md:block border rounded-lg overflow-hidden ${
                    isLight ? "border-gray-200" : "border-zinc-800"
                  }`}>
                    <div className="flex">
                      {/* User Column */}
                      <div className="flex-1">
                        {/* Header */}
                        <div className={`h-10 px-4 flex items-center border-b ${
                          isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900"
                        }`}>
                          <span className={`text-sm font-medium ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                            User
                          </span>
                        </div>
                        {/* Rows */}
                        {users.map((user, index) => (
                          <div
                            key={user.id}
                            className={`h-[65px] px-4 flex items-center gap-2 ${
                              index < users.length - 1 ? 'border-b' : ''
                            } ${isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900"}`}
                          >
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden ${
                              user.avatar ? "" : isLight ? "bg-gray-200 text-gray-900" : "bg-zinc-800 text-white"
                            }`}>
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
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
                        ))}
                      </div>

                      {/* Role Column */}
                      <div className="flex-1">
                        {/* Header */}
                        <div className={`h-10 px-4 flex items-center border-b ${
                          isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900"
                        }`}>
                          <span className={`text-sm font-medium ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                            Role
                          </span>
                        </div>
                        {/* Rows */}
                        {users.map((user, index) => (
                          <div
                            key={user.id}
                            className={`h-[65px] px-4 flex items-center ${
                              index < users.length - 1 ? 'border-b' : ''
                            } ${isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900"}`}
                          >
                            <span className={`text-sm capitalize ${isLight ? "text-gray-900" : "text-white"}`}>
                              {user.role}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Actions Column */}
                      <div className="w-[52px]">
                        {/* Header */}
                        <div className={`h-10 flex items-center border-b ${
                          isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900"
                        }`}>
                        </div>
                        {/* Rows */}
                        {users.map((user, index) => (
                          <div
                            key={user.id}
                            className={`h-[65px] flex items-center justify-center ${
                              index < users.length - 1 ? 'border-b' : ''
                            } ${isLight ? "border-gray-200 bg-white" : "border-zinc-800 bg-zinc-900"}`}
                          >
                            <button
                              onClick={() => {
                                setUserToRemove(user);
                                setShowRemoveUserDialog(true);
                              }}
                              className={`h-10 w-10 flex items-center justify-center rounded-md transition-colors ${
                                isLight ? "hover:bg-gray-100" : "hover:bg-zinc-800"
                              }`}
                            >
                              <MoreHorizontal className={`h-4 w-4 ${isLight ? "text-gray-600" : "text-zinc-400"}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <div className="space-y-4 md:space-y-3">
                  <div className={`hidden md:block pb-3 border-b ${isLight ? "border-gray-200" : "border-zinc-800"}`}>
                    <h2 className={`text-lg font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                      Account
                    </h2>
                  </div>

                  {/* Profile Section */}
                  <div className="space-y-3 md:space-y-3">
                    {/* Mobile: Stacked Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0">
                          <img
                            src="https://avatar.vercel.sh/john"
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className={`text-base font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                            {preferredName}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <button className="text-blue-600 font-medium hover:underline">Add photo</button>
                        <span className={isLight ? "text-gray-600" : "text-zinc-400"}> or </span>
                        <button className="text-red-600 font-medium hover:underline">Remove photo</button>
                      </div>
                    </div>

                    {/* Desktop: Horizontal Layout */}
                    <div className="hidden md:flex items-center gap-4 px-1">
                      <div className="h-14 w-14 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src="https://avatar.vercel.sh/john"
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="w-[250px]">
                        <label className={`block text-xs font-medium mb-1.5 ${
                          isLight ? "text-gray-600" : "text-zinc-400"
                        }`}>
                          Preferred Name
                        </label>
                        <input
                          type="text"
                          value={preferredName}
                          onChange={(e) => setPreferredName(e.target.value)}
                          className={`w-full rounded-md border h-9 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isLight
                              ? "border-gray-200 bg-white text-gray-900"
                              : "border-zinc-800 bg-zinc-900 text-white"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="hidden md:block text-sm">
                      <button className="text-blue-700 font-medium hover:underline">Add photo</button>
                      <span className={isLight ? "text-gray-600" : "text-zinc-400"}> or </span>
                      <button className="text-blue-700 font-medium hover:underline">Remove photo</button>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Email
                      </h3>
                      <p className={`text-xs md:text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        {email}
                      </p>
                    </div>
                    <button
                      className={`w-full md:w-auto border rounded-lg md:rounded-md px-4 h-10 md:h-9 text-sm font-medium transition-colors ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          : "border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      Change Email
                    </button>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Password
                      </h3>
                      <p className={`text-xs md:text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Change your password to login to your account.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowChangePasswordDialog(true)}
                      className={`w-full md:w-auto border rounded-lg md:rounded-md px-4 h-10 md:h-9 text-sm font-medium transition-colors ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          : "border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      Change Password
                    </button>
                  </div>

                  {/* Log out of all devices */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 pt-2 md:pt-0">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Log out of all devices
                      </h3>
                      <p className={`text-xs md:text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        Log out of all other active sessions besides this device.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className={`w-full md:w-auto border rounded-lg md:rounded-md px-4 h-10 md:h-9 text-sm font-medium transition-colors ${
                        isLight
                          ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          : "border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      Log out
                    </button>
                  </div>

                  {/* Disable Account */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 pt-2 md:pt-0">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                        Disable my account
                      </h3>
                      <p className={`text-xs md:text-xs ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
                        This will temporarily disable your account and log you out from all sessions. You can reactivate it by logging in again.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDisableAccountModal(true)}
                      className="w-full md:w-auto rounded-lg md:rounded-md bg-red-500 px-4 h-10 md:h-9 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                    >
                      Disable Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      {showAddUserDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowAddUserDialog(false)}>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowRemoveUserDialog(false)}>
          <div
            className={`w-full max-w-md rounded-lg p-6 m-4 ${isLight ? "bg-white" : "bg-zinc-900"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
              Remove User
            </h3>
            <p className={`text-sm mb-6 ${isLight ? "text-gray-600" : "text-zinc-400"}`}>
              Once you remove {userToRemove.name}, they&apos;ll lose access to all data. You can re-invite them anytime later.
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowChangePasswordDialog(false)}>
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

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          // Handle logout logic here
          console.log("Logging out from all devices...");
        }}
        title="Log Out of All Devices"
        description="This will end your active sessions on every device."
        confirmText="Yes, Log out"
      />

      {/* Disable Account Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDisableAccountModal}
        onClose={() => setShowDisableAccountModal(false)}
        onConfirm={() => {
          // Handle disable account logic here
          console.log("Disabling account...");
        }}
        title="Disable my account"
        description="This will temporarily disable your account and log you out from all sessions. You can reactivate it by logging in again."
        confirmText="Yes, Disable"
      />
    </>
  );
}
