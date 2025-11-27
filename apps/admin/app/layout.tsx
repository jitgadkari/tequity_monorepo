import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { AdminProvider } from "@/context/AdminContext";
import SettingsModal from "@/components/SettingsModal";

export const metadata: Metadata = {
  title: "Lightning Dashboard",
  description: "SaaS Platform Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <SettingsProvider>
            <AdminProvider>
              {children}
              <SettingsModal />
            </AdminProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
