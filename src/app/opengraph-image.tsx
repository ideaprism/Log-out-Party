import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { copy, cover } from '@/lib/content';

/*
 * 링크 미리보기 (PRD 4 · 0번) — 공보 1면 썸네일. 빌드 때 한 번 그려 둔다.
 * 사내 게시판·카카오톡이 이 그림을 띄운다. IdeaPrism은 넣지 않는다.
 *
 * 한글 글꼴은 Google Fonts에서 이 그림에 쓰는 글자만 잘라 받는다(text=).
 * 브라우저용 next/font는 woff2라 여기(satori)에서는 못 쓴다.
 */

export const alt = copy.meta.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#141414';
const INK2 = '#5A5A5A';
const PAPER = '#FAF7F0';
const GROUND = '#EFEBE1';
const LINE = '#C8C2B6';
const NAVY = '#173F6B';

async function font(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`OG 글꼴을 받지 못했습니다: ${family} ${weight}`);
  return (await fetch(src)).arrayBuffer();
}

async function figure(): Promise<string> {
  const src = cover.figure.src;
  const file = path.join(process.cwd(), 'public', src.replace(/^\//, ''));
  const mime = src.endsWith('.svg') ? 'image/svg+xml' : src.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${await readFile(file, 'base64')}`;
}

export default async function Image() {
  const term = `${cover.term.from} ~ ${cover.term.to} (${cover.term.note})`;
  const serifText = [cover.agency, cover.kind, cover.subtitle, cover.title, cover.inventor, term].join('');
  const sansText = `등록특허 ${cover.docNo}(19)(12)(54)(72)발명의 명칭발명자존속기간${cover.figure.caption}`;

  const [m400, m800, g400, img] = await Promise.all([
    font('Nanum+Myeongjo', 400, serifText),
    font('Nanum+Myeongjo', 800, serifText),
    font('Nanum+Gothic', 400, sansText),
    figure(),
  ]);

  const label = { fontFamily: 'Gothic', fontSize: 22, color: INK2 } as const;
  const rule = (w: number) => ({ height: w, background: INK, width: '100%' }) as const;

  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: GROUND, padding: 36 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: PAPER,
          border: `1px solid ${LINE}`,
          padding: '24px 48px 36px',
          fontFamily: 'Myeongjo',
          color: INK,
        }}
      >
        <div style={{ ...label, display: 'flex', justifyContent: 'flex-end', fontSize: 20 }}>
          등록특허 {cover.docNo}
        </div>
        <div style={{ ...rule(4), marginTop: 10 }} />

        <div style={{ display: 'flex', flex: 1, gap: 40, marginTop: 22 }}>
          {/* 표제는 위, 서지는 아래에 붙여 세로 여백을 고르게 쓴다 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: NAVY, fontSize: 28 }}>
                <span style={{ fontFamily: 'Gothic', fontSize: 22 }}>(19)</span>
                {cover.agency}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                <span style={{ fontFamily: 'Gothic', fontSize: 22, color: NAVY }}>(12)</span>
                <span style={{ fontSize: 72, fontWeight: 800, letterSpacing: -1, whiteSpace: 'nowrap' }}>
                  {cover.kind}
                </span>
              </div>
              <div style={{ fontSize: 36, marginTop: 4 }}>{cover.subtitle}</div>
              <div style={{ ...rule(4), marginTop: 22 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 4 }}>
              <Row k="(54) 발명의 명칭" v={cover.title} big label={label} />
              <Row k="(72) 발명자" v={cover.inventor} label={label} />
              <Row k="존속기간" v={term} label={label} />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 300,
            }}
          >
            <div style={{ display: 'flex', border: `1.5px solid ${INK}`, background: '#FFFFFF', padding: 6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} width={284} height={284} alt="" />
            </div>
            <div style={{ ...label, marginTop: 10 }}>{cover.figure.caption}</div>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Myeongjo', data: m400, weight: 400, style: 'normal' },
        { name: 'Myeongjo', data: m800, weight: 800, style: 'normal' },
        { name: 'Gothic', data: g400, weight: 400, style: 'normal' },
      ],
    },
  );
}

function Row({
  k,
  v,
  big,
  label,
}: {
  k: string;
  v: string;
  big?: boolean;
  label: { fontFamily: string; fontSize: number; color: string };
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <span style={{ ...label, width: 180 }}>{k}</span>
      <span style={{ fontSize: big ? 44 : 27, fontWeight: big ? 800 : 400, whiteSpace: 'nowrap' }}>{v}</span>
    </div>
  );
}
