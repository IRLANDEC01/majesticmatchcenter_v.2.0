import Link from 'next/link';
import { LayoutDashboard, Newspaper, Trophy, Users, Sword, Library, Map } from 'lucide-react';

const AdminSidebar = () => {
  const navItems = [
    { href: '/admin', label: 'Главная', icon: LayoutDashboard },
    { href: '/admin/tournaments', label: 'Турниры', icon: Trophy },
    { href: '/admin/players', label: 'Игроки', icon: Sword },
    { href: '/admin/families', label: 'Семьи', icon: Users },
    { href: '/admin/tournament-templates', label: 'Шаблоны турниров', icon: Library },
    { href: '/admin/map-templates', label: 'Шаблоны карт', icon: Map },
    { href: '/admin/news', label: 'Новости', icon: Newspaper },
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