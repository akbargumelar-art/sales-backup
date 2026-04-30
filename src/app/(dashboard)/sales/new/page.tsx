'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getVisibleOutlets, formatCurrency } from '@/lib/app-data';
import type { SalesLineItem, Product, Outlet } from '@/types';

// Indonesian mobile phone prefixes (4-digit)
const ID_PHONE_PREFIXES = [
  // Telkomsel
  '0811','0812','0813','0821','0822','0823','0851','0852','0853',
  // Indosat
  '0814','0815','0816','0855','0856','0857','0858',
  // XL
  '0817','0818','0819','0859','0877','0878',
  // Axis
  '0831','0832','0833','0838',
  // 3 (Three)
  '0895','0896','0897','0898','0899',
  // Smartfren
  '0881','0882','0883','0884','0885','0886','0887','0888','0889',
  // by.U (Telkomsel)
  '0850',
];

function genId() { return Math.random().toString(36).slice(2, 10); }

const emptyItem = (): SalesLineItem => ({
  id: genId(), productId: '', hargaSatuan: 0, kuantiti: 1, subTotal: 0,
  snMode: 'none', snAwal: '', snAkhir: '', scannedSNs: [], isManualPrice: false,
});

export default function SalesNewPage() {
  const { user, products, showToast, addOutlet, submitTransaction } = useAppStore();
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [outletSearch, setOutletSearch] = useState('');
  const [outletDropdownOpen, setOutletDropdownOpen] = useState(false);
  const [items, setItems] = useState<SalesLineItem[]>([emptyItem()]);
  const [catatan, setCatatan] = useState('');
  const [nomorWaOwner, setNomorWaOwner] = useState('');
  const [namaOwner, setNamaOwner] = useState('');
  const [waError, setWaError] = useState('');
  const [namaError, setNamaError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddOutlet, setShowAddOutlet] = useState(false);

  // WA Number validation
  const validateWaNumber = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '');
    if (!digitsOnly) { setWaError(''); return; }
    if (digitsOnly.length < 4) { setWaError('Masukkan minimal 4 digit'); return; }
    const prefix = digitsOnly.substring(0, 4);
    if (!ID_PHONE_PREFIXES.includes(prefix)) {
      setWaError(`Prefix "${prefix}" bukan nomor HP Indonesia yang valid`);
      return;
    }
    if (digitsOnly.length < 10) { setWaError('Nomor minimal 10 digit'); return; }
    if (digitsOnly.length > 12) { setWaError('Nomor maksimal 12 digit'); return; }
    setWaError('');
  };

  const handleWaChange = (val: string) => {
    // Only allow digits
    const clean = val.replace(/[^0-9]/g, '');
    setNomorWaOwner(clean);
    validateWaNumber(clean);
  };

  const handleNamaOwnerChange = (val: string) => {
    // Only allow letters and spaces
    const clean = val.replace(/[^a-zA-Z\s]/g, '');
    setNamaOwner(clean);
    if (clean && clean.trim().length < 2) {
      setNamaError('Nama minimal 2 karakter');
    } else {
      setNamaError('');
    }
  };

  const isWaValid = nomorWaOwner.length >= 10 && nomorWaOwner.length <= 12 && !waError;
  const isNamaValid = namaOwner.trim().length >= 2 && !namaError;

  // Filter outlets based on user role and allowed TAPs
  const userOutlets = user ? getVisibleOutlets(user) : [];
  const filteredOutlets = userOutlets.filter(o =>
    o.idOutlet.toLowerCase().includes(outletSearch.toLowerCase()) ||
    o.namaOutlet.toLowerCase().includes(outletSearch.toLowerCase())
  );

  const activeProducts = products.filter(p => p.isActive);
  const virtualProducts = activeProducts.filter(p => p.kategori === 'VIRTUAL');
  const fisikProducts = activeProducts.filter(p => p.kategori === 'FISIK');

  const grandTotal = items.reduce((sum, item) => sum + item.subTotal, 0);

  const selectOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setOutletSearch('');
    setOutletDropdownOpen(false);
  };

  const updateItem = useCallback((id: string, updates: Partial<SalesLineItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      // auto-calculate subtotal
      if ('hargaSatuan' in updates || 'kuantiti' in updates) {
        updated.subTotal = updated.hargaSatuan * updated.kuantiti;
      }
      return updated;
    }));
  }, []);

  const selectProduct = (itemId: string, product: Product) => {
    if (product.isVirtualNominal) {
      // Virtual nominal: harga 0, user isi nominal nanti
      updateItem(itemId, {
        productId: product.id,
        product,
        hargaSatuan: 0,
        kuantiti: 1,
        subTotal: 0,
        snMode: 'none',
        nominalVirtual: 0,
        isManualPrice: false,
      });
    } else {
      updateItem(itemId, {
        productId: product.id,
        product,
        hargaSatuan: product.harga,
        subTotal: product.harga * 1,
        kuantiti: 1,
        snMode: product.kategori === 'FISIK' ? 'range' : 'none',
        nominalVirtual: undefined,
        isManualPrice: false,
      });
    }
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const calculateSNQuantity = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.snAwal || !item.snAkhir) return;
    const start = parseInt(item.snAwal, 10);
    const end = parseInt(item.snAkhir, 10);
    if (isNaN(start) || isNaN(end) || end < start) {
      showToast('SN Akhir harus lebih besar dari SN Awal', 'error');
      return;
    }
    const qty = end - start + 1;
    updateItem(itemId, { kuantiti: qty, subTotal: item.hargaSatuan * qty });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));
    const result = user ? await submitTransaction({
      outletId: selectedOutlet!.id,
      salesforceId: user.id,
      ownerName: namaOwner,
      ownerPhone: nomorWaOwner,
      catatan,
      items,
    }) : { ok: false, message: 'User tidak valid' };
    setIsSubmitting(false);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    setShowConfirm(false);
    showToast('Transaksi berhasil disimpan!', 'success');
    // Reset
    setSelectedOutlet(null);
    setItems([emptyItem()]);
    setCatatan('');
    setNomorWaOwner('');
    setNamaOwner('');
  };

  const canSubmit = selectedOutlet &&
    items.every(i => {
      if (!i.productId) return false;
      if (i.product?.isVirtualNominal) return (i.nominalVirtual ?? 0) >= (i.product.minNominal ?? 20000);
      return i.kuantiti >= 1;
    }) &&
    grandTotal > 0 && isWaValid && isNamaValid;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 sticky top-[52px] z-20">
        <h2 className="text-h2 text-text-primary">Input Penjualan</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Section A: Outlet ────────────────────── */}
        <div className="card">
          <h3 className="text-label text-primary font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-caption flex items-center justify-center font-bold">A</span>
            Data Outlet
          </h3>

          {/* ID Outlet Combobox */}
          <div className="mb-3">
            <label className="form-label">ID Outlet <span className="text-error">*</span></label>
            <div className="relative">
              <input
                type="text"
                value={selectedOutlet ? `${selectedOutlet.idOutlet} — ${selectedOutlet.namaOutlet}` : outletSearch}
                onChange={(e) => { setOutletSearch(e.target.value); setSelectedOutlet(null); setOutletDropdownOpen(true); }}
                onFocus={() => setOutletDropdownOpen(true)}
                placeholder="Cari ID Outlet..."
                className="input-field pr-10"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>

              {outletDropdownOpen && !selectedOutlet && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-border max-h-48 overflow-y-auto z-30 animate-scale-in">
                  {filteredOutlets.length === 0 ? (
                    <p className="p-3 text-caption text-text-secondary text-center">Outlet tidak ditemukan</p>
                  ) : (
                    filteredOutlets.map(o => (
                      <button key={o.id} onClick={() => selectOutlet(o)}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface transition-colors border-b border-border/50 last:border-0">
                        <p className="text-body font-medium text-text-primary">{o.idOutlet}</p>
                        <p className="text-caption text-text-secondary">{o.namaOutlet} — {o.kecamatan}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setShowAddOutlet(true)} className="mt-1.5 text-caption text-primary font-medium hover:underline flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Outlet Baru
            </button>
          </div>

          {/* Auto-fill fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Nomor RS</label>
              <input type="text" value={selectedOutlet?.nomorRS || ''} readOnly className="input-disabled" placeholder="—" />
            </div>
            <div>
              <label className="form-label">Kabupaten</label>
              <input type="text" value={selectedOutlet?.kabupaten || ''} readOnly className="input-disabled" placeholder="—" />
            </div>
          </div>
          <div className="mt-3">
            <label className="form-label">Nama Outlet</label>
            <input type="text" value={selectedOutlet?.namaOutlet || ''} readOnly className="input-disabled" placeholder="—" />
          </div>
        </div>

        {/* ── Section B: Line Items ───────────────── */}
        <div className="card">
          <h3 className="text-label text-primary font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-caption flex items-center justify-center font-bold">B</span>
            Produk
          </h3>

          {items.map((item, idx) => (
            <LineItemForm
              key={item.id}
              item={item}
              index={idx}
              canRemove={items.length > 1}
              virtualProducts={virtualProducts}
              fisikProducts={fisikProducts}
              onSelectProduct={(p) => selectProduct(item.id, p)}
              onUpdate={(updates) => updateItem(item.id, updates)}
              onRemove={() => removeItem(item.id)}
              onCalcSN={() => calculateSNQuantity(item.id)}
            />
          ))}

          <button onClick={addItem} className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-primary font-medium text-body hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 mt-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Produk
          </button>
        </div>

        {/* ── Section C: Owner Info ──────────────── */}
        <div className="card">
          <h3 className="text-label text-primary font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-caption flex items-center justify-center font-bold">C</span>
            Data Owner Outlet
          </h3>

          {/* Nomor WA Owner */}
          <div className="mb-3">
            <label className="form-label">Nomor WA Owner <span className="text-error">*</span></label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
              </span>
              <input
                type="tel"
                value={nomorWaOwner}
                onChange={e => handleWaChange(e.target.value)}
                placeholder="08xx xxxx xxxx"
                maxLength={12}
                className={`input-field pl-11 ${waError ? 'border-error focus:ring-error/20 focus:border-error' : ''}`}
              />
              {isWaValid && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              )}
            </div>
            {waError && <p className="text-[10px] text-error mt-1 flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>{waError}</p>}
            {!waError && nomorWaOwner.length >= 4 && nomorWaOwner.length < 10 && <p className="text-[10px] text-text-secondary mt-1">{nomorWaOwner.length}/10-12 digit</p>}
            <p className="text-[10px] text-text-secondary/50 mt-1">Format: 08xx (Telkomsel, Indosat, XL, 3, Smartfren, dll)</p>
          </div>

          {/* Nama Owner */}
          <div className="mb-3">
            <label className="form-label">Nama Owner <span className="text-error">*</span></label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <input
                type="text"
                value={namaOwner}
                onChange={e => handleNamaOwnerChange(e.target.value)}
                placeholder="Nama lengkap owner outlet"
                className={`input-field pl-11 ${namaError ? 'border-error focus:ring-error/20 focus:border-error' : ''}`}
              />
              {isNamaValid && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              )}
            </div>
            {namaError && <p className="text-[10px] text-error mt-1">{namaError}</p>}
            <p className="text-[10px] text-text-secondary/50 mt-1">Hanya huruf dan spasi yang diperbolehkan</p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────── */}
        <div className="card">
          <div className="mb-3">
            <label className="form-label">Catatan (opsional)</label>
            <textarea value={catatan} onChange={e => setCatatan(e.target.value)} maxLength={500} rows={2}
              className="input-field resize-none" placeholder="Catatan tambahan..." />
            <p className="text-[10px] text-text-secondary text-right mt-1">{catatan.length}/500</p>
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-surface rounded-xl">
            <span className="text-h2 text-text-primary">Grand Total</span>
            <span className="text-h1 text-primary">{formatCurrency(grandTotal)}</span>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canSubmit}
            className="btn-primary w-full mt-4 text-center"
          >
            SUBMIT TRANSAKSI
          </button>
        </div>
      </div>

      {/* ── Confirmation Dialog ──────────────────── */}
      {showConfirm && (
        <div className="overlay" onClick={() => setShowConfirm(false)}>
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white rounded-t-2xl p-5 z-50 animate-slide-up max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <h3 className="text-h2 text-text-primary mb-1">Konfirmasi Transaksi</h3>
            <p className="text-caption text-text-secondary mb-4">Pastikan data berikut sudah benar</p>

            <div className="bg-surface rounded-xl p-3 mb-3">
              <p className="text-caption text-text-secondary">Outlet</p>
              <p className="text-body font-semibold text-text-primary">{selectedOutlet?.namaOutlet}</p>
              <p className="text-caption text-text-secondary">{selectedOutlet?.idOutlet} — {selectedOutlet?.kecamatan}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-surface rounded-xl p-3">
                <p className="text-[10px] text-text-secondary">Owner</p>
                <p className="text-body font-medium text-text-primary">{namaOwner}</p>
              </div>
              <div className="bg-surface rounded-xl p-3">
                <p className="text-[10px] text-text-secondary">WA Owner</p>
                <p className="text-body font-medium text-text-primary">{nomorWaOwner}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {items.filter(i => i.product).map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-body font-medium text-text-primary">{item.product?.namaProduk}</p>
                    <p className="text-caption text-text-secondary">{item.kuantiti}x {formatCurrency(item.hargaSatuan)}</p>
                  </div>
                  <p className="text-body font-semibold text-text-primary">{formatCurrency(item.subTotal)}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-primary/5 rounded-xl border border-primary/20">
              <span className="text-h2 text-text-primary">TOTAL</span>
              <span className="text-h1 text-primary">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => setShowConfirm(false)} className="btn-ghost border border-border py-3 rounded-xl font-semibold">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : '✓'} Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Outlet Modal ─────────────────────── */}
      {showAddOutlet && user && (
        <AddOutletModal
          userTap={user.tap}
          username={user.username}
          onClose={() => setShowAddOutlet(false)}
          onSuccess={async (payload) => {
            const result = await addOutlet(payload);
            if (!result.ok || !result.data?.outlet) {
              showToast(result.message, 'error');
              return;
            }
            selectOutlet(result.data.outlet);
            setShowAddOutlet(false);
            showToast('Outlet berhasil ditambahkan', 'success');
          }}
        />
      )}
    </div>
  );
}

/* ─── LINE ITEM COMPONENT ─────────────────────────── */
function LineItemForm({ item, index, canRemove, virtualProducts, fisikProducts, onSelectProduct, onUpdate, onRemove, onCalcSN }: {
  item: SalesLineItem; index: number; canRemove: boolean;
  virtualProducts: Product[]; fisikProducts: Product[];
  onSelectProduct: (p: Product) => void; onUpdate: (u: Partial<SalesLineItem>) => void;
  onRemove: () => void; onCalcSN: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filterProducts = (list: Product[]) => list.filter(p => p.namaProduk.toLowerCase().includes(search.toLowerCase()) || p.kode.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`${index > 0 ? 'mt-4 pt-4 border-t border-border' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-label text-text-primary font-semibold">Produk {index + 1}</span>
        {canRemove && (
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-error transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        )}
      </div>

      {/* Product dropdown */}
      <div className="mb-3 relative">
        <label className="form-label">Nama Produk <span className="text-error">*</span></label>
        <input
          type="text"
          value={item.product ? `${item.product.kode} — ${item.product.namaProduk}` : search}
          onChange={e => { setSearch(e.target.value); onUpdate({ productId: '', product: undefined, hargaSatuan: 0, subTotal: 0, nominalVirtual: undefined, isManualPrice: false }); setDropdownOpen(true); }}
          onFocus={() => setDropdownOpen(true)}
          placeholder="Cari produk..."
          className="input-field"
        />
        {dropdownOpen && !item.product && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-border max-h-56 overflow-y-auto z-20 animate-scale-in">
            {filterProducts(virtualProducts).length > 0 && (
              <>
                <p className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase bg-purple-50 sticky top-0">Virtual</p>
                {filterProducts(virtualProducts).map(p => (
                  <button key={p.id} onClick={() => { onSelectProduct(p); setDropdownOpen(false); setSearch(''); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-surface transition-colors flex items-center justify-between gap-2">
                    <div>
                      <p className="text-body text-text-primary">{p.namaProduk}</p>
                      <p className="text-caption text-text-secondary">{p.kode} {p.isVirtualNominal ? '· Nominal bebas' : ''}</p>
                    </div>
                    {p.isVirtualNominal ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                        +{p.adminFee === 0 ? 'Gratis' : formatCurrency(p.adminFee ?? 0)}
                      </span>
                    ) : (
                      <span className="text-body font-semibold text-text-primary">{formatCurrency(p.harga)}</span>
                    )}
                  </button>
                ))}
              </>
            )}
            {filterProducts(fisikProducts).length > 0 && (
              <>
                <p className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase bg-orange-50 sticky top-0">Fisik</p>
                {filterProducts(fisikProducts).map(p => (
                  <button key={p.id} onClick={() => { onSelectProduct(p); setDropdownOpen(false); setSearch(''); }}
                    className="w-full text-left px-4 py-2 hover:bg-surface transition-colors flex items-center justify-between">
                    <div><p className="text-body text-text-primary">{p.namaProduk}</p><p className="text-caption text-text-secondary">{p.kode}</p></div>
                    <span className="text-body font-semibold text-text-primary">{formatCurrency(p.harga)}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Virtual Nominal Input */}
      {item.product?.isVirtualNominal && (
        <div className="mb-3 p-3 rounded-xl bg-purple-50/60 border border-purple-100">
          <p className="text-caption font-semibold text-purple-700 mb-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Nominal {item.product.namaProduk}
          </p>
          <div className="relative mb-2">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-caption font-medium">Rp</span>
            <input
              type="text" inputMode="numeric"
              value={(item.nominalVirtual ?? 0) > 0 ? (item.nominalVirtual ?? 0).toLocaleString('id-ID') : ''}
              onChange={e => {
                const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                const fee = item.product?.adminFee ?? 0;
                const total = val + fee;
                onUpdate({ nominalVirtual: val, hargaSatuan: total, subTotal: total, kuantiti: 1 });
              }}
              placeholder={`Min. ${(item.product.minNominal ?? 20000).toLocaleString('id-ID')}`}
              className="input-field pl-10"
            />
          </div>
          {/* Breakdown */}
          {(item.nominalVirtual ?? 0) > 0 && (
            <div className="text-[11px] space-y-1">
              <div className="flex justify-between text-text-secondary">
                <span>Nominal</span><span>{formatCurrency(item.nominalVirtual ?? 0)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Biaya Admin</span>
                <span className={(item.product.adminFee ?? 0) === 0 ? 'text-success' : 'text-primary'}>
                  {(item.product.adminFee ?? 0) === 0 ? 'Gratis' : `+${formatCurrency(item.product.adminFee ?? 0)}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-text-primary border-t border-purple-200 pt-1">
                <span>Total Tagihan</span><span>{formatCurrency(item.subTotal)}</span>
              </div>
            </div>
          )}
          {(item.nominalVirtual ?? 0) > 0 && (item.nominalVirtual ?? 0) < (item.product.minNominal ?? 20000) && (
            <p className="text-[10px] text-error mt-1">⚠️ Minimal nominal {formatCurrency(item.product.minNominal ?? 20000)}</p>
          )}
        </div>
      )}

      {/* Price + Quantity (non-virtual-nominal) */}
      {!item.product?.isVirtualNominal && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="form-label mb-0">Harga Satuan</label>
              {item.product && (
                <label className="flex items-center gap-1.5 text-[10px] text-text-secondary font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(item.isManualPrice)}
                    onChange={(e) => {
                      const defaultPrice = item.product?.harga ?? 0;
                      const nextPrice = e.target.checked ? item.hargaSatuan : defaultPrice;
                      onUpdate({ isManualPrice: e.target.checked, hargaSatuan: nextPrice, subTotal: nextPrice * item.kuantiti });
                    }}
                    className="w-3.5 h-3.5 rounded accent-primary"
                  />
                  Manual
                </label>
              )}
            </div>
            {item.isManualPrice ? (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-caption font-medium">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={item.hargaSatuan > 0 ? item.hargaSatuan.toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const price = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                    onUpdate({ hargaSatuan: price, subTotal: price * item.kuantiti });
                  }}
                  placeholder="0"
                  className="input-field pl-10 font-semibold"
                />
              </div>
            ) : (
              <input type="text" value={item.hargaSatuan ? formatCurrency(item.hargaSatuan) : '---'} readOnly className="input-disabled" />
            )}
          </div>
          <div>
            <label className="form-label">Kuantiti <span className="text-error">*</span></label>
            <input type="number" min={1} value={item.kuantiti}
              onChange={e => { const q = Math.max(1, parseInt(e.target.value) || 1); onUpdate({ kuantiti: q, subTotal: item.hargaSatuan * q }); }}
              className="input-field text-center font-semibold" />
          </div>
        </div>
      )}

      {/* Serial Number (FISIK only) */}
      {item.product?.kategori === 'FISIK' && (
        <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100">
          <p className="text-caption font-semibold text-accent mb-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="12" y2="16"/></svg>
            Serial Number
          </p>
          {/* Mode tabs */}
          <div className="flex gap-2 mb-2.5">
            <button onClick={() => onUpdate({ snMode: 'range' })} className={`flex-1 py-1.5 rounded-lg text-caption font-medium transition-colors ${item.snMode === 'range' ? 'bg-accent text-white' : 'bg-white text-text-secondary border border-border'}`}>
              Rentang SN
            </button>
            <button onClick={() => onUpdate({ snMode: 'scan' })} className={`flex-1 py-1.5 rounded-lg text-caption font-medium transition-colors ${item.snMode === 'scan' ? 'bg-accent text-white' : 'bg-white text-text-secondary border border-border'}`}>
              📷 Scan
            </button>
          </div>
          {item.snMode === 'range' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="SN Awal" value={item.snAwal} onChange={e => onUpdate({ snAwal: e.target.value })} className="input-field text-caption" />
              <input type="text" placeholder="SN Akhir" value={item.snAkhir} onChange={e => onUpdate({ snAkhir: e.target.value })} className="input-field text-caption" />
              <button onClick={onCalcSN} className="col-span-2 py-2 bg-accent/10 text-accent rounded-lg text-caption font-medium hover:bg-accent/20 transition-colors">
                Hitung Kuantiti
              </button>
            </div>
          )}
          {item.snMode === 'scan' && (
            <button className="w-full py-3 bg-white border border-border rounded-xl text-body text-text-secondary hover:bg-surface transition-colors flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
              Buka Kamera Scanner
            </button>
          )}
        </div>
      )}

      {/* Subtotal */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <span className="text-caption text-text-secondary">Subtotal</span>
        <span className="text-body font-bold text-text-primary">{formatCurrency(item.subTotal)}</span>
      </div>
    </div>
  );
}

/* ─── ADD OUTLET MODAL ────────────────────────────── */
function AddOutletModal({ userTap, username, onClose, onSuccess }: { userTap: string; username: string; onClose: () => void; onSuccess: (outlet: Omit<Outlet, 'id' | 'createdAt'>) => void }) {
  const [form, setForm] = useState({ idOutlet: '', nomorRS: '', namaOutlet: '', kabupaten: '', kecamatan: '' });

  const handleSave = () => {
    if (!form.idOutlet || !form.nomorRS || !form.namaOutlet || !form.kabupaten || !form.kecamatan) return;
    const newOutlet = {
      ...form, tap: userTap, salesforceUsername: username, isManual: true,
    };
    onSuccess(newOutlet);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-lg lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
        <h3 className="text-h2 text-text-primary mb-1">Tambah Outlet Baru</h3>
        <p className="text-caption text-text-secondary mb-4">TAP: {userTap} - Salesforce: @{username}</p>
        <div className="space-y-3">
          {(['idOutlet', 'nomorRS', 'namaOutlet', 'kabupaten', 'kecamatan'] as const).map(field => (
            <div key={field}>
              <label className="form-label">{field === 'idOutlet' ? 'ID Outlet' : field === 'nomorRS' ? 'Nomor RS' : field === 'namaOutlet' ? 'Nama Outlet' : field.charAt(0).toUpperCase() + field.slice(1)} <span className="text-error">*</span></label>
              <input type="text" value={form[field]} onChange={e => setForm(prev => ({...prev, [field]: e.target.value}))} className="input-field" placeholder={`Masukkan ${field}`} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost border border-border py-3 rounded-xl font-semibold">Batal</button>
          <button onClick={handleSave} className="btn-primary">Simpan</button>
        </div>
      </div>
    </div>
  );
}
