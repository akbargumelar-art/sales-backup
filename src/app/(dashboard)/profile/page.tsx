'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

export default function ProfilePage() {
  const { user, logout } = useAppStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="animate-fade-in">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-secondary via-secondary to-slate-700 px-5 pt-6 pb-12 -mt-px text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center shadow-xl ring-4 ring-white/20">
          <span className="text-white text-2xl font-bold">{user?.nama?.charAt(0)}</span>
        </div>
        <h2 className="text-white text-h1 mt-3">{user?.nama}</h2>
        <p className="text-white/50 text-caption mt-1">@{user?.username}</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-caption font-medium">
          {user?.role?.replace('_', ' ')}
        </span>
      </div>

      <div className="px-4 -mt-6 space-y-3 pb-6">
        {/* Info Card */}
        <div className="card">
          <h3 className="text-label text-text-secondary font-semibold mb-3">Informasi Akun</h3>
          <div className="space-y-3">
            {[
              { label: 'Username', value: user?.username, icon: '👤' },
              { label: 'Nama Lengkap', value: user?.nama, icon: '📝' },
              { label: 'Role', value: user?.role?.replace('_', ' '), icon: '🔑' },
              { label: 'TAP / Lokasi', value: user?.tap, icon: '📍' },
              { label: 'Status', value: user?.isActive ? 'Aktif' : 'Nonaktif', icon: '✅' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-body text-text-secondary flex items-center gap-2">
                  <span className="text-[16px]">{item.icon}</span>
                  {item.label}
                </span>
                <span className="text-body font-medium text-text-primary">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TAP Access Card (for Admin/SuperAdmin) */}
        {user?.role !== 'SALESFORCE' && (
          <div className="card">
            <h3 className="text-label text-text-secondary font-semibold mb-3 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Akses TAP
            </h3>
            {user?.allowedTaps?.includes('ALL') ? (
              <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-body text-primary font-medium flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Akses ke Semua TAP
              </div>
            ) : (
              <div className="space-y-1.5">
                {user?.allowedTaps?.map(tap => (
                  <div key={tap} className="px-3 py-2 rounded-xl bg-surface border border-border text-body text-text-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    {tap}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-text-secondary/60 mt-2">
              Hak akses TAP diatur oleh Super Admin
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="card space-y-2">
          <button onClick={() => router.push('/change-password')} className="w-full flex items-center gap-3 py-2.5 px-1 text-body text-text-primary hover:bg-surface rounded-lg transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            Ubah Password
          </button>
          <button className="w-full flex items-center gap-3 py-2.5 px-1 text-body text-text-primary hover:bg-surface rounded-lg transition-colors">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </div>
            Pengaturan
          </button>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="w-full py-3 text-center text-body font-semibold text-error bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
          Keluar dari Akun
        </button>

        <p className="text-center text-[10px] text-text-secondary/50 mt-4">SalesTrack v1.0.0 — © abay,2026</p>
      </div>
    </div>
  );
}
