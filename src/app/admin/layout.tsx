import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-3 flex items-center gap-6 text-sm">
        <span className="font-semibold">Admin</span>
        <Link href="/admin/upload" className="text-muted-foreground hover:text-foreground">
          Upload
        </Link>
        <Link href="/admin/ingestion" className="text-muted-foreground hover:text-foreground">
          Ingestion Log
        </Link>
        <Link href="/" className="ml-auto text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
