import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SalesTrack - Input Penjualan Produk Telko',
  description: 'Platform pencatatan dan pengelolaan penjualan produk telekomunikasi. Digitalisasi input penjualan untuk tim Salesforce.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
