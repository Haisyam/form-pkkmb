import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pemilihan Kelompok Mentor PKKMB UNMA 2026/2027 | Universitas Majalengka',
  description: 'Portal resmi pendaftaran dan penguncian kelompok mentor PKKMB Universitas Majalengka T.A. 2026/2027. Real-time selection & locking system.',
  keywords: ['PKKMB UNMA', 'Universitas Majalengka', 'Mentor PKKMB 2026', 'Pemilihan Kelompok Mentor UNMA'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakarta.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
