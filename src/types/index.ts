// ─── ENUMS ──────────────────────────────────────────
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SALESFORCE';
export type ProductCategory = 'VIRTUAL' | 'FISIK';
export type TransactionStatus = 'DRAFT' | 'COMPLETED' | 'PENDING_CANCEL' | 'CANCELLED';

// ─── USER ──────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  nama: string;
  role: Role;
  tap: string;                 // Home TAP
  allowedTaps: string[];       // TAPs this user can view data from (set by Super Admin)
  isActive: boolean;
  mustChangePassword: boolean; // true = must change on first login
  createdAt: string;
  updatedAt: string;
}

export interface AdminPermission {
  id: string;
  userId: string;
  canManageUsers: boolean;
  canManageOutlets: boolean;
  canManageProducts: boolean;
  allowedTaps: string[];       // empty = home TAP only, ['ALL'] = all TAPs
  canExportReport: boolean;
}

export interface Tap {
  id: string;
  kode: string;
  nama: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── PRODUCT ──────────────────────────────────────────
export type ProductBrand = 'LINKAJA' | 'FINPAY';

export interface Product {
  id: string;
  kode: string;
  kategori: ProductCategory;
  namaProduk: string;
  harga: number;          // For FISIK: fixed price. For VIRTUAL nominal: 0 (nominal diisi user)
  isActive: boolean;
  // Virtual nominal product fields
  isVirtualNominal?: boolean;   // true = user input nominal sendiri (LinkAja!/FinPay)
  brand?: ProductBrand;          // LINKAJA | FINPAY
  adminFee?: number;             // Biaya admin yang ditambah ke nominal (default: LinkAja=2000, FinPay=0)
  minNominal?: number;           // Minimum nominal (default: 20000)
  createdAt: string;
  updatedAt: string;
}

// ─── OUTLET ──────────────────────────────────────────
export interface Outlet {
  id: string;
  idOutlet: string;
  nomorRS: string;
  namaOutlet: string;
  tap: string;
  salesforceUsername?: string;
  kabupaten: string;
  kecamatan: string;
  isManual: boolean;
  createdAt: string;
}

// ─── TRANSACTION ──────────────────────────────────────
export interface Transaction {
  id: string;
  nomorTransaksi: string;
  outletId: string;
  outlet: Outlet;
  salesforceId: string;
  salesforce: User;
  status: TransactionStatus;
  totalTagihan: number;
  ownerName: string;
  ownerPhone: string;
  catatan?: string;
  submittedAt: string;
  confirmedAt?: string;
  // Cancellation workflow
  cancelReason?: string;          // Alasan pembatalan (wajib diisi)
  cancelRequestedBy?: string;     // User ID yang minta batal (admin atau SF)
  cancelRequestedAt?: string;     // Waktu request pembatalan
  cancelApprovedAt?: string;      // Waktu pembatalan disetujui
  cancelInitiatedBy?: 'ADMIN' | 'SALESFORCE'; // Siapa yang mengajukan pembatalan
  items: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  product: Product;
  hargaSatuan: number;
  kuantiti: number;
  subTotal: number;
  snAwal?: string;
  snAkhir?: string;
  serialNumbers?: string[];
}

// ─── FORM TYPES ──────────────────────────────────────
export interface SalesFormData {
  outletId: string;
  catatan: string;
  items: SalesLineItem[];
}

export interface SalesLineItem {
  id: string;
  productId: string;
  product?: Product;
  hargaSatuan: number;
  kuantiti: number;
  subTotal: number;
  snMode: 'scan' | 'range' | 'none';
  snAwal: string;
  snAkhir: string;
  scannedSNs: string[];
  nominalVirtual?: number;  // For isVirtualNominal products: nominal entered by user
  isManualPrice?: boolean;
}

// ─── DASHBOARD ──────────────────────────────────────
export interface DashboardSummary {
  totalTransaksi: number;
  totalOmset: number;
  totalOutlet: number;
  totalProdukTerjual: number;
}

export interface DashboardFilter {
  startDate: Date;
  endDate: Date;
  salesforceId?: string;
  tap?: string;
  kategori?: ProductCategory | 'SEMUA';
  status?: TransactionStatus[];
}

// ─── WEBHOOK ──────────────────────────────────────
export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  isActive: boolean;
  events: string[];
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  transactionId: string;
  url: string;
  responseCode?: number;
  isSuccess: boolean;
  attemptCount: number;
  sentAt: string;
}

// ─── NAV ──────────────────────────────────────────
export interface NavItem {
  icon: string;
  label: string;
  href: string;
  roles: Role[];
}
