'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

export default function LoginPage() {
  const router = useRouter();
  const { hasSetup, user, taps, hydrateFromServer, authenticateUser, initializeAdmin, hasHydrated } = useAppStore();
  const setupTapOptions = useMemo(() => {
    return taps.filter((tap) => tap.isActive).map((tap) => tap.kode);
  }, [taps]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupForm, setSetupForm] = useState({
    nama: '',
    username: '',
    password: '',
    confirmPassword: '',
    tap: '',
  });

  const needsSetup = hasHydrated && !hasSetup;

  useEffect(() => {
    hydrateFromServer();
  }, [hydrateFromServer]);

  useEffect(() => {
    if (!hasHydrated || !user) return;
    router.push(user.mustChangePassword ? '/change-password' : '/dashboard');
  }, [hasHydrated, router, user]);

  useEffect(() => {
    if (setupTapOptions.length === 0) return;
    if (setupTapOptions.includes(setupForm.tap)) return;
    setSetupForm((prev) => ({ ...prev, tap: setupTapOptions[0] }));
  }, [setupForm.tap, setupTapOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Username dan password wajib diisi'); return; }
    setIsLoading(true);
    const loggedInUser = await authenticateUser(username, password);
    setIsLoading(false);
    if (!loggedInUser) { setError('Username atau password salah'); return; }
    router.push(loggedInUser.mustChangePassword ? '/change-password' : '/dashboard');
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!setupForm.nama || !setupForm.username || !setupForm.password || !setupForm.tap) {
      setError('Semua field setup wajib diisi');
      return;
    }
    if (setupForm.password.length < 8) {
      setError('Password admin minimal 8 karakter');
      return;
    }
    if (setupForm.password !== setupForm.confirmPassword) {
      setError('Konfirmasi password admin tidak cocok');
      return;
    }
    const ok = await initializeAdmin({
      nama: setupForm.nama,
      username: setupForm.username,
      password: setupForm.password,
      tap: setupForm.tap,
    });
    if (!ok) {
      setError('Inisialisasi aplikasi gagal');
      return;
    }
    setError('');
    router.push('/dashboard');
  };

  if (!hasHydrated) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-secondary to-slate-800 px-4 py-8">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm lg:max-w-4xl lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
        {/* Left side - branding (visible on desktop) */}
        <div className="hidden lg:block">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-xl mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><circle cx="17.5" cy="17.5" r="3.5"/>
            </svg>
          </div>
          <h1 className="text-white text-4xl font-bold tracking-tight">SalesTrack</h1>
          <p className="text-white/60 text-lg mt-2 max-w-md">Platform pencatatan dan pengelolaan penjualan produk telekomunikasi untuk tim Salesforce.</p>
          <div className="mt-8 space-y-3">
            {['Real-time dashboard per TAP', 'Input penjualan via mobile', 'Export laporan Excel'].map(f => (
              <div key={f} className="flex items-center gap-3 text-white/50">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E3000F" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                <span className="text-body">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - login form */}
        <div>
          {/* Logo (mobile only) */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark mx-auto flex items-center justify-center shadow-xl mb-5">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><circle cx="17.5" cy="17.5" r="3.5"/>
              </svg>
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">SalesTrack</h1>
            <p className="text-white/50 text-body mt-1">Platform Input Penjualan Telko</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
            <h2 className="text-h2 text-text-primary text-center mb-6">
              {needsSetup ? 'Setup Admin Awal' : 'Masuk ke Akun'}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-error text-caption flex items-center gap-2 animate-scale-in">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {error}
              </div>
            )}

            {needsSetup ? (
              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="form-label">Nama Admin</label>
                  <input type="text" value={setupForm.nama} onChange={(e) => setSetupForm((prev) => ({ ...prev, nama: e.target.value }))} placeholder="Nama lengkap admin" className="input-field" />
                </div>
                <div>
                  <label className="form-label">Username Admin</label>
                  <input type="text" value={setupForm.username} onChange={(e) => setSetupForm((prev) => ({ ...prev, username: e.target.value }))} placeholder="Username login" className="input-field" autoComplete="username" />
                </div>
                <div>
                  <label className="form-label">TAP Utama</label>
                  <select value={setupForm.tap} onChange={(e) => setSetupForm((prev) => ({ ...prev, tap: e.target.value }))} className="input-field" disabled={setupTapOptions.length === 0}>
                    {setupTapOptions.length === 0 && <option value="">Belum ada TAP aktif</option>}
                    {setupTapOptions.map((tap) => <option key={tap} value={tap}>{tap}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Password Admin</label>
                  <input type="password" value={setupForm.password} onChange={(e) => setSetupForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Minimal 8 karakter" className="input-field" />
                </div>
                <div>
                  <label className="form-label">Konfirmasi Password</label>
                  <input type="password" value={setupForm.confirmPassword} onChange={(e) => setSetupForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Ulangi password admin" className="input-field" />
                </div>
                <button type="submit" className="btn-primary w-full disabled:opacity-60" disabled={setupTapOptions.length === 0}>Simpan Setup Awal</button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="form-label">Username</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </span>
                    <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Masukkan username" className="input-field pl-11" autoComplete="username" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="form-label">Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </span>
                    <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" className="input-field pl-11 pr-11" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-secondary transition-colors">
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  {isLoading ? (
                    <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Memproses...</>
                  ) : 'MASUK'}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-white/30 text-caption mt-6">SalesTrack v1.0.0 — © abay,2026</p>
        </div>
      </div>
    </div>
  );
}
