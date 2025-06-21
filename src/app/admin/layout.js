import AdminSidebar from '@/components/admin/admin-sidebar';

export default function AdminLayout({ children }) {
  return (
    <div className="container flex gap-12">
      <AdminSidebar />
      <main className="flex-1 py-8">
        <div className="max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
} 