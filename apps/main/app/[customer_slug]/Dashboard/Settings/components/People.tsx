"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { AddUserDialog } from "../dialogbox/AddUserDialog";
import { RemoveUserDialog } from "../dialogbox/RemoveUserDialog";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Types
interface User {
  id: number;
  name: string;
  email: string;
  initials: string;
  role: string;
}

// Generate mock users
const generateMockUsers = (): User[] => {
  const roles = ["Admin", "General", "Financial", "Viewer"];
  const mockUsers: User[] = [];

  for (let i = 1; i <= 15; i++) {
    const firstName = ["John", "Jane", "Michael", "Sarah", "David"][
      Math.floor(Math.random() * 5)
    ];
    const lastName = ["Doe", "Smith", "Johnson", "Williams", "Brown"][
      Math.floor(Math.random() * 5)
    ];
    mockUsers.push({
      id: i,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      initials: `${firstName[0]}${lastName[0]}`,
      role: roles[Math.floor(Math.random() * roles.length)],
    });
  }

  return mockUsers;
};

export function People() {
  // State
  const [inviteLinkEnabled, setInviteLinkEnabled] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [removeUserOpen, setRemoveUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Data
  const users = generateMockUsers();
  const itemsPerPage = 10;
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  // const totalPages = Math.ceil(users.length / itemsPerPage);

  // Handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // const toggleRowSelection = (id: number) => {
  //   setSelectedRows((prev) =>
  //     prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
  //   );
  // };

  // const handleSelectAll = (checked: boolean) => {
  //   setSelectedRows(checked ? currentUsers.map((user) => user.id) : []);
  // };

  return (
    <div className="max-h-[500px] flex flex-col bg-white dark:bg-[#09090B] rounded-lg overflow-hidden">
      <div className="p-6 space-y-6 flex-1 flex flex-col">
        <div className="flex items-center gap-3">
          {/* <FiUsers className="h-6 w-6 text-gray-700" /> */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            People
          </h2>
        </div>

        {/* Invite link section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
              Invite link to add members
            </p>
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              Only people with permission to invite members can see this. You
              can also{" "}
              <button className="underline hover:text-gray-700 cursor-pointer">
                Generate a new link
              </button>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="whitespace-nowrap w-[94px] h-[36px] px-4 py-0 bg-gray-200 rounded-[4.5px] text-sm hover:bg-gray-50 dark:hover:bg-[#27272A] transition-colors cursor-pointer"
              aria-label="Copy link"
            >
              Copy link
            </button>
            <button
              onClick={() => setInviteLinkEnabled(!inviteLinkEnabled)}
              className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                inviteLinkEnabled
                  ? "bg-black dark:bg-white"
                  : "bg-gray-300 dark:bg-[#27272A]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  inviteLinkEnabled
                    ? "translate-x-6 dark:bg-black"
                    : "translate-x-1 dark:bg-black"
                }`}
              />
            </button>
          </div>
        </div>

        {/* All users section */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
              All users
            </p>
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              List of registered accounts
            </p>
          </div>
          <button
            onClick={() => setAddUserOpen(true)}
            className="whitespace-nowrap w-[85px] h-9 px-4 py-0 bg-black text-white dark:bg-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Add User"
          >
            Add user
          </button>
        </div>

        {/* Users table */}

        <div className="w-full border border-gray-200 dark:border-[#27272A] rounded-lg overflow-hidden bg-white dark:bg-[#09090B] flex-1 flex flex-col">
          {/* constrain height and enable inner scrolling so TableHeader.sticky works */}
          <div className="overflow-y-auto flex-1 max-h-[360px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#09090B]">
                <TableRow className="border-b border-gray-200 dark:border-[#27272A] bg-gray-50 dark:bg-[#09090B]">
                  <TableHead className="w-[35%] md:w-[45%] text-xs font-medium text-gray-500 dark:text-white px-2">
                    User
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-white px-2">
                    Role
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user: User) => (
                  <TableRow
                    key={user.id}
                    className="border-b border-gray-200 dark:border-[#27272A] hover:bg-gray-50 dark:hover:bg-[#0f0f0f]"
                  >
                    <TableCell className="py-3 px-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium dark:bg-blue-900 dark:text-blue-200">
                          {user.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-sm text-gray-900 dark:text-white">
                      {user.role}
                    </TableCell>
                    <TableCell className="py-3 px-2 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser({
                            name: user.name,
                            email: user.email,
                          });
                          setRemoveUserOpen(true);
                        }}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <Trash2 className="h-4 w-4 cursor-pointer text-red-500 hover:text-red-600 dark:hover:text-red-400" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Pagination - Fixed at the bottom */}
        <div className="border-t border-gray-200 dark:border-[#27272A] bg-white dark:bg-[#09090B] p-4">
          <Pagination
            currentPage={currentPage}
            totalItems={users.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            selectedCount={0}
          />
        </div>

        {/* Dialog Components */}
        <AddUserDialog open={addUserOpen} onOpenChange={setAddUserOpen} />
        <RemoveUserDialog
          open={removeUserOpen}
          onOpenChange={setRemoveUserOpen}
          userName={selectedUser?.name}
          userEmail={selectedUser?.email}
        />
      </div>
    </div>
  );
}
