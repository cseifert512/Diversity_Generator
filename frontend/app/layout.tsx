import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from '@/components/providers/ClientProviders';

export const metadata: Metadata = {
  title: 'Floor Plan Diversity Analyzer | Drafted',
  description: 'Analyze geometric diversity across AI-generated floor plans. Evaluate design variation, spatial topology, and program distribution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <ClientProviders>
          <div className="flex flex-col min-h-screen">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}




