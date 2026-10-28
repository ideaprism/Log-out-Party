/** KST 표기. 공보식 'YYYY.MM.DD HH:mm' */
const fmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatKST(iso: string): string {
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** 'YYYY-MM-DD' + 'HH:mm' (KST) → ISO(UTC) */
export function kstToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00+09:00`).toISOString();
}

/** ISO → KST 'HH:mm' (입력창 기본값용) */
export function kstTime(iso: string): string {
  return formatKST(iso).slice(-5);
}
