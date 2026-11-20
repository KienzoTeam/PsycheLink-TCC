export function media(valores: Array<number | null | undefined>): number | null {
  const validos = valores.filter((v): v is number => v !== null && v !== undefined);
  if (validos.length === 0) return null;
  return validos.reduce((soma, v) => soma + v, 0) / validos.length;
}

export function arredondar(valor: number | null): number | null {
  return valor === null ? null : Number(valor.toFixed(1));
}

/** Correlação de Pearson; null quando uma das séries não varia. */
export function pearson(pares: Array<[number, number]>): number | null {
  const mx = media(pares.map(([x]) => x));
  const my = media(pares.map(([, y]) => y));
  if (mx === null || my === null) return null;

  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pares) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  const denominador = Math.sqrt(sxx * syy);
  return denominador === 0 ? null : sxy / denominador;
}

/** Desvio de cada valor em relação à média da própria série, com uma casa decimal. */
export function desviosDaMedia(itens: Array<{ data: string; valor: number }>) {
  const m = media(itens.map((i) => i.valor));
  return {
    media: arredondar(m),
    dias: m === null ? [] : itens.map((i) => ({ data: i.data, desvio: Number((i.valor - m).toFixed(1)) })),
  };
}

/** Diferença entre duas médias já arredondadas, para a tela bater com o que o psicólogo confere à mão. */
export function variacaoEntre(atual: number | null, anterior: number | null): number | null {
  return atual === null || anterior === null ? null : Number((atual - anterior).toFixed(1));
}
