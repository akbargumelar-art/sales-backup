'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function UploadLockOverlay() {
  const uploadLock = useAppStore((state) => state.uploadLock);
  const hasProgress = uploadLock.total > 0;
  const progress = hasProgress
    ? Math.min(100, Math.max(0, Math.round((uploadLock.current / uploadLock.total) * 100)))
    : 0;

  useEffect(() => {
    if (!uploadLock.isActive) return;
    const previousOverflow = document.body.style.overflow;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePopState = () => {
      window.history.pushState({ uploadLocked: true }, '', window.location.href);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href]');
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isReload = key === 'f5' || ((event.ctrlKey || event.metaKey) && key === 'r');
      const isHistoryShortcut = event.altKey && (key === 'arrowleft' || key === 'arrowright');
      if (event.key === 'Escape' || isReload || isHistoryShortcut) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.body.style.overflow = 'hidden';
    window.history.pushState({ uploadLocked: true }, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [uploadLock.isActive]);

  if (!uploadLock.isActive) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center px-5"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="upload-lock-title"
      aria-describedby="upload-lock-message"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
          <svg className="animate-spin h-7 w-7 text-primary" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 id="upload-lock-title" className="text-h2 text-text-primary">{uploadLock.title}</h2>
          <p id="upload-lock-message" className="text-body text-text-secondary mt-2">{uploadLock.message}</p>
        </div>

        <div className="mt-5 rounded-xl bg-surface p-4">
          <div className="flex items-center justify-between gap-3 text-caption font-semibold text-text-primary">
            <span>{hasProgress ? `${uploadLock.current} dari ${uploadLock.total} baris` : 'Menyiapkan upload'}</span>
            {hasProgress && <span>{progress}%</span>}
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: hasProgress ? `${progress}%` : '18%' }}
            />
          </div>
          {uploadLock.detail && (
            <p className="mt-3 text-caption text-text-secondary break-words">{uploadLock.detail}</p>
          )}
          {uploadLock.failed > 0 && (
            <p className="mt-2 text-caption font-semibold text-error">{uploadLock.failed} baris gagal, proses tetap dilanjutkan.</p>
          )}
        </div>

        <p className="text-[11px] text-text-secondary/70 mt-4 text-center">
          Halaman dikunci sementara. Jangan tutup tab, reload, atau pindah halaman sampai selesai.
        </p>
      </div>
    </div>
  );
}
