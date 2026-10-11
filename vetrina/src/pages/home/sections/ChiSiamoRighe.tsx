/** "\n" nei testi modificabili = a capo */
export function Righe({ s }: { s: string }) {
  const r = s.split("\n");
  return (
    <>
      {r.map((x, i) => (
        <span key={i}>
          {x}
          {i < r.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}
