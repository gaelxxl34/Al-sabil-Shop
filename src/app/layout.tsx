import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { NotificationWrapper } from "@/components/NotificationWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Al-Sabil Ordering App",
  description: "Wholesale ordering platform for Al-Sabil products",
  keywords: ["wholesale", "ordering", "Al-Sabil", "products", "business", "platform"],
  authors: [{ name: "Al-Sabil" }],
  creator: "Al-Sabil",
  publisher: "Al-Sabil",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Al-Sabil Ordering App",
    description: "Wholesale ordering platform for Al-Sabil products",
    url: "https://orders.alsabilmarketplace.ie/",
    siteName: "Al-Sabil Ordering App",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Al-Sabil Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Al-Sabil Ordering App",
    description: "Wholesale ordering platform for Al-Sabil products",
    images: ["/twitter-image.png"],
    creator: "@AlSabil",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <NotificationWrapper>
                {children}
              </NotificationWrapper>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
