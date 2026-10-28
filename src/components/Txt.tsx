/** content/ 문자열의 [확인필요]를 점선 표시로 바꿔 그린다. */
export function Txt({ children }: { children: string }) {
  const parts = children.split(/(\[확인필요\])/);
  if (parts.length === 1) return <>{children}</>;
  return (
    <>
      {parts.map((p, i) =>
        p === '[확인필요]' ? (
          <mark key={i} className="tbd" title="사실 확인 후 content/에서 지울 것">
            확인필요
          </mark>
        ) : (
          p && <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
