/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  FileText,
  Plus,
  AtSign,
  ArrowUp,
  File,
  Folder,
  Image as ImageIcon,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Search,
  Loader2,
} from "lucide-react";
import { GoodResponse } from "./Feedback/goodResponse";
import { BadResponse } from "./Feedback/badResponse";
import { useChatContext } from "../context/ChatContext";
import { useFiles } from "../context/FilesContext";
import Image from "next/image";
import Logomark from "@/public/Logomark.svg";
import { getUser } from "@/lib/client-auth";

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt?: Date;
  url?: string;
}

interface ChatInterfaceProps {
  selectedFile: FileItem | null;
  onClose?: () => void;
  onNewChat?: () => void;
  key?: string | number; // Add key to the interface
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ChatInterface({ selectedFile }: ChatInterfaceProps) {
  const { activeChat, activeChatId, createNewChat, sendMessage, isSending, chats } =
    useChatContext();
  const { files: userFilesFromContext } = useFiles();
  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const feedbackPanelRef = useRef<HTMLDivElement | null>(null);
  const [userName, setUserName] = useState<string>("there");

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [contextSearchValue, setContextSearchValue] = useState("");
  const [activeFeedback, setActiveFeedback] = useState<{
    type: "good" | "bad";
    messageIndex: number;
  } | null>(null);

  // Load user name on mount
  useEffect(() => {
    const user = getUser();
    if (user?.fullName) {
      setUserName(user.fullName.split(' ')[0]);
    }
  }, []);

  useEffect(() => {
    if (activeFeedback && feedbackPanelRef.current) {
      feedbackPanelRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeFeedback]);

  const handleFeedbackToggle = (type: "good" | "bad", index: number) => {
    setActiveFeedback((prev) => {
      if (prev && prev.type === type && prev.messageIndex === index) {
        feedbackPanelRef.current = null;
        return null;
      }
      return { type, messageIndex: index };
    });
  };

  // Auto-resize textarea function
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    adjustTextareaHeight();
  };

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!inputValue && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [inputValue]);
  const [selectedContextItems, setSelectedContextItems] = useState<
    Array<{
      id: string;
      name: string;
      type: "file" | "chat";
      fileType?: string;
      size?: number;
    }>
  >([]);
  const hasInitialized = useRef(false);

  // Use files from context (fetched from backend)
  const userFiles: FileItem[] = useMemo(() => {
    return userFilesFromContext.map((f) => ({
      id: f.id || '',
      name: f.name,
      type: f.type,
      size: f.size || 0,
    }));
  }, [userFilesFromContext]);

  // Create a new chat only if there are no chats at all (initial app load)
  useEffect(() => {
    if (!hasInitialized.current && !activeChatId && chats.length === 0) {
      hasInitialized.current = true;
      createNewChat();
    }
  }, [activeChatId, chats.length, createNewChat]);

  const messages = useMemo(
    () => activeChat?.messages || [],
    [activeChat?.messages]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        uploadMenuRef.current &&
        !uploadMenuRef.current.contains(event.target as Node)
      ) {
        setShowUploadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || isSending) return;

    if (
      inputValue.trim() ||
      attachedFiles.length > 0 ||
      selectedContextItems.length > 0
    ) {
      // Build message text with context items
      let messageText = inputValue || "";
      if (selectedContextItems.length > 0) {
        const contextText = selectedContextItems
          .map((item) => `@${item.name}`)
          .join(" ");
        messageText = messageText
          ? `${contextText} ${messageText}`
          : contextText;
      }

      // Get file IDs from selected context items that are files
      const fileIds = selectedContextItems
        .filter((item) => item.type === "file")
        .map((item) => item.id);

      // Send message using context (calls backend API)
      await sendMessage(activeChatId, messageText || "Uploaded files", fileIds.length > 0 ? fileIds : undefined);

      setInputValue("");
      setAttachedFiles([]);
      setSelectedContextItems([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Toggle the upload menu
    setShowUploadMenu(!showUploadMenu);
  };

  // Handle click outside to close the menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        uploadMenuRef.current &&
        !uploadMenuRef.current.contains(event.target as Node)
      ) {
        setShowUploadMenu(false);
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setShowContextMenu(false);
        setContextSearchValue("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFileUpload = (type: "files" | "folder" | "image") => {
    setShowUploadMenu(false);
    if (type === "files") {
      fileInputRef.current?.click();
    } else if (type === "folder") {
      folderInputRef.current?.click();
    } else if (type === "image") {
      imageInputRef.current?.click();
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFileSelect = (file: FileItem) => {
    // Check if file is already selected
    if (
      !selectedContextItems.some(
        (item) => item.id === file.id && item.type === "file"
      )
    ) {
      setSelectedContextItems((prev) => [
        ...prev,
        {
          id: file.id,
          name: file.name,
          type: "file",
          fileType: file.type,
          size: file.size,
        },
      ]);
    }
    setShowContextMenu(false);
    setContextSearchValue("");
  };

  const handleChatSelect = (chatText: string, chatId: string) => {
    // Check if chat is already selected
    if (
      !selectedContextItems.some(
        (item) => item.id === chatId && item.type === "chat"
      )
    ) {
      setSelectedContextItems((prev) => [
        ...prev,
        { id: chatId, name: chatText, type: "chat" },
      ]);
    }
    setShowContextMenu(false);
    setContextSearchValue("");
  };

  const removeContextItem = (id: string, type: "file" | "chat") => {
    setSelectedContextItems((prev) =>
      prev.filter((item) => !(item.id === id && item.type === type))
    );
  };

  const getFileIcon = (type: string) => {
    let iconPath = "/Files/TXT-icon.svg"; // default icon

    if (
      type.includes("image") ||
      type.includes("jpeg") ||
      type.includes("jpg") ||
      type.includes("png") ||
      type.includes("gif")
    ) {
      iconPath = "/Files/JPG-icon.svg";
    } else if (type.includes("svg")) {
      iconPath = "/Files/SVG-icon.svg";
    } else if (type.includes("pdf")) {
      iconPath = "/Files/PDF-icon.svg";
    } else if (
      type.includes("spreadsheet") ||
      type.includes("excel") ||
      type.includes("sheet")
    ) {
      iconPath = "/Files/XLS-icon.svg";
    } else if (
      type.includes("word") ||
      type.includes("document") ||
      type.includes("msword")
    ) {
      iconPath = "/Files/Docs-icon.svg";
    } else if (
      type.includes("zip") ||
      type.includes("compressed") ||
      type.includes("archive")
    ) {
      iconPath = "/Files/ZIP-icon.svg";
    } else if (
      type.includes("audio") ||
      type.includes("mp3") ||
      type.includes("wav")
    ) {
      iconPath = "/Files/MP3-icon.svg";
    } else if (type.includes("text") || type.includes("txt")) {
      iconPath = "/Files/TXT-icon.svg";
    }

    return (
      <Image
        src={iconPath}
        alt="file icon"
        width={32}
        height={32}
        className="shrink-0"
      />
    );
  };

  const filteredFiles = userFiles.filter(
    (file) =>
      contextSearchValue === "" ||
      file.name.toLowerCase().includes(contextSearchValue.toLowerCase())
  );

  return (
    <div className="h-full bg-white dark:bg-[#09090B] flex flex-col items-center">
      <div className="flex-1 max-w-[792px] w-full p-4 overflow-y-auto scrollbar-hide bg-white dark:bg-[#09090B]">
        {selectedFile ? (
          <div className="mb-4 p-4 border rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gray-100 p-2 rounded">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{selectedFile.name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedFile.type} • {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            {selectedFile.url ? (
              <div className="mt-4 border rounded-md overflow-hidden">
                <iframe
                  src={selectedFile.url}
                  className="w-full h-[500px]"
                  title={selectedFile.name}
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No preview available for this file type.
              </div>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto">
              <div className="flex items-center justify-center mx-auto mb-3">
                <Image
                  src={Logomark}
                  alt="Tequity AI"
                  width={48}
                  height={48}
                  className="shrink-0"
                />
              </div>
              <h3
                className="text-gray-900 dark:text-white"
                style={{
                  fontFamily: "Plus Jakarta Sans",
                  fontWeight: 500,
                  fontStyle: "medium",
                  fontSize: "28px",
                  lineHeight: "40px",
                  letterSpacing: "0px",
                  verticalAlign: "middle",
                }}
              >
                Hello {userName}
              </h3>
              <p
                className="text-gray-500 text-sm leading-5 text-center dark:text-[#F4F4F5]"
                style={{ fontFamily: "Inter", fontSize: "14px" }}
              >
                How can I help you today?
              </p>
            </div>
          </div>
        ) : null}

        {/* Messages Display Area */}
        {messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Message Content */}
                <div
                  className={`flex w-full max-w-[600px] flex-col gap-1 ${
                    message.isUser
                      ? "items-end self-end"
                      : "items-start self-start"
                  }`}
                >
                  {/* File Attachments - Show separately above message */}
                  {message.files && message.files.length > 0 && (
                    <div
                      className={`grid grid-cols-2 gap-2 mb-2 w-full max-w-[800px] ${
                        message.isUser
                          ? "justify-items-end"
                          : "justify-items-start"
                      }`}
                    >
                      {message.files.map((file, fileIndex) => (
                        <div
                          key={fileIndex}
                          className={`flex items-center gap-3 p-3 rounded-lg border w-full max-w-[300px] bg-[#f4f4f5] dark:bg-[#27272A] ${
                            message.isUser
                              ? "border-[#E4E4E7] dark:border-[#3F3F46] "
                              : "border-[#E4E4E7] dark:border-[#3F3F46]"
                          }`}
                        >
                          <div className="shrink-0 bg-[#F4F4F5] dark:bg-[#27272A] p-2 rounded flex items-center justify-center w-8 h-8">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-sm font-medium text-[#18181B] dark:text-white truncate w-full">
                              {file.name}
                            </p>
                            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                              {formatFileSize(file.size)} •{" "}
                              {file.type.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`w-fit max-w-full rounded-lg px-2 py-2 ${
                      message.isUser
                        ? "bg-[#F4F4F5] dark:bg-[#3F3F46] text-black dark:text-white"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {message.isStreaming && !message.text ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#D91D69]" />
                        <span className="text-sm text-gray-500">Thinking...</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    )}
                  </div>

                  {/* Sources - Only for AI messages with sources */}
                  {!message.isUser && message.sources && message.sources.length > 0 && !message.isStreaming && (
                    <div className="mt-2 w-full max-w-full">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.slice(0, 3).map((source, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 px-2 py-1 bg-[#F4F4F5] dark:bg-[#27272A] rounded text-xs"
                            title={`${source.filename} (${Math.round(source.similarity * 100)}% match)`}
                          >
                            <FileText className="h-3 w-3 text-gray-500" />
                            <span className="truncate max-w-[150px] text-gray-700 dark:text-gray-300">
                              {source.filename}
                            </span>
                            <span className="text-gray-400">
                              {Math.round(source.similarity * 100)}%
                            </span>
                          </div>
                        ))}
                        {message.sources.length > 3 && (
                          <span className="text-xs text-gray-400 px-2 py-1">
                            +{message.sources.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons - Only for AI messages */}
                  {!message.isUser && !message.isStreaming && (
                    <div className="flex items-center gap-1">
                      <div className="relative flex h-6 w-6 items-center justify-center">
                        <button
                          onClick={() => handleCopy(message.text, index)}
                          className={`flex h-6 w-6 items-center justify-center transition-colors ${
                            copiedIndex === index
                              ? "border-[#D91D69] text-[#D91D69]"
                              : "border-[#E4E4E7] text-gray-500 hover:text-gray-700 dark:border-[#3F3F46] dark:text-gray-400 dark:hover:text-gray-200"
                          }`}
                          title="Copy"
                          aria-label={copiedIndex === index ? "Copied" : "Copy"}
                        >
                          <Copy className="h-3.5 w-3.5 cursor-pointer" />
                        </button>
                        {copiedIndex === index && (
                          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#D91D69]">
                            Copied
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFeedbackToggle("good", index)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                          activeFeedback?.type === "good" &&
                          activeFeedback?.messageIndex === index
                            ? "text-[#D91D69]"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                        aria-label="Provide positive feedback"
                      >
                        <ThumbsUp className="h-3 w-3 cursor-pointer" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedbackToggle("bad", index)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                          activeFeedback?.type === "bad" &&
                          activeFeedback?.messageIndex === index
                            ? "text-[#D91D69]"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                        aria-label="Provide negative feedback"
                      >
                        <ThumbsDown className="h-3 w-3 cursor-pointer" />
                      </button>
                    </div>
                  )}
                  {!message.isUser &&
                    activeFeedback?.messageIndex === index && (
                      <div
                        ref={feedbackPanelRef}
                        className="mt-3 flex justify-start"
                      >
                        {activeFeedback.type === "good" ? (
                          <GoodResponse
                            onClose={() => {
                              setActiveFeedback(null);
                              feedbackPanelRef.current = null;
                            }}
                          />
                        ) : (
                          <BadResponse
                            onClose={() => {
                              setActiveFeedback(null);
                              feedbackPanelRef.current = null;
                            }}
                          />
                        )}
                      </div>
                    )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input at bottom */}
      <div className="p-4 bg-white dark:bg-[#09090B] w-full flex justify-center">
        <form onSubmit={handleSendMessage} className="max-w-[792px] w-full">
          <div className="rounded-lg border border-gray-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] p-3">
            <div className="flex flex-col">
              {/* Selected Context Items (Files & Chats) - At Top Inside Input */}
              {selectedContextItems.length > 0 && (
                <div className="pb-2 mb-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedContextItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`flex items-center gap-2 bg-[#E4E4E7] dark:bg-[#27272A] px-2 py-1.5 text-xs ${
                          item.type === "file"
                            ? "rounded-md h-[58px]"
                            : "rounded-full h-[24px]"
                        }`}
                      >
                        {item.type === "file" ? (
                          // File display with icon, name and size
                          <>
                            <div className="flex-shrink-0">
                              {getFileIcon(item.fileType || "")}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate max-w-[150px] text-gray-700 dark:text-white font-medium">
                                {item.name}
                              </span>
                              {item.size && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {formatFileSize(item.size)}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          // Chat display - just name, no icon
                          <span className="truncate max-w-[200px] text-gray-700 dark:text-white">
                            {item.name}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeContextItem(item.id, item.type)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
                          aria-label="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached Files Preview - Inside Input */}
              {attachedFiles.length > 0 && (
                <div className="pb-2 mb-2 border-b border-gray-200 dark:border-[#27272A]">
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-[#E4E4E7] dark:bg-[#27272A] rounded-md px-2 py-1.5 text-xs"
                      >
                        <div className="flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate max-w-[150px] text-gray-700 dark:text-white font-medium">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachedFile(index)}
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex-shrink-0"
                          aria-label="Remove file"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Need quick insights..."
                  className="flex-1 outline-none text-sm resize-none overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                  rows={1}
                  style={{ minHeight: "24px", maxHeight: "120px" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={
                    isSending ||
                    (!inputValue.trim() &&
                    attachedFiles.length === 0 &&
                    selectedContextItems.length === 0)
                  }
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#D91D69] text-white hover:bg-[#D91D69] dark:bg-[#D91D69] dark:text-black dark:border-[#3F3F46] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="flex gap-2 relative">
                <div ref={uploadMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="flex items-center bg-white dark:bg-[#09090B] border border-gray-200 dark:border-[#3F3F46] justify-center rounded-md text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:bg-[#27272A]"
                    style={{
                      width: "30px",
                      height: "30px",
                      paddingTop: "6px",
                      paddingRight: "6px",
                      paddingBottom: "6px",
                      paddingLeft: "6px",
                      gap: "8px",
                      borderWidth: "0.83px",
                      borderRadius: "6.67px",
                      opacity: 1,
                    }}
                    aria-label="Upload files"
                    title="Upload files"
                  >
                    <Plus
                      className={`h-4 w-4 dark:text-white transition-transform duration-200 ${
                        showUploadMenu ? "rotate-45" : ""
                      }`}
                    />
                  </button>

                  {/* Upload Dropdown Menu */}
                  {showUploadMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-[#09090B] dark:border-[#27272A] border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => handleFileUpload("files")}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-[#27272A] dark:text-white transition-colors"
                        >
                          <File className="h-4 w-4 text-blue-600" />
                          <span>Upload Files</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFileUpload("folder")}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-[#27272A] dark:text-white transition-colors"
                        >
                          <Folder className="h-4 w-4 text-orange-600" />
                          <span>Upload Folder</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFileUpload("image")}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-[#27272A] dark:text-white transition-colors"
                        >
                          <ImageIcon className="h-4 w-4 text-purple-600" />
                          <span>Upload Images</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div ref={contextMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (showContextMenu) {
                        setContextSearchValue("");
                      }
                      setShowContextMenu(!showContextMenu);
                    }}
                    className="flex bg-white dark:bg-[#09090B] border border-gray-200 dark:border-[#3F3F46] items-center gap-2 px-4 h-8 rounded-md text-gray-600 hover:bg-gray-100 transition-colors text-sm cursor-pointer dark:text-white dark:hover:bg-[#27272A]"
                    style={{
                      width: "137.33px",
                      height: "30px",
                      paddingTop: "0px",
                      paddingRight: "16px",
                      paddingBottom: "0px",
                      paddingLeft: "16px",
                      gap: "8px",
                      borderWidth: "0.83px",
                      borderRadius: "6.67px",
                      opacity: 1,
                    }}
                    aria-label="Add context"
                  >
                    <AtSign className="h-3.5 w-3.5" />
                    <span>Add context</span>
                  </button>

                  {/* Context Dropdown Menu */}
                  {showContextMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-[#09090B] border border-gray-200 dark:border-[#27272A] rounded-lg shadow-lg z-50">
                      <div className="">
                        {/* Search Bar */}
                        <div className="">
                          <div className="flex items-center gap-2 px-2 py-2 dark:bg-[#09090B] rounded-t-md">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={contextSearchValue}
                              onChange={(e) =>
                                setContextSearchValue(e.target.value)
                              }
                              placeholder="Search..."
                              className="flex-1 bg-transparent outline-none text-sm text-gray-700 dark:text-white placeholder:text-gray-400"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>

                        {/* Show Files Section */}
                        <div className="border-t border-gray-200 dark:border-[#27272A] pt-2">
                          <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Files
                          </div>
                          <div className="max-h-25 overflow-y-auto scrollbar-hide">
                            {filteredFiles.length > 0 ? (
                              filteredFiles.map((file) => (
                                <button
                                  key={file.id}
                                  type="button"
                                  onClick={() => handleFileSelect(file)}
                                  className="w-full flex items-center gap-2 px-4 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors"
                                >
                                  {getFileIcon(file.type)}
                                  <div className="flex-1 text-left min-w-0">
                                    <div className="truncate font-medium">
                                      {file.name}
                                    </div>
                                    {/* <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatFileSize(file.size)}
                                  </div> */}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                {contextSearchValue
                                  ? "No files found"
                                  : "No files available"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Previous Chats Section */}
                        <div className="border-t border-gray-200 dark:border-[#27272A] pt-2 mt-2">
                          <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Chats
                          </div>
                          <div className="max-h-40 overflow-y-auto scrollbar-hide">
                            {messages.length > 0 ? (
                              messages
                                .filter((msg) => msg.isUser)
                                .filter(
                                  (msg) =>
                                    contextSearchValue === "" ||
                                    msg.text
                                      .toLowerCase()
                                      .includes(
                                        contextSearchValue.toLowerCase()
                                      )
                                )
                                .slice(0, 3)
                                .map((msg, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      handleChatSelect(
                                        msg.text,
                                        `chat-${idx}-${msg.timestamp.getTime()}`
                                      )
                                    }
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors"
                                    title={msg.text}
                                  >
                                    <div className="truncate">
                                      {msg.text.length > 35
                                        ? `${msg.text.substring(0, 35)}...`
                                        : msg.text}
                                    </div>
                                  </button>
                                ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                No previous chats
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as any)}
          />
          <input
            ref={imageInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </form>
      </div>
    </div>
  );
}
