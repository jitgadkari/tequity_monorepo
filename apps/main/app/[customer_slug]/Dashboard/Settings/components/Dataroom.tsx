"use client";

import Image from "next/image";
import BlackLogo from "@/public/BlackLogo.svg";
import { useState, useEffect } from "react";
import { DeleteAllChatsDialog } from "../dialogbox/DeleteAllChatsDialog";
import { LeaveDataroomDialog } from "../dialogbox/LeaveDataroomDialog";
import { DeleteDataroomDialog } from "../dialogbox/DeleteDataroomDialog";

export function Dataroom() {
  const [deleteAllChatsOpen, setDeleteAllChatsOpen] = useState(false);
  const [leaveDataroomOpen, setLeaveDataroomOpen] = useState(false);
  const [deleteDataroomOpen, setDeleteDataroomOpen] = useState(false);
  const [dataroomName, setDataroomName] = useState("LLA");

  // Load dataroom name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("dataroomName");
    if (savedName) {
      setDataroomName(savedName);
    }
  }, []);

  // Handle dataroom name change
  const handleDataroomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setDataroomName(newName);
    localStorage.setItem("dataroomName", newName);
    // Trigger a storage event to update other components
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="space-y-6 dark:bg-[#09090B] max-h-[500px] overflow-y-auto">
      <div className="flex items-center gap-3">
        {/* <MdOutlineFolderCopy className="h-6 w-6 text-gray-700" /> */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Dataroom
        </h2>
      </div>

      {/* Logo and Name */}
      <div className="">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16  flex items-center justify-center flex-shrink-0">
            <Image src={BlackLogo} alt="Logo" width={52} height={52} />
          </div>
          <div className="flex-1 space-y-3 mb-2">
            <p className="text-xs font-medium" style={{ color: "#64748B" }}>
              Dataroom Name
            </p>
            <input
              type="text"
              className="w-[250px] h-[36px] pr-3 pl-4 py-2 border border-gray-300 rounded-md dark:border-[#27272A] opacity-100"
              placeholder="Dataroom name"
              value={dataroomName}
              onChange={handleDataroomNameChange}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {" "}
          <span className="text-blue-600">Add logo </span> or{" "}
          <span className="text-red-600">remove logo</span>
        </p>
      </div>

      {/* Export data */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Export data
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Download all data and documents from this dataroom to your device.
          </p>
        </div>
        <button
          className="whitespace-nowrap w-[76px] h-[36px] px-4 py-0 border border-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-[#27272A] dark:hover:text-white transition-colors dark:border-[#27272A] dark:text-white flex items-center justify-center cursor-pointer"
          aria-label="Export"
        >
          Export
        </button>
      </div>

      {/* Archive all chats */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Archive all chats
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Save and archive all messages for secure backup and future
            reference.
          </p>
        </div>
        <button
          className="whitespace-nowrap w-[145px] h-[36px] px-4 py-0 border border-gray-300 rounded-md text-sm shadow hover:bg-gray-50 dark:hover:bg-[#27272A] dark:hover:text-white transition-colors dark:border-[#27272A] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
          aria-label="Archive All Chats"
        >
          Archive all chats
        </button>
      </div>

      {/* Delete all chats */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Delete all chats
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Remove all chat history associated with this dataroom. This action
            cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setDeleteAllChatsOpen(true)}
          className="whitespace-nowrap w-[134px] h-[36px] px-4 py-0 border border-red-600 rounded-md text-sm hover:bg-red-50 dark:hover:bg-[#27272A] dark:hover:text-white transition-colors dark:border-[#27272A] text-red-600 flex items-center justify-center cursor-pointer"
          aria-label="Delete all chats"
        >
          Delete all chats
        </button>
      </div>

      {/* Leave dataroom */}
      <div className="flex gap-2 items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Leave dataroom
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Log out and leave this dataroom. Your access will be removed from
            all active devices.
          </p>
        </div>
        <button
          onClick={() => setLeaveDataroomOpen(true)}
          className="whitespace-nowrap w-[139px] h-9 px-4 py-0 border border-red-600 text-red-600 rounded-md text-sm hover:bg-red-50 dark:hover:bg-[#27272A] dark:hover:text-white dark:border-[#27272A] transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Leave dataroom"
        >
          Leave dataroom
        </button>
      </div>

      {/* Delete entire dataroom */}
      <div className="flex gap-2 items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Delete entire dataroom
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Permanently delete this dataroom and all its contents. This action
            cannot be undone. Please confirm before proceeding.
          </p>
        </div>
        <button
          onClick={() => setDeleteDataroomOpen(true)}
          className="whitespace-nowrap w-[143px] h-9 px-4 py-0 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Delete dataroom"
        >
          Delete dataroom
        </button>
      </div>

      {/* Dialog Components */}
      <DeleteAllChatsDialog
        open={deleteAllChatsOpen}
        onOpenChange={setDeleteAllChatsOpen}
      />
      <LeaveDataroomDialog
        open={leaveDataroomOpen}
        onOpenChange={setLeaveDataroomOpen}
      />
      <DeleteDataroomDialog
        open={deleteDataroomOpen}
        onOpenChange={setDeleteDataroomOpen}
      />
    </div>
  );
}


