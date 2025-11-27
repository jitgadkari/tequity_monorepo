"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ChatInterface } from "../components/ChatInterface";
import { DashboardLayout } from "../components/DashboardLayout";
import { useChatContext } from "../context/ChatContext";

export default function ChatPage() {
  const router = useRouter();
  const { 
    activeChat, 
    activeChatId, 
    createNewChat, 
    loadChats,
    isLoading 
  } = useChatContext();
  const [chatTitle, setChatTitle] = useState<string>("New Chat");
  const [isInitialized, setIsInitialized] = useState(false);

  // Load chats on initial mount
  useEffect(() => {
    const initializeChat = async () => {
      try {
        await loadChats();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load chats:', error);
      }
    };

    initializeChat();
  }, [loadChats]);

  // Ensure we have an active chat
  useEffect(() => {
    if (isInitialized && !activeChatId) {
      // If no active chat, create a new one
      handleNewChat();
    }
  }, [isInitialized, activeChatId]);

  // Update title when active chat changes
  useEffect(() => {
    if (activeChat) {
      setChatTitle(activeChat.title || "New Chat");
    } else {
      setChatTitle("New Chat");
    }
  }, [activeChat]);

  const handleNewChat = useCallback(async () => {
    try {
      console.log('Creating new chat...');
      const chatId = await createNewChat();
      if (chatId) {
        console.log('New chat created with ID:', chatId);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  }, [createNewChat]);

  const handleChatSelect = (chatId: string) => {
    // This will be handled by the DashboardLayout
    console.log('Chat selected:', chatId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title={chatTitle}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 bg-[#F4F4F5] dark:bg-[#27272A] hover:bg-gray-200 dark:hover:bg-[#3F3F46] text-gray-700 dark:text-white hover:text-gray-900 transition-colors px-3 py-2 rounded-md dark:border-gray-700"
            title="New Chat"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium md:block hidden">New Chat</span>
          </button>
        </div>
      }
      activeChatId={activeChatId || undefined}
      onChatSelect={handleChatSelect}
    >
      <main className="flex-1 overflow-hidden">
        {activeChatId ? (
          <ChatInterface
          key={activeChatId || 'new'} // This forces a remount when chat changes
          selectedFile={null}
          onNewChat={handleNewChat}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No active chat found</p>
              <button
                onClick={handleNewChat}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Start a new chat
              </button>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
