// app/layout.tsx
import { Inter } from 'next/font/google';
import { ClientLayout } from './client-layout';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'simplifIDE',
  description: 'AI-powered IDE assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark h-full">
      <body className={`${inter.className} bg-background text-foreground antialiased h-full`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}