import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Faculty Team App',
  description: 'Project management, time tracking, and billing for Faculty',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className={`${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel='stylesheet' href='https://use.typekit.net/ulz0ipb.css' />
      </head>
      <body className='min-h-full flex flex-col overflow-x-hidden'>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
