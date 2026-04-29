'use client';

import { useAppStore } from '@/store/useAppStore';

export default function Toast() {
  const { toast } = useAppStore();

  if (!toast) return null;

  const bgClass = toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-warning';
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '⚠';

  return (
    <div className={bgClass}>
      <span className="mr-2">{icon}</span>
      {toast.message}
    </div>
  );
}
