import { calcularPaginacao, type BlocoMedido, type LayoutPagina } from './pagination';

const layout: LayoutPagina = { alturaPagina: 1000, alturaConteudo: 800, gap: 20 };
const bloco = (pos: number, top: number, height: number, quebraForcadaDepois = false): BlocoMedido => ({
  pos, top, height, quebraForcadaDepois,
});

describe('calcularPaginacao', () => {
  it('uma página quando tudo cabe', () => {
    const r = calcularPaginacao([bloco(0, 100, 300), bloco(10, 400, 300)], layout);
    expect(r).toEqual({ espacadores: [], paginas: 1 });
  });

  it('documento vazio tem uma página', () => {
    expect(calcularPaginacao([], layout).paginas).toBe(1);
  });

  it('empurra o bloco que não cabe para a próxima folha', () => {
    const r = calcularPaginacao([bloco(0, 100, 500), bloco(20, 600, 400)], layout);
    expect(r.paginas).toBe(2);
    // usado = 500; espaçador = passo (1020) - 500
    expect(r.espacadores).toEqual([{ pos: 20, altura: 520 }]);
  });

  it('respeita quebra de página manual', () => {
    const r = calcularPaginacao([bloco(0, 100, 50, true), bloco(5, 150, 50)], layout);
    expect(r.paginas).toBe(2);
    expect(r.espacadores).toEqual([{ pos: 5, altura: 970 }]);
  });

  it('bloco maior que a página não gera espaçador negativo', () => {
    const r = calcularPaginacao([bloco(0, 100, 1500), bloco(50, 1600, 20)], layout);
    expect(r.espacadores[0].altura).toBeGreaterThan(0);
    expect(r.paginas).toBe(3);
  });

  it('conta páginas extras quando o último bloco transborda', () => {
    const r = calcularPaginacao([bloco(0, 100, 1700)], layout);
    expect(r.paginas).toBe(2);
  });
});
