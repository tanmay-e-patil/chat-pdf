'use client';
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type Props = { children: React.ReactNode };
const queryClient = new QueryClient();

export default function Providers({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <html lang="en">
        <body>
          {children}
        </body>
      </html>
    </QueryClientProvider>
  )
}
