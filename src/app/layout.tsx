import type { Metadata } from 'next';
import './globals.css';
import { StockSenseProvider } from '@/components/providers/StockSenseProvider';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'StockSense — Autonomous Inventory Management System',
  description: 'AI-Powered IMS built with the Mastra Framework. Real-time ledger, predictive reordering, anomaly detection, and hands-free warehouse floor operations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">
        <StockSenseProvider>
          <AppLayout>{children}</AppLayout>
        </StockSenseProvider>
      </body>
    </html>
  );
}
