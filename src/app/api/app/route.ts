import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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
const requireSuperAdmin = (role: string) => role === 'SUPER_ADMIN';

const normalizeTapCode = (value: unknown) => {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!raw) return '';
  return raw.startsWith('TAP-') ? raw : `TAP-${raw}`;
};

const normalizeTapName = (value: unknown, kode: string) => {
  const name = String(value ?? '').trim();
  return name || kode.replace(/^TAP-/, '').replace(/-/g, ' ');
};

const normalizeUsername = (value: unknown) => String(value ?? '').trim().toLowerCase();

const normalizeOutletSalesforceUsername = (value: unknown, currentUser: { role: string; username: string }) => {
  if (currentUser.role === 'SALESFORCE') return currentUser.username;
  const username = normalizeUsername(value);
  return username || null;
};

const normalizeOutletPayload = (payload: any, currentUser: { role: string; username: string; tap: string }) => ({
  idOutlet: String(payload.idOutlet ?? '').trim().toUpperCase(),
  nomorRS: String(payload.nomorRS ?? '').trim(),
  namaOutlet: String(payload.namaOutlet ?? '').trim(),
  tap: String(payload.tap ?? currentUser.tap).trim(),
  salesforceUsername: normalizeOutletSalesforceUsername(payload.salesforceUsername, currentUser),
  kabupaten: String(payload.kabupaten ?? '').trim(),
  kecamatan: String(payload.kecamatan ?? '').trim(),
  isManual: Boolean(payload.isManual ?? true),
});

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
  let responseOutletId: string | null = null;

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
        const existingUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
        const username = normalizeUsername(payload.username);
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              nama: String(payload.nama ?? '').trim(),
              username,
              role,
              tap,
              allowedTaps: role === 'SALESFORCE' ? [tap] : normalizeTaps(payload.allowedTaps, tap),
              isActive: Boolean(payload.isActive),
            },
          });

          if (existingUser.username !== username) {
            await tx.outlet.updateMany({
              where: { salesforceUsername: existingUser.username },
              data: { salesforceUsername: username },
            });
          }
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
      case 'addTap': {
        if (!requireSuperAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const kode = normalizeTapCode(payload.kode);
        const nama = normalizeTapName(payload.nama, kode);
        if (!kode || !nama) return NextResponse.json({ message: 'Kode dan nama TAP wajib diisi' }, { status: 400 });
        await prisma.tap.create({
          data: {
            kode,
            nama,
            isActive: Boolean(payload.isActive ?? true),
          },
        });
        break;
      }
      case 'updateTap': {
        if (!requireSuperAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const tapId = String(payload.tapId ?? '');
        const kode = normalizeTapCode(payload.kode);
        const nama = normalizeTapName(payload.nama, kode);
        if (!tapId || !kode || !nama) return NextResponse.json({ message: 'Data TAP tidak valid' }, { status: 400 });

        const existingTap = await prisma.tap.findUnique({ where: { id: tapId } });
        if (!existingTap) return NextResponse.json({ message: 'TAP tidak ditemukan' }, { status: 404 });

        const nextIsActive = Boolean(payload.isActive ?? true);
        if (!nextIsActive) {
          const otherActiveCount = await prisma.tap.count({ where: { isActive: true, NOT: { id: tapId } } });
          if (otherActiveCount === 0) return NextResponse.json({ message: 'Minimal harus ada satu TAP aktif' }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
          await tx.tap.update({
            where: { id: tapId },
            data: { kode, nama, isActive: nextIsActive },
          });

          if (existingTap.kode !== kode) {
            await tx.user.updateMany({ where: { tap: existingTap.kode }, data: { tap: kode } });
            await tx.outlet.updateMany({ where: { tap: existingTap.kode }, data: { tap: kode } });

            const users = await tx.user.findMany({ select: { id: true, allowedTaps: true } });
            await Promise.all(users.map((userItem) => {
              const allowedTaps = Array.isArray(userItem.allowedTaps) ? userItem.allowedTaps.map(String) : [];
              if (!allowedTaps.includes(existingTap.kode)) return null;
              const nextAllowedTaps = Array.from(new Set(allowedTaps.map((tap) => tap === existingTap.kode ? kode : tap)));
              return tx.user.update({ where: { id: userItem.id }, data: { allowedTaps: nextAllowedTaps } });
            }));
          }
        });
        break;
      }
      case 'toggleTapActive': {
        if (!requireSuperAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const tap = await prisma.tap.findUnique({ where: { id: String(payload.tapId ?? '') } });
        if (!tap) return NextResponse.json({ message: 'TAP tidak ditemukan' }, { status: 404 });
        if (tap.isActive) {
          const otherActiveCount = await prisma.tap.count({ where: { isActive: true, NOT: { id: tap.id } } });
          if (otherActiveCount === 0) return NextResponse.json({ message: 'Minimal harus ada satu TAP aktif' }, { status: 400 });
        }
        await prisma.tap.update({ where: { id: tap.id }, data: { isActive: !tap.isActive } });
        break;
      }
      case 'upsertProduct': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const productId = payload.productId ? String(payload.productId) : null;
        const kategori = String(payload.kategori ?? 'FISIK') as 'VIRTUAL' | 'FISIK';
        const productKode = String(payload.kode ?? '').trim().toUpperCase();
        // Check for duplicate product code before create/update
        if (productKode) {
          const existingProduct = await prisma.product.findUnique({ where: { kode: productKode } });
          if (existingProduct && existingProduct.id !== productId) {
            return NextResponse.json({ message: 'Kode produk sudah digunakan' }, { status: 409 });
          }
        }
        const data = {
          kode: productKode,
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
        const data = normalizeOutletPayload(payload, currentUser);
        if (!data.idOutlet || !data.nomorRS || !data.namaOutlet || !data.tap || !data.kabupaten || !data.kecamatan) {
          return NextResponse.json({ message: 'Data outlet belum lengkap' }, { status: 400 });
        }

        const existingOutlet = await prisma.outlet.findUnique({ where: { idOutlet: data.idOutlet } });
        if (
          existingOutlet &&
          currentUser.role === 'SALESFORCE' &&
          existingOutlet.salesforceUsername &&
          existingOutlet.salesforceUsername.toLowerCase() !== currentUser.username.toLowerCase()
        ) {
          return NextResponse.json({ message: 'ID Outlet sudah terdaftar untuk user lain. Pilih outlet dari daftar atau hubungi admin.' }, { status: 409 });
        }

        const outlet = await prisma.outlet.upsert({
          where: { idOutlet: data.idOutlet },
          update: data,
          create: data,
        });
        responseOutletId = outlet.id;
        break;
      }
      case 'updateOutlet': {
        if (!requireAdmin(currentUser.role)) return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
        const outletId = String(payload.outletId ?? '');
        const data = normalizeOutletPayload(payload, currentUser);
        if (!data.idOutlet || !data.nomorRS || !data.namaOutlet || !data.tap || !data.kabupaten || !data.kecamatan) {
          return NextResponse.json({ message: 'Data outlet belum lengkap' }, { status: 400 });
        }

        const [outletById, outletByIdOutlet] = await Promise.all([
          outletId ? prisma.outlet.findUnique({ where: { id: outletId } }) : null,
          prisma.outlet.findUnique({ where: { idOutlet: data.idOutlet } }),
        ]);

        if (outletById && outletByIdOutlet && outletById.id !== outletByIdOutlet.id) {
          return NextResponse.json({ message: 'ID Outlet sudah dipakai outlet lain' }, { status: 409 });
        }

        const targetOutlet = outletById ?? outletByIdOutlet;
        if (!targetOutlet) return NextResponse.json({ message: 'Outlet tidak ditemukan' }, { status: 404 });

        const outlet = await prisma.outlet.update({
          where: { id: targetOutlet.id },
          data,
        });
        responseOutletId = outlet.id;
        break;
      }
      case 'submitTransaction': {
        const items: any[] = Array.isArray(payload.items) ? payload.items : [];
        const outletId = String(payload.outletId ?? '').trim();
        const idOutlet = String(payload.idOutlet ?? '').trim().toUpperCase();

        // Server-side transaction validation
        if (items.length === 0) {
          return NextResponse.json({ message: 'Transaksi harus memiliki minimal 1 item produk.' }, { status: 400 });
        }
        const ownerName = String(payload.ownerName ?? '').trim();
        const ownerPhone = String(payload.ownerPhone ?? '').trim();
        if (!ownerName || !ownerPhone) {
          return NextResponse.json({ message: 'Nama dan nomor HP pemilik outlet wajib diisi.' }, { status: 400 });
        }
        for (const item of items) {
          if (Number(item.kuantiti ?? 0) < 1) {
            return NextResponse.json({ message: 'Kuantitas setiap item harus minimal 1.' }, { status: 400 });
          }
          if (Number(item.subTotal ?? 0) <= 0) {
            return NextResponse.json({ message: 'Subtotal setiap item harus lebih dari 0.' }, { status: 400 });
          }
        }

        if (!outletId && !idOutlet) {
          return NextResponse.json({ message: 'Outlet belum dipilih. Silakan pilih ulang outlet.' }, { status: 400 });
        }
        const outlet = await prisma.outlet.findFirst({
          where: {
            OR: [
              ...(outletId ? [{ id: outletId }] : []),
              ...(idOutlet ? [{ idOutlet }] : []),
            ],
          },
        });

        if (!outlet) {
          return NextResponse.json({ message: 'Outlet sudah berubah atau tidak ditemukan. Silakan pilih ulang outlet.' }, { status: 404 });
        }

        const allowedTaps = Array.isArray(currentUser.allowedTaps) ? currentUser.allowedTaps.map(String) : [];
        const canUseOutlet =
          currentUser.role === 'SUPER_ADMIN' ||
          allowedTaps.includes('ALL') ||
          (currentUser.role === 'ADMIN' && allowedTaps.includes(outlet.tap)) ||
          (currentUser.role === 'SALESFORCE' && outlet.salesforceUsername?.toLowerCase() === currentUser.username.toLowerCase());

        if (!canUseOutlet) {
          return NextResponse.json({ message: 'Outlet ini tidak tersedia untuk user Anda. Silakan pilih outlet lain.' }, { status: 403 });
        }

        const productIdList: string[] = [];
        items.forEach((item) => {
          const productId = String(item.productId ?? '');
          if (productId) productIdList.push(productId);
        });
        const productIds = Array.from(new Set(productIdList));
        const validProductCount = productIds.length > 0
          ? await prisma.product.count({ where: { id: { in: productIds } } })
          : 0;
        if (productIds.length === 0 || validProductCount !== productIds.length) {
          return NextResponse.json({ message: 'Produk sudah berubah atau tidak ditemukan. Silakan pilih ulang produk.' }, { status: 404 });
        }

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
            outletId: outlet.id,
            salesforceId: currentUser.id,
            status: 'COMPLETED',
            totalTagihan: items.reduce((sum: number, item: any) => sum + Number(item.subTotal ?? 0), 0),
            ownerName,
            ownerPhone,
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
    const bootstrap = await getBootstrapData(refreshedUser);
    return NextResponse.json({
      ...bootstrap,
      ...(responseOutletId ? { outlet: bootstrap.outlets.find((outlet) => outlet.id === responseOutletId) } : {}),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'Data dengan kode, username, atau ID Outlet tersebut sudah ada' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ message: 'Data referensi tidak ditemukan. Muat ulang halaman lalu coba lagi.' }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return NextResponse.json({ message }, { status: 500 });
  }
}
