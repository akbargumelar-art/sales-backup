'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-30 w-11 h-11 rounded-full bg-primary text-white shadow-lg shadow-primary/25 flex items-center justify-center transition-all hover:bg-primary-dark active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <ArrowUp size={20} strokeWidth={2.4} />
    </button>
  );
}
