"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { authFetch } from "@/lib/client-auth";

// Source interface from RAG response
export interface Source {
  fileId: string;
  filename: string;
  content: string;
  similarity: number;
  category?: string;
}

export interface ChatMessage {
  id?: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  files?: File[];
  sources?: Source[];
  isStreaming?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  dataroomId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  activeChatId: string | null;
  isLoading: boolean;
  isSending: boolean;
  dataroomId: string | null;
  setDataroomId: (id: string) => void;
  createNewChat: () => Promise<string | null>;
  sendMessage: (chatId: string, message: string, fileIds?: string[]) => Promise<void>;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => void;
  loadChats: () => Promise<void>;
  loadChatMessages: (chatId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}

// Optional version that doesn't throw error
export function useChatContextOptional() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dataroomId, setDataroomId] = useState<string | null>(null);

  // Load dataroom ID from user profile on mount
  useEffect(() => {
    const loadDataroomId = async () => {
      // First try localStorage
      const storedDataroomId = localStorage.getItem('tequity_dataroom_id');
      if (storedDataroomId) {
        setDataroomId(storedDataroomId);
        return;
      }

      // Otherwise, get from user's datarooms
      try {
        const response = await authFetch<{
          datarooms: Array<{ id: string; name: string; role: string }>;
        }>('/auth/me');

        if (response.success && response.data?.datarooms?.[0]) {
          const firstDataroom = response.data.datarooms[0];
          setDataroomId(firstDataroom.id);
          localStorage.setItem('tequity_dataroom_id', firstDataroom.id);
        }
      } catch (error) {
        console.error('Error loading dataroom ID:', error);
      }
    };

    loadDataroomId();
  }, []);

  // Load chats when dataroomId is available
  useEffect(() => {
    if (dataroomId) {
      loadChats();
    }
  }, [dataroomId]);

  const loadChats = useCallback(async () => {
    if (!dataroomId) return;

    setIsLoading(true);
    try {
      const response = await authFetch<{
        sessions: Array<{
          id: string;
          title: string;
          dataroomId: string;
          messageCount: number;
          createdAt: string;
          updatedAt: string;
        }>;
      }>(`/chat?dataroomId=${dataroomId}`);

      if (response.success && response.data?.sessions) {
        const loadedChats: Chat[] = response.data.sessions.map((session) => ({
          id: session.id,
          title: session.title || 'New Chat',
          messages: [],
          dataroomId: session.dataroomId,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        }));
        setChats(loadedChats);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dataroomId]);

  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      const response = await authFetch<{
        messages: Array<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
          metadata?: { sources?: Source[] };
          createdAt: string;
        }>;
      }>(`/chat/${chatId}/messages`);

      if (response.success && response.data?.messages) {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: response.data!.messages.map((msg) => ({
                  id: msg.id,
                  text: msg.content,
                  isUser: msg.role === 'user',
                  timestamp: new Date(msg.createdAt),
                  sources: msg.metadata?.sources,
                })),
              };
            }
            return chat;
          })
        );
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  }, []);

  const createNewChat = useCallback(async (): Promise<string | null> => {
    if (!dataroomId) {
      console.error('No dataroom ID available');
      return null;
    }

    try {
      const response = await authFetch<{
        session: {
          id: string;
          title: string;
          dataroomId: string;
          createdAt: string;
          updatedAt: string;
        };
      }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ dataroomId }),
      });

      if (response.success && response.data?.session) {
        const newChat: Chat = {
          id: response.data.session.id,
          title: response.data.session.title || 'New Chat',
          messages: [],
          dataroomId: response.data.session.dataroomId,
          createdAt: new Date(response.data.session.createdAt),
          updatedAt: new Date(response.data.session.updatedAt),
        };
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        return newChat.id;
      }
      return null;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }, [dataroomId]);

  const sendMessage = useCallback(async (chatId: string, message: string, fileIds?: string[]) => {
    if (!dataroomId) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, userMessage],
            updatedAt: new Date(),
          };
        }
        return chat;
      })
    );

    // Add streaming AI message placeholder
    const streamingMessage: ChatMessage = {
      text: '',
      isUser: false,
      timestamp: new Date(),
      isStreaming: true,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, streamingMessage],
          };
        }
        return chat;
      })
    );

    setIsSending(true);

    try {
      // Use streaming for real-time response
      const token = localStorage.getItem('tequity_auth_token');
      const tenantSlug = window.location.pathname.split('/')[1];

      const response = await fetch(`/api/${tenantSlug}/chat/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: message,
          dataroomId,
          sessionId: chatId,
          fileIds,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      let sources: Source[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'chunk') {
                  fullAnswer += data.data;
                  // Update the streaming message
                  setChats((prev) =>
                    prev.map((chat) => {
                      if (chat.id === chatId) {
                        const messages = [...chat.messages];
                        const lastMessage = messages[messages.length - 1];
                        if (lastMessage && lastMessage.isStreaming) {
                          messages[messages.length - 1] = {
                            ...lastMessage,
                            text: fullAnswer,
                          };
                        }
                        return { ...chat, messages };
                      }
                      return chat;
                    })
                  );
                } else if (data.type === 'done') {
                  sources = data.data?.sources || [];
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Finalize the message
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === chatId) {
            const messages = [...chat.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.isStreaming) {
              messages[messages.length - 1] = {
                ...lastMessage,
                text: fullAnswer || 'I could not process your question. Please try again.',
                isStreaming: false,
                sources,
              };
            }

            // Update title if it was "New Chat"
            let newTitle = chat.title;
            if (chat.title === 'New Chat' && chat.messages.length <= 2) {
              newTitle = message.substring(0, 50) + (message.length > 50 ? '...' : '');
            }

            return {
              ...chat,
              messages,
              title: newTitle,
              updatedAt: new Date(),
            };
          }
          return chat;
        })
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Update the streaming message with error
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === chatId) {
            const messages = [...chat.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.isStreaming) {
              messages[messages.length - 1] = {
                ...lastMessage,
                text: 'Sorry, there was an error processing your message. Please try again.',
                isStreaming: false,
              };
            }
            return { ...chat, messages };
          }
          return chat;
        })
      );
    } finally {
      setIsSending(false);
    }
  }, [dataroomId]);

  const selectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    // Load messages if not already loaded
    const chat = chats.find((c) => c.id === chatId);
    if (chat && chat.messages.length === 0) {
      loadChatMessages(chatId);
    }
  }, [chats, loadChatMessages]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await authFetch(`/chat/${chatId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [activeChatId]);

  const updateChatTitle = useCallback((chatId: string, title: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title, updatedAt: new Date() } : chat
      )
    );
  }, []);

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        activeChatId,
        isLoading,
        isSending,
        dataroomId,
        setDataroomId,
        createNewChat,
        sendMessage,
        selectChat,
        deleteChat,
        updateChatTitle,
        loadChats,
        loadChatMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
