import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My TodoMate',
  description: '나만의 투두메이트',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard-dynamic-subset.css" />
      </head>
      <body className="font-['Pretendard'] antialiased bg-gray-100">{children}</body>
    </html>
  )
}