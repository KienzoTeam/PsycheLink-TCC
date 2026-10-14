import { brand } from '../theme';

export function EmBreve({ titulo }: { titulo: string }) {
  return (
    <>
      <h1 style={{ margin: 0 }}>{titulo}</h1>
      <div style={{ background: brand.surface, border: `1px solid ${brand.outline}`, borderRadius: brand.radius.xl, padding: 24, color: brand.subtext }}>
        Esta área ainda não foi implementada.
      </div>
    </>
  );
}
