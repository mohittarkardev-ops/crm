import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SecureDrive CRM",
  description: "Manage clients, policies, renewals and notifications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Runs before the first paint: tells the CSS whether the welcome splash was already shown in this browser session. */}
        <Script id="crm-welcome-flag" strategy="beforeInteractive">
          {`try{document.documentElement.dataset.welcome=sessionStorage.getItem("crm-welcome")&&!/[?&]welcome/.test(location.search)?"seen":"show"}catch(e){document.documentElement.dataset.welcome="seen"}`}
        </Script>
        {children}
      </body>
    </html>
  );
}
