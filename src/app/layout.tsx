import type { Metadata } from 'next'
import {
  Geist,
  Geist_Mono as GeistMono,
  Courier_Prime as CourierPrime,
} from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = GeistMono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const courierPrime = CourierPrime({
  variable: '--font-courier-prime',
  subsets: ['latin'],
  weight: '700',
})

export const metadata: Metadata = {
  title: 'Markdown Dynamic Previewer',
  description:
    'An app that scans some folder and creates dynamic pages to preview markdown, based on a custom url.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}  ${courierPrime.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
