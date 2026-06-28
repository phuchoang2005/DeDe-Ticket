import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/store/AuthContext';
import AppLayout from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'Dề Dê Ticketing',
  description: 'Online event management & ticketing system',
};

/**
 * Root layout: renders the document shell, loads the runtime config
 * (`public/config.js`) before the app hydrates, and wraps every route in the
 * auth provider and the shared application chrome (header/nav/footer).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Runtime API base URL override — must run before the bundle. */}
        <Script src="/config.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
