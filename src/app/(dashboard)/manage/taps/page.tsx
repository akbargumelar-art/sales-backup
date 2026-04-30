'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { downloadCsv, findDuplicateValues, getCsvValue, parseBoolean, parseCsv } from '@/lib/csv';
import type { Tap } from '@/types';

type TapFormPayload = {
  kode: string;
  nama: string;
  isActive: boolean;
};

type TapImportRow = TapFormPayload;

const tapCsvHeaders = ['kode', 'nama', 'isActive'];

const normalizeTapCodePreview = (value: string) => value
  .toUpperCase()
  .replace(/[^A-Z0-9-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const normalizeTapCodeForImport = (value: string) => {
  const normalized = normalizeTapCodePreview(value);
  return normalized && !normalized.startsWith('TAP-') ? `TAP-${normalized}` : normalized;
};

export default function ManageTapsPage() {
  const { user, taps, users, outlets, showToast, addTap, updateTap, toggleTapActive } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTap, setEditingTap] = useState<Tap | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<TapImportRow[]>([]);

  const tapUsage = useMemo(() => {
    const counts: Record<string, { users: number; outlets: number }> = {};
    taps.forEach((tap) => {
      counts[tap.kode] = { users: 0, outlets: 0 };
    });
    users.forEach((item) => {
      counts[item.tap] = counts[item.tap] ?? { users: 0, outlets: 0 };
      counts[item.tap].users += 1;
    });
    outlets.forEach((item) => {
      counts[item.tap] = counts[item.tap] ?? { users: 0, outlets: 0 };
      counts[item.tap].outlets += 1;
    });
    return counts;
  }, [outlets, taps, users]);

  const filteredTaps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return taps
      .filter((tap) => !q || tap.kode.toLowerCase().includes(q) || tap.nama.toLowerCase().includes(q))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.kode.localeCompare(b.kode));
  }, [searchQuery, taps]);

  const activeCount = taps.filter((tap) => tap.isActive).length;

  const handleToggle = async (tap: Tap) => {
    const ok = await toggleTapActive(tap.id);
    showToast(ok ? 'Status TAP berhasil diperbarui' : 'Status TAP gagal diperbarui', ok ? 'success' : 'error');
  };

  const handleCreate = async (payload: TapFormPayload) => {
    const result = await addTap(payload);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    setIsCreating(false);
    showToast(result.message, 'success');
  };

  const handleUpdate = async (payload: TapFormPayload) => {
    if (!editingTap) return;
    const result = await updateTap(editingTap.id, payload);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    setEditingTap(null);
    showToast(result.message, 'success');
  };

  const handleDownloadData = () => {
    if (filteredTaps.length === 0) {
      showToast('Tidak ada data TAP untuk didownload', 'warning');
      return;
    }
    downloadCsv(
      `tap-${new Date().toISOString().slice(0, 10)}.csv`,
      tapCsvHeaders,
      filteredTaps.map((tap) => [tap.kode, tap.nama, tap.isActive]),
    );
    showToast('Download data TAP berhasil', 'success');
  };

  const handleDownloadTemplate = () => {
    downloadCsv('template-tap.csv', tapCsvHeaders, [
      ['TAP-CONTOH', 'TAP Contoh', true],
    ]);
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

    const parsed = rows.map((row) => ({
      kode: normalizeTapCodeForImport(getCsvValue(row, ['kode', 'kodeTap', 'kode tap', 'tap', 'idTap', 'id tap'])),
      nama: getCsvValue(row, ['nama', 'namaTap', 'nama tap', 'name']).trim(),
      isActive: parseBoolean(getCsvValue(row, ['isActive', 'is active', 'aktif', 'status', 'statusAktif', 'status aktif']), true),
    })).filter((row) => row.kode && row.nama);

    if (parsed.length === 0) {
      showToast('Tidak ada data TAP yang terbaca', 'error');
      return;
    }
    const duplicateCodes = findDuplicateValues(parsed.map((row) => row.kode));
    if (duplicateCodes.length > 0) {
      showToast(`Kode TAP duplikat di file: ${duplicateCodes.slice(0, 3).join(', ')}`, 'error');
      return;
    }
    setImportRows(parsed);
    setShowImport(true);
  };

  const confirmImport = async () => {
    const failures: string[] = [];
    for (const row of importRows) {
      const existing = taps.find((tap) => tap.kode.toUpperCase() === row.kode.toUpperCase());
      const result = existing ? await updateTap(existing.id, row) : await addTap(row);
      if (!result.ok) failures.push(`${row.kode}: ${result.message}`);
    }

    if (failures.length > 0) {
      showToast(`${failures.length} baris gagal. ${failures[0]}`, 'error');
      return;
    }
    setShowImport(false);
    setImportRows([]);
    showToast(`${importRows.length} TAP berhasil diupload`, 'success');
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-4 animate-fade-in">
        <div className="card p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E3000F" strokeWidth="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          </div>
          <h2 className="text-h2 text-text-primary">Akses Ditolak</h2>
          <p className="text-body text-text-secondary mt-1">Kelola TAP hanya tersedia untuk Super Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b border-border px-4 py-3 sticky top-[52px] lg:top-[53px] z-20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-h2 text-text-primary">Kelola TAP</h2>
            <p className="text-caption text-text-secondary">{activeCount} aktif dari {taps.length} TAP</p>
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
            <button onClick={() => setIsCreating(true)} className="px-3 py-2 rounded-xl bg-primary text-white text-caption font-semibold flex items-center gap-1.5 hover:bg-primary-dark transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah TAP
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total TAP" value={taps.length} tone="slate" />
          <StatCard label="TAP Aktif" value={activeCount} tone="green" />
          <StatCard label="User Terhubung" value={users.length} tone="blue" />
          <StatCard label="Outlet Terhubung" value={outlets.length} tone="amber" />
        </div>

        <div className="card p-3">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari kode atau nama TAP..." className="input-field pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          {filteredTaps.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-body text-text-secondary">Tidak ada TAP ditemukan.</p>
            </div>
          ) : filteredTaps.map((tap) => {
            const usage = tapUsage[tap.kode] ?? { users: 0, outlets: 0 };
            return (
              <div key={tap.id} className="card p-4 border border-transparent hover:border-primary/20 transition-all">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tap.isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-body font-semibold text-text-primary">{tap.kode}</h3>
                      <span className={`badge text-[10px] ${tap.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>{tap.isActive ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                    <p className="text-caption text-text-secondary mt-0.5">{tap.nama}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-text-secondary">
                      <span>{usage.users} user</span>
                      <span>{usage.outlets} outlet</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditingTap(tap)} className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-primary transition-colors" title="Edit TAP">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => handleToggle(tap)} className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-colors ${tap.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                      {tap.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isCreating && (
        <TapModal
          title="Tambah TAP"
          onClose={() => setIsCreating(false)}
          onSave={handleCreate}
        />
      )}

      {editingTap && (
        <TapModal
          title="Edit TAP"
          tap={editingTap}
          onClose={() => setEditingTap(null)}
          onSave={handleUpdate}
        />
      )}

      {showImport && (
        <div className="overlay" onClick={() => setShowImport(false)}>
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-2xl lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
            <h3 className="text-h2 text-text-primary mb-1">Preview Upload TAP</h3>
            <p className="text-caption text-text-secondary mb-4">{importRows.length} baris siap diupload</p>
            <div className="space-y-2">
              {importRows.map((row, index) => (
                <div key={`${row.kode}-${index}`} className="rounded-xl border border-border p-3">
                  <p className="text-body font-semibold text-text-primary">{row.kode}</p>
                  <p className="text-caption text-text-secondary">{row.nama} - {row.isActive ? 'Aktif' : 'Nonaktif'}</p>
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
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'green' | 'blue' | 'amber' }) {
  const toneClass = {
    slate: 'bg-slate-50 text-slate-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-2xl p-4 ${toneClass}`}>
      <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function TapModal({ title, tap, onClose, onSave }: {
  title: string;
  tap?: Tap;
  onClose: () => void;
  onSave: (payload: TapFormPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<TapFormPayload>({
    kode: tap?.kode ?? '',
    nama: tap?.nama ?? '',
    isActive: tap?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    const kode = normalizeTapCodePreview(form.kode);
    if (!kode || !form.nama.trim()) {
      setError('Kode dan nama TAP wajib diisi');
      return;
    }
    setError('');
    setIsSaving(true);
    await onSave({ kode, nama: form.nama.trim(), isActive: form.isActive });
    setIsSaving(false);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-lg lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
        <h3 className="text-h2 text-text-primary mb-1">{title}</h3>
        <p className="text-caption text-text-secondary mb-4">Kode TAP boleh diubah. Sistem akan ikut memperbarui user dan outlet yang memakai kode lama.</p>

        {error && <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-error text-caption">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="form-label">Kode TAP</label>
            <input type="text" value={form.kode} onChange={(e) => setForm((prev) => ({ ...prev, kode: normalizeTapCodePreview(e.target.value) }))} placeholder="Contoh: TAP-CIREBON" className="input-field" />
            <p className="text-[10px] text-text-secondary mt-1">Jika isi CIREBON, sistem akan menyimpan sebagai TAP-CIREBON.</p>
          </div>
          <div>
            <label className="form-label">Nama TAP</label>
            <input type="text" value={form.nama} onChange={(e) => setForm((prev) => ({ ...prev, nama: e.target.value }))} placeholder="Contoh: Cirebon" className="input-field" />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface">
            <div>
              <span className="text-body text-text-primary font-medium">Status Aktif</span>
              <p className="text-[10px] text-text-secondary">TAP aktif muncul di pilihan user, outlet, dan setup awal.</p>
            </div>
            <button onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))} className={`w-10 h-6 rounded-full transition-colors relative ${form.isActive ? 'bg-success' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${form.isActive ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost border border-border py-3 rounded-xl font-semibold" disabled={isSaving}>Batal</button>
          <button onClick={handleSubmit} className="btn-primary disabled:opacity-60" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </div>
    </div>
  );
}
