import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/sidebar";

export const metadata: Metadata = {
  title: "ClawdTalk — AI Communication Platform",
  description: "Connect AI agents to customers via Voice, Phone, SMS, and Live Chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
