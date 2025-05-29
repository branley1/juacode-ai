import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import "../utils/icons";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JuaCode AI",
  description: "Your intelligent coding assistant",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-64.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <noscript>You need to enable JavaScript to run JuaCode.</noscript>
      </body>
    </html>
  );
}
