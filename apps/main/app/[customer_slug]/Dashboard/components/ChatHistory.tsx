"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { MdOutlineDelete } from "react-icons/md";
import { LuPencil } from "react-icons/lu";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";
import { useChatContext } from "../context/ChatContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatHistoryProps {
  onChatSelect?: (chatId: string) => void;
  activeChatId?: string;
}

export function ChatHistory({ onChatSelect, activeChatId }: ChatHistoryProps) {
  const { state } = useSidebar();
  const { chats, deleteChat, selectChat, updateChatTitle } = useChatContext();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const handleDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chatToDelete = chats.find((c) => c.id === chatId);
    console.log("Deleting chat:", chatId);

    try {
      deleteChat(chatId);
      toast.success(
        `Chat "${chatToDelete?.title || "Untitled"}" deleted successfully`
      );
    } catch {
      toast.error("Failed to delete chat");
    }
  };

  const handleEdit = (
    chatId: string,
    currentTitle: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditValue(currentTitle);
  };

  const handleSaveEdit = (chatId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (
      editValue.trim() !== "" &&
      editValue.trim() !== chats.find((c) => c.id === chatId)?.title
    ) {
      try {
        updateChatTitle(chatId, editValue.trim());
        toast.success(`Chat renamed to "${editValue.trim()}" successfully`);
      } catch {
        toast.error("Failed to rename chat");
      }
    }
    setEditingChatId(null);
    setEditValue("");
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditValue("");
  };

  const handleKeyDown = (chatId: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit(chatId);
    } else if (e.key === "Escape") {
      setEditingChatId(null);
      setEditValue("");
    }
  };

  const handleChatClick = (chatId: string) => {
    if (editingChatId !== chatId) {
      selectChat(chatId);
      onChatSelect?.(chatId);
    }
  };

  // Don't render if sidebar is collapsed
  if (state === "collapsed") return null;

  return (
    <div className="flex flex-col gap-1 px-2">
      <div className="px-2 mb-1">
        <h3 className="text-xs font-medium text-gray-700 dark:text-gray-400 tracking-wide">
          Chat
        </h3>
      </div>
      <div className="flex flex-col">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => handleChatClick(chat.id)}
            className={`group relative flex items-center justify-between text-sm text-[#3F3F46] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A]  rounded-md px-3 py-1 cursor-pointer transition-colors ${
              activeChatId === chat.id
                ? "dark:text-[#3F3F46]"
                : "text-[#3F3F46]"
            }`}
          >
            {editingChatId === chat.id ? (
              <div
                className="flex items-center gap-2 w-full text-[#3F3F46]"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(chat.id, e)}
                  className="flex-1 min-w-0 text-sm  bg-white dark:bg-[#27272A] text-[#3F3F46] px-2 py-1 border border-gray-10 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={(e) => handleSaveEdit(chat.id, e)}
                  className="p-1 hover:bg-gray-200 rounded shrink-0"
                  aria-label="Save"
                >
                  <Check className="h-3 w-3 text-green-600" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit(e);
                  }}
                  className="p-1 hover:bg-gray-200 rounded shrink-0"
                  aria-label="Cancel"
                >
                  <X className="h-3 w-3 text-red-600" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-normal text-[#3f3f46] dark:text-[#F4F4F5] overflow-ellipsis overflow-hidden whitespace-nowrap leading-5">
                  {chat.title}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="hover:bg-gray-200 dark:hover:bg-[#27272A] dark:hover:text-white cursor-pointer rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      aria-label="Chat actions"
                    >
                      <HiOutlineDotsHorizontal className="h-5 w-5 text-gray-500 dark:text-white" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-32 dark:bg-[#09090B] dark:border-[#27272A]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        handleEdit(chat.id, chat.title, e);
                      }}
                      className="cursor-pointer focus:bg-gray-100 dark:focus:bg-[#27272A]"
                    >
                      <LuPencil className="mr-2 h-4 w-4" />
                      <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="dark:bg-[#27272A]" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        handleDelete(chat.id, e);
                      }}
                      className="cursor-pointer text-red-600 focus:bg-red-50 dark:focus:bg-[#1f1f1f]"
                    >
                      <MdOutlineDelete className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
