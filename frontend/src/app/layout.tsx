import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { I18nProvider } from '@/i18n';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OTP Manager",
  description: "Manage OTP generation and verification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoMono.variable} font-sans antialiased`}
        suppressHydrationWarning={true}
      >
        <I18nProvider>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
