// app/layout.tsx
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner'; // For notifications
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Juacode Chatbot',
  description: 'Unified Next.js Chatbot with Supabase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Meta tags, theme-color script, etc. can be added here */}
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster position="top-center" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
