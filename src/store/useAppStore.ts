import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Outlet, Product, Role, SalesLineItem, Transaction, TransactionItem, User } from '@/types';

type ToastType = 'success' | 'error' | 'warning';

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
  kabupaten: string;
  kecamatan: string;
  isManual?: boolean;
}

interface SubmitTransactionInput {
  outletId: string;
  salesforceId: string;
  ownerName: string;
  ownerPhone: string;
  catatan?: string;
  items: SalesLineItem[];
}

interface AppState {
  hasHydrated: boolean;
  user: User | null;
  isLoggedIn: boolean;
  mustChangePassword: boolean;
  sidebarCollapsed: boolean;
  activeNav: string;
  toast: { message: string; type: ToastType } | null;
  salesFormItems: SalesLineItem[];
  selectedOutletId: string;
  users: User[];
  products: Product[];
  outlets: Outlet[];
  transactions: Transaction[];
  setHasHydrated: (value: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  toggleSidebar: () => void;
  setActiveNav: (nav: string) => void;
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;
  setSalesFormItems: (items: SalesLineItem[]) => void;
  setSelectedOutletId: (id: string) => void;
  initializeAdmin: (input: CreateAdminInput) => boolean;
  authenticateUser: (username: string, password: string) => User | null;
  updateOwnPassword: (userId: string, newPassword: string) => boolean;
  addUser: (input: CreateUserInput) => { ok: boolean; message: string; user?: User };
  updateUser: (userId: string, input: UpdateUserInput) => { ok: boolean; message: string };
  resetUserPassword: (targetUserId: string, requesterRole: Role, requesterId: string) => { newPassword: string } | null;
  upsertProduct: (productId: string | null, input: ProductInput) => { ok: boolean; message: string; product?: Product };
  toggleProductActive: (productId: string) => boolean;
  addOutlet: (input: OutletInput) => { ok: boolean; message: string; outlet?: Outlet };
  updateOutlet: (outletId: string, input: OutletInput) => { ok: boolean; message: string; outlet?: Outlet };
  submitTransaction: (input: SubmitTransactionInput) => { ok: boolean; message: string; transaction?: Transaction };
  requestCancelTransaction: (trxId: string, adminId: string, reason: string) => boolean;
  approveCancelTransaction: (trxId: string) => boolean;
  rejectCancelTransaction: (trxId: string) => boolean;
  requestCancelBySalesforce: (trxId: string, sfId: string, reason: string) => boolean;
  approveCancelBySalesforce: (trxId: string) => boolean;
  rejectCancelBySalesforce: (trxId: string) => boolean;
}

const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const allTaps = [
  'TAP-CIREBON',
  'TAP-BANDUNG',
  'TAP-JAKARTA',
  'TAP-SEMARANG',
  'TAP-SURABAYA',
];

const normalizeTapList = (taps: string[], fallbackTap: string) => {
  const cleaned = Array.from(new Set(taps.filter(Boolean)));
  if (cleaned.includes('ALL')) return ['ALL'];
  return cleaned.length > 0 ? cleaned : [fallbackTap];
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      user: null,
      isLoggedIn: false,
      mustChangePassword: false,
      sidebarCollapsed: false,
      activeNav: '/dashboard',
      toast: null,
      salesFormItems: [],
      selectedOutletId: '',
      users: [],
      products: [],
      outlets: [],
      transactions: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      login: (user) => set({
        user,
        isLoggedIn: true,
        mustChangePassword: user.mustChangePassword,
      }),
      logout: () => set({
        user: null,
        isLoggedIn: false,
        mustChangePassword: false,
        salesFormItems: [],
        selectedOutletId: '',
      }),
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
      setSalesFormItems: (items) => set({ salesFormItems: items }),
      setSelectedOutletId: (id) => set({ selectedOutletId: id }),
      initializeAdmin: (input) => {
        if (get().users.length > 0) return false;
        const now = new Date().toISOString();
        const admin: User = {
          id: genId('user'),
          nama: input.nama.trim(),
          username: input.username.trim(),
          password: input.password,
          role: 'SUPER_ADMIN',
          tap: input.tap,
          allowedTaps: ['ALL'],
          isActive: true,
          mustChangePassword: false,
          createdAt: now,
          updatedAt: now,
        };
        set({ users: [admin] });
        return true;
      },
      authenticateUser: (username, password) => {
        const user = get().users.find((item) =>
          item.username.toLowerCase() === username.trim().toLowerCase() &&
          item.password === password &&
          item.isActive
        );
        return user ?? null;
      },
      updateOwnPassword: (userId, newPassword) => {
        let updatedUser: User | null = null;
        set((state) => ({
          users: state.users.map((item) => {
            if (item.id !== userId) return item;
            updatedUser = {
              ...item,
              password: newPassword,
              mustChangePassword: false,
              updatedAt: new Date().toISOString(),
            };
            return updatedUser;
          }),
          user: state.user?.id === userId && updatedUser ? updatedUser : state.user,
          mustChangePassword: state.user?.id === userId ? false : state.mustChangePassword,
        }));
        return Boolean(updatedUser);
      },
      addUser: (input) => {
        const username = input.username.trim().toLowerCase();
        if (!username) return { ok: false, message: 'Username wajib diisi' };
        if (get().users.some((item) => item.username.toLowerCase() === username)) {
          return { ok: false, message: 'Username sudah digunakan' };
        }
        const now = new Date().toISOString();
        const user: User = {
          id: genId('user'),
          nama: input.nama.trim(),
          username,
          password: input.password,
          role: input.role,
          tap: input.tap,
          allowedTaps: input.role === 'SALESFORCE' ? [input.tap] : normalizeTapList(input.allowedTaps, input.tap),
          isActive: input.isActive,
          mustChangePassword: input.mustChangePassword ?? true,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ users: [...state.users, user] }));
        return { ok: true, message: 'Pengguna berhasil ditambahkan', user };
      },
      updateUser: (userId, input) => {
        const duplicate = get().users.find((item) =>
          item.id !== userId && item.username.toLowerCase() === input.username.trim().toLowerCase()
        );
        if (duplicate) return { ok: false, message: 'Username sudah digunakan' };

        let updatedCurrentUser: User | null = null;
        set((state) => ({
          users: state.users.map((item) => {
            if (item.id !== userId) return item;
            const updated = {
              ...item,
              nama: input.nama.trim(),
              username: input.username.trim().toLowerCase(),
              role: input.role,
              tap: input.tap,
              allowedTaps: input.role === 'SALESFORCE' ? [input.tap] : normalizeTapList(input.allowedTaps, input.tap),
              isActive: input.isActive,
              updatedAt: new Date().toISOString(),
            };
            if (state.user?.id === userId) updatedCurrentUser = updated;
            return updated;
          }),
          user: updatedCurrentUser ?? state.user,
        }));
        return { ok: true, message: 'Pengguna berhasil diperbarui' };
      },
      resetUserPassword: (targetUserId, requesterRole, requesterId) => {
        const target = get().users.find((item) => item.id === targetUserId);
        if (!target || target.id === requesterId) return null;
        if (requesterRole === 'ADMIN' && target.role !== 'SALESFORCE') return null;
        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
        const newPassword = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        set((state) => ({
          users: state.users.map((item) =>
            item.id === targetUserId
              ? { ...item, password: newPassword, mustChangePassword: true, updatedAt: new Date().toISOString() }
              : item
          ),
        }));
        return { newPassword };
      },
      upsertProduct: (productId, input) => {
        const code = input.kode.trim().toUpperCase();
        const name = input.namaProduk.trim();
        const duplicate = get().products.find((item) => item.id !== productId && item.kode.toUpperCase() === code);
        if (duplicate) return { ok: false, message: `Kode produk ${code} sudah ada` };
        const now = new Date().toISOString();

        if (productId) {
          let updatedProduct: Product | undefined;
          set((state) => ({
            products: state.products.map((item) => {
              if (item.id !== productId) return item;
              updatedProduct = {
                ...item,
                kode: code,
                kategori: input.kategori,
                namaProduk: name,
                harga: input.kategori === 'FISIK' ? input.harga : 0,
                isActive: input.isActive ?? item.isActive,
                isVirtualNominal: input.isVirtualNominal,
                brand: input.brand,
                adminFee: input.isVirtualNominal ? input.adminFee ?? 0 : undefined,
                minNominal: input.isVirtualNominal ? input.minNominal ?? 20000 : undefined,
                updatedAt: now,
              };
              return updatedProduct;
            }),
          }));
          return updatedProduct
            ? { ok: true, message: 'Produk berhasil diperbarui', product: updatedProduct }
            : { ok: false, message: 'Produk tidak ditemukan' };
        }

        const product: Product = {
          id: genId('prod'),
          kode: code,
          kategori: input.kategori,
          namaProduk: name,
          harga: input.kategori === 'FISIK' ? input.harga : 0,
          isActive: input.isActive ?? true,
          isVirtualNominal: input.isVirtualNominal,
          brand: input.brand,
          adminFee: input.isVirtualNominal ? input.adminFee ?? 0 : undefined,
          minNominal: input.isVirtualNominal ? input.minNominal ?? 20000 : undefined,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ products: [...state.products, product] }));
        return { ok: true, message: 'Produk berhasil ditambahkan', product };
      },
      toggleProductActive: (productId) => {
        let changed = false;
        set((state) => ({
          products: state.products.map((item) => {
            if (item.id !== productId) return item;
            changed = true;
            return { ...item, isActive: !item.isActive, updatedAt: new Date().toISOString() };
          }),
        }));
        return changed;
      },
      addOutlet: (input) => {
        const code = input.idOutlet.trim().toUpperCase();
        if (get().outlets.some((item) => item.idOutlet.toUpperCase() === code)) {
          return { ok: false, message: 'ID Outlet sudah digunakan' };
        }
        const outlet: Outlet = {
          id: genId('out'),
          idOutlet: code,
          nomorRS: input.nomorRS.trim(),
          namaOutlet: input.namaOutlet.trim(),
          tap: input.tap,
          kabupaten: input.kabupaten.trim(),
          kecamatan: input.kecamatan.trim(),
          isManual: input.isManual ?? true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ outlets: [...state.outlets, outlet] }));
        return { ok: true, message: 'Outlet berhasil ditambahkan', outlet };
      },
      updateOutlet: (outletId, input) => {
        const code = input.idOutlet.trim().toUpperCase();
        const duplicate = get().outlets.find((item) => item.id !== outletId && item.idOutlet.toUpperCase() === code);
        if (duplicate) return { ok: false, message: 'ID Outlet sudah digunakan' };
        let updatedOutlet: Outlet | undefined;
        set((state) => ({
          outlets: state.outlets.map((item) => {
            if (item.id !== outletId) return item;
            updatedOutlet = {
              ...item,
              idOutlet: code,
              nomorRS: input.nomorRS.trim(),
              namaOutlet: input.namaOutlet.trim(),
              tap: input.tap,
              kabupaten: input.kabupaten.trim(),
              kecamatan: input.kecamatan.trim(),
              isManual: input.isManual ?? item.isManual,
            };
            return updatedOutlet;
          }),
        }));
        return updatedOutlet
          ? { ok: true, message: 'Outlet berhasil diperbarui', outlet: updatedOutlet }
          : { ok: false, message: 'Outlet tidak ditemukan' };
      },
      submitTransaction: (input) => {
        const outlet = get().outlets.find((item) => item.id === input.outletId);
        const salesforce = get().users.find((item) => item.id === input.salesforceId);
        if (!outlet || !salesforce) return { ok: false, message: 'Data outlet atau salesforce tidak valid' };
        const now = new Date();
        const serialDay = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const countToday = get().transactions.filter((item) => item.nomorTransaksi.includes(serialDay)).length + 1;
        const transactionId = genId('trx');
        const items: TransactionItem[] = input.items.map((item, index) => ({
          id: genId(`itm${index + 1}`),
          transactionId,
          productId: item.productId,
          product: item.product!,
          hargaSatuan: item.hargaSatuan,
          kuantiti: item.kuantiti,
          subTotal: item.subTotal,
          snAwal: item.snAwal || undefined,
          snAkhir: item.snAkhir || undefined,
          serialNumbers: item.scannedSNs.length > 0 ? item.scannedSNs : undefined,
        }));
        const transaction: Transaction = {
          id: transactionId,
          nomorTransaksi: `TRX-${serialDay}-${String(countToday).padStart(4, '0')}`,
          outletId: outlet.id,
          outlet,
          salesforceId: salesforce.id,
          salesforce,
          status: 'COMPLETED',
          totalTagihan: items.reduce((sum, item) => sum + item.subTotal, 0),
          catatan: input.catatan?.trim() || undefined,
          ownerName: input.ownerName.trim(),
          ownerPhone: input.ownerPhone.trim(),
          submittedAt: now.toISOString(),
          items,
        };
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
        return { ok: true, message: 'Transaksi berhasil disimpan', transaction };
      },
      requestCancelTransaction: (trxId, adminId, reason) => {
        let changed = false;
        set((state) => ({
          transactions: state.transactions.map((item) => {
            if (item.id !== trxId || item.status !== 'COMPLETED') return item;
            changed = true;
            return {
              ...item,
              status: 'PENDING_CANCEL',
              cancelReason: reason,
              cancelRequestedBy: adminId,
              cancelRequestedAt: new Date().toISOString(),
              cancelInitiatedBy: 'ADMIN',
            };
          }),
        }));
        return changed;
      },
      approveCancelTransaction: (trxId) => {
        let changed = false;
        set((state) => ({
          transactions: state.transactions.map((item) => {
            if (item.id !== trxId || item.status !== 'PENDING_CANCEL' || item.cancelInitiatedBy !== 'ADMIN') return item;
            changed = true;
            return { ...item, status: 'CANCELLED', cancelApprovedAt: new Date().toISOString() };
          }),
        }));
        return changed;
      },
      rejectCancelTransaction: (trxId) => {
        let changed = false;
        set((state) => ({
          transactions: state.transactions.map((item) => {
            if (item.id !== trxId || item.status !== 'PENDING_CANCEL' || item.cancelInitiatedBy !== 'ADMIN') return item;
            changed = true;
            return {
              ...item,
              status: 'COMPLETED',
              cancelReason: undefined,
              cancelRequestedBy: undefined,
              cancelRequestedAt: undefined,
              cancelInitiatedBy: undefined,
            };
          }),
        }));
        return changed;
      },
      requestCancelBySalesforce: (trxId, sfId, reason) => {
        let changed = false;
        set((state) => ({
          transactions: state.transactions.map((item) => {
            if (item.id !== trxId || item.status !== 'COMPLETED' || item.salesforceId !== sfId) return item;
            changed = true;
            return {
              ...item,
              status: 'PENDING_CANCEL',
              cancelReason: reason,
              cancelRequestedBy: sfId,
              cancelRequestedAt: new Date().toISOString(),
              cancelInitiatedBy: 'SALESFORCE',
            };
          }),
        }));
        return changed;
      },
      approveCancelBySalesforce: (trxId) => {
        let changed = false;
        set((state) => ({
          transactions: state.transactions.map((item) => {
            if (item.id !== trxId || item.status !== 'PENDING_CANCEL' || item.cancelInitiatedBy !== 'SALESFORCE') return item;
            changed = true;
            return { ...item, status: 'CANCELLED', cancelApprovedAt: new Date().toISOString() };
          }),
        }));
        return changed;
      },
      rejectCancelBySalesforce: (trxId) => {
        let changed = false;
        set((state) => ({
          transactions: state.transactions.map((item) => {
            if (item.id !== trxId || item.status !== 'PENDING_CANCEL' || item.cancelInitiatedBy !== 'SALESFORCE') return item;
            changed = true;
            return {
              ...item,
              status: 'COMPLETED',
              cancelReason: undefined,
              cancelRequestedBy: undefined,
              cancelRequestedAt: undefined,
              cancelInitiatedBy: undefined,
            };
          }),
        }));
        return changed;
      },
    }),
    {
      name: 'salestrack-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        mustChangePassword: state.mustChangePassword,
        sidebarCollapsed: state.sidebarCollapsed,
        activeNav: state.activeNav,
        salesFormItems: state.salesFormItems,
        selectedOutletId: state.selectedOutletId,
        users: state.users,
        products: state.products,
        outlets: state.outlets,
        transactions: state.transactions,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export { allTaps };
