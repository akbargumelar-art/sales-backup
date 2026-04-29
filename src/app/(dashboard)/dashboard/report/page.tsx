'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  getVisibleTransactions, getViewableTaps, formatCurrency, formatDateTime,
  getStatusColor, getStatusLabel,
} from '@/lib/app-data';
import type { TransactionStatus } from '@/types';

export default function ReportPage() {
  const {
    user,
    users,
    transactions,
    showToast,
    requestCancelTransaction,
    approveCancelTransaction,
    rejectCancelTransaction,
    requestCancelBySalesforce,
    approveCancelBySalesforce,
    rejectCancelBySalesforce,
  } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'ALL'>('ALL');
  const [selectedTap, setSelectedTap] = useState<string>('ALL');
  const [selectedSalesforce, setSelectedSalesforce] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTapFilter, setShowTapFilter] = useState(false);
  const [showSfFilter, setShowSfFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  // Cancel modal — tracks who is initiating (ADMIN or SALESFORCE)
  const [cancelModal, setCancelModal] = useState<{ trxId: string; initiator: 'ADMIN' | 'SALESFORCE' } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const isAdminOrAbove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isSalesforce = user?.role === 'SALESFORCE';
  const viewableTaps = useMemo(() => user ? getViewableTaps(user) : [], [user]);
  const allVisibleTrx = useMemo(() => {
    void transactions;
    return user ? getVisibleTransactions(user) : [];
  }, [user, transactions]);

  const visibleSalesforces = useMemo(() => {
    if (!isAdminOrAbove || !user) return [];
    return users.filter(u => {
      if (u.role !== 'SALESFORCE') return false;
      if (selectedTap !== 'ALL') return u.tap === selectedTap;
      if (user.allowedTaps.includes('ALL')) return true;
      return user.allowedTaps.includes(u.tap);
    });
  }, [isAdminOrAbove, user, selectedTap, users]);

  const filtered = useMemo(() => {
    return allVisibleTrx.filter(trx => {
      if (statusFilter !== 'ALL' && trx.status !== statusFilter) return false;
      if (selectedTap !== 'ALL' && trx.outlet.tap !== selectedTap) return false;
      if (selectedSalesforce !== 'ALL' && trx.salesforceId !== selectedSalesforce) return false;
      if (dateFrom) { const f = new Date(dateFrom); f.setHours(0,0,0,0); if (new Date(trx.submittedAt) < f) return false; }
      if (dateTo) { const t = new Date(dateTo); t.setHours(23,59,59,999); if (new Date(trx.submittedAt) > t) return false; }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return trx.nomorTransaksi.toLowerCase().includes(q) || trx.outlet.namaOutlet.toLowerCase().includes(q) || trx.salesforce.nama.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allVisibleTrx, statusFilter, selectedTap, selectedSalesforce, dateFrom, dateTo, searchQuery]);

  const statusCounts = useMemo(() => {
    const base = allVisibleTrx.filter(t => {
      if (selectedTap !== 'ALL' && t.outlet.tap !== selectedTap) return false;
      if (selectedSalesforce !== 'ALL' && t.salesforceId !== selectedSalesforce) return false;
      return true;
    });
    return {
      ALL: base.length,
      COMPLETED: base.filter(t => t.status === 'COMPLETED').length,
      PENDING_CANCEL: base.filter(t => t.status === 'PENDING_CANCEL').length,
      CANCELLED: base.filter(t => t.status === 'CANCELLED').length,
    };
  }, [allVisibleTrx, selectedTap, selectedSalesforce]);

  const activeFilterCount = [dateFrom || dateTo ? 1 : 0, selectedTap !== 'ALL' ? 1 : 0, selectedSalesforce !== 'ALL' ? 1 : 0].reduce((a, b) => a + b, 0);

  // Admin submits cancel request → SF must approve
  const handleAdminRequestCancel = useCallback(async () => {
    if (!cancelModal || !cancelReason.trim() || !user) return;
    const ok = await requestCancelTransaction(cancelModal.trxId, user.id, cancelReason.trim());
    if (ok) { showToast('Permintaan pembatalan dikirim ke Salesforce', 'success'); }
    else showToast('Gagal mengirim permintaan', 'error');
    setCancelModal(null); setCancelReason('');
  }, [cancelModal, cancelReason, requestCancelTransaction, user, showToast]);

  // SF submits cancel request → Admin must approve
  const handleSfRequestCancel = useCallback(async () => {
    if (!cancelModal || !cancelReason.trim() || !user) return;
    const ok = await requestCancelBySalesforce(cancelModal.trxId, user.id, cancelReason.trim());
    if (ok) { showToast('Pengajuan pembatalan dikirim ke Admin untuk disetujui', 'success'); }
    else showToast('Gagal mengajukan pembatalan', 'error');
    setCancelModal(null); setCancelReason('');
  }, [cancelModal, cancelReason, requestCancelBySalesforce, user, showToast]);

  // SF: approve/reject admin's cancel request
  const handleSfApprove = useCallback(async (trxId: string) => {
    if (await approveCancelTransaction(trxId)) { showToast('Pembatalan disetujui', 'warning'); }
  }, [approveCancelTransaction, showToast]);
  const handleSfReject = useCallback(async (trxId: string) => {
    if (await rejectCancelTransaction(trxId)) { showToast('Pembatalan ditolak, transaksi kembali Selesai', 'success'); }
  }, [rejectCancelTransaction, showToast]);

  // Admin: approve/reject SF's cancel request
  const handleAdminApprove = useCallback(async (trxId: string) => {
    if (await approveCancelBySalesforce(trxId)) { showToast('Pembatalan Salesforce disetujui', 'warning'); }
  }, [approveCancelBySalesforce, showToast]);
  const handleAdminReject = useCallback(async (trxId: string) => {
    if (await rejectCancelBySalesforce(trxId)) { showToast('Pengajuan pembatalan ditolak, transaksi kembali Selesai', 'success'); }
  }, [rejectCancelBySalesforce, showToast]);

  const openModal = (trxId: string, initiator: 'ADMIN' | 'SALESFORCE') => {
    setCancelModal({ trxId, initiator });
    setCancelReason('');
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      showToast('Tidak ada data untuk diexport', 'warning');
      return;
    }
    const header = ['nomorTransaksi', 'tanggal', 'status', 'tap', 'outlet', 'ownerName', 'ownerPhone', 'salesforce', 'totalTagihan'];
    const lines = filtered.map((trx) => [
      trx.nomorTransaksi,
      trx.submittedAt,
      trx.status,
      trx.outlet.tap,
      trx.outlet.namaOutlet,
      trx.ownerName,
      trx.ownerPhone,
      trx.salesforce.nama,
      String(trx.totalTagihan),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export laporan berhasil', 'success');
  };

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="bg-white border-b border-border px-4 py-3 sticky top-[52px] lg:top-[53px] z-20">
        <div className="flex items-center justify-between">
          <h2 className="text-h2 text-text-primary">Laporan Penjualan</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`px-2.5 py-1.5 rounded-lg text-caption font-medium flex items-center gap-1 transition-colors relative ${showFilters || activeFilterCount > 0 ? 'bg-primary/10 text-primary' : 'bg-surface text-text-secondary hover:bg-slate-100'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Filter
              {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            <button onClick={handleExport} className="px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-caption font-medium flex items-center gap-1 hover:bg-success/20 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border-b border-border px-4 py-3 space-y-3 animate-slide-down">
          <div>
            <label className="form-label">Rentang Tanggal</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-caption" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-caption" />
            </div>
          </div>
          {isAdminOrAbove && viewableTaps.length > 1 && (
            <div>
              <label className="form-label">TAP</label>
              <div className="relative">
                <button onClick={() => setShowTapFilter(!showTapFilter)} className={`w-full input-field text-left flex items-center justify-between ${selectedTap !== 'ALL' ? 'text-primary font-medium' : ''}`}>
                  <span>{selectedTap === 'ALL' ? 'Semua TAP' : selectedTap}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showTapFilter && (<><div className="fixed inset-0 z-30" onClick={() => setShowTapFilter(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-40 animate-scale-in overflow-hidden max-h-48 overflow-y-auto">
                    <button onClick={() => { setSelectedTap('ALL'); setSelectedSalesforce('ALL'); setShowTapFilter(false); }} className={`w-full text-left px-4 py-2.5 text-body hover:bg-surface transition-colors ${selectedTap === 'ALL' ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>Semua TAP</button>
                    {viewableTaps.map(tap => (<button key={tap} onClick={() => { setSelectedTap(tap); setSelectedSalesforce('ALL'); setShowTapFilter(false); }} className={`w-full text-left px-4 py-2.5 text-body hover:bg-surface transition-colors border-t border-border/50 ${selectedTap === tap ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>{tap}</button>))}
                  </div></>)}
              </div>
            </div>
          )}
          {isAdminOrAbove && (
            <div>
              <label className="form-label">Nama Salesforce</label>
              <div className="relative">
                <button onClick={() => setShowSfFilter(!showSfFilter)} className={`w-full input-field text-left flex items-center justify-between ${selectedSalesforce !== 'ALL' ? 'text-primary font-medium' : ''}`}>
                  <span>{selectedSalesforce === 'ALL' ? 'Semua Salesforce' : users.find(u => u.id === selectedSalesforce)?.nama || 'Pilih'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showSfFilter && (<><div className="fixed inset-0 z-30" onClick={() => setShowSfFilter(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-40 animate-scale-in overflow-hidden max-h-48 overflow-y-auto">
                    <button onClick={() => { setSelectedSalesforce('ALL'); setShowSfFilter(false); }} className={`w-full text-left px-4 py-2.5 text-body hover:bg-surface transition-colors ${selectedSalesforce === 'ALL' ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>Semua Salesforce</button>
                    {visibleSalesforces.map(sf => (<button key={sf.id} onClick={() => { setSelectedSalesforce(sf.id); setShowSfFilter(false); }} className={`w-full text-left px-4 py-2.5 hover:bg-surface transition-colors border-t border-border/50 ${selectedSalesforce === sf.id ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}><p className="text-body">{sf.nama}</p><p className="text-[10px] text-text-secondary">{sf.tap} • @{sf.username}</p></button>))}
                  </div></>)}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            {activeFilterCount > 0 && <button onClick={() => { setDateFrom(''); setDateTo(''); setSelectedTap('ALL'); setSelectedSalesforce('ALL'); }} className="px-3 py-1.5 rounded-lg text-caption font-medium text-error hover:bg-red-50 transition-colors">Reset</button>}
            <button onClick={() => setShowFilters(false)} className="ml-auto px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-caption font-medium">Terapkan</button>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari transaksi, outlet, atau salesforce..." className="input-field pl-10" />
        </div>

        {/* Status tabs */}
        <div className="mb-3">
          <p className="text-[10px] text-text-secondary/60 mb-1.5 uppercase tracking-wider font-semibold">Status Transaksi</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {([
              { key: 'ALL' as const, label: 'Semua', color: 'bg-slate-100 text-slate-700' },
              { key: 'COMPLETED' as const, label: 'Selesai', color: 'bg-green-50 text-green-700' },
              { key: 'PENDING_CANCEL' as const, label: 'Menunggu', color: 'bg-amber-50 text-amber-700' },
              { key: 'CANCELLED' as const, label: 'Dibatalkan', color: 'bg-red-50 text-red-700' },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-caption font-medium transition-all ${statusFilter === tab.key ? `${tab.color} ring-2 ring-offset-1 ring-current/20 scale-105` : 'bg-surface text-text-secondary hover:bg-slate-100'}`}>
                {tab.label} ({statusCounts[tab.key] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Status info */}
        {statusFilter !== 'ALL' && (
          <div className="mb-3 p-3 rounded-xl bg-surface border border-border/50 text-caption text-text-secondary">
            {statusFilter === 'COMPLETED' && <p>✅ Transaksi valid, dihitung sebagai omset. Admin atau Salesforce dapat mengajukan pembatalan.</p>}
            {statusFilter === 'PENDING_CANCEL' && <p>⏳ Ada permintaan pembatalan yang menunggu persetujuan. Omset belum dikurangi.</p>}
            {statusFilter === 'CANCELLED' && <p>❌ Transaksi dibatalkan setelah disetujui. <strong>Omset sudah dikurangi.</strong></p>}
          </div>
        )}

        {/* Transaction list */}
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-surface mx-auto flex items-center justify-center mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <p className="text-body text-text-secondary">Tidak ada transaksi ditemukan</p>
            </div>
          ) : filtered.map((trx, i) => (
            <div key={trx.id} className="card p-3.5 border border-transparent hover:border-primary/20 transition-all" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-body font-semibold text-text-primary truncate">{trx.outlet.namaOutlet}</p>
                    <span className={getStatusColor(trx.status)}>{getStatusLabel(trx.status)}</span>
                    {isAdminOrAbove && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-text-secondary">{trx.outlet.tap.replace('TAP-', '')}</span>}
                    {/* Show who initiated pending cancel */}
                    {trx.status === 'PENDING_CANCEL' && trx.cancelInitiatedBy && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${trx.cancelInitiatedBy === 'SALESFORCE' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        Diajukan: {trx.cancelInitiatedBy === 'SALESFORCE' ? 'Salesforce' : 'Admin'}
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-text-secondary mt-0.5">{trx.nomorTransaksi}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-caption text-text-secondary">{formatDateTime(trx.submittedAt)}</span>
                    {isAdminOrAbove && <span className="text-caption text-text-secondary">• {trx.salesforce.nama}</span>}
                    <span className="text-caption text-text-secondary">{trx.items.length} produk</span>
                  </div>

                  {/* Cancel reason */}
                  {trx.cancelReason && (trx.status === 'PENDING_CANCEL' || trx.status === 'CANCELLED') && (
                    <div className={`mt-2 p-2 rounded-lg text-[11px] ${trx.status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      <strong>Alasan:</strong> {trx.cancelReason}
                    </div>
                  )}

                  {/* SF: approve/reject Admin's cancel request */}
                  {isSalesforce && trx.status === 'PENDING_CANCEL' && trx.cancelInitiatedBy === 'ADMIN' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-[11px] text-amber-800 font-medium mb-2">⚠️ Admin meminta pembatalan transaksi ini</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleSfApprove(trx.id)} className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-caption font-medium hover:bg-red-600 transition-colors">Setujui Batal</button>
                        <button onClick={() => handleSfReject(trx.id)} className="flex-1 py-1.5 rounded-lg bg-white border border-border text-text-primary text-caption font-medium hover:bg-slate-50 transition-colors">Tolak</button>
                      </div>
                    </div>
                  )}

                  {/* SF: pending waiting admin (SF initiated) */}
                  {isSalesforce && trx.status === 'PENDING_CANCEL' && trx.cancelInitiatedBy === 'SALESFORCE' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-[11px] text-blue-700 font-medium">🕐 Pengajuan pembatalan Anda sedang menunggu persetujuan Admin</p>
                    </div>
                  )}

                  {/* Admin: approve/reject SF's cancel request */}
                  {isAdminOrAbove && trx.status === 'PENDING_CANCEL' && trx.cancelInitiatedBy === 'SALESFORCE' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-[11px] text-blue-800 font-medium mb-2">📋 Salesforce mengajukan pembatalan transaksi ini</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleAdminApprove(trx.id)} className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-caption font-medium hover:bg-red-600 transition-colors">Setujui Batal</button>
                        <button onClick={() => handleAdminReject(trx.id)} className="flex-1 py-1.5 rounded-lg bg-white border border-border text-text-primary text-caption font-medium hover:bg-slate-50 transition-colors">Tolak</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                  <p className={`text-body font-bold ${trx.status === 'CANCELLED' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{formatCurrency(trx.totalTagihan)}</p>
                  {/* Admin: request cancel for COMPLETED */}
                  {isAdminOrAbove && trx.status === 'COMPLETED' && (
                    <button onClick={() => openModal(trx.id, 'ADMIN')} className="px-2 py-1 rounded-lg text-[10px] font-medium text-error bg-red-50 hover:bg-red-100 transition-colors">Batalkan</button>
                  )}
                  {/* SF: request cancel for own COMPLETED transaction */}
                  {isSalesforce && trx.status === 'COMPLETED' && trx.salesforceId === user?.id && (
                    <button onClick={() => openModal(trx.id, 'SALESFORCE')} className="px-2 py-1 rounded-lg text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">Ajukan Batal</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="overlay" onClick={() => { setCancelModal(null); setCancelReason(''); }}>
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-lg lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 ${cancelModal.initiator === 'ADMIN' ? 'bg-red-50' : 'bg-amber-50'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={cancelModal.initiator === 'ADMIN' ? '#DC2626' : '#D97706'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h3 className="text-h2 text-text-primary text-center mb-1">
              {cancelModal.initiator === 'ADMIN' ? 'Batalkan Transaksi' : 'Ajukan Pembatalan'}
            </h3>
            <p className="text-caption text-text-secondary text-center mb-4">
              {cancelModal.initiator === 'ADMIN'
                ? 'Permintaan akan dikirim ke Salesforce untuk disetujui'
                : 'Pengajuan akan dikirim ke Admin untuk disetujui'}
            </p>
            <div>
              <label className="form-label">Alasan Pembatalan <span className="text-error">*</span></label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} maxLength={300} placeholder="Jelaskan alasan pembatalan transaksi..." className="input-field resize-none" />
              <p className="text-[10px] text-text-secondary text-right mt-1">{cancelReason.length}/300</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => { setCancelModal(null); setCancelReason(''); }} className="btn-ghost border border-border py-3 rounded-xl font-semibold">Batal</button>
              <button
                onClick={cancelModal.initiator === 'ADMIN' ? handleAdminRequestCancel : handleSfRequestCancel}
                disabled={!cancelReason.trim()}
                className={`btn-primary py-3 rounded-xl font-semibold disabled:opacity-50 ${cancelModal.initiator === 'ADMIN' ? 'bg-error hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                Kirim Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
