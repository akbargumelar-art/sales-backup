import { create } from 'zustand';
import type { Outlet, Product, Role, SalesLineItem, Tap, Transaction, TransactionItem, User } from '@/types';

type ToastType = 'success' | 'error' | 'warning';

interface BootstrapData {
  hasSetup: boolean;
  user: User | null;
  users: User[];
  products: Product[];
  outlets: Outlet[];
  transactions: Transaction[];
  taps: Tap[];
}

interface CreateAdminInput {
  nama: string;
  username: string;
  password: string;
  tap: string;
}

interface CreateUserInput {
  nama: string;
  username: string;
  password: string;
  role: Role;
  tap: string;
  allowedTaps: string[];
  isActive: boolean;
  mustChangePassword?: boolean;
}

interface UpdateUserInput {
  nama: string;
  username: string;
  role: Role;
  tap: string;
  allowedTaps: string[];
  isActive: boolean;
}

interface ProductInput {
  kode: string;
  kategori: 'VIRTUAL' | 'FISIK';
  namaProduk: string;
  harga: number;
  isActive?: boolean;
  isVirtualNominal?: boolean;
  brand?: 'LINKAJA' | 'FINPAY';
  adminFee?: number;
  minNominal?: number;
}

interface OutletInput {
  idOutlet: string;
  nomorRS: string;
  namaOutlet: string;
  tap: string;
  salesforceUsername?: string;
  kabupaten: string;
  kecamatan: string;
  isManual?: boolean;
}

interface TapInput {
  kode: string;
  nama: string;
  isActive?: boolean;
}

interface SubmitTransactionInput {
  outletId: string;
  idOutlet?: string;
  salesforceId: string;
  ownerName: string;
  ownerPhone: string;
  catatan?: string;
  items: SalesLineItem[];
}

interface ActionResult<T = unknown> {
  ok: boolean;
  message: string;
  data?: T;
}

interface UploadLockState {
  isActive: boolean;
  title: string;
  message: string;
  detail: string;
  current: number;
  total: number;
  failed: number;
}

interface AppState {
  hasHydrated: boolean;
  hasSetup: boolean;
  user: User | null;
  isLoggedIn: boolean;
  mustChangePassword: boolean;
  sidebarCollapsed: boolean;
  activeNav: string;
  toast: { message: string; type: ToastType } | null;
  uploadLock: UploadLockState;
  salesFormItems: SalesLineItem[];
  selectedOutletId: string;
  users: User[];
  products: Product[];
  outlets: Outlet[];
  transactions: Transaction[];
  taps: Tap[];
  hydrateFromServer: () => Promise<void>;
  login: (user: User) => void;
  logout: () => Promise<void>;
  toggleSidebar: () => void;
  setActiveNav: (nav: string) => void;
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;
  startUploadLock: (input?: string | Partial<Omit<UploadLockState, 'isActive'>>) => void;
  updateUploadLock: (input: Partial<Omit<UploadLockState, 'isActive'>>) => void;
  stopUploadLock: () => void;
  setSalesFormItems: (items: SalesLineItem[]) => void;
  setSelectedOutletId: (id: string) => void;
  initializeAdmin: (input: CreateAdminInput) => Promise<boolean>;
  authenticateUser: (username: string, password: string) => Promise<User | null>;
  updateOwnPassword: (userId: string, newPassword: string) => Promise<boolean>;
  addUser: (input: CreateUserInput) => Promise<ActionResult<{ user?: User }>>;
  updateUser: (userId: string, input: UpdateUserInput) => Promise<ActionResult>;
  resetUserPassword: (targetUserId: string, requesterRole: Role, requesterId: string) => Promise<{ newPassword: string } | null>;
  upsertProduct: (productId: string | null, input: ProductInput) => Promise<ActionResult<{ product?: Product }>>;
  toggleProductActive: (productId: string) => Promise<boolean>;
  addOutlet: (input: OutletInput) => Promise<ActionResult<{ outlet?: Outlet }>>;
  updateOutlet: (outletId: string, input: OutletInput) => Promise<ActionResult<{ outlet?: Outlet }>>;
  addTap: (input: TapInput) => Promise<ActionResult<{ tap?: Tap }>>;
  updateTap: (tapId: string, input: TapInput) => Promise<ActionResult<{ tap?: Tap }>>;
  toggleTapActive: (tapId: string) => Promise<boolean>;
  submitTransaction: (input: SubmitTransactionInput) => Promise<ActionResult<{ transaction?: Transaction }>>;
  requestCancelTransaction: (trxId: string, adminId: string, reason: string) => Promise<boolean>;
  approveCancelTransaction: (trxId: string) => Promise<boolean>;
  rejectCancelTransaction: (trxId: string) => Promise<boolean>;
  requestCancelBySalesforce: (trxId: string, sfId: string, reason: string) => Promise<boolean>;
  approveCancelBySalesforce: (trxId: string) => Promise<boolean>;
  rejectCancelBySalesforce: (trxId: string) => Promise<boolean>;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request gagal');
  }
  return data;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return readJson<T>(response);
}

function stripProductSnapshot(items: SalesLineItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    isManualPrice: item.isManualPrice,
    priceChangeReason: item.priceChangeReason,
    hargaSatuan: item.hargaSatuan,
    kuantiti: item.kuantiti,
    subTotal: item.subTotal,
    snAwal: item.snAwal,
    snAkhir: item.snAkhir,
    scannedSNs: item.scannedSNs,
  }));
}

const createIdleUploadLock = (): UploadLockState => ({
  isActive: false,
  title: 'Upload Sedang Diproses',
  message: 'Mengupload data. Mohon tunggu sampai proses selesai.',
  detail: '',
  current: 0,
  total: 0,
  failed: 0,
});

export const useAppStore = create<AppState>((set, get) => {
  const applyBootstrap = (data: BootstrapData) => {
    set({
      hasHydrated: true,
      hasSetup: data.hasSetup,
      user: data.user,
      isLoggedIn: Boolean(data.user),
      mustChangePassword: Boolean(data.user?.mustChangePassword),
      users: data.users,
      products: data.products,
      outlets: data.outlets,
      transactions: data.transactions,
      taps: data.taps ?? [],
    });
  };

  const postAction = async <T = unknown>(action: string, payload: unknown, successMessage: string): Promise<ActionResult<T>> => {
    try {
      const data = await postJson<BootstrapData & T>('/api/app', { action, payload });
      applyBootstrap(data);
      return { ok: true, message: successMessage, data };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Request gagal' };
    }
  };

  return {
    hasHydrated: false,
    hasSetup: false,
    user: null,
    isLoggedIn: false,
    mustChangePassword: false,
    sidebarCollapsed: false,
    activeNav: '/dashboard',
    toast: null,
    uploadLock: createIdleUploadLock(),
    salesFormItems: [],
    selectedOutletId: '',
    users: [],
    products: [],
    outlets: [],
    transactions: [],
    taps: [],
    hydrateFromServer: async () => {
      try {
        const response = await fetch('/api/session', { cache: 'no-store' });
        applyBootstrap(await readJson<BootstrapData>(response));
      } catch {
        set({ hasHydrated: true, isLoggedIn: false, user: null, mustChangePassword: false });
      }
    },
    login: (user) => set({
      user,
      isLoggedIn: true,
      mustChangePassword: user.mustChangePassword,
    }),
    logout: async () => {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      set({
        user: null,
        isLoggedIn: false,
        mustChangePassword: false,
        salesFormItems: [],
        selectedOutletId: '',
      });
    },
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setActiveNav: (nav) => set({ activeNav: nav }),
    showToast: (message, type) => {
      set({ toast: { message, type } });
      setTimeout(() => {
        if (get().toast?.message === message) {
          set({ toast: null });
        }
      }, 3000);
    },
    hideToast: () => set({ toast: null }),
    startUploadLock: (input) => set({
      uploadLock: {
        ...createIdleUploadLock(),
        isActive: true,
        ...(typeof input === 'string' ? { message: input } : input),
      },
    }),
    updateUploadLock: (input) => set((state) => ({
      uploadLock: {
        ...state.uploadLock,
        ...input,
        isActive: true,
      },
    })),
    stopUploadLock: () => set({ uploadLock: createIdleUploadLock() }),
    setSalesFormItems: (items) => set({ salesFormItems: items }),
    setSelectedOutletId: (id) => set({ selectedOutletId: id }),
    initializeAdmin: async (input) => {
      try {
        const data = await postJson<BootstrapData>('/api/setup', input);
        applyBootstrap(data);
        return true;
      } catch {
        return false;
      }
    },
    authenticateUser: async (username, password) => {
      try {
        const data = await postJson<BootstrapData>('/api/auth/login', { username, password });
        applyBootstrap(data);
        return data.user;
      } catch {
        return null;
      }
    },
    updateOwnPassword: async (_userId, newPassword) => {
      try {
        const data = await postJson<BootstrapData>('/api/auth/change-password', { password: newPassword });
        applyBootstrap(data);
        return true;
      } catch {
        return false;
      }
    },
    addUser: (input) => postAction('addUser', input, 'Pengguna berhasil ditambahkan'),
    updateUser: (userId, input) => postAction('updateUser', { userId, ...input }, 'Pengguna berhasil diperbarui'),
    resetUserPassword: async (targetUserId, requesterRole, requesterId) => {
      const result = await postAction<{ newPassword?: string }>('resetUserPassword', { targetUserId, requesterRole, requesterId }, 'Password berhasil direset');
      return result.ok && result.data?.newPassword ? { newPassword: result.data.newPassword } : null;
    },
    upsertProduct: (productId, input) => postAction('upsertProduct', { productId, ...input }, productId ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan'),
    toggleProductActive: async (productId) => {
      const result = await postAction('toggleProductActive', { productId }, 'Status produk berhasil diperbarui');
      return result.ok;
    },
    addOutlet: (input) => postAction('addOutlet', input, 'Outlet berhasil ditambahkan'),
    updateOutlet: (outletId, input) => postAction('updateOutlet', { outletId, ...input }, 'Outlet berhasil diperbarui'),
    addTap: (input) => postAction('addTap', input, 'TAP berhasil ditambahkan'),
    updateTap: (tapId, input) => postAction('updateTap', { tapId, ...input }, 'TAP berhasil diperbarui'),
    toggleTapActive: async (tapId) => {
      const result = await postAction('toggleTapActive', { tapId }, 'Status TAP berhasil diperbarui');
      return result.ok;
    },
    submitTransaction: (input) => postAction('submitTransaction', { ...input, items: stripProductSnapshot(input.items) }, 'Transaksi berhasil disimpan'),
    requestCancelTransaction: async (trxId, _adminId, reason) => (await postAction('requestCancelTransaction', { trxId, reason }, 'Permintaan pembatalan dikirim')).ok,
    approveCancelTransaction: async (trxId) => (await postAction('approveCancelTransaction', { trxId }, 'Pembatalan disetujui')).ok,
    rejectCancelTransaction: async (trxId) => (await postAction('rejectCancelTransaction', { trxId }, 'Pembatalan ditolak')).ok,
    requestCancelBySalesforce: async (trxId, _sfId, reason) => (await postAction('requestCancelBySalesforce', { trxId, reason }, 'Pengajuan pembatalan dikirim')).ok,
    approveCancelBySalesforce: async (trxId) => (await postAction('approveCancelBySalesforce', { trxId }, 'Pembatalan disetujui')).ok,
    rejectCancelBySalesforce: async (trxId) => (await postAction('rejectCancelBySalesforce', { trxId }, 'Pengajuan pembatalan ditolak')).ok,
  };
});
