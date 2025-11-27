"use client";

import { ChatProvider } from "./context/ChatContext";
import { FilesProvider } from "./context/FilesContext";

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatProvider>
      <FilesProvider>{children}</FilesProvider>
    </ChatProvider>
  );
}
