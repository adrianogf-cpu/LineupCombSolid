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
    <nav className="flex items-center gap-1">
      {navLinks.map(({ href, label }) => {
        const isActive =
          href === '/'
            ? pathname === '/'
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
