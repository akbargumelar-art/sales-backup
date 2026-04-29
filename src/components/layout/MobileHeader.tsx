'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

export default function MobileHeader() {
  const { user, logout } = useAppStore();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-secondary shadow-header lg:static lg:bg-transparent lg:shadow-none">
        <div className="flex items-center justify-between px-4 py-3 lg:px-0 lg:py-0">
          {/* Logo - mobile only */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><circle cx="17.5" cy="17.5" r="3.5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-[15px] leading-none">SalesTrack</h1>
              <p className="text-white/50 text-[10px] mt-0.5">Input Penjualan</p>
            </div>
          </div>

          {/* Desktop: Page title area */}
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse-soft" />
              <span className="text-caption text-text-secondary">{user?.tap}</span>
            </div>
            {user?.allowedTaps && !user.allowedTaps.includes('ALL') && user.allowedTaps.length > 1 && (
              <span className="text-[10px] text-text-secondary/50">
                ({user.allowedTaps.join(', ')})
              </span>
            )}
            {user?.allowedTaps?.includes('ALL') && (
              <span className="badge bg-primary/10 text-primary text-[10px]">Semua TAP</span>
            )}
          </div>

          {/* Profile button - avatar with initials */}
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 lg:hover:bg-slate-100 transition-colors relative"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-white/20">
              <span className="text-white text-caption font-bold">
                {user?.nama?.charAt(0) || 'U'}
              </span>
            </div>
            <span className="hidden lg:block text-body text-text-primary font-medium">{user?.nama}</span>
          </button>
        </div>
      </header>

      {/* Profile dropdown */}
      {showProfile && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
          <div className="fixed right-4 top-14 z-50 bg-white rounded-2xl shadow-xl border border-border w-72 animate-scale-in overflow-hidden lg:right-4 lg:top-14">
            {/* User info header */}
            <div className="bg-gradient-to-br from-secondary to-slate-700 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <span className="text-white font-bold text-lg">{user?.nama?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-body text-white truncate">{user?.nama}</p>
                  <p className="text-[11px] text-white/60">@{user?.username}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px] font-medium">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div className="px-4 py-3 border-b border-border space-y-2">
              <div className="flex items-center justify-between text-caption">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  TAP
                </span>
                <span className="font-medium text-text-primary">{user?.tap}</span>
              </div>
              {user?.allowedTaps && (
                <div className="flex items-center justify-between text-caption">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Akses
                  </span>
                  <span className="font-medium text-text-primary text-right text-[11px]">
                    {user.allowedTaps.includes('ALL') ? 'Semua TAP' : user.allowedTaps.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-3 px-4 py-3 text-body text-text-primary hover:bg-surface transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                Profil Saya
              </Link>
              <button
                onClick={() => { setShowProfile(false); router.push('/change-password'); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-body text-text-primary hover:bg-surface transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
                Ubah Password
              </button>
              <div className="border-t border-border mx-4 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-body text-error hover:bg-red-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
                Keluar dari Akun
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
