'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getViewableTaps } from '@/lib/app-data';
import { downloadCsv, findDuplicateValues, getCsvValue, parseBoolean, parseCsv } from '@/lib/csv';
import type { User } from '@/types';

type UserImportRow = {
  nama: string;
  username: string;
  password: string;
  role: User['role'];
  tap: string;
  allowedTaps: string[];
  isActive: boolean;
  mustChangePassword: boolean;
};

const userCsvHeaders = ['nama', 'username', 'password', 'role', 'tap', 'allowedTaps', 'isActive', 'mustChangePassword'];

const normalizeUserRole = (value: string | undefined): User['role'] => {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN' || normalized === 'SALESFORCE') return normalized;
  if (['SF', 'SALES', 'SALES_FORCE', 'SALES_FORCE_USER'].includes(normalized)) return 'SALESFORCE';
  return 'SALESFORCE';
};

const parseAllowedTaps = (value: string | undefined, tap: string, role: User['role']) => {
  if (role === 'SALESFORCE') return [tap];
  const taps = String(value ?? '')
    .split(/[;,|]/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  if (taps.includes('ALL')) return ['ALL'];
  return taps.length > 0 ? Array.from(new Set(taps)) : [tap];
};

export default function ManageSalesforcePage() {
  const { user: currentUser, users, taps, showToast, addUser, updateUser, resetUserPassword } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTap, setFilterTap] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [showTapDropdown, setShowTapDropdown] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<UserImportRow[]>([]);
  // Reset password state
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isSuper = currentUser?.role === 'SUPER_ADMIN';
  const viewableTaps = useMemo(() => currentUser ? getViewableTaps(currentUser) : [], [currentUser]);
  const activeTapCodes = useMemo(() => taps.filter((tap) => tap.isActive).map((tap) => tap.kode), [taps]);
  const assignableTaps = activeTapCodes.length > 0 ? activeTapCodes : viewableTaps;
  const scopedAssignableTaps = currentUser?.role === 'SUPER_ADMIN' ? assignableTaps : viewableTaps.filter((tap) => assignableTaps.includes(tap));
  const createTapOptions = scopedAssignableTaps.length > 0 ? scopedAssignableTaps : (currentUser ? [currentUser.tap] : []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (!isSuper && currentUser) {
        if (!currentUser.allowedTaps.includes('ALL') && !currentUser.allowedTaps.includes(u.tap)) return false;
      }
      if (filterTap !== 'ALL' && u.tap !== filterTap) return false;
      if (filterRole !== 'ALL' && u.role !== filterRole) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return u.nama.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.tap.toLowerCase().includes(q);
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTap, filterRole, searchQuery, currentUser, isSuper]);

  const getRoleBadgeClass = (role: string) => {
    switch(role) {
      case 'SUPER_ADMIN': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'ADMIN': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'SALESFORCE': return 'bg-green-50 text-green-700 border border-green-200';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const handleResetPassword = (target: User) => {
    setResetTarget(target);
    setResetResult(null);
    setCopied(false);
  };

  const confirmReset = async () => {
    if (!resetTarget || !currentUser) return;
    const result = await resetUserPassword(resetTarget.id, currentUser.role, currentUser.id);
    if (result) {
      setResetResult(result.newPassword);
    } else {
      showToast('Tidak dapat mereset password user ini', 'error');
      setResetTarget(null);
    }
  };

  const handleCopy = () => {
    if (resetResult) {
      navigator.clipboard.writeText(resetResult).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const closeResetModal = () => {
    setResetTarget(null);
    setResetResult(null);
    setCopied(false);
    if (resetResult) showToast('Password berhasil direset. User wajib ganti password saat login.', 'success');
  };

  // Can the current user reset this target's password?
  const canReset = (target: User) => {
    if (!currentUser) return false;
    if (target.id === currentUser.id) return false; // can't reset own
    if (currentUser.role === 'SUPER_ADMIN') return true;
    if (currentUser.role === 'ADMIN') return target.role === 'SALESFORCE';
    return false;
  };

  const handleDownloadData = () => {
    if (filteredUsers.length === 0) {
      showToast('Tidak ada data user untuk didownload', 'warning');
      return;
    }
    downloadCsv(
      `salesforce-${new Date().toISOString().slice(0, 10)}.csv`,
      userCsvHeaders,
      filteredUsers.map((item) => [
        item.nama,
        item.username,
        '',
        item.role,
        item.tap,
        item.allowedTaps.join(';'),
        item.isActive,
        item.mustChangePassword,
      ]),
    );
    showToast('Download data user berhasil', 'success');
  };

  const handleDownloadTemplate = () => {
    const sampleTap = createTapOptions[0] ?? currentUser?.tap ?? 'TAP-CONTOH';
    const rows: (string | boolean)[][] = [
      ['Budi Salesforce', 'budi.sf', 'Password123', 'SALESFORCE', sampleTap, sampleTap, true, true],
    ];
    if (isSuper) rows.push(['Admin Area', 'admin.area', 'Password123', 'ADMIN', sampleTap, sampleTap, true, true]);
    downloadCsv('template-salesforce.csv', userCsvHeaders, rows);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      showToast('File import kosong atau tidak valid', 'error');
      return;
    }

    const parsed = rows.map((row) => {
      const role = normalizeUserRole(getCsvValue(row, ['role', 'jabatan', 'tipeUser', 'tipe user', 'hakAkses', 'hak akses']));
      const tap = getCsvValue(row, ['tap', 'homeTap', 'home tap', 'kodeTap', 'kode tap'], currentUser?.tap ?? '').trim();
      return {
        nama: getCsvValue(row, ['nama', 'namaLengkap', 'nama lengkap', 'name', 'fullName', 'full name']).trim(),
        username: getCsvValue(row, ['username', 'userName', 'user name', 'login', 'idLogin', 'id login']).trim().toLowerCase(),
        password: getCsvValue(row, ['password', 'passwordSementara', 'password sementara', 'pass']).trim(),
        role,
        tap,
        allowedTaps: parseAllowedTaps(getCsvValue(row, ['allowedTaps', 'allowed taps', 'aksesTap', 'akses tap', 'tapAkses', 'tap akses']), tap, role),
        isActive: parseBoolean(getCsvValue(row, ['isActive', 'is active', 'aktif', 'status', 'statusAktif', 'status aktif']), true),
        mustChangePassword: parseBoolean(getCsvValue(row, ['mustChangePassword', 'must change password', 'wajibGantiPassword', 'wajib ganti password', 'gantiPassword', 'ganti password']), true),
      };
    }).filter((row) => row.nama && row.username && row.tap);

    if (parsed.length === 0) {
      showToast('Tidak ada data user yang terbaca', 'error');
      return;
    }
    const duplicateUsernames = findDuplicateValues(parsed.map((row) => row.username));
    if (duplicateUsernames.length > 0) {
      showToast(`Username duplikat di file: ${duplicateUsernames.slice(0, 3).join(', ')}`, 'error');
      return;
    }
    setImportRows(parsed);
    setShowImport(true);
  };

  const confirmImport = async () => {
    const failures: string[] = [];
    for (const row of importRows) {
      const existing = users.find((item) => item.username.toLowerCase() === row.username.toLowerCase());
      if (!isSuper && (row.role !== 'SALESFORCE' || (existing && existing.role !== 'SALESFORCE'))) {
        failures.push(`${row.username}: admin hanya bisa mengelola user Salesforce`);
        continue;
      }

      const payload = {
        nama: row.nama,
        username: row.username,
        role: row.role,
        tap: row.tap,
        allowedTaps: row.allowedTaps,
        isActive: row.isActive,
      };

      const result = existing
        ? await updateUser(existing.id, payload)
        : row.password
          ? await addUser({ ...payload, password: row.password, mustChangePassword: row.mustChangePassword })
          : { ok: false, message: 'Password wajib diisi untuk user baru' };

      if (!result.ok) failures.push(`${row.username}: ${result.message}`);
    }

    if (failures.length > 0) {
      showToast(`${failures.length} baris gagal. ${failures[0]}`, 'error');
      return;
    }
    setShowImport(false);
    setImportRows([]);
    showToast(`${importRows.length} user berhasil diupload`, 'success');
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b border-border px-4 py-3 sticky top-[52px] lg:top-[53px] z-20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-h2 text-text-primary">Kelola Salesforce</h2>
            <p className="text-caption text-text-secondary">{filteredUsers.length} pengguna</p>
          </div>
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button onClick={handleDownloadTemplate} className="px-3 py-2 rounded-xl bg-surface text-text-secondary text-caption font-semibold hover:bg-slate-100 transition-colors">
              Template CSV
            </button>
            <button onClick={handleDownloadData} className="px-3 py-2 rounded-xl bg-success/10 text-success text-caption font-semibold hover:bg-success/20 transition-colors">
              Download Data
            </button>
            <label className="px-3 py-2 rounded-xl bg-surface text-text-secondary text-caption font-semibold cursor-pointer hover:bg-slate-100 transition-colors">
              Upload Data
              <input type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
            </label>
            <button onClick={() => { setCreatingUser(true); setShowEditModal(false); }} className="px-3 py-2 rounded-xl bg-primary text-white text-caption font-semibold flex items-center gap-1.5 hover:bg-primary-dark transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah User
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama, username, atau TAP..." className="input-field pl-10" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <button onClick={() => setShowTapDropdown(!showTapDropdown)}
              className={`px-3 py-1.5 rounded-lg text-caption font-medium flex items-center gap-1.5 transition-colors ${filterTap !== 'ALL' ? 'bg-primary/10 text-primary' : 'bg-surface text-text-secondary hover:bg-slate-100'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {filterTap === 'ALL' ? 'Semua TAP' : filterTap.replace('TAP-', '')}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showTapDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowTapDropdown(false)} />
                <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border min-w-[160px] z-40 animate-scale-in overflow-hidden">
                  <button onClick={() => { setFilterTap('ALL'); setShowTapDropdown(false); }} className={`w-full text-left px-3 py-2 text-body hover:bg-surface transition-colors ${filterTap === 'ALL' ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>Semua TAP</button>
                  {viewableTaps.map(tap => (
                    <button key={tap} onClick={() => { setFilterTap(tap); setShowTapDropdown(false); }} className={`w-full text-left px-3 py-2 text-body hover:bg-surface transition-colors border-t border-border/50 ${filterTap === tap ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>
                      {tap.replace('TAP-', '')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {['ALL', 'SALESFORCE', 'ADMIN', 'SUPER_ADMIN'].map(role => (
            <button key={role} onClick={() => setFilterRole(role)}
              className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-colors ${filterRole === role ? 'bg-primary/10 text-primary' : 'bg-surface text-text-secondary hover:bg-slate-100'}`}>
              {role === 'ALL' ? 'Semua Role' : role.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* User list */}
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-surface mx-auto flex items-center justify-center mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <p className="text-body text-text-secondary">Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            filteredUsers.map(u => (
              <div key={u.id} className="card p-3.5 border border-transparent hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${u.isActive ? 'bg-gradient-to-br from-primary to-accent' : 'bg-slate-300'}`}>
                    <span className="text-white font-bold text-caption">{u.nama.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-body font-semibold text-text-primary truncate">{u.nama}</p>
                      <span className={`badge text-[10px] ${getRoleBadgeClass(u.role)}`}>{u.role.replace('_', ' ')}</span>
                      {u.mustChangePassword && (
                        <span className="badge text-[10px] bg-amber-50 text-amber-700 border border-amber-200">Ganti PW</span>
                      )}
                    </div>
                    <p className="text-caption text-text-secondary mt-0.5">@{u.username}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-text-secondary flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {u.tap}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        Akses: {u.allowedTaps.includes('ALL') ? 'Semua TAP' : u.allowedTaps.join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-success' : 'bg-slate-300'}`} />
                    {/* Reset Password button */}
                    {canReset(u) && (
                      <button
                        onClick={() => handleResetPassword(u)}
                        title="Reset Password"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-text-secondary hover:text-amber-600 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><line x1="12" y1="15" x2="12" y2="17"/></svg>
                      </button>
                    )}
                    <button onClick={() => { setEditingUser(u); setShowEditModal(true); }} className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-primary transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          tapOptions={Array.from(new Set([editingUser.tap, ...viewableTaps]))}
          isSuper={isSuper}
          onClose={() => setShowEditModal(false)}
          onSave={async (payload) => {
            const result = await updateUser(editingUser.id, payload);
            if (!result.ok) {
              showToast(result.message, 'error');
              return;
            }
            setShowEditModal(false);
            showToast(result.message, 'success');
          }}
        />
      )}

      {creatingUser && currentUser && (
        <CreateUserModal
          tapOptions={createTapOptions}
          isSuper={isSuper}
          defaultTap={createTapOptions.includes(currentUser.tap) ? currentUser.tap : (createTapOptions[0] ?? currentUser.tap)}
          onClose={() => setCreatingUser(false)}
          onSave={async (payload) => {
            const result = await addUser(payload);
            if (!result.ok) {
              showToast(result.message, 'error');
              return;
            }
            setCreatingUser(false);
            showToast(result.message, 'success');
          }}
        />
      )}

      {showImport && (
        <div className="overlay" onClick={() => setShowImport(false)}>
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-2xl lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
            <h3 className="text-h2 text-text-primary mb-1">Preview Upload User</h3>
            <p className="text-caption text-text-secondary mb-4">{importRows.length} baris siap diupload</p>
            <div className="space-y-2">
              {importRows.map((row, index) => (
                <div key={`${row.username}-${index}`} className="rounded-xl border border-border p-3">
                  <p className="text-body font-semibold text-text-primary">{row.nama}</p>
                  <p className="text-caption text-text-secondary">@{row.username} - {row.role.replace('_', ' ')} - {row.tap}</p>
                  <p className="text-caption text-text-secondary">Akses: {row.allowedTaps.includes('ALL') ? 'Semua TAP' : row.allowedTaps.join(', ')}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setShowImport(false)} className="btn-ghost border border-border py-3 rounded-xl font-semibold">Batal</button>
              <button onClick={confirmImport} className="btn-primary">Upload Sekarang</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="overlay" onClick={!resetResult ? closeResetModal : undefined}>
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-md lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />

            {!resetResult ? (
              /* Confirm reset */
              <>
                <div className="w-12 h-12 rounded-full bg-amber-50 mx-auto flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </div>
                <h3 className="text-h2 text-text-primary text-center mb-1">Reset Password</h3>
                <p className="text-caption text-text-secondary text-center mb-1">
                  Reset password untuk <strong>{resetTarget.nama}</strong>?
                </p>
                <p className="text-[11px] text-amber-600 text-center bg-amber-50 rounded-xl px-3 py-2 mb-5">
                  ⚠️ Password lama akan diganti dengan password sementara. User wajib mengganti password saat login berikutnya.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={closeResetModal} className="btn-ghost border border-border py-3 rounded-xl font-semibold">Batal</button>
                  <button onClick={confirmReset} className="py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors">Ya, Reset</button>
                </div>
              </>
            ) : (
              /* Show new password */
              <>
                <div className="w-12 h-12 rounded-full bg-success/10 mx-auto flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="text-h2 text-text-primary text-center mb-1">Password Direset!</h3>
                <p className="text-caption text-text-secondary text-center mb-4">
                  Password sementara untuk <strong>{resetTarget.nama}</strong>:
                </p>
                {/* Password display box */}
                <div className="bg-slate-900 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
                  <span className="font-mono text-lg font-bold text-white tracking-widest">{resetResult}</span>
                  <button
                    onClick={handleCopy}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-caption font-medium transition-colors ${copied ? 'bg-success text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {copied ? '✓ Disalin' : 'Salin'}
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary text-center mb-5">
                  Berikan password ini kepada <strong>{resetTarget.nama}</strong>. Mereka akan diminta membuat password baru saat login.
                </p>
                <button onClick={closeResetModal} className="btn-primary w-full">Selesai</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditUserModal({ user, tapOptions, isSuper, onClose, onSave }: {
  user: User; tapOptions: string[]; isSuper: boolean;
  onClose: () => void; onSave: (payload: {
    nama: string;
    username: string;
    tap: string;
    role: User['role'];
    allowedTaps: string[];
    isActive: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    nama: user.nama,
    username: user.username,
    tap: user.tap,
    role: user.role,
    allowedTaps: [...user.allowedTaps],
    isActive: user.isActive,
  });

  const toggleTapAccess = (tap: string) => {
    setForm(prev => {
      if (tap === 'ALL') {
        return { ...prev, allowedTaps: prev.allowedTaps.includes('ALL') ? [prev.tap] : ['ALL'] };
      }
      const current = prev.allowedTaps.filter(t => t !== 'ALL');
      if (current.includes(tap)) {
        const updated = current.filter(t => t !== tap);
        return { ...prev, allowedTaps: updated.length === 0 ? [prev.tap] : updated };
      }
      return { ...prev, allowedTaps: [...current, tap] };
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-lg lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
        <h3 className="text-h2 text-text-primary mb-4">Edit Pengguna</h3>

        <div className="space-y-3">
          <div>
            <label className="form-label">Nama Lengkap</label>
            <input type="text" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="form-label">Username</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Home TAP</label>
              <select value={form.tap} onChange={e => setForm({...form, tap: e.target.value})} className="input-field">
                {tapOptions.map(t => <option key={t} value={t}>{t.replace('TAP-', '')}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value as any})} className="input-field" disabled={!isSuper}>
                <option value="SALESFORCE">Salesforce</option>
                <option value="ADMIN">Admin</option>
                {isSuper && <option value="SUPER_ADMIN">Super Admin</option>}
              </select>
            </div>
          </div>

          {isSuper && form.role !== 'SALESFORCE' && (
            <div>
              <label className="form-label">Akses TAP</label>
              <p className="text-[10px] text-text-secondary mb-2">Pilih TAP yang bisa diakses user ini</p>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" checked={form.allowedTaps.includes('ALL')} onChange={() => toggleTapAccess('ALL')} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-body font-medium text-text-primary">Semua TAP</span>
                </label>
                {!form.allowedTaps.includes('ALL') && tapOptions.map(tap => (
                  <label key={tap} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface cursor-pointer hover:bg-slate-100 transition-colors">
                    <input type="checkbox" checked={form.allowedTaps.includes(tap)} onChange={() => toggleTapAccess(tap)} className="w-4 h-4 rounded accent-primary" />
                    <span className="text-body text-text-primary">{tap}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface">
            <span className="text-body text-text-primary">Status Aktif</span>
            <button onClick={() => setForm({...form, isActive: !form.isActive})}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.isActive ? 'bg-success' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${form.isActive ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost border border-border py-3 rounded-xl font-semibold">Batal</button>
          <button onClick={() => onSave(form)} className="btn-primary">Simpan</button>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({
  tapOptions,
  isSuper,
  defaultTap,
  onClose,
  onSave,
}: {
  tapOptions: string[];
  isSuper: boolean;
  defaultTap: string;
  onClose: () => void;
  onSave: (payload: {
    nama: string;
    username: string;
    password: string;
    role: User['role'];
    tap: string;
    allowedTaps: string[];
    isActive: boolean;
    mustChangePassword: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    nama: '',
    username: '',
    password: '',
    role: 'SALESFORCE' as User['role'],
    tap: defaultTap,
    allowedTaps: [defaultTap],
    isActive: true,
    mustChangePassword: true,
  });

  const toggleTapAccess = (tap: string) => {
    setForm((prev) => {
      if (tap === 'ALL') return { ...prev, allowedTaps: prev.allowedTaps.includes('ALL') ? [prev.tap] : ['ALL'] };
      const current = prev.allowedTaps.filter((item) => item !== 'ALL');
      if (current.includes(tap)) {
        const next = current.filter((item) => item !== tap);
        return { ...prev, allowedTaps: next.length > 0 ? next : [prev.tap] };
      }
      return { ...prev, allowedTaps: [...current, tap] };
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-lg lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
        <h3 className="text-h2 text-text-primary mb-4">Tambah Pengguna</h3>
        <div className="space-y-3">
          <div>
            <label className="form-label">Nama Lengkap</label>
            <input type="text" value={form.nama} onChange={(e) => setForm((prev) => ({ ...prev, nama: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="form-label">Username</label>
            <input type="text" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="form-label">Password Sementara</label>
            <input type="text" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Home TAP</label>
              <select value={form.tap} onChange={(e) => setForm((prev) => ({ ...prev, tap: e.target.value, allowedTaps: prev.role === 'SALESFORCE' ? [e.target.value] : prev.allowedTaps }))} className="input-field">
                {tapOptions.map((tap) => <option key={tap} value={tap}>{tap}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Role</label>
              <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as User['role'], allowedTaps: e.target.value === 'SALESFORCE' ? [prev.tap] : prev.allowedTaps }))} className="input-field">
                <option value="SALESFORCE">Salesforce</option>
                <option value="ADMIN">Admin</option>
                {isSuper && <option value="SUPER_ADMIN">Super Admin</option>}
              </select>
            </div>
          </div>
          {form.role !== 'SALESFORCE' && (
            <div>
              <label className="form-label">Akses TAP</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface">
                  <input type="checkbox" checked={form.allowedTaps.includes('ALL')} onChange={() => toggleTapAccess('ALL')} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-body font-medium text-text-primary">Semua TAP</span>
                </label>
                {!form.allowedTaps.includes('ALL') && tapOptions.map((tap) => (
                  <label key={tap} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface">
                    <input type="checkbox" checked={form.allowedTaps.includes(tap)} onChange={() => toggleTapAccess(tap)} className="w-4 h-4 rounded accent-primary" />
                    <span className="text-body text-text-primary">{tap}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost border border-border py-3 rounded-xl font-semibold">Batal</button>
          <button onClick={() => onSave(form)} className="btn-primary">Simpan</button>
        </div>
      </div>
    </div>
  );
}
