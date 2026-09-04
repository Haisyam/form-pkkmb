import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const logoUrl = 'https://unma.ac.id/wp-content/uploads/2023/02/Logo-Universitas-Majalengka-300x300-1.png';

export const metadata: Metadata = {
  title: 'Pemilihan Kelompok Mentor PKKMB UNMA 2026/2027',
  description: 'Portal Resmi Pendaftaran & Pemilihan Kelompok Mentor PKKMB Universitas Majalengka Tahun Akademik 2026/2027.',
  keywords: [
    'PKKMB UNMA',
    'Universitas Majalengka',
    'Mentor PKKMB 2026',
    'Kelompok PKKMB UNMA',
    'Pendaftaran Mentor UNMA'
  ],
  authors: [{ name: 'Panitia Pelaksana PKKMB UNMA 2026/2027' }],
  icons: {
    icon: logoUrl,
    shortcut: logoUrl,
    apple: logoUrl,
  },
  openGraph: {
    title: 'Pemilihan Kelompok Mentor PKKMB UNMA 2026/2027',
    description: 'Portal Resmi Pendaftaran & Pemilihan Kelompok Mentor PKKMB Universitas Majalengka T.A. 2026/2027.',
    siteName: 'PKKMB UNMA 2026/2027',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: logoUrl,
        width: 300,
        height: 300,
        alt: 'Logo Universitas Majalengka (UNMA)',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Pemilihan Kelompok Mentor PKKMB UNMA 2026/2027',
    description: 'Portal Resmi Pendaftaran & Pemilihan Kelompok Mentor PKKMB Universitas Majalengka T.A. 2026/2027.',
    images: [logoUrl],
  },
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
        <link rel="icon" href={logoUrl} type="image/png" />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
