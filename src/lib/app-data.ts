import type { Outlet, Product, Transaction, User } from '@/types';
import { useAppStore } from '@/store/useAppStore';

type ProductFilterOption = {
  value: string;
  label: string;
  description?: string;
};

export function getActiveTapCodes(): string[] {
  return useAppStore.getState().taps.filter((tap) => tap.isActive).map((tap) => tap.kode);
}

export function getKnownTapCodes(): string[] {
  const { taps, users, outlets } = useAppStore.getState();
  const codes = new Set<string>(taps.map((tap) => tap.kode));
  users.forEach((user) => {
    codes.add(user.tap);
    user.allowedTaps.filter((tap) => tap !== 'ALL').forEach((tap) => codes.add(tap));
  });
  outlets.forEach((outlet) => codes.add(outlet.tap));
  return Array.from(codes);
}

export function canViewTap(user: User, tap: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.allowedTaps.includes('ALL')) return true;
  return user.allowedTaps.includes(tap);
}

export function getViewableTaps(user: User): string[] {
  const knownTaps = getKnownTapCodes();
  if (user.role === 'SUPER_ADMIN' || user.allowedTaps.includes('ALL')) return knownTaps;
  const viewable = user.allowedTaps.filter((tap) => knownTaps.includes(tap));
  return viewable.length > 0 ? viewable : [user.tap];
}

export function getVisibleTransactions(user: User): Transaction[] {
  const { transactions } = useAppStore.getState();
  if (user.role === 'SUPER_ADMIN' || user.allowedTaps.includes('ALL')) return transactions;
  if (user.role === 'ADMIN') return transactions.filter((item) => user.allowedTaps.includes(item.outlet.tap));
  return transactions.filter((item) => item.salesforceId === user.id);
}

export function getVisibleOutlets(user: User): Outlet[] {
  const { outlets } = useAppStore.getState();
  if (user.role === 'SUPER_ADMIN' || user.allowedTaps.includes('ALL')) return outlets;
  if (user.role === 'ADMIN') return outlets.filter((item) => user.allowedTaps.includes(item.tap));
  return outlets.filter((item) => item.salesforceUsername?.toLowerCase() === user.username.toLowerCase());
}

export function getPendingCancelForSalesforce(user: User): Transaction[] {
  return useAppStore.getState().transactions.filter((item) => item.salesforceId === user.id && item.status === 'PENDING_CANCEL');
}

export function getPendingCancelBySalesforceForAdmin(user: User): Transaction[] {
  return useAppStore.getState().transactions.filter((item) => {
    if (item.status !== 'PENDING_CANCEL' || item.cancelInitiatedBy !== 'SALESFORCE') return false;
    if (user.role === 'SUPER_ADMIN' || user.allowedTaps.includes('ALL')) return true;
    return user.allowedTaps.includes(item.outlet.tap);
  });
}

export function getSummaryForTransactions(trxList: Transaction[]) {
  const completed = trxList.filter((item) => item.status === 'COMPLETED');
  return {
    totalTransaksi: trxList.length,
    totalOmset: completed.reduce((sum, item) => sum + item.totalTagihan, 0),
    totalOutlet: new Set(completed.map((item) => item.outletId)).size,
    totalProdukTerjual: completed.reduce((sum, trx) => sum + trx.items.reduce((itemSum, item) => itemSum + item.kuantiti, 0), 0),
  };
}

export function buildProductFilterOptions(products: Product[], trxList: Transaction[]): ProductFilterOption[] {
  const productMap = new Map<string, ProductFilterOption>();

  products.forEach((product) => {
    productMap.set(product.id, {
      value: product.id,
      label: product.namaProduk,
      description: `${product.kode} - ${product.kategori}`,
    });
  });

  trxList.forEach((trx) => {
    trx.items.forEach((item) => {
      if (productMap.has(item.productId)) return;
      productMap.set(item.productId, {
        value: item.productId,
        label: item.product.namaProduk,
        description: `${item.product.kode} - ${item.product.kategori}`,
      });
    });
  });

  return Array.from(productMap.values()).sort((a, b) => (
    a.label.localeCompare(b.label, 'id', { numeric: true, sensitivity: 'base' })
  ));
}

export function filterTransactionsByProducts(trxList: Transaction[], selectedProductIds: string[]): Transaction[] {
  if (selectedProductIds.length === 0) return trxList;

  const productIdSet = new Set(selectedProductIds);

  return trxList.reduce<Transaction[]>((result, trx) => {
    const matchingItems = trx.items.filter((item) => productIdSet.has(item.productId));
    if (matchingItems.length === 0) return result;

    result.push({
      ...trx,
      items: matchingItems,
      totalTagihan: matchingItems.reduce((sum, item) => sum + item.subTotal, 0),
    });
    return result;
  }, []);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(dateStr));
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'badge-confirmed',
    PENDING_CANCEL: 'badge-submitted',
    CANCELLED: 'badge-cancelled',
    DRAFT: 'badge-draft',
  };
  return map[status] || 'badge-draft';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'Selesai',
    PENDING_CANCEL: 'Menunggu Persetujuan',
    CANCELLED: 'Dibatalkan',
    DRAFT: 'Draft',
  };
  return map[status] || status;
}
