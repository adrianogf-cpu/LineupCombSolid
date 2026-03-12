'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Lineup' },
  { href: '/analytics/vessels', label: 'Navios' },
  { href: '/analytics/ports', label: 'Portos' },
  { href: '/analytics/cargo', label: 'Cargas' },
  { href: '/analytics/afretadores', label: 'Afretadores' },
];

export function AnalyticsNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center gap-6">
        <span className="text-lg font-semibold">Lineup Dashboard</span>
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
