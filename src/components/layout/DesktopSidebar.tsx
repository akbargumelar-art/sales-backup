'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, sidebarCollapsed, toggleSidebar } = useAppStore();

  const isAdminOrAbove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const mainNav = [
    { label: 'Dashboard', href: '/dashboard', iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', extra: <><polyline points="9 22 9 12 15 12 15 22"/></> },
    { label: 'Input Penjualan', href: '/sales/new', iconPath: null, isPlus: true },
    { label: 'Laporan', href: '/dashboard/report', iconPath: 'M18 20V10M12 20V4M6 20v-6' },
  ];

  const adminNav = [
    ...(user?.role === 'SUPER_ADMIN' ? [
      { label: 'Kelola TAP', href: '/manage/taps', iconPath: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z', extra: <><circle cx="12" cy="10" r="3"/></> },
    ] : []),
    { label: 'Kelola Salesforce', href: '/manage/salesforce', iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', extra: <><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
    { label: 'Kelola Outlet', href: '/manage/outlets', iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', extra: <><polyline points="9 22 9 12 15 12 15 22"/></> },
    { label: 'Kelola Produk', href: '/manage/products', iconPath: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
  ];

  const bottomNav = [
    { label: 'Profil', href: '/profile', iconPath: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', extra: <><circle cx="12" cy="7" r="4"/></> },
  ];

  const renderNavItem = (item: typeof mainNav[0], index?: number) => {
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
    return (
      <Link key={item.href} href={item.href} title={sidebarCollapsed ? item.label : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
          isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
        } ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {item.isPlus ? (
              <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
            ) : (
              <><path d={item.iconPath!}/>{item.extra}</>
            )}
          </svg>
        </div>
        {!sidebarCollapsed && (
          <>
            <span className="text-body font-medium truncate">{item.label}</span>
            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto shrink-0" />}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside className={`hidden lg:flex lg:flex-col bg-secondary min-h-screen sticky top-0 transition-all duration-300 ${
      sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64 xl:w-72'
    }`}>
      {/* Logo + Collapse toggle */}
      <div className={`py-4 border-b border-white/10 ${sidebarCollapsed ? 'px-3' : 'px-5'}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><circle cx="17.5" cy="17.5" r="3.5"/>
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-white font-bold text-[16px] leading-none">SalesTrack</h1>
                <p className="text-white/40 text-[11px] mt-0.5">Input Penjualan</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Kecilkan sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
            </button>
          )}
        </div>
        {sidebarCollapsed && (
          <button onClick={toggleSidebar} className="w-full mt-3 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors flex justify-center" title="Perbesar sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
          </button>
        )}
      </div>

      {/* User info */}
      {!sidebarCollapsed ? (
        <div className="px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-caption">{user?.nama?.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-caption truncate">{user?.nama}</p>
              <p className="text-white/40 text-[10px]">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
            <span className="text-white/40 text-[10px]">{user?.tap}</span>
            {user?.allowedTaps?.includes('ALL') && (
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary-light text-[9px] font-medium">Semua TAP</span>
            )}
            {user?.allowedTaps && !user.allowedTaps.includes('ALL') && user.allowedTaps.length > 1 && (
              <span className="text-white/30 text-[9px]">+{user.allowedTaps.length - 1} TAP</span>
            )}
          </div>
        </div>
      ) : (
        <div className="py-3 flex justify-center border-b border-white/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center" title={user?.nama}>
            <span className="text-white font-bold text-caption">{user?.nama?.charAt(0)}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 py-3 space-y-0.5 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
        {/* Main section */}
        {!sidebarCollapsed && <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider px-3 mb-1.5">Menu Utama</p>}
        {mainNav.map(renderNavItem)}

        {/* Admin section */}
        {isAdminOrAbove && (
          <>
            <div className={`my-2 border-t border-white/10 ${sidebarCollapsed ? '' : ''}`} />
            {!sidebarCollapsed && <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider px-3 mb-1.5 mt-3">Manajemen Data</p>}
            {adminNav.map(renderNavItem)}
          </>
        )}

        {/* Divider */}
        <div className="my-2 border-t border-white/10" />
        {!sidebarCollapsed && <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider px-3 mb-1.5 mt-3">Akun</p>}
        {bottomNav.map(renderNavItem)}
      </nav>

      {/* Logout */}
      <div className={`pb-4 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
        <button onClick={handleLogout} title={sidebarCollapsed ? 'Keluar' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all w-full ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {!sidebarCollapsed && <span className="text-body font-medium">Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
