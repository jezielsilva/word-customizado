import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

/** Medidas da página em px (antes do zoom). */
export interface LayoutPagina {
  alturaPagina: number;
  /** Altura útil: página menos margens superior e inferior. */
  alturaConteudo: number;
  gap: number;
}

/** Trecho que não pode ser partido: um bloco inteiro ou uma linha de parágrafo. */
export interface Segmento {
  pos: number;
  /** Topo "natural" (sem os espaçadores atuais). */
  top: number;
  bottom: number;
  /** true = linha dentro de um parágrafo (espaçador inline). */
  inline: boolean;
}

export interface BlocoMedido extends Segmento {
  quebraForcadaDepois: boolean;
  /** Parágrafos e títulos podem ser divididos por linha. */
  divisivel: boolean;
}

export interface Espacador {
  pos: number;
  altura: number;
  inline: boolean;
}

export interface ResultadoPaginacao {
  espacadores: Espacador[];
  paginas: number;
}

/**
 * Distribui o conteúdo em páginas, como o Word: um bloco que não cabe vai para a
 * próxima folha; um parágrafo longo é partido na linha que não cabe.
 * `linhas` só é chamado para blocos divisíveis que estouram a página.
 */
export function calcularPaginacao(
  blocos: BlocoMedido[],
  layout: LayoutPagina,
  linhas: (b: BlocoMedido) => Segmento[] = () => [],
): ResultadoPaginacao {
  const passo = layout.alturaPagina + layout.gap;
  const espacadores: Espacador[] = [];
  let paginas = 1;
  if (!blocos.length) return { espacadores, paginas };

  let origem = blocos[0].top;
  let forcar = false;
  let fundo = origem;

  const quebrar = (s: Segmento) => {
    const usado = s.top - origem;
    const saltos = Math.max(1, Math.ceil(usado / passo));
    espacadores.push({ pos: s.pos, altura: saltos * passo - usado, inline: s.inline });
    paginas += saltos;
    origem = s.top;
  };

  for (const b of blocos) {
    if (forcar && b.top > origem) quebrar(b);
    forcar = b.quebraForcadaDepois;

    if (b.bottom - origem <= layout.alturaConteudo) {
      fundo = b.bottom;
      continue;
    }
    const partes = b.divisivel ? linhas(b) : [];
    const segmentos: Segmento[] = partes.length > 1 ? partes : [b];
    for (const s of segmentos) {
      if (s.bottom - origem > layout.alturaConteudo && s.top > origem) quebrar(s);
      fundo = s.bottom;
    }
  }
  const excesso = fundo - origem - layout.alturaConteudo;
  if (excesso > 0) paginas += Math.ceil(excesso / passo);
  return { espacadores, paginas };
}

export interface PaginationOptions {
  layout: () => LayoutPagina;
  onPaginas: (n: number) => void;
}

export const paginacaoKey = new PluginKey<Espacador[]>('pePaginacao');

const CLASSE_ESPACADOR = 'pe-page-spacer';
/** Blocos que contêm outros blocos: a paginação desce neles. */
const CONTEINERES = new Set(['bulletList', 'orderedList', 'listItem', 'blockquote', 'conditional', 'repeat']);
const DIVISIVEIS = new Set(['paragraph', 'heading']);

function mesmosEspacadores(a: Espacador[], b: Espacador[]): boolean {
  return (
    a.length === b.length &&
    a.every((x, i) => x.pos === b[i].pos && x.inline === b[i].inline && Math.abs(x.altura - b[i].altura) < 0.5)
  );
}

/** Converte coordenadas da tela em coordenadas "naturais" do documento (sem zoom e sem espaçadores). */
function criarConversor(view: EditorView) {
  const raiz = view.dom.getBoundingClientRect();
  const escala = view.dom.offsetHeight ? raiz.height / view.dom.offsetHeight : 1;
  const espacadores = Array.from(view.dom.querySelectorAll<HTMLElement>(`.${CLASSE_ESPACADOR}`)).map((el) => {
    const r = el.getBoundingClientRect();
    return { fim: (r.bottom - raiz.top) / escala, altura: r.height / escala };
  });
  return (yTela: number) => {
    const y = (yTela - raiz.top) / escala;
    let desconto = 0;
    for (const e of espacadores) if (e.fim <= y + 0.5) desconto += e.altura;
    return y - desconto;
  };
}

function medir(view: EditorView, natural: (y: number) => number): BlocoMedido[] {
  const blocos: BlocoMedido[] = [];
  const visitar = (pai: PMNode, inicio: number) => {
    pai.forEach((node, offset) => {
      const pos = inicio + offset;
      if (CONTEINERES.has(node.type.name) && node.childCount) {
        visitar(node, pos + 1);
        return;
      }
      const el = view.nodeDOM(pos);
      if (!(el instanceof HTMLElement)) return;
      const r = el.getBoundingClientRect();
      blocos.push({
        pos,
        top: natural(r.top),
        bottom: natural(r.bottom),
        inline: false,
        quebraForcadaDepois: node.type.name === 'pageBreak',
        divisivel: DIVISIVEIS.has(node.type.name) && node.content.size > 0,
      });
    });
  };
  visitar(view.state.doc, 0);
  return blocos;
}

/** Linhas de um parágrafo: a cada mudança de linha, um segmento começando na posição inicial dela. */
function medirLinhas(view: EditorView, natural: (y: number) => number, b: BlocoMedido): Segmento[] {
  const node = view.state.doc.nodeAt(b.pos);
  if (!node) return [];
  const inicio = b.pos + 1;
  const fim = b.pos + node.nodeSize - 1;
  const topoEm = (pos: number) => natural(view.coordsAtPos(pos, 1).top);
  const baseEm = (pos: number) => natural(view.coordsAtPos(pos, 1).bottom);

  const linhas: Segmento[] = [];
  let pos = inicio;
  let topoLinha = b.top;
  while (pos <= fim) {
    const topo = topoEm(pos);
    // Busca binária: primeira posição cujo topo está numa linha abaixo.
    let lo = pos + 1;
    let hi = fim + 1;
    while (lo < hi) {
      const meio = (lo + hi) >> 1;
      if (topoEm(meio) > topo + 1) hi = meio;
      else lo = meio + 1;
    }
    const proxima = lo;
    const base = proxima <= fim ? topoEm(proxima) : b.bottom;
    linhas.push({
      pos: linhas.length ? pos : b.pos,
      top: linhas.length ? topoLinha : b.top,
      bottom: Math.max(base, baseEm(Math.min(proxima - 1, fim))),
      inline: linhas.length > 0,
    });
    if (proxima > fim) break;
    topoLinha = topoEm(proxima);
    pos = proxima;
  }
  if (linhas.length) linhas[linhas.length - 1].bottom = b.bottom;
  return linhas;
}

/**
 * Paginação visual estilo Word: folhas separadas com espaço entre elas.
 * O documento continua um fluxo único; espaçadores (decorations) empurram
 * o conteúdo que não cabe para a próxima folha. Nada é gravado no JSON.
 */
export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      layout: () => ({ alturaPagina: 1123, alturaConteudo: 937, gap: 24 }),
      onPaginas: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<Espacador[]>({
        key: paginacaoKey,
        state: {
          init: () => [],
          apply: (tr, valor) => {
            const meta = tr.getMeta(paginacaoKey) as Espacador[] | undefined;
            if (meta) return meta;
            if (!tr.docChanged) return valor;
            return valor.map((e) => ({ ...e, pos: tr.mapping.map(e.pos) }));
          },
        },
        props: {
          decorations: (state) => {
            const espacadores = paginacaoKey.getState(state) ?? [];
            if (!espacadores.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              espacadores
                .filter((e) => e.pos <= state.doc.content.size)
                .map((e) =>
                  Decoration.widget(
                    e.pos,
                    () => {
                      const el = document.createElement(e.inline ? 'span' : 'div');
                      el.className = CLASSE_ESPACADOR;
                      el.contentEditable = 'false';
                      el.style.display = 'block';
                      el.style.height = `${e.altura}px`;
                      return el;
                    },
                    {
                      side: -1,
                      key: `pe-esp-${e.inline ? 'i' : 'b'}-${e.pos}-${Math.round(e.altura)}`,
                      ignoreSelection: true,
                    },
                  ),
                ),
            );
          },
        },
        view: (editorView) => {
          let raf = 0;
          let ativo = true;
          const agendar = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
              if (!ativo || !editorView.dom.isConnected) return;
              const natural = criarConversor(editorView);
              const { espacadores, paginas } = calcularPaginacao(medir(editorView, natural), options.layout(), (b) =>
                medirLinhas(editorView, natural, b),
              );
              options.onPaginas(paginas);
              const atuais = paginacaoKey.getState(editorView.state) ?? [];
              if (!mesmosEspacadores(atuais, espacadores)) {
                editorView.dispatch(
                  editorView.state.tr.setMeta(paginacaoKey, espacadores).setMeta('addToHistory', false),
                );
              }
            });
          };
          agendar();
          document.fonts?.ready.then(agendar);
          return {
            update: agendar,
            destroy: () => {
              ativo = false;
              cancelAnimationFrame(raf);
            },
          };
        },
      }),
    ];
  },
});

/** Força um novo cálculo (ex.: margens ou fonte padrão mudaram). */
export function recalcularPaginacao(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta('peRecalcular', true).setMeta('addToHistory', false));
}
