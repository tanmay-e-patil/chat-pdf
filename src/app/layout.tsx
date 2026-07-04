import "./globals.css";
import Providers from "@/components/Providers";
import Script from "next/script";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <Script
          src="https://rybbit.tanmayep.dev/api/script.js"
          data-site-id="3"
          data-track-errors="true"
          data-session-replay="true"
          strategy="afterInteractive"
        />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
