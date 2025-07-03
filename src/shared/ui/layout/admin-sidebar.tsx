'use client';

import Link from 'next/link';
import { LayoutDashboard, Newspaper, Trophy, Users, Sword, Library, Map, Shield, LucideIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { can, type Role } from '@/shared/lib/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const AdminSidebar = () => {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  // Базовые пункты меню (доступны всем админам)
  const baseItems: NavItem[] = [
    { href: '/admin', label: 'Главная', icon: LayoutDashboard },
  ];

  // Условные пункты меню на основе прав
  const conditionalItems: (NavItem | false)[] = [
    can(role, 'manageEntities') && { href: '/admin/tournaments', label: 'Турниры', icon: Trophy },
    can(role, 'manageEntities') && { href: '/admin/players', label: 'Игроки', icon: Sword },
    can(role, 'manageEntities') && { href: '/admin/families', label: 'Семьи', icon: Users },
    can(role, 'manageEntities') && { href: '/admin/tournament-templates', label: 'Шаблоны турниров', icon: Library },
    can(role, 'manageEntities') && { href: '/admin/map-templates', label: 'Шаблоны карт', icon: Map },
    can(role, 'manageNews') && { href: '/admin/news', label: 'Новости', icon: Newspaper },
    can(role, 'viewAudit') && { href: '/admin/audit', label: 'Аудит', icon: Shield },
  ];

  // Объединяем базовые и условные пункты, фильтруем false значения
  const navItems: NavItem[] = [
    ...baseItems,
    ...conditionalItems.filter(Boolean) as NavItem[]
  ];

  return (
    <aside className="sticky top-20 h-[calc(100vh-80px)] w-[240px] shrink-0 border-r py-8">
      <nav className="flex flex-col gap-2">
        {navItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="flex items-center rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar; 