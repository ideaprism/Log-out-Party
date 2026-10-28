import type { Metadata, Viewport } from 'next';
import { Nanum_Myeongjo } from 'next/font/google';
import { copy } from '@/lib/content';
import './globals.css';

// 공보 본문은 명조다. 안드로이드에는 바탕체가 없으므로 내려받아 쓴다.
// 한글은 unicode-range로 쪼개져 있어 화면에 나온 글자의 조각만 받는다.
const myeongjo = Nanum_Myeongjo({
  weight: ['400', '700', '800'],
  display: 'swap',
  preload: false,
  variable: '--font-myeongjo',
});

/**
 * 미리보기 그림은 절대 주소여야 카카오톡·게시판이 가져간다.
 * SITE_URL이 있으면 그것, Vercel 위면 운영 도메인, 아니면 로컬.
 */
const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: copy.meta.title,
  description: copy.meta.description,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    title: copy.meta.title,
    description: copy.meta.description,
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#EFEBE1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={myeongjo.variable} suppressHydrationWarning>
      <head>
        {/* JS가 돌 때만 페이드용으로 숨긴다. 스크립트가 막혀도 글은 보인다. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
