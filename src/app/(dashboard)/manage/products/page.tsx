'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency } from '@/lib/app-data';
import { downloadCsv, parseBoolean, parseCsv, parseNumber } from '@/lib/csv';
import type { Product } from '@/types';

type ProductFormState = {
  kode: string;
  kategori: 'VIRTUAL' | 'FISIK';
  namaProduk: string;
  harga: string;
  isVirtualNominal: boolean;
  brand: 'LINKAJA' | 'FINPAY' | '';
  adminFee: string;
  minNominal: string;
};

const emptyForm: ProductFormState = {
  kode: '',
  kategori: 'FISIK',
  namaProduk: '',
  harga: '',
  isVirtualNominal: false,
  brand: '',
  adminFee: '0',
  minNominal: '20000',
};

type ProductImportRow = {
  kode: string;
  kategori: 'VIRTUAL' | 'FISIK';
  namaProduk: string;
  harga: number;
  isActive: boolean;
  isVirtualNominal: boolean;
  brand?: 'LINKAJA' | 'FINPAY';
  adminFee?: number;
  minNominal?: number;
};

const productCsvHeaders = ['kode', 'kategori', 'namaProduk', 'harga', 'isActive', 'isVirtualNominal', 'brand', 'adminFee', 'minNominal'];

const normalizeProductCategory = (value: string | undefined): 'VIRTUAL' | 'FISIK' => (
  String(value ?? '').trim().toUpperCase() === 'VIRTUAL' ? 'VIRTUAL' : 'FISIK'
);

const normalizeProductBrand = (value: string | undefined): 'LINKAJA' | 'FINPAY' | undefined => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized === 'LINKAJA' || normalized === 'FINPAY' ? normalized : undefined;
};

export default function ManageProductsPage() {
  const { user, products, showToast, upsertProduct, toggleProductActive } = useAppStore();
  const [filterKategori, setFilterKategori] = useState<'ALL' | 'VIRTUAL' | 'FISIK'>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ProductImportRow[]>([]);

  const isAdminOrAbove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const filtered = useMemo(
    () => filterKategori === 'ALL' ? products : products.filter((item) => item.kategori === filterKategori),
    [filterKategori, products],
  );

  const handleToggle = async (product: Product) => {
    if (!(await toggleProductActive(product.id))) return;
    showToast(`Produk ${product.namaProduk} ${product.isActive ? 'dinonaktifkan' : 'diaktifkan'}`, 'success');
  };

  const handleDownloadData = () => {
    if (filtered.length === 0) {
      showToast('Tidak ada data produk untuk didownload', 'warning');
      return;
    }
    downloadCsv(
      `produk-${new Date().toISOString().slice(0, 10)}.csv`,
      productCsvHeaders,
      filtered.map((product) => [
        product.kode,
        product.kategori,
        product.namaProduk,
        product.harga,
        product.isActive,
        Boolean(product.isVirtualNominal),
        product.brand ?? '',
        product.adminFee ?? '',
        product.minNominal ?? '',
      ]),
    );
    showToast('Download data produk berhasil', 'success');
  };

  const handleDownloadTemplate = () => {
    downloadCsv('template-produk.csv', productCsvHeaders, [
      ['FIS-001', 'FISIK', 'Perdana Telkomsel', 5000, true, false, '', '', ''],
      ['VIR-LINKAJA', 'VIRTUAL', 'LinkAja Nominal Bebas', 0, true, true, 'LINKAJA', 2000, 20000],
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
    const parsed = rows.map((row) => {
      const kategori = normalizeProductCategory(row.kategori);
      const isVirtualNominal = kategori === 'VIRTUAL' ? parseBoolean(row.isVirtualNominal, true) : false;
      return {
        kode: String(row.kode ?? '').trim().toUpperCase(),
        kategori,
        namaProduk: String(row.namaProduk ?? '').trim(),
        harga: kategori === 'FISIK' ? parseNumber(row.harga) : 0,
        isActive: parseBoolean(row.isActive, true),
        isVirtualNominal,
        brand: normalizeProductBrand(row.brand),
        adminFee: isVirtualNominal ? parseNumber(row.adminFee) : undefined,
        minNominal: isVirtualNominal ? parseNumber(row.minNominal, 20000) : undefined,
      };
    }).filter((row) => row.kode && row.namaProduk);
    if (parsed.length === 0) {
      showToast('Tidak ada data produk yang terbaca', 'error');
      return;
    }
    setImportRows(parsed);
    setShowImport(true);
  };

  const confirmImport = async () => {
    const failures: string[] = [];
    for (const row of importRows) {
      const existing = products.find((product) => product.kode.toUpperCase() === row.kode.toUpperCase());
      const result = await upsertProduct(existing?.id ?? null, {
        kode: row.kode,
        kategori: row.kategori,
        namaProduk: row.namaProduk,
        harga: row.harga,
        isActive: row.isActive,
        isVirtualNominal: row.isVirtualNominal,
        brand: row.brand,
        adminFee: row.adminFee,
        minNominal: row.minNominal,
      });
      if (!result.ok) failures.push(`${row.kode}: ${result.message}`);
    }
    if (failures.length > 0) {
      showToast(`${failures.length} baris gagal. ${failures[0]}`, 'error');
      return;
    }
    setShowImport(false);
    setImportRows([]);
    showToast(`${importRows.length} produk berhasil diupload`, 'success');
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b border-border px-4 py-3 sticky top-[52px] lg:top-[53px] z-20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-h2 text-text-primary">Manajemen Produk</h2>
            <p className="text-caption text-text-secondary">{filtered.length} produk</p>
          </div>
          {isAdminOrAbove && (
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
              <button onClick={() => { setEditingProduct(null); setShowForm(true); }} className="px-3 py-2 rounded-xl bg-primary text-white text-caption font-semibold">
                Tambah Produk
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          {(['ALL', 'VIRTUAL', 'FISIK'] as const).map((item) => (
            <button key={item} onClick={() => setFilterKategori(item)} className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-colors ${filterKategori === item ? 'bg-primary/10 text-primary' : 'bg-surface text-text-secondary hover:bg-slate-100'}`}>
              {item === 'ALL' ? 'Semua' : item}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-body text-text-secondary">Belum ada produk tersimpan</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((product) => (
              <div key={product.id} className={`card p-4 border transition-all ${product.isActive ? 'border-transparent hover:border-primary/20' : 'border-slate-200 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${product.kategori === 'FISIK' ? 'bg-amber-50' : 'bg-purple-50'}`}>
                    <span className={`text-xs font-bold ${product.kategori === 'FISIK' ? 'text-amber-700' : 'text-purple-700'}`}>{product.kategori === 'FISIK' ? 'F' : 'V'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-body font-semibold text-text-primary">{product.namaProduk}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${product.kategori === 'VIRTUAL' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'}`}>{product.kategori}</span>
                      {!product.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Nonaktif</span>}
                    </div>
                    <p className="text-caption text-text-secondary mt-0.5">{product.kode}</p>
                    {product.isVirtualNominal ? (
                      <div className="mt-2 text-caption text-text-secondary space-y-1">
                        <p>Min. nominal: <span className="font-semibold text-text-primary">{formatCurrency(product.minNominal ?? 20000)}</span></p>
                        <p>Biaya admin: <span className="font-semibold text-text-primary">{(product.adminFee ?? 0) === 0 ? 'Gratis' : formatCurrency(product.adminFee ?? 0)}</span></p>
                      </div>
                    ) : (
                      <p className="text-body font-bold text-text-primary mt-1">{formatCurrency(product.harga)}</p>
                    )}
                  </div>
                  {isAdminOrAbove && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => { setEditingProduct(product); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-primary transition-colors">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleToggle(product)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-error transition-colors">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ProductModal
          product={editingProduct}
          onClose={() => setShowForm(false)}
          onSave={async (payload) => {
            const result = await upsertProduct(editingProduct?.id ?? null, payload);
            if (!result.ok) {
              showToast(result.message, 'error');
              return;
            }
            setShowForm(false);
            showToast(result.message, 'success');
          }}
        />
      )}

      {showImport && (
        <div className="overlay" onClick={() => setShowImport(false)}>
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-2xl lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
            <h3 className="text-h2 text-text-primary mb-1">Preview Upload Produk</h3>
            <p className="text-caption text-text-secondary mb-4">{importRows.length} baris siap diupload</p>
            <div className="space-y-2">
              {importRows.map((row, index) => (
                <div key={`${row.kode}-${index}`} className="rounded-xl border border-border p-3">
                  <p className="text-body font-semibold text-text-primary">{row.namaProduk}</p>
                  <p className="text-caption text-text-secondary">{row.kode} - {row.kategori} - {row.isActive ? 'Aktif' : 'Nonaktif'}</p>
                  <p className="text-caption text-text-secondary">
                    {row.isVirtualNominal
                      ? `Admin ${formatCurrency(row.adminFee ?? 0)} - Min ${formatCurrency(row.minNominal ?? 20000)}`
                      : formatCurrency(row.harga)}
                  </p>
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

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (payload: {
    kode: string;
    kategori: 'VIRTUAL' | 'FISIK';
    namaProduk: string;
    harga: number;
    isVirtualNominal?: boolean;
    brand?: 'LINKAJA' | 'FINPAY';
    adminFee?: number;
    minNominal?: number;
  }) => void;
}) {
  const [form, setForm] = useState<ProductFormState>({
    kode: product?.kode ?? '',
    kategori: product?.kategori ?? 'FISIK',
    namaProduk: product?.namaProduk ?? '',
    harga: product ? String(product.harga) : '',
    isVirtualNominal: product?.isVirtualNominal ?? false,
    brand: product?.brand ?? '',
    adminFee: String(product?.adminFee ?? 0),
    minNominal: String(product?.minNominal ?? 20000),
  });

  const isVirtual = form.kategori === 'VIRTUAL';

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile lg:max-w-lg lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 bg-white rounded-t-2xl lg:rounded-2xl p-5 z-50 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />
        <h3 className="text-h2 text-text-primary mb-4">{product ? 'Edit Produk' : 'Tambah Produk'}</h3>
        <div className="space-y-3">
          <div>
            <label className="form-label">Kode Produk</label>
            <input type="text" value={form.kode} onChange={(e) => setForm((prev) => ({ ...prev, kode: e.target.value.toUpperCase() }))} className="input-field" />
          </div>
          <div>
            <label className="form-label">Nama Produk</label>
            <input type="text" value={form.namaProduk} onChange={(e) => setForm((prev) => ({ ...prev, namaProduk: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="form-label">Kategori</label>
            <select value={form.kategori} onChange={(e) => setForm((prev) => ({ ...prev, kategori: e.target.value as 'VIRTUAL' | 'FISIK', isVirtualNominal: e.target.value === 'VIRTUAL' }))} className="input-field">
              <option value="FISIK">FISIK</option>
              <option value="VIRTUAL">VIRTUAL</option>
            </select>
          </div>
          {isVirtual ? (
            <>
              <div>
                <label className="form-label">Brand</label>
                <select value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value as 'LINKAJA' | 'FINPAY' }))} className="input-field">
                  <option value="">Pilih Brand</option>
                  <option value="LINKAJA">LINKAJA</option>
                  <option value="FINPAY">FINPAY</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Biaya Admin</label>
                  <input type="number" value={form.adminFee} onChange={(e) => setForm((prev) => ({ ...prev, adminFee: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="form-label">Min. Nominal</label>
                  <input type="number" value={form.minNominal} onChange={(e) => setForm((prev) => ({ ...prev, minNominal: e.target.value }))} className="input-field" />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="form-label">Harga</label>
              <input type="number" value={form.harga} onChange={(e) => setForm((prev) => ({ ...prev, harga: e.target.value }))} className="input-field" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost border border-border py-3 rounded-xl font-semibold">Batal</button>
          <button
            onClick={() => onSave({
              kode: form.kode,
              kategori: form.kategori,
              namaProduk: form.namaProduk,
              harga: Number(form.harga) || 0,
              isVirtualNominal: isVirtual,
              brand: form.brand || undefined,
              adminFee: isVirtual ? Number(form.adminFee) || 0 : undefined,
              minNominal: isVirtual ? Number(form.minNominal) || 20000 : undefined,
            })}
            className="btn-primary"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
