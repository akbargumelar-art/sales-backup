export function waitForUploadOverlayPaint() {
  if (typeof window === 'undefined') return Promise.resolve();

  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}
