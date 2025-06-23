import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils.ts";
import GlobalHeader from "@/components/layout/global-header";
import { SWRProvider } from "@/components/providers/swr-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Majestic Match Center",
  description: "The central hub for all Majestic series tournaments and statistics.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className="dark">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
      >
        <SWRProvider>
          <div className="relative flex min-h-screen flex-col bg-background">
            <GlobalHeader />
            <main className="flex-1">{children}</main>
          </div>
        </SWRProvider>
      </body>
    </html>
  );
}
