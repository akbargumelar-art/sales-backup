'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import SearchableMultiSelect from '@/components/ui/SearchableMultiSelect';
import { getVisibleTransactions, getSummaryForTransactions, getViewableTaps, getPendingCancelForSalesforce, getPendingCancelBySalesforceForAdmin, buildProductFilterOptions, filterTransactionsByProducts, formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/app-data';
import type { Transaction } from '@/types';

type DashboardSummaryRow = {
  id: string;
  title: string;
  subtitle?: string;
  transaksi: number;
  qty: number;
  omzet: number;
  outletCount?: number;
  salesforceCount?: number;
  tapName?: string;
};

const sumTransactionQty = (trx: Transaction) => trx.items.reduce((sum, item) => sum + item.kuantiti, 0);

type SummarySortKey = 'title' | 'tapName' | 'transaksi' | 'outletCount' | 'salesforceCount' | 'qty' | 'omzet';
type SummarySort = { key: SummarySortKey; direction: 'asc' | 'desc' } | null;

const getSummarySortValue = (row: DashboardSummaryRow, key: SummarySortKey) => {
  switch (key) {
    case 'title':
      return row.title;
    case 'tapName':
      return row.tapName ?? '';
    case 'transaksi':
      return row.transaksi;
    case 'outletCount':
      return row.outletCount ?? 0;
    case 'salesforceCount':
      return row.salesforceCount ?? 0;
    case 'qty':
      return row.qty;
    case 'omzet':
      return row.omzet;
    default:
      return '';
  }
};

function sortSummaryRows(rows: DashboardSummaryRow[], sort: SummarySort) {
  if (!sort) return rows;

  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const valueA = getSummarySortValue(a, sort.key);
    const valueB = getSummarySortValue(b, sort.key);
    const compared = typeof valueA === 'number' && typeof valueB === 'number'
      ? valueA - valueB
      : String(valueA).localeCompare(String(valueB), 'id', { numeric: true, sensitivity: 'base' });

    return compared === 0
      ? a.title.localeCompare(b.title, 'id', { numeric: true, sensitivity: 'base' })
      : compared * direction;
  });
}

function buildProductSummary(transactions: Transaction[]): DashboardSummaryRow[] {
  const rows = new Map<string, DashboardSummaryRow & { trxIds: Set<string> }>();

  transactions.filter((trx) => trx.status === 'COMPLETED').forEach((trx) => {
    trx.items.forEach((item) => {
      const row = rows.get(item.productId) ?? {
        id: item.productId,
        title: item.product.namaProduk,
        subtitle: item.product.kode,
        transaksi: 0,
        qty: 0,
        omzet: 0,
        trxIds: new Set<string>(),
      };
      row.trxIds.add(trx.id);
      row.transaksi = row.trxIds.size;
      row.qty += item.kuantiti;
      row.omzet += item.subTotal;
      rows.set(item.productId, row);
    });
  });

  return Array.from(rows.values())
    .map(({ trxIds: _trxIds, ...row }) => row)
    .sort((a, b) => b.omzet - a.omzet || b.qty - a.qty || a.title.localeCompare(b.title));
}

function buildTapSummary(transactions: Transaction[]): DashboardSummaryRow[] {
  const rows = new Map<string, DashboardSummaryRow & { outlets: Set<string>; salesforces: Set<string> }>();

  transactions.filter((trx) => trx.status === 'COMPLETED').forEach((trx) => {
    const tap = trx.outlet.tap;
    const row = rows.get(tap) ?? {
      id: tap,
      title: tap,
      transaksi: 0,
      qty: 0,
      omzet: 0,
      outletCount: 0,
      salesforceCount: 0,
      outlets: new Set<string>(),
      salesforces: new Set<string>(),
    };
    row.transaksi += 1;
    row.qty += sumTransactionQty(trx);
    row.omzet += trx.totalTagihan;
    row.outlets.add(trx.outletId);
    row.salesforces.add(trx.salesforceId);
    row.outletCount = row.outlets.size;
    row.salesforceCount = row.salesforces.size;
    rows.set(tap, row);
  });

  return Array.from(rows.values())
    .map(({ outlets: _outlets, salesforces: _salesforces, ...row }) => row)
    .sort((a, b) => b.omzet - a.omzet || b.transaksi - a.transaksi || a.title.localeCompare(b.title));
}

function buildTapTotalSummary(transactions: Transaction[]): DashboardSummaryRow | undefined {
  const completedTransactions = transactions.filter((trx) => trx.status === 'COMPLETED');
  if (completedTransactions.length === 0) return undefined;

  const outlets = new Set<string>();
  const salesforces = new Set<string>();

  return completedTransactions.reduce<DashboardSummaryRow>((total, trx) => {
    outlets.add(trx.outletId);
    salesforces.add(trx.salesforceId);

    total.transaksi += 1;
    total.qty += sumTransactionQty(trx);
    total.omzet += trx.totalTagihan;
    total.outletCount = outlets.size;
    total.salesforceCount = salesforces.size;

    return total;
  }, {
    id: 'total-cluster',
    title: 'Total 1 Cluster',
    transaksi: 0,
    qty: 0,
    omzet: 0,
    outletCount: 0,
    salesforceCount: 0,
  });
}

function buildSalesforceSummary(transactions: Transaction[]): DashboardSummaryRow[] {
  const rows = new Map<string, DashboardSummaryRow & { outlets: Set<string> }>();

  transactions.filter((trx) => trx.status === 'COMPLETED').forEach((trx) => {
    const row = rows.get(trx.salesforceId) ?? {
      id: trx.salesforceId,
      title: trx.salesforce.nama,
      subtitle: `@${trx.salesforce.username}`,
      tapName: trx.salesforce.tap,
      transaksi: 0,
      qty: 0,
      omzet: 0,
      outletCount: 0,
      outlets: new Set<string>(),
    };
    row.transaksi += 1;
    row.qty += sumTransactionQty(trx);
    row.omzet += trx.totalTagihan;
    row.outlets.add(trx.outletId);
    row.outletCount = row.outlets.size;
    rows.set(trx.salesforceId, row);
  });

  return Array.from(rows.values())
    .map(({ outlets: _outlets, ...row }) => row)
    .sort((a, b) => b.omzet - a.omzet || b.transaksi - a.transaksi || a.title.localeCompare(b.title));
}

export default function DashboardPage() {
  const { user, users, products, transactions } = useAppStore();
  const [selectedTap, setSelectedTap] = useState<string>('ALL');
  const [selectedSalesforce, setSelectedSalesforce] = useState<string>('ALL');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showTapFilter, setShowTapFilter] = useState(false);
  const [showSfFilter, setShowSfFilter] = useState(false);
  const [openSummaryTables, setOpenSummaryTables] = useState({
    tap: true,
    salesforce: false,
    product: false,
  });

  const isAdminOrAbove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const viewableTaps = useMemo(() => user ? getViewableTaps(user) : [], [user]);
  const allVisibleTrx = useMemo(() => {
    void transactions;
    return user ? getVisibleTransactions(user) : [];
  }, [user, transactions]);

  // Visible salesforces based on selected TAP
  const visibleSalesforces = useMemo(() => {
    if (!isAdminOrAbove || !user) return [];
    return users.filter(u => {
      if (u.role !== 'SALESFORCE') return false;
      if (selectedTap !== 'ALL') return u.tap === selectedTap;
      if (user.allowedTaps.includes('ALL')) return true;
      return user.allowedTaps.includes(u.tap);
    });
  }, [isAdminOrAbove, user, selectedTap, users]);

  // Apply all filters
  const filteredTrx = useMemo(() => {
    const base = allVisibleTrx.filter(t => {
      if (selectedTap !== 'ALL' && t.outlet.tap !== selectedTap) return false;
      if (selectedSalesforce !== 'ALL' && t.salesforceId !== selectedSalesforce) return false;
      if (dateFrom) { const f = new Date(dateFrom); f.setHours(0, 0, 0, 0); if (new Date(t.submittedAt) < f) return false; }
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); if (new Date(t.submittedAt) > d) return false; }
      return true;
    });
    return filterTransactionsByProducts(base, selectedProductIds);
  }, [allVisibleTrx, selectedTap, selectedSalesforce, selectedProductIds, dateFrom, dateTo]);

  const summary = useMemo(() => getSummaryForTransactions(filteredTrx), [filteredTrx]);
  const productSummary = useMemo(() => buildProductSummary(filteredTrx), [filteredTrx]);
  const tapSummary = useMemo(() => buildTapSummary(filteredTrx), [filteredTrx]);
  const tapTotalSummary = useMemo(() => buildTapTotalSummary(filteredTrx), [filteredTrx]);
  const salesforceSummary = useMemo(() => buildSalesforceSummary(filteredTrx), [filteredTrx]);
  const recentTrx = filteredTrx.slice(0, 5);
  const productFilterOptions = useMemo(() => buildProductFilterOptions(products, allVisibleTrx), [products, allVisibleTrx]);
  const productFilterLabel = useMemo(() => {
    if (selectedProductIds.length === 0) return '';
    const selectedLabels = selectedProductIds
      .map((productId) => productFilterOptions.find((option) => option.value === productId)?.label)
      .filter(Boolean);
    return selectedLabels.length === 1 ? selectedLabels[0] ?? '1 produk' : `${selectedProductIds.length} produk`;
  }, [productFilterOptions, selectedProductIds]);

  const activeFilterCount = [
    dateFrom || dateTo ? 1 : 0,
    selectedTap !== 'ALL' ? 1 : 0,
    selectedSalesforce !== 'ALL' ? 1 : 0,
    selectedProductIds.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Selamat Pagi' : today.getHours() < 17 ? 'Selamat Siang' : 'Selamat Malam';

  // Pending cancel notifications
  const pendingCancelForSf = useMemo(() => {
    void transactions;
    return user?.role === 'SALESFORCE' ? getPendingCancelForSalesforce(user) : [];
  }, [user, transactions]);
  const pendingCancelBySfForAdmin = useMemo(() => {
    void transactions;
    return isAdminOrAbove && user ? getPendingCancelBySalesforceForAdmin(user) : [];
  }, [isAdminOrAbove, user, transactions]);

  return (
    <div className="animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-secondary via-secondary to-slate-700 px-5 pt-5 pb-8 -mt-px">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-caption">{greeting} 👋</p>
            <h2 className="text-white text-h1 mt-0.5">{user?.nama}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse-soft" />
              <span className="text-white/50 text-caption">{user?.tap}</span>
              {user?.role !== 'SALESFORCE' && (
                <span className="text-white/30 text-[10px] ml-1">
                  ({user?.allowedTaps?.includes('ALL') ? 'Semua TAP' : `${user?.allowedTaps?.length} TAP`})
                </span>
              )}
            </div>
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-xl text-caption font-medium flex items-center gap-1.5 transition-colors relative ${
              showFilters || activeFilterCount > 0
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center ml-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-border px-4 py-3 space-y-3 animate-slide-down shadow-sm">
          {/* Date range */}
          <div>
            <label className="form-label">Rentang Tanggal</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-caption" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-caption" />
            </div>
          </div>

          {/* TAP filter (Admin/SuperAdmin with >1 TAP) */}
          {isAdminOrAbove && viewableTaps.length > 1 && (
            <div>
              <label className="form-label">TAP</label>
              <div className="relative">
                <button
                  onClick={() => setShowTapFilter(!showTapFilter)}
                  className={`w-full input-field text-left flex items-center justify-between ${selectedTap !== 'ALL' ? 'text-primary font-medium' : ''}`}
                >
                  <span>{selectedTap === 'ALL' ? 'Semua TAP' : selectedTap}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showTapFilter && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowTapFilter(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-40 animate-scale-in overflow-hidden max-h-48 overflow-y-auto">
                      <button onClick={() => { setSelectedTap('ALL'); setSelectedSalesforce('ALL'); setShowTapFilter(false); }} className={`w-full text-left px-4 py-2.5 text-body hover:bg-surface transition-colors ${selectedTap === 'ALL' ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>Semua TAP</button>
                      {viewableTaps.map(tap => (
                        <button key={tap} onClick={() => { setSelectedTap(tap); setSelectedSalesforce('ALL'); setShowTapFilter(false); }} className={`w-full text-left px-4 py-2.5 text-body hover:bg-surface transition-colors border-t border-border/50 ${selectedTap === tap ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>{tap}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Salesforce filter (Admin/SuperAdmin) */}
          {isAdminOrAbove && (
            <div>
              <label className="form-label">Nama Salesforce</label>
              <div className="relative">
                <button
                  onClick={() => setShowSfFilter(!showSfFilter)}
                  className={`w-full input-field text-left flex items-center justify-between ${selectedSalesforce !== 'ALL' ? 'text-primary font-medium' : ''}`}
                >
                  <span>{selectedSalesforce === 'ALL' ? 'Semua Salesforce' : users.find(u => u.id === selectedSalesforce)?.nama || 'Pilih'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showSfFilter && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowSfFilter(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-40 animate-scale-in overflow-hidden max-h-48 overflow-y-auto">
                      <button onClick={() => { setSelectedSalesforce('ALL'); setShowSfFilter(false); }} className={`w-full text-left px-4 py-2.5 text-body hover:bg-surface transition-colors ${selectedSalesforce === 'ALL' ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>Semua Salesforce</button>
                      {visibleSalesforces.map(sf => (
                        <button key={sf.id} onClick={() => { setSelectedSalesforce(sf.id); setShowSfFilter(false); }} className={`w-full text-left px-4 py-2.5 hover:bg-surface transition-colors border-t border-border/50 ${selectedSalesforce === sf.id ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}>
                          <p className="text-body">{sf.nama}</p>
                          <p className="text-[10px] text-text-secondary">{sf.tap} • @{sf.username}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <SearchableMultiSelect
            label="Nama Produk"
            options={productFilterOptions}
            selectedValues={selectedProductIds}
            onChange={setSelectedProductIds}
            placeholder="Semua Produk"
            searchPlaceholder="Cari nama atau kode produk..."
            emptyLabel="Produk tidak ditemukan"
            selectedCountLabel={(count) => `${count} produk dipilih`}
          />

          <div className="flex items-center gap-2 pt-1">
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setSelectedTap('ALL'); setSelectedSalesforce('ALL'); setSelectedProductIds([]); }}
                className="px-3 py-1.5 rounded-lg text-caption font-medium text-error hover:bg-red-50 transition-colors"
              >
                Reset
              </button>
            )}
            <button onClick={() => setShowFilters(false)} className="ml-auto px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-caption font-medium">
              Terapkan
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-3xl" />
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E3000F" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </div>
            <p className="text-caption text-text-secondary">Total Transaksi</p>
            <p className="text-h1 text-text-primary mt-0.5">{summary.totalTransaksi}</p>
          </div>

          <div className="card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-success/10 to-transparent rounded-bl-3xl" />
            <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <p className="text-caption text-text-secondary">Total Omset</p>
            <p className="text-h2 text-text-primary mt-0.5">{formatCurrency(summary.totalOmset)}</p>
          </div>

          <div className="card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-accent/10 to-transparent rounded-bl-3xl" />
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <p className="text-caption text-text-secondary">Outlet Aktif</p>
            <p className="text-h1 text-text-primary mt-0.5">{summary.totalOutlet}</p>
          </div>

          <div className="card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-3xl" />
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <p className="text-caption text-text-secondary">Produk Terjual</p>
            <p className="text-h1 text-text-primary mt-0.5">{summary.totalProdukTerjual}</p>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="px-4 mt-3 flex flex-wrap gap-2">
          {(dateFrom || dateTo) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/20 text-caption text-primary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : dateFrom ? `Dari ${dateFrom}` : `s/d ${dateTo}`}
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          )}
          {selectedTap !== 'ALL' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/20 text-caption text-primary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {selectedTap.replace('TAP-', '')}
              <button onClick={() => { setSelectedTap('ALL'); setSelectedSalesforce('ALL'); }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          )}
          {selectedSalesforce !== 'ALL' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/20 text-caption text-primary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {users.find(u => u.id === selectedSalesforce)?.nama}
              <button onClick={() => setSelectedSalesforce('ALL')}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          )}
          {selectedProductIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/20 text-caption text-primary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              {productFilterLabel}
              <button onClick={() => setSelectedProductIds([])}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          )}
        </div>
      )}

      {/* Admin Summary Tables */}
      {isAdminOrAbove && (
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-h2 text-text-primary">Summary Admin</h3>
            <p className="text-caption text-text-secondary">{summary.totalTransaksi} transaksi</p>
          </div>
          <div className="space-y-3">
            <SummaryTableCard
              title="Per TAP"
              rows={tapSummary}
              emptyLabel="Belum ada transaksi per TAP"
              showOutlet
              showSalesforce
              totalRow={tapTotalSummary}
              isOpen={openSummaryTables.tap}
              onToggle={() => setOpenSummaryTables((prev) => ({ ...prev, tap: !prev.tap }))}
            />
            <SummaryTableCard
              title="Per Salesforce"
              rows={salesforceSummary}
              emptyLabel="Belum ada transaksi per Salesforce"
              showTap
              showOutlet
              isOpen={openSummaryTables.salesforce}
              onToggle={() => setOpenSummaryTables((prev) => ({ ...prev, salesforce: !prev.salesforce }))}
            />
            <SummaryTableCard
              title="Per Produk"
              rows={productSummary}
              emptyLabel="Belum ada produk terjual"
              isOpen={openSummaryTables.product}
              onToggle={() => setOpenSummaryTables((prev) => ({ ...prev, product: !prev.product }))}
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 mt-5">
        <div className="card bg-gradient-to-r from-primary to-primary-dark p-4 hover:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-body">Input Penjualan Baru</p>
              <p className="text-white/60 text-caption mt-0.5">Catat transaksi harian Anda</p>
            </div>
            <Link href="/sales/new" className="px-4 py-2.5 bg-white rounded-xl text-primary font-semibold text-body hover:bg-white/90 transition-colors active:scale-95">
              + Input
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Cancel Notification for SF (admin requested) */}
      {pendingCancelForSf.length > 0 && (
        <div className="px-4 mt-3">
          <Link href="/dashboard/report">
            <div className="card bg-amber-50 border border-amber-200 p-3.5 hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-body font-semibold text-amber-800">{pendingCancelForSf.length} transaksi menunggu persetujuan pembatalan</p>
                  <p className="text-caption text-amber-600 mt-0.5">Admin meminta pembatalan — perlu tindakan Anda</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Pending Cancel Notification for Admin (SF requested) */}
      {pendingCancelBySfForAdmin.length > 0 && (
        <div className="px-4 mt-3">
          <Link href="/dashboard/report">
            <div className="card bg-blue-50 border border-blue-200 p-3.5 hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-body font-semibold text-blue-800">{pendingCancelBySfForAdmin.length} pengajuan pembatalan dari Salesforce</p>
                  <p className="text-caption text-blue-600 mt-0.5">Salesforce meminta pembatalan — menunggu persetujuan Anda</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="px-4 mt-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-h2 text-text-primary">Transaksi Terbaru</h3>
          <Link href="/dashboard/report" className="text-caption text-primary font-medium hover:underline">
            Lihat Semua →
          </Link>
        </div>

        {recentTrx.length === 0 ? (
          <div className="card text-center py-8">
            <div className="w-14 h-14 rounded-full bg-surface mx-auto flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
            </div>
            <p className="text-body text-text-secondary">Belum ada transaksi</p>
            {activeFilterCount > 0 && <p className="text-caption text-text-secondary/60 mt-0.5">Coba ubah filter yang aktif</p>}
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentTrx.map((trx, index) => (
              <Link key={trx.id} href={`/sales/${trx.id}`}>
                <div className="card p-3.5 flex items-center gap-3 hover:border-primary/20 border border-transparent transition-all cursor-pointer" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${trx.status === 'COMPLETED' ? 'bg-success/10' : trx.status === 'CANCELLED' ? 'bg-red-50' : trx.status === 'PENDING_CANCEL' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    {trx.status === 'COMPLETED' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : trx.status === 'CANCELLED' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-body font-semibold text-text-primary truncate">{trx.outlet.namaOutlet}</p>
                      <p className={`text-body font-bold shrink-0 ml-2 ${trx.status === 'CANCELLED' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{formatCurrency(trx.totalTagihan)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <p className="text-caption text-text-secondary">{trx.nomorTransaksi}</p>
                        {isAdminOrAbove && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-text-secondary">{trx.outlet.tap.replace('TAP-', '')}</span>
                        )}
                      </div>
                      <span className={getStatusColor(trx.status)}>{getStatusLabel(trx.status)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-text-secondary/60">{formatDateTime(trx.submittedAt)}</p>
                      {isAdminOrAbove && (
                        <p className="text-[10px] text-text-secondary/60">• {trx.salesforce.nama}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTableCard({
  title,
  rows,
  emptyLabel,
  isOpen,
  onToggle,
  showOutlet = false,
  showSalesforce = false,
  showTap = false,
  totalRow,
}: {
  title: string;
  rows: DashboardSummaryRow[];
  emptyLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  showOutlet?: boolean;
  showSalesforce?: boolean;
  showTap?: boolean;
  totalRow?: DashboardSummaryRow;
}) {
  const [sort, setSort] = useState<SummarySort>(null);
  const sortedRows = useMemo(() => sortSummaryRows(rows, sort), [rows, sort]);
  const toggleSort = (key: SummarySortKey) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  return (
    <div className="card p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-surface/70 transition-colors ${isOpen ? 'border-b border-border' : ''}`}
      >
        <div className="min-w-0">
          <h4 className="text-body font-semibold text-text-primary">{title}</h4>
          <p className="text-caption text-text-secondary">{rows.length} baris</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-caption font-semibold text-text-primary">
            {formatCurrency(rows.reduce((sum, row) => sum + row.omzet, 0))}
          </span>
          <span className={`w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </button>
      {isOpen && rows.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-body text-text-secondary">{emptyLabel}</p>
        </div>
      ) : isOpen ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left">
            <thead className="bg-surface">
              <tr className="text-[10px] uppercase font-bold text-text-secondary">
                <SortableSummaryHeader label="Nama" sortKey="title" sort={sort} onSort={toggleSort} className="px-4 py-2.5 w-[34%]" />
                {showTap && <SortableSummaryHeader label="TAP" sortKey="tapName" sort={sort} onSort={toggleSort} className="px-3 py-2.5" />}
                <SortableSummaryHeader label="Trx" sortKey="transaksi" sort={sort} onSort={toggleSort} className="px-3 py-2.5 text-right" align="right" />
                {showOutlet && <SortableSummaryHeader label="Outlet" sortKey="outletCount" sort={sort} onSort={toggleSort} className="px-3 py-2.5 text-right" align="right" />}
                {showSalesforce && <SortableSummaryHeader label="SF Unik" sortKey="salesforceCount" sort={sort} onSort={toggleSort} className="px-3 py-2.5 text-right" align="right" />}
                <SortableSummaryHeader label="Qty" sortKey="qty" sort={sort} onSort={toggleSort} className="px-3 py-2.5 text-right" align="right" />
                <SortableSummaryHeader label="Omset" sortKey="omzet" sort={sort} onSort={toggleSort} className="px-4 py-2.5 text-right" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {sortedRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-text-primary truncate">{row.title}</p>
                        {row.subtitle && <p className="text-caption text-text-secondary truncate">{row.subtitle}</p>}
                      </div>
                    </div>
                  </td>
                  {showTap && <td className="px-3 py-3 text-body text-text-primary">{row.tapName ?? '-'}</td>}
                  <td className="px-3 py-3 text-right text-body font-semibold text-text-primary">{row.transaksi}</td>
                  {showOutlet && <td className="px-3 py-3 text-right text-body text-text-primary">{row.outletCount ?? 0}</td>}
                  {showSalesforce && <td className="px-3 py-3 text-right text-body text-text-primary">{row.salesforceCount ?? 0}</td>}
                  <td className="px-3 py-3 text-right text-body text-text-primary">{row.qty}</td>
                  <td className="px-4 py-3 text-right text-body font-bold text-text-primary">{formatCurrency(row.omzet)}</td>
                </tr>
              ))}
            </tbody>
            {totalRow && (
              <tfoot>
                <tr className="border-t border-primary/20 bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        T
                      </span>
                      <p className="text-body font-bold text-text-primary">{totalRow.title}</p>
                    </div>
                  </td>
                  {showTap && <td className="px-3 py-3 text-body font-bold text-text-primary">{totalRow.tapName ?? '-'}</td>}
                  <td className="px-3 py-3 text-right text-body font-bold text-text-primary">{totalRow.transaksi}</td>
                  {showOutlet && <td className="px-3 py-3 text-right text-body font-bold text-text-primary">{totalRow.outletCount ?? 0}</td>}
                  {showSalesforce && <td className="px-3 py-3 text-right text-body font-bold text-text-primary">{totalRow.salesforceCount ?? 0}</td>}
                  <td className="px-3 py-3 text-right text-body font-bold text-text-primary">{totalRow.qty}</td>
                  <td className="px-4 py-3 text-right text-body font-bold text-text-primary">{formatCurrency(totalRow.omzet)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : null}
    </div>
  );
}

function SortableSummaryHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = 'left',
}: {
  label: string;
  sortKey: SummarySortKey;
  sort: SummarySort;
  onSort: (key: SummarySortKey) => void;
  className?: string;
  align?: 'left' | 'right';
}) {
  const activeDirection = sort?.key === sortKey ? sort.direction : null;
  const isNumeric = !['title', 'tapName'].includes(sortKey);
  const indicator = activeDirection
    ? activeDirection === 'asc'
      ? isNumeric ? '0-9' : 'A-Z'
      : isNumeric ? '9-0' : 'Z-A'
    : '';

  return (
    <th
      className={className}
      aria-sort={activeDirection ? (activeDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`w-full inline-flex items-center gap-1.5 rounded-md py-1 text-[10px] uppercase font-bold text-text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${align === 'right' ? 'justify-end' : 'justify-start'}`}
      >
        <span>{label}</span>
        {activeDirection ? (
          <span className="text-[9px] text-primary">{indicator}</span>
        ) : (
          <svg className="text-text-secondary/50" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M8 7h8" />
            <path d="M8 12h6" />
            <path d="M8 17h4" />
          </svg>
        )}
      </button>
    </th>
  );
}
