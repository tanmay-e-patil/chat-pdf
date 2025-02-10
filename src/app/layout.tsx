import {
  ClerkProvider,
} from '@clerk/nextjs'
import './globals.css'
import Providers from '@/components/Providers'
import {Toaster} from 'react-hot-toast';
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <Providers>
      <html lang="en" suppressHydrationWarning>
        <body>
          {children}
        </body>
      </html>
      <Toaster />
      </Providers>
    </ClerkProvider>
  )
}