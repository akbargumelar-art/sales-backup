import type { Prisma, User as DbUser } from '@prisma/client';
import type { Product, Tap, Transaction, User } from '@/types';
import { prisma } from '@/lib/prisma';

const DEFAULT_TRANSACTION_LIMIT = 200;

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

function mapOutlet(outlet: Prisma.OutletGetPayload<Record<string, never>>) {
  return {
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
  };
}

/**
 * Returns the list of TAP codes this user is allowed to see.
 * Returns null if the user has unrestricted access (SUPER_ADMIN or allowedTaps includes 'ALL').
 */
function getAllowedTapCodes(user: DbUser): string[] | null {
  const allowedTaps = Array.isArray(user.allowedTaps) ? user.allowedTaps.map(String) : [];
  if (user.role === 'SUPER_ADMIN' || allowedTaps.includes('ALL')) return null;
  if (user.role === 'ADMIN') return allowedTaps.length > 0 ? allowedTaps : [user.tap];
  return [user.tap];
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

  const allowedTapCodes = getAllowedTapCodes(user);

  // --- Users: Salesforce only sees self ---
  const usersQuery =
    user.role === 'SALESFORCE'
      ? Promise.resolve([user])
      : prisma.user.findMany({
          where: allowedTapCodes ? { tap: { in: allowedTapCodes } } : undefined,
          orderBy: [{ role: 'asc' }, { nama: 'asc' }],
        });

  // --- Products: everyone sees all products (needed for transaction form) ---
  const productsQuery = prisma.product.findMany({ orderBy: { namaProduk: 'asc' } });

  // --- Outlets: Salesforce sees only assigned outlets ---
  const outletWhere: Prisma.OutletWhereInput | undefined =
    user.role === 'SALESFORCE'
      ? { salesforceUsername: user.username }
      : allowedTapCodes
        ? { tap: { in: allowedTapCodes } }
        : undefined;

  const outletsQuery = prisma.outlet.findMany({
    where: outletWhere,
    orderBy: { namaOutlet: 'asc' },
  });

  // --- Transactions: scoped by role with limit ---
  const transactionWhere: Prisma.TransactionWhereInput | undefined =
    user.role === 'SALESFORCE'
      ? { salesforceId: user.id }
      : allowedTapCodes
        ? { outlet: { tap: { in: allowedTapCodes } } }
        : undefined;

  const transactionsQuery = prisma.transaction.findMany({
    where: transactionWhere,
    include: transactionInclude,
    orderBy: { submittedAt: 'desc' },
    take: DEFAULT_TRANSACTION_LIMIT,
  });

  const [users, products, outlets, transactions] = await Promise.all([
    usersQuery,
    productsQuery,
    outletsQuery,
    transactionsQuery,
  ]);

  return {
    hasSetup: true,
    user: sanitizeUser(user),
    users: users.map(sanitizeUser),
    products: products.map(mapProduct),
    outlets: outlets.map(mapOutlet),
    transactions: transactions.map(mapTransaction),
    taps: taps.map(mapTap),
  };
}
