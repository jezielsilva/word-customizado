import { calcularPaginacao, type BlocoMedido, type LayoutPagina, type Segmento } from './pagination';

const layout: LayoutPagina = { alturaPagina: 1000, alturaConteudo: 800, gap: 20, margemSuperior: 100 };
const bloco = (pos: number, top: number, height: number, extra: Partial<BlocoMedido> = {}): BlocoMedido => ({
  pos, top, bottom: top + height, inline: false, quebraForcadaDepois: false, divisivel: false, ...extra,
});

describe('calcularPaginacao', () => {
  it('uma página quando tudo cabe', () => {
    expect(calcularPaginacao([bloco(0, 100, 300), bloco(10, 400, 300)], layout)).toEqual({ espacadores: [], paginas: 1 });
  });

  it('documento vazio tem uma página', () => {
    expect(calcularPaginacao([], layout).paginas).toBe(1);
  });

  it('empurra o bloco que não cabe para a próxima folha', () => {
    const r = calcularPaginacao([bloco(0, 100, 500), bloco(20, 600, 400)], layout);
    expect(r.paginas).toBe(2);
    expect(r.espacadores).toEqual([{ pos: 20, altura: 520, inline: false }]);
  });

  it('respeita quebra de página manual', () => {
    const r = calcularPaginacao([bloco(0, 100, 50, { quebraForcadaDepois: true }), bloco(5, 150, 50)], layout);
    expect(r.paginas).toBe(2);
    expect(r.espacadores).toEqual([{ pos: 5, altura: 970, inline: false }]);
  });

  it('divide parágrafo longo na linha que não cabe', () => {
    const p = bloco(30, 700, 300, { divisivel: true });
    const linhas: Segmento[] = [
      { pos: 30, top: 700, bottom: 800, inline: false },
      { pos: 40, top: 800, bottom: 900, inline: true },
      { pos: 50, top: 900, bottom: 1000, inline: true },
    ];
    const r = calcularPaginacao([bloco(0, 100, 600), p], layout, () => linhas);
    expect(r.espacadores).toEqual([{ pos: 50, altura: 1020 - 800, inline: true }]);
    expect(r.paginas).toBe(2);
  });

  it('quebra tabela entre linhas', () => {
    const linhas = [0, 1, 2, 3, 4].map((i) => bloco(10 + i * 5, 100 + i * 200, 200, { linha: true, colunas: 3 }));
    const r = calcularPaginacao(linhas, layout);
    expect(r.paginas).toBe(2);
    expect(r.espacadores).toEqual([{ pos: 30, altura: 1020 - 800, inline: false, linha: true, colunas: 3 }]);
  });

  it('bloco indivisível maior que a página não gera espaçador negativo', () => {
    const r = calcularPaginacao([bloco(0, 100, 1500), bloco(50, 1600, 20)], layout);
    expect(r.espacadores[0].altura).toBeGreaterThan(0);
    expect(r.paginas).toBe(3);
  });
});
