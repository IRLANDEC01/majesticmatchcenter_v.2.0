import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { GlobalHeader, Toaster } from "@/shared/ui";
import { QueryProvider } from "@/shared/providers";
import { AuthProvider } from "@/shared/providers/auth-provider";
import { initializeSharp } from "@/lib/image-processing/variants";

// Инициализация Sharp с оптимальными настройками
// Выполняется один раз при запуске приложения
initializeSharp(2);

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Majestic Match Center",
  description: "The central hub for all Majestic series tournaments and statistics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
      >
        <AuthProvider>
          <QueryProvider>
            <div className="relative flex min-h-screen flex-col bg-background">
              <GlobalHeader />
              <main className="flex-1">{children}</main>
            </div>
          </QueryProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
