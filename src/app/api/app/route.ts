import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { getCurrentUser } from '@/lib/session';
import { getBootstrapData } from '@/lib/server-data';

const normalizeTaps = (taps: unknown, fallbackTap: string) => {
  const list = Array.isArray(taps) ? taps.map(String).filter(Boolean) : [];
  const unique = Array.from(new Set(list));
  if (unique.includes('ALL')) return ['ALL'];
  return unique.length > 0 ? unique : [fallbackTap];
};

const requireAdmin = (role: string) => role === 'SUPER_ADMIN' || role === 'ADMIN';

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
  }

  const body = await request.json();
  const action = String(body.action ?? '');
  const payload = body.payload ?? {};

  try {
    switch (action) {
      case 'addUser': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const role = String(payload.role ?? 'SALESFORCE') as 'SUPER_ADMIN' | 'ADMIN' | 'SALESFORCE';
        if (currentUser.role !== 'SUPER_ADMIN' && role !== 'SALESFORCE') {
          return NextResponse.json({ message: 'Admin hanya bisa membuat user Salesforce' }, { status: 403 });
        }
        const tap = String(payload.tap ?? '').trim();
        await prisma.user.create({
          data: {
            nama: String(payload.nama ?? '').trim(),
            username: String(payload.username ?? '').trim().toLowerCase(),
            passwordHash: hashPassword(String(payload.password ?? '')),
            role,
            tap,
            allowedTaps: role === 'SALESFORCE' ? [tap] : normalizeTaps(payload.allowedTaps, tap),
            isActive: Boolean(payload.isActive ?? true),
            mustChangePassword: Boolean(payload.mustChangePassword ?? true),
          },
        });
        break;
      }
      case 'updateUser': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const userId = String(payload.userId ?? '');
        const role = String(payload.role ?? 'SALESFORCE') as 'SUPER_ADMIN' | 'ADMIN' | 'SALESFORCE';
        if (currentUser.role !== 'SUPER_ADMIN' && role !== 'SALESFORCE') {
          return NextResponse.json({ message: 'Admin hanya bisa mengubah user Salesforce' }, { status: 403 });
        }
        const tap = String(payload.tap ?? '').trim();
        await prisma.user.update({
          where: { id: userId },
          data: {
            nama: String(payload.nama ?? '').trim(),
            username: String(payload.username ?? '').trim().toLowerCase(),
            role,
            tap,
            allowedTaps: role === 'SALESFORCE' ? [tap] : normalizeTaps(payload.allowedTaps, tap),
            isActive: Boolean(payload.isActive),
          },
        });
        break;
      }
      case 'resetUserPassword': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const target = await prisma.user.findUnique({ where: { id: String(payload.targetUserId ?? '') } });
        if (!target || target.id === currentUser.id) return NextResponse.json({ message: 'User tidak valid' }, { status: 400 });
        if (currentUser.role === 'ADMIN' && target.role !== 'SALESFORCE') {
          return NextResponse.json({ message: 'Admin hanya bisa reset password Salesforce' }, { status: 403 });
        }
        const newPassword = generatePassword();
        await prisma.user.update({
          where: { id: target.id },
          data: {
            passwordHash: hashPassword(newPassword),
            mustChangePassword: true,
          },
        });
        return NextResponse.json({
          ...(await getBootstrapData(currentUser)),
          newPassword,
        });
      }
      case 'upsertProduct': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const productId = payload.productId ? String(payload.productId) : null;
        const kategori = String(payload.kategori ?? 'FISIK') as 'VIRTUAL' | 'FISIK';
        const data = {
          kode: String(payload.kode ?? '').trim().toUpperCase(),
          kategori,
          namaProduk: String(payload.namaProduk ?? '').trim(),
          harga: kategori === 'FISIK' ? Number(payload.harga ?? 0) : 0,
          isActive: Boolean(payload.isActive ?? true),
          isVirtualNominal: Boolean(payload.isVirtualNominal && kategori === 'VIRTUAL'),
          brand: payload.brand ? String(payload.brand) as 'LINKAJA' | 'FINPAY' : null,
          adminFee: payload.isVirtualNominal ? Number(payload.adminFee ?? 0) : null,
          minNominal: payload.isVirtualNominal ? Number(payload.minNominal ?? 20000) : null,
        };
        if (productId) await prisma.product.update({ where: { id: productId }, data });
        else await prisma.product.create({ data });
        break;
      }
      case 'toggleProductActive': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const product = await prisma.product.findUnique({ where: { id: String(payload.productId ?? '') } });
        if (!product) return NextResponse.json({ message: 'Produk tidak ditemukan' }, { status: 404 });
        await prisma.product.update({ where: { id: product.id }, data: { isActive: !product.isActive } });
        break;
      }
      case 'addOutlet': {
        const tap = String(payload.tap ?? currentUser.tap).trim();
        await prisma.outlet.create({
          data: {
            idOutlet: String(payload.idOutlet ?? '').trim().toUpperCase(),
            nomorRS: String(payload.nomorRS ?? '').trim(),
            namaOutlet: String(payload.namaOutlet ?? '').trim(),
            tap,
            kabupaten: String(payload.kabupaten ?? '').trim(),
            kecamatan: String(payload.kecamatan ?? '').trim(),
            isManual: Boolean(payload.isManual ?? true),
          },
        });
        break;
      }
      case 'updateOutlet': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        await prisma.outlet.update({
          where: { id: String(payload.outletId ?? '') },
          data: {
            idOutlet: String(payload.idOutlet ?? '').trim().toUpperCase(),
            nomorRS: String(payload.nomorRS ?? '').trim(),
            namaOutlet: String(payload.namaOutlet ?? '').trim(),
            tap: String(payload.tap ?? '').trim(),
            kabupaten: String(payload.kabupaten ?? '').trim(),
            kecamatan: String(payload.kecamatan ?? '').trim(),
            isManual: Boolean(payload.isManual ?? true),
          },
        });
        break;
      }
      case 'submitTransaction': {
        const items = Array.isArray(payload.items) ? payload.items : [];
        const now = new Date();
        const serialDay = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const countToday = await prisma.transaction.count({
          where: {
            nomorTransaksi: {
              startsWith: `TRX-${serialDay}`,
            },
          },
        });
        await prisma.transaction.create({
          data: {
            nomorTransaksi: `TRX-${serialDay}-${String(countToday + 1).padStart(4, '0')}`,
            outletId: String(payload.outletId ?? ''),
            salesforceId: currentUser.id,
            status: 'COMPLETED',
            totalTagihan: items.reduce((sum: number, item: any) => sum + Number(item.subTotal ?? 0), 0),
            ownerName: String(payload.ownerName ?? '').trim(),
            ownerPhone: String(payload.ownerPhone ?? '').trim(),
            catatan: payload.catatan ? String(payload.catatan).trim() : null,
            submittedAt: now,
            items: {
              create: items.map((item: any) => ({
                productId: String(item.productId ?? ''),
                hargaSatuan: Number(item.hargaSatuan ?? 0),
                kuantiti: Number(item.kuantiti ?? 1),
                subTotal: Number(item.subTotal ?? 0),
                snAwal: item.snAwal ? String(item.snAwal) : null,
                snAkhir: item.snAkhir ? String(item.snAkhir) : null,
                serialNumbers: Array.isArray(item.scannedSNs) && item.scannedSNs.length > 0 ? item.scannedSNs : undefined,
              })),
            },
          },
        });
        break;
      }
      case 'requestCancelTransaction': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        await prisma.transaction.update({
          where: { id: String(payload.trxId ?? '') },
          data: {
            status: 'PENDING_CANCEL',
            cancelReason: String(payload.reason ?? '').trim(),
            cancelRequestedBy: currentUser.id,
            cancelRequestedAt: new Date(),
            cancelInitiatedBy: 'ADMIN',
          },
        });
        break;
      }
      case 'approveCancelTransaction': {
        await prisma.transaction.update({
          where: { id: String(payload.trxId ?? '') },
          data: { status: 'CANCELLED', cancelApprovedAt: new Date() },
        });
        break;
      }
      case 'rejectCancelTransaction':
      case 'rejectCancelBySalesforce': {
        await prisma.transaction.update({
          where: { id: String(payload.trxId ?? '') },
          data: {
            status: 'COMPLETED',
            cancelReason: null,
            cancelRequestedBy: null,
            cancelRequestedAt: null,
            cancelApprovedAt: null,
            cancelInitiatedBy: null,
          },
        });
        break;
      }
      case 'requestCancelBySalesforce': {
        await prisma.transaction.update({
          where: { id: String(payload.trxId ?? '') },
          data: {
            status: 'PENDING_CANCEL',
            cancelReason: String(payload.reason ?? '').trim(),
            cancelRequestedBy: currentUser.id,
            cancelRequestedAt: new Date(),
            cancelInitiatedBy: 'SALESFORCE',
          },
        });
        break;
      }
      case 'approveCancelBySalesforce': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        await prisma.transaction.update({
          where: { id: String(payload.trxId ?? '') },
          data: { status: 'CANCELLED', cancelApprovedAt: new Date() },
        });
        break;
      }
      default:
        return NextResponse.json({ message: 'Aksi tidak dikenal' }, { status: 400 });
    }

    const refreshedUser = await prisma.user.findUnique({ where: { id: currentUser.id } });
    return NextResponse.json(await getBootstrapData(refreshedUser));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return NextResponse.json({ message }, { status: 500 });
  }
}
