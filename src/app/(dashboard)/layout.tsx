'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import MobileHeader from '@/components/layout/MobileHeader';
import BottomNav from '@/components/layout/BottomNav';
import DesktopSidebar from '@/components/layout/DesktopSidebar';
import Toast from '@/components/ui/Toast';
import UploadLockOverlay from '@/components/ui/UploadLockOverlay';
import ScrollToTopButton from '@/components/ui/ScrollToTopButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoggedIn, mustChangePassword, hasHydrated, hydrateFromServer } = useAppStore();

  useEffect(() => {
    hydrateFromServer();
  }, [hydrateFromServer]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isLoggedIn) { router.push('/login'); return; }
    if (mustChangePassword) { router.push('/change-password'); return; }
  }, [hasHydrated, isLoggedIn, mustChangePassword, router]);

  if (!hasHydrated || !isLoggedIn || mustChangePassword) return null;

  return (
    <div className="min-h-screen bg-slate-900 lg:bg-surface">
      {/* Desktop layout: sidebar + content */}
      <div className="lg:flex">
        {/* Desktop Sidebar - hidden on mobile */}
        <DesktopSidebar />

        {/* Content area */}
        <div className="lg:flex-1 lg:min-w-0">
          {/* Mobile: centered container */}
          <div className="max-w-mobile mx-auto lg:max-w-none lg:mx-0 min-h-screen bg-surface relative">
            {/* Mobile header - hidden on desktop */}
            <div className="lg:hidden">
              <MobileHeader />
            </div>

            {/* Desktop top bar - full width */}
            <div className="hidden lg:block sticky top-0 z-30 bg-white border-b border-border px-6 py-3">
              <MobileHeader />
            </div>

            <main className="pb-safe lg:pb-6 min-h-[calc(100vh-56px)]">
              {children}
            </main>

            {/* Bottom nav - mobile only */}
            <div className="lg:hidden">
              <BottomNav />
            </div>
          </div>
        </div>
      </div>
      <ScrollToTopButton />
      <Toast />
      <UploadLockOverlay />
    </div>
  );
}
