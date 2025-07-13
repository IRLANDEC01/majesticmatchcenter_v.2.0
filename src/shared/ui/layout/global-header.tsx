"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSession, signIn, signOut } from "next-auth/react";

/**
 * Глобальный хедер для всех страниц с авторизацией
 * Next.js 15.3 + TypeScript + NextAuth.js v5
 */
const GlobalHeader = () => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <span className="font-bold">Majestic Match Center</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            {isAdmin && (
              <Button
                asChild
                variant="ghost"
                onClick={() => (window.location.href = "/admin")}
              >
                <a href="/admin">Админ-панель</a>
              </Button>
            )}

            {session ? (
              <Button
                variant="outline"
                onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
              >
                Выйти
              </Button>
            ) : (
              <Button variant="default" onClick={() => signIn("yandex")}>
                Войти
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
