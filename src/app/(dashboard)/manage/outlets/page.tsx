'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getVisibleOutlets, getViewableTaps } from '@/lib/app-data';
import { downloadCsv, findDuplicateValues, getCsvValue, parseBoolean, parseCsv } from '@/lib/csv';
import type { Outlet } from '@/types';

type OutletImportRow = {
  idOutlet: string;
  nomorRS: string;
  namaOutlet: string;
  tap: string;
  salesforceUsername: string;
  kabupaten: string;
  kecamatan: string;
  isManual: boolean;
};

const outletCsvHeaders = ['idOutlet', 'nomorRS', 'namaOutlet', 'tap', 'salesforceUsername', 'kabupaten', 'kecamatan', 'isManual'];

export default function ManageOutletsPage() {
  const { user, users, outlets, showToast, addOutlet, updateOutlet } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTap, setFilterTap] = useState<string>('ALL');
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<OutletImportRow[]>([]);

  const isAdminOrAbove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const viewableTaps = useMemo(() => user ? getViewableTaps(user) : [], [user]);
  const salesforceOptions = useMemo(() => users
    .filter((item) => item.role === 'SALESFORCE')
    .filter((item) => user?.role === 'SUPER_ADMIN' || user?.allowedTaps.includes('ALL') || user?.allowedTaps.includes(item.tap))
    .sort((a, b) => a.nama.localeCompare(b.nama)), [user, users]);
  const allOutlets = useMemo(() => {
    void outlets;
    return user ? getVisibleOutlets(user) : [];
  }, [user, outlets]);

  const filtered = useMemo(() => {
    return allOutlets.filter(o => {
      if (filterTap !== 'ALL' && o.tap !== filterTap) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return o.idOutlet.toLowerCase().includes(q) || o.namaOutlet.toLowerCase().includes(q) || o.salesforceUsername?.toLowerCase().includes(q) || o.kabupaten.toLowerCase().includes(q) || o.kecamatan.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allOutlets, filterTap, searchQuery]);

  const tapCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allOutlets.length };
    allOutlets.forEach(o => { counts[o.tap] = (counts[o.tap] || 0) + 1; });
    return counts;
  }, [allOutlets]);

  const handleDownloadData = () => {
    if (filtered.length === 0) {
      showToast('Tidak ada data outlet untuk didownload', 'warning');
      return;
    }
    downloadCsv(
      `outlet-${new Date().toISOString().slice(0, 10)}.csv`,
      outletCsvHeaders,
      filtered.map((outlet) => [
        outlet.idOutlet,
        outlet.nomorRS,
        outlet.namaOutlet,
        outlet.tap,
        outlet.salesforceUsername ?? '',
        outlet.kabupaten,
        outlet.kecamatan,
        outlet.isManual,
      ]),
    );
    showToast('Download data outlet berhasil', 'success');
  };

  const handleDownloadTemplate = () => {
    const sampleTap = viewableTaps[0] ?? user?.tap ?? 'TAP-CONTOH';
    const sampleSalesforce = salesforceOptions[0]?.username ?? 'username.salesforce';
    downloadCsv('template-outlet.csv', outletCsvHeaders, [
      ['OUT-001', 'RS-001', 'Outlet Contoh', sampleTap, sampleSalesforce, 'Bandung', 'Coblong', true],
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
      idOutlet: getCsvValue(row, ['idOutlet', 'id outlet', 'kodeOutlet', 'kode outlet', 'outletId', 'outlet id']).trim().toUpperCase(),
      nomorRS: getCsvValue(row, ['nomorRS', 'nomor rs', 'noRS', 'no rs', 'rs', 'kodeRS', 'kode rs']).trim(),
      namaOutlet: getCsvValue(row, ['namaOutlet', 'nama outlet', 'outlet', 'nama']).trim(),
      tap: getCsvValue(row, ['tap', 'kodeTap', 'kode tap', 'homeTap', 'home tap'], user?.tap ?? '').trim(),
      salesforceUsername: getCsvValue(row, ['salesforceUsername', 'salesforce username', 'usernameSalesforce', 'username salesforce', 'salesUsername', 'sales username', 'sfUsername', 'sf username', 'usernameSF', 'username sf']).trim().toLowerCase(),
      kabupaten: getCsvValue(row, ['kabupaten', 'kabupatenKota', 'kabupaten kota', 'kota', 'city']).trim(),
      kecamatan: getCsvValue(row, ['kecamatan', 'district']).trim(),
      isManual: parseBoolean(getCsvValue(row, ['isManual', 'is manual', 'manual', 'inputManual', 'input manual']), true),
    })).filter((row) => row.idOutlet && row.nomorRS && row.namaOutlet && row.tap && row.kabupaten && row.kecamatan);

    if (parsed.length === 0) {
      showToast('Tidak ada data outlet yang terbaca', 'error');
      return;
    }
    const duplicateIds = findDuplicateValues(parsed.map((row) => row.idOutlet));
    if (duplicateIds.length > 0) {
      showToast(`ID Outlet duplikat di file: ${duplicateIds.slice(0, 3).join(', ')}`, 'error');
      return;
    }
    const validSalesforceUsernames = new Set(users.filter((item) => item.role === 'SALESFORCE').map((item) => item.username.toLowerCase()));
    const unknownSalesforces = Array.from(new Set(parsed
      .map((row) => row.salesforceUsername)
      .filter((username) => username && !validSalesforceUsernames.has(username))));
    if (unknownSalesforces.length > 0) {
      showToast(`Username Salesforce tidak ditemukan: ${unknownSalesforces.slice(0, 3).join(', ')}`, 'error');
      return;
    }
    setImportRows(parsed);
    setShowImport(true);
  };

  const confirmImport = async () => {
    const failures: string[] = [];
    for (const row of importRows) {
      const existing = outlets.find((outlet) => outlet.idOutlet.toUpperCase() === row.idOutlet.toUpperCase());
      const payload = {
        idOutlet: row.idOutlet,
        nomorRS: row.nomorRS,
        namaOutlet: row.namaOutlet,
        tap: row.tap,
        salesforceUsername: row.salesforceUsername,
        kabupaten: row.kabupaten,
        kecamatan: row.kecamatan,
        isManual: row.isManual,
      };
      if (existing && !isAdminOrAbove) {
        failures.push(`${row.idOutlet}: hanya admin yang bisa memperbarui outlet`);
        continue;
      }
      const result = existing ? await updateOutlet(existing.id, payload) : await addOutlet(payload);
      if (!result.ok) failures.push(`${row.idOutlet}: ${result.message}`);
    }

    if (failures.length > 0) {
      showToast(`${failures.length} baris gagal. ${failures[0]}`, 'error');
      return;
    }
    setShowImport(false);
    setImportRows([]);
    showToast(`${importRows.length} outlet berhasil diupload`, 'success');
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b border-border px-4 py-3 sticky top-[52px] lg:top-[53px] z-20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-h2 text-text-primary">Kelola Outlet</h2>
            <p className="text-caption text-text-secondary">{filtered.length} outlet</p>
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
            <button onClick={() => { setEditingOutlet(null); setShowModal(true); }} className="px-3 py-2 rounded-xl bg-primary text-white text-caption font-semibold flex items-center gap-1.5 hover:bg-primary-dark transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Outlet
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari outlet, kabupaten, atau kecamatan..." className="input-field pl-10" />
        </div>

        {/* TAP filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => setFilterTap('ALL')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-caption font-medium transition-all ${filterTap === 'ALL' ? 'bg-primary/10 text-primary ring-2 ring-primary/20 ring-offset-1' : 'bg-surface text-text-secondary hover:bg-slate-100'}`}>
            Semua ({tapCounts.ALL || 0})
          </button>
          {viewableTaps.map(tap => (
            <button key={tap} onClick={() => setFilterTap(tap)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-caption font-medium transition-all ${filterTap === tap ? 'bg-primary/10 text-primary ring-2 ring-primary/20 ring-offset-1' : 'bg-surface text-text-secondary hover:bg-slate-100'}`}>
              {tap.replace('TAP-', '')} ({tapCounts[tap] || 0})
            </button>
          ))}
        </div>

        {/* Outlet list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-surface mx-auto flex items-center justify-center mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <p className="text-body text-text-secondary">Tidak ada outlet ditemukan</p>
            </div>
          ) : (
            filtered.map(outlet => (
              <div key={outlet.id} className="card p-3.5 border border-transparent hover:border-primary/20 transition-all">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${outlet.isManual ? 'bg-accent/10' : 'bg-primary/10'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={outlet.isManual ? '#FF6B00' : '#E3000F'} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-body font-semibold text-text-primary">{outlet.namaOutlet}</p>
                      {outlet.isManual && <span className="badge text-[9px] bg-accent/10 text-accent border border-accent/20">Manual</span>}
                    </div>
                    <p className="text-caption text-text-secondary mt-0.5">{outlet.idOutlet} • RS: {outlet.nomorRS}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">{outlet.salesforceUsername ? `@${outlet.salesforceUsername}` : 'Belum assign SF'}</span>
                      <span className="text-[10px] text-text-secondary flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {outlet.kabupaten}, {outlet.kecamatan}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-text-secondary">{outlet.tap.replace('TAP-', '')}</span>
                    </div>
                  </div>
                  <button onClick={() => { setEditingOutlet(outlet); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-primary transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && user && (
        <OutletModal
          outlet={editingOutlet}
          taps={user.role === 'SALESFORCE' ? [user.tap] : viewableTaps}
          defaultTap={editingOutlet?.tap ?? user.tap}
          salesforces={isAdminOrAbove ? salesforceOptions : []}
          currentUsername={user.username}
          onClose={() => setShowModal(false)}
          onSave={async (payload) => {
            const result = editingOutlet
              ? await updateOutlet(editingOutlet.id, payload)
              : await addOutlet(payload);
            if (!result.ok) {
              showToast(result.message, 'error');
              return;
            }
            showToast(result.message, 'success');
            setShowModal(false);
          }}
        />
      )}

      {showImport && (
        <div className="overlay" onClick={() => setShowImport(false)}>
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-2xl lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
            <h3 className="text-h2 text-text-primary mb-1">Preview Upload Outlet</h3>
            <p className="text-caption text-text-secondary mb-4">{importRows.length} baris siap diupload</p>
            <div className="space-y-2">
              {importRows.map((row, index) => (
                <div key={`${row.idOutlet}-${index}`} className="rounded-xl border border-border p-3">
                  <p className="text-body font-semibold text-text-primary">{row.namaOutlet}</p>
                  <p className="text-caption text-text-secondary">{row.idOutlet} - {row.nomorRS} - {row.tap}</p>
                  <p className="text-caption text-text-secondary">Salesforce: {row.salesforceUsername ? `@${row.salesforceUsername}` : 'Belum diisi'}</p>
                  <p className="text-caption text-text-secondary">{row.kabupaten}, {row.kecamatan}</p>
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

function OutletModal({
  outlet,
  taps,
  defaultTap,
  salesforces,
  currentUsername,
  onClose,
  onSave,
}: {
  outlet: Outlet | null;
  taps: string[];
  defaultTap: string;
  salesforces: Array<{ username: string; nama: string; tap: string }>;
  currentUsername: string;
  onClose: () => void;
  onSave: (payload: {
    idOutlet: string;
    nomorRS: string;
    namaOutlet: string;
    tap: string;
    salesforceUsername?: string;
    kabupaten: string;
    kecamatan: string;
    isManual: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    idOutlet: outlet?.idOutlet ?? '',
    nomorRS: outlet?.nomorRS ?? '',
    namaOutlet: outlet?.namaOutlet ?? '',
    tap: outlet?.tap ?? defaultTap,
    salesforceUsername: outlet?.salesforceUsername ?? '',
    kabupaten: outlet?.kabupaten ?? '',
    kecamatan: outlet?.kecamatan ?? '',
    isManual: outlet?.isManual ?? true,
  });
  const assignableSalesforces = salesforces.filter((salesforce) => salesforce.tap === form.tap || salesforce.username === form.salesforceUsername);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-lg lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
        <h3 className="text-h2 text-text-primary mb-4">{outlet ? 'Edit Outlet' : 'Tambah Outlet'}</h3>
        <div className="space-y-3">
          <div>
            <label className="form-label">ID Outlet</label>
            <input type="text" value={form.idOutlet} onChange={(e) => setForm((prev) => ({ ...prev, idOutlet: e.target.value.toUpperCase() }))} className="input-field" />
          </div>
          <div>
            <label className="form-label">Nomor RS</label>
            <input type="text" value={form.nomorRS} onChange={(e) => setForm((prev) => ({ ...prev, nomorRS: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="form-label">Nama Outlet</label>
            <input type="text" value={form.namaOutlet} onChange={(e) => setForm((prev) => ({ ...prev, namaOutlet: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Kabupaten</label>
              <input type="text" value={form.kabupaten} onChange={(e) => setForm((prev) => ({ ...prev, kabupaten: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="form-label">Kecamatan</label>
              <input type="text" value={form.kecamatan} onChange={(e) => setForm((prev) => ({ ...prev, kecamatan: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="form-label">TAP</label>
            <select value={form.tap} onChange={(e) => setForm((prev) => {
              const nextTap = e.target.value;
              const selectedSalesforce = salesforces.find((salesforce) => salesforce.username === prev.salesforceUsername);
              return {
                ...prev,
                tap: nextTap,
                salesforceUsername: selectedSalesforce && selectedSalesforce.tap !== nextTap ? '' : prev.salesforceUsername,
              };
            })} className="input-field">
              {taps.map((tap) => <option key={tap} value={tap}>{tap}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Username Salesforce</label>
            {salesforces.length > 0 ? (
              <select value={form.salesforceUsername} onChange={(e) => setForm((prev) => ({ ...prev, salesforceUsername: e.target.value }))} className="input-field">
                <option value="">Belum diassign</option>
                {assignableSalesforces.map((salesforce) => (
                  <option key={salesforce.username} value={salesforce.username}>
                    {salesforce.nama} (@{salesforce.username}) - {salesforce.tap}
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" value={form.salesforceUsername || currentUsername} readOnly className="input-disabled" />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost border border-border py-3 rounded-xl font-semibold">Batal</button>
          <button
            onClick={() => onSave(form)}
            className="btn-primary"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
