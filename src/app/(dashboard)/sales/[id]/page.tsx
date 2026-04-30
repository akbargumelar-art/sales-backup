'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/app-data';

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { transactions } = useAppStore();
  const trx = transactions.find(t => t.id === params.id);

  if (!trx) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <p className="text-body text-text-secondary mb-4">Transaksi tidak ditemukan</p>
        <button onClick={() => router.back()} className="btn-outline text-caption">Kembali</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 sticky top-[52px] z-20">
        <button onClick={() => router.back()} className="p-1 rounded-lg hover:bg-surface transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="text-h2 text-text-primary">Detail Transaksi</h2>
      </div>

      <div className="p-4 space-y-3">
        {/* Status Card */}
        <div className={`card p-4 ${trx.status === 'COMPLETED' ? 'bg-green-50 border border-green-200' : trx.status === 'CANCELLED' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-text-secondary">Status</p>
              <span className={`${getStatusColor(trx.status)} mt-1 inline-block`}>{getStatusLabel(trx.status)}</span>
            </div>
            <div className="text-right">
              <p className="text-caption text-text-secondary">No. Transaksi</p>
              <p className="text-body font-semibold text-text-primary mt-0.5">{trx.nomorTransaksi}</p>
            </div>
          </div>
        </div>

        {/* Outlet Info */}
        <div className="card">
          <h3 className="text-label text-text-secondary font-semibold mb-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            Outlet
          </h3>
          <p className="text-body font-semibold text-text-primary">{trx.outlet.namaOutlet}</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div><p className="text-[10px] text-text-secondary">ID Outlet</p><p className="text-caption font-medium">{trx.outlet.idOutlet}</p></div>
            <div><p className="text-[10px] text-text-secondary">Nomor RS</p><p className="text-caption font-medium">{trx.outlet.nomorRS}</p></div>
            <div><p className="text-[10px] text-text-secondary">Kabupaten</p><p className="text-caption font-medium">{trx.outlet.kabupaten}</p></div>
            <div><p className="text-[10px] text-text-secondary">Kecamatan</p><p className="text-caption font-medium">{trx.outlet.kecamatan}</p></div>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <h3 className="text-label text-text-secondary font-semibold mb-3 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
            Produk ({trx.items.length})
          </h3>
          <div className="space-y-3">
            {trx.items.map(item => (
              <div key={item.id} className="p-3 bg-surface rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-body font-medium text-text-primary">{item.product.namaProduk}</p>
                    <span className={item.product.kategori === 'VIRTUAL' ? 'badge-virtual' : 'badge-fisik'}>{item.product.kategori}</span>
                  </div>
                  <p className="text-body font-bold text-text-primary">{formatCurrency(item.subTotal)}</p>
                </div>
                <div className="flex items-center gap-4 mt-2 text-caption text-text-secondary">
                  <span>{item.kuantiti}x {formatCurrency(item.hargaSatuan)}</span>
                  {item.snAwal && <span>SN: {item.snAwal} — {item.snAkhir}</span>}
                </div>
                {item.priceChangeReason && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 text-[11px] text-amber-700">
                    <p>Harga master: {formatCurrency(item.hargaAwal ?? item.product.harga)}</p>
                    <p><strong>Alasan rubah harga:</strong> {item.priceChangeReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-h2 text-text-primary">Total</span>
            <span className="text-h1 text-primary">{formatCurrency(trx.totalTagihan)}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="card">
          <h3 className="text-label text-text-secondary font-semibold mb-2">Informasi</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-caption"><span className="text-text-secondary">Salesforce</span><span className="font-medium">{trx.salesforce.nama}</span></div>
            <div className="flex justify-between text-caption"><span className="text-text-secondary">TAP</span><span className="font-medium">{trx.salesforce.tap}</span></div>
            <div className="flex justify-between text-caption"><span className="text-text-secondary">Owner Outlet</span><span className="font-medium">{trx.ownerName}</span></div>
            <div className="flex justify-between text-caption"><span className="text-text-secondary">WA Owner</span><span className="font-medium">{trx.ownerPhone}</span></div>
            <div className="flex justify-between text-caption"><span className="text-text-secondary">Diajukan</span><span className="font-medium">{formatDateTime(trx.submittedAt)}</span></div>
            {trx.confirmedAt && <div className="flex justify-between text-caption"><span className="text-text-secondary">Dikonfirmasi</span><span className="font-medium">{formatDateTime(trx.confirmedAt)}</span></div>}
            {trx.catatan && <div className="pt-2 border-t border-border/50"><p className="text-[10px] text-text-secondary mb-0.5">Catatan</p><p className="text-caption text-text-primary">{trx.catatan}</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
