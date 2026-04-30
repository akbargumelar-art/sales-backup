import type { Prisma, User as DbUser } from '@prisma/client';
import type { Product, Tap, Transaction, User } from '@/types';
import { prisma } from '@/lib/prisma';

const transactionInclude = {
  outlet: true,
  salesforce: true,
  items: {
    include: {
      product: true,
    },
  },
} satisfies Prisma.TransactionInclude;

export function sanitizeUser(user: DbUser): User {
  return {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    tap: user.tap,
    allowedTaps: Array.isArray(user.allowedTaps) ? user.allowedTaps.map(String) : [],
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function mapProduct(product: Prisma.ProductGetPayload<Record<string, never>>): Product {
  return {
    id: product.id,
    kode: product.kode,
    kategori: product.kategori,
    namaProduk: product.namaProduk,
    harga: product.harga,
    isActive: product.isActive,
    isVirtualNominal: product.isVirtualNominal,
    brand: product.brand ?? undefined,
    adminFee: product.adminFee ?? undefined,
    minNominal: product.minNominal ?? undefined,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function mapTap(tap: Prisma.TapGetPayload<Record<string, never>>): Tap {
  return {
    id: tap.id,
    kode: tap.kode,
    nama: tap.nama,
    isActive: tap.isActive,
    createdAt: tap.createdAt.toISOString(),
    updatedAt: tap.updatedAt.toISOString(),
  };
}

function mapTransaction(transaction: Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>): Transaction {
  return {
    id: transaction.id,
    nomorTransaksi: transaction.nomorTransaksi,
    outletId: transaction.outletId,
    outlet: {
      id: transaction.outlet.id,
      idOutlet: transaction.outlet.idOutlet,
      nomorRS: transaction.outlet.nomorRS,
      namaOutlet: transaction.outlet.namaOutlet,
      tap: transaction.outlet.tap,
      salesforceUsername: transaction.outlet.salesforceUsername ?? undefined,
      kabupaten: transaction.outlet.kabupaten,
      kecamatan: transaction.outlet.kecamatan,
      isManual: transaction.outlet.isManual,
      createdAt: transaction.outlet.createdAt.toISOString(),
    },
    salesforceId: transaction.salesforceId,
    salesforce: sanitizeUser(transaction.salesforce),
    status: transaction.status,
    totalTagihan: transaction.totalTagihan,
    ownerName: transaction.ownerName,
    ownerPhone: transaction.ownerPhone,
    catatan: transaction.catatan ?? undefined,
    submittedAt: transaction.submittedAt.toISOString(),
    confirmedAt: transaction.confirmedAt?.toISOString(),
    cancelReason: transaction.cancelReason ?? undefined,
    cancelRequestedBy: transaction.cancelRequestedBy ?? undefined,
    cancelRequestedAt: transaction.cancelRequestedAt?.toISOString(),
    cancelApprovedAt: transaction.cancelApprovedAt?.toISOString(),
    cancelInitiatedBy: transaction.cancelInitiatedBy ?? undefined,
    items: transaction.items.map((item) => ({
      id: item.id,
      transactionId: item.transactionId,
      productId: item.productId,
      product: mapProduct(item.product),
      hargaSatuan: item.hargaSatuan,
      kuantiti: item.kuantiti,
      subTotal: item.subTotal,
      snAwal: item.snAwal ?? undefined,
      snAkhir: item.snAkhir ?? undefined,
      serialNumbers: Array.isArray(item.serialNumbers) ? item.serialNumbers.map(String) : undefined,
    })),
  };
}

export async function getBootstrapData(user: DbUser | null) {
  const [userCount, taps] = await Promise.all([
    prisma.user.count(),
    prisma.tap.findMany({ orderBy: { kode: 'asc' } }),
  ]);
  if (!user) {
    return {
      hasSetup: userCount > 0,
      user: null,
      users: [],
      products: [],
      outlets: [],
      transactions: [],
      taps: taps.map(mapTap),
    };
  }

  const [users, products, outlets, transactions] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: 'asc' }, { nama: 'asc' }] }),
    prisma.product.findMany({ orderBy: { namaProduk: 'asc' } }),
    prisma.outlet.findMany({ orderBy: { namaOutlet: 'asc' } }),
    prisma.transaction.findMany({
      include: transactionInclude,
      orderBy: { submittedAt: 'desc' },
    }),
  ]);

  return {
    hasSetup: true,
    user: sanitizeUser(user),
    users: users.map(sanitizeUser),
    products: products.map(mapProduct),
    outlets: outlets.map((outlet) => ({
      id: outlet.id,
      idOutlet: outlet.idOutlet,
      nomorRS: outlet.nomorRS,
      namaOutlet: outlet.namaOutlet,
      tap: outlet.tap,
      salesforceUsername: outlet.salesforceUsername ?? undefined,
      kabupaten: outlet.kabupaten,
      kecamatan: outlet.kecamatan,
      isManual: outlet.isManual,
      createdAt: outlet.createdAt.toISOString(),
    })),
    transactions: transactions.map(mapTransaction),
    taps: taps.map(mapTap),
  };
}
