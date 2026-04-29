'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile z-30 bg-white border-t border-border shadow-nav">
      <div className="flex items-center justify-around py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))]">

        {/* Dashboard */}
        <Link href="/dashboard" className="flex flex-col items-center py-1.5 px-4 group">
          <div className={`transition-all duration-200 ${isActive('/dashboard') ? 'text-primary scale-110' : 'text-text-secondary group-hover:text-primary'}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive('/dashboard') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className={`text-[10px] mt-0.5 font-medium ${isActive('/dashboard') ? 'text-primary' : 'text-text-secondary'}`}>Dashboard</span>
          {isActive('/dashboard') && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
        </Link>

        {/* Input Penjualan — center FAB */}
        <Link href="/sales/new" className="flex flex-col items-center -mt-5">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 bg-primary text-white ${isActive('/sales/new') ? 'scale-110 ring-4 ring-primary/20' : 'hover:scale-105'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <span className={`text-[10px] mt-1 font-medium ${isActive('/sales/new') ? 'text-primary' : 'text-text-secondary'}`}>Input</span>
        </Link>

        {/* Laporan */}
        <Link href="/dashboard/report" className="flex flex-col items-center py-1.5 px-4 group">
          <div className={`transition-all duration-200 ${isActive('/dashboard/report') ? 'text-primary scale-110' : 'text-text-secondary group-hover:text-primary'}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive('/dashboard/report') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <span className={`text-[10px] mt-0.5 font-medium ${isActive('/dashboard/report') ? 'text-primary' : 'text-text-secondary'}`}>Laporan</span>
          {isActive('/dashboard/report') && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
        </Link>

      </div>
    </nav>
  );
}
