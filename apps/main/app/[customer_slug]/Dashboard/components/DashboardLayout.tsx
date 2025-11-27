"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/ui/sidebar";
import { SidebarMenuItems } from "@/components/ui/sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Logo from "@/public/Logomark.svg";
import Image from "next/image";
import { ChatHistory } from "./ChatHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Settings, LogOut, Moon, Sun, Menu } from "lucide-react";
import { SettingsDialog } from "../Settings/SettingsDialog";
import { ChevronsLeft, ChevronDown, UploadCloud } from "lucide-react";
import { MdOutlineFolderCopy } from "react-icons/md";
import { useTheme } from "next-themes";
import { useChatContextOptional } from "../context/ChatContext";
// import { FileText } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  headerActions?: ReactNode;
  activeChatId?: string;
  onChatSelect?: (chatId: string) => void;
}

export function DashboardLayout({
  children,
  title,
  headerActions,
  activeChatId,
  onChatSelect,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isChatPage = pathname === "/Dashboard/chat";
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [starredFiles, setStarredFiles] = useState<
    Array<{ id: string; name: string; type: string }>
  >([]);
  const chatContext = useChatContextOptional();
  const [dataroomName, setDataroomName] = useState("LLA");

  // Load dataroom name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("dataroomName");
    if (savedName) {
      setDataroomName(savedName);
    }

    // Listen for storage changes to update in real-time
    const handleStorageChange = () => {
      const updatedName = localStorage.getItem("dataroomName");
      if (updatedName) {
        setDataroomName(updatedName);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Format dataroom name with suffix
  const formattedDataroomName = `${dataroomName}'s Dataroom`;

  // Load starred files from localStorage
  useEffect(() => {
    const loadStarredFiles = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("starredFiles");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setStarredFiles(parsed);
          } catch (e) {
            console.error("Error parsing starred files:", e);
          }
        }
      }
    };

    loadStarredFiles();

    // Listen for storage changes (when starred files are updated in other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "starredFiles") {
        loadStarredFiles();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("starredFilesUpdated", loadStarredFiles);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("starredFilesUpdated", loadStarredFiles);
    };
  }, []);

  const handleLogout = () => {
    // Add your logout logic here
    console.log("Logging out...");
    router.push("/login");
  };

  const toggleSidebar = () => {
    // Try multiple approaches to find and trigger the sidebar toggle
    const selectors = [
      'button[data-sidebar="trigger"]',
      "[data-radix-sidebar-menu-trigger]",
      'button[aria-label="Toggle Sidebar"]',
      'button[aria-controls="sidebar"]',
      ".sidebar-trigger",
      'button:has([data-lucide="menu"])',
      'button:has([data-lucide="chevron-left"])',
    ];

    for (const selector of selectors) {
      const trigger = document.querySelector(selector) as HTMLButtonElement;
      if (trigger) {
        trigger.click();
        return;
      }
    }

    // Fallback: try to trigger a keyboard shortcut if supported
    const event = new KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
      metaKey: false,
    });
    document.dispatchEvent(event);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar
          side="left"
          variant="sidebar"
          collapsible="icon"
          className="shrink-0 group"
        >
          <div className="flex flex-col gap-2 px-2 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
            <div className="flex items-center gap-2 px-2 py-2 rounded-md h-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 transition-all duration-300 ease-in-out w-full relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-50 rounded-md px-2 py-2 -mx-2 -my-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:my-0 dark:hover:bg-[#27272A] dark:hover:text-white data-[state=open]:bg-[#F4F4F5] dark:data-[state=open]:bg-[#27272A]">
                    <Image
                      src={Logo}
                      alt="Company Logo"
                      width={32}
                      height={32}
                      priority
                      className="shrink-0"
                    />
                    <div className="flex items-center gap-2 flex-1 overflow-hidden transition-all duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
                      <p className="font-sans font-medium text-sm leading-none tracking-[-0.084px] whitespace-nowrap overflow-hidden text-left">
                        {formattedDataroomName}
                      </p>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-59 -ml-1 space-y-1.5 dark:bg-[#09090B] dark:text-white"
                  align="start"
                >
                  {/* Header */}
                  <DropdownMenuLabel className="text-xs text-gray-500 font-normal dark:text-[#F4F4F5] px-3">
                    Your Dataroom&apos;s
                  </DropdownMenuLabel>

                  {/* Current Dataroom */}
                  <DropdownMenuItem className="flex items-center gap-2 py-2 mx-1">
                    <Image
                      src={Logo}
                      alt="Logo"
                      width={20}
                      height={20}
                      className="shrink-0"
                    />
                    <span className="font-medium">LLA&apos;s DATAROOM</span>
                  </DropdownMenuItem>

                  {/* Add Dataroom */}
                  <DropdownMenuItem className="flex cursor-pointer items-center gap-2 mx-1">
                    <Plus className="h-4 w-4" />
                    <span>Add Dataroom</span>
                  </DropdownMenuItem>
                  <hr className="my-1" />

                  {/* Light/Dark Mode Toggle - Side by Side */}
                  <div className="flex items-center rounded-lg dark:bg-[#27272A] bg-gray-100 dark:text-white gap-1 px-1 py-1">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 rounded-md flex-1 transition-colors ${
                        theme === "light"
                          ? "bg-white shadow-sm"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-[#27272A] dark:text-white"
                      }`}
                    >
                      <Sun className="h-4 w-4" />
                      <span className="text-sm">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 rounded-md flex-1 transition-colors ${
                        theme === "dark"
                          ? "bg-white shadow-sm dark:bg-[#09090B] dark:text-white"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-[#09090B] dark:text-white"
                      }`}
                    >
                      <Moon className="h-4 w-4" />
                      <span className="text-sm">Dark</span>
                    </button>
                  </div>
                  <hr className="my-1" />

                  {/* Settings */}
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2 mx-1"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>

                  {/* Logout */}
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2 mx-1"
                    variant="destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Collapse button positioned to appear inside the dropdown area */}
              <button
                onClick={() => {
                  toggleSidebar();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors group-data-[collapsible=icon]:hidden rounded-md z-10"
              >
                <ChevronsLeft className="size-4" />
              </button>
            </div>
          </div>
          <SidebarMenuItems />
          {isChatPage && (
            <hr className="my-4 transition-opacity duration-300 group-data-[collapsible=icon]:hidden" />
          )}

          {/* Chat History - Only visible on Tequity AI page and when sidebar is expanded */}
          {isChatPage && (
            <div className="group-data-[collapsible=icon]:hidden">
              <ChatHistory
                activeChatId={activeChatId}
                onChatSelect={onChatSelect}
              />
            </div>
          )}
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Mobile Header */}
          <header className="flex md:hidden h-16 items-center justify-between border-b dark:border-[#A1A1AA] border-gray-200 bg-white dark:bg-[#09090B] px-3">
            {/* Menu Button - Left */}
            <SidebarTrigger className="size-9 p-2 rounded-sm hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors shadow-sm">
              <Menu className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </SidebarTrigger>

            {/* Middle Content */}
            {isChatPage && chatContext && chatContext.chats.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none border-0 focus:border-0 focus-visible:border-0">
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate max-w-[150px]">
                      {chatContext.activeChat?.title || "New Chat"}
                    </span>
                    <ChevronDown className="h-5 w-5 text-gray-500 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 dark:bg-[#09090B] dark:text-white"
                  align="center"
                >
                  {chatContext.chats.slice(0, 5).map((chat) => (
                    <DropdownMenuItem
                      key={chat.id}
                      onClick={() => {
                        chatContext.selectChat(chat.id);
                        onChatSelect?.(chat.id);
                      }}
                      className={`cursor-pointer ${
                        chatContext.activeChatId === chat.id
                          ? "bg-gray-100 dark:bg-[#27272A]"
                          : ""
                      }`}
                    >
                      <span className="truncate">{chat.title}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : title === "Library" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 h-9 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-[#27272A] transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none border-0 focus:border-0 focus-visible:border-0">
                    <MdOutlineFolderCopy className="h-4 w-4 text-black dark:text-white" />
                    <span className="text-sm font-medium text-[#0f172a] dark:text-white">
                      {title}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 dark:bg-[#09090B] dark:text-white p-0"
                  align="center"
                >
                  {starredFiles.length > 0 ? (
                    <>
                      {starredFiles.map((file) => (
                        <DropdownMenuItem
                          key={file.id}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] px-4 py-2 flex items-center gap-2"
                          onClick={() => {
                            console.log("Starred file clicked:", file);
                            // Dispatch custom event to open PDF viewer
                            const fileData = {
                              id: file.id,
                              name: file.name,
                              type: file.type || "pdf",
                              size: 0,
                            };
                            window.dispatchEvent(
                              new CustomEvent("selectFile", {
                                detail: fileData,
                              })
                            );
                          }}
                        >
                          <span className="truncate">{file.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : (
                    <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No starred files
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Image
                  src={Logo}
                  alt="Company Logo"
                  width={20}
                  height={20}
                  priority
                  className="shrink-0"
                />
                <span className="text-sm font-semibold text-[#3f3f46] dark:text-white">
                  {formattedDataroomName}
                </span>
              </div>
            )}

            {headerActions ? (
              <div className="flex items-center">{headerActions}</div>
            ) : (
              <button className="flex items-center justify-center size-9 p-2 rounded-md bg-[#f1f5f9] dark:bg-[#27272A] hover:bg-gray-200 dark:hover:bg-[#27272A] transition-colors">
                <UploadCloud className="size-4 text-black dark:text-white" />
              </button>
            )}
          </header>

          {/* Desktop Header */}
          <header className="hidden md:flex h-16 items-center justify-between bg-white px-4 dark:bg-[#09090B] dark:text-white">
            <div className="flex items-center gap-3">
              {title === "Library" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 h-9 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-[#27272A] transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none border-0 focus:border-0 focus-visible:border-0">
                      <MdOutlineFolderCopy className="h-4 w-4 text-black dark:text-white" />
                      <span className="text-sm font-medium text-[#0f172a] dark:text-white">
                        {title}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 dark:bg-[#09090B] dark:text-white p-0"
                    align="start"
                  >
                    {starredFiles.length > 0 ? (
                      <>
                        {/* <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Starred Files
                        </div> */}
                        {starredFiles.map((file) => (
                          <DropdownMenuItem
                            key={file.id}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] px-4 py-2 flex items-center gap-2"
                            onClick={() => {
                              console.log(
                                "Starred file clicked (mobile):",
                                file
                              );
                              // Dispatch custom event to open PDF viewer
                              const fileData = {
                                id: file.id,
                                name: file.name,
                                type: file.type || "pdf",
                                size: 0,
                              };
                              window.dispatchEvent(
                                new CustomEvent("selectFile", {
                                  detail: fileData,
                                })
                              );
                            }}
                          >
                            {/* <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" /> */}
                            <span className="truncate">{file.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </>
                    ) : (
                      <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No starred files
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : isChatPage && chatContext && chatContext.chats.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 h-9 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-[#27272A] transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none border-0 focus:border-0 focus-visible:border-0">
                      <span className="text-sm font-medium text-[#0f172a] dark:text-white">
                        {title}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 dark:bg-[#09090B] dark:text-white p-0"
                    align="start"
                  >
                    {/* <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                      Recent Chats
                    </DropdownMenuLabel> */}
                    {chatContext.chats.slice(0, 5).map((chat) => (
                      <DropdownMenuItem
                        key={chat.id}
                        onClick={() => {
                          chatContext.selectChat(chat.id);
                          onChatSelect?.(chat.id);
                        }}
                        className={`cursor-pointer ${
                          chatContext.activeChatId === chat.id
                            ? "bg-gray-100 dark:bg-[#27272A] rounded-none"
                            : ""
                        }`}
                      >
                        <span className="truncate">{chat.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <h1 className="text-lg font-semibold text-black dark:text-white">
                  {title}
                </h1>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center gap-4">{headerActions}</div>
            )}
          </header>

          {children}
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </SidebarProvider>
  );
}
