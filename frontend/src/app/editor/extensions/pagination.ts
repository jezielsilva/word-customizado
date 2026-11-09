import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

/** Medidas da página em px (antes do zoom). */
export interface LayoutPagina {
  alturaPagina: number;
  /** Altura útil: página menos margens superior e inferior. */
  alturaConteudo: number;
  gap: number;
}

export interface BlocoMedido {
  pos: number;
  /** Topo "natural" (sem os espaçadores atuais). */
  top: number;
  height: number;
  quebraForcadaDepois: boolean;
}

export interface Espacador {
  pos: number;
  altura: number;
}

export interface ResultadoPaginacao {
  espacadores: Espacador[];
  paginas: number;
}

/**
 * Distribui blocos em páginas. Um bloco que não cabe vai inteiro para a próxima
 * página (o espaçador empurra-o até o topo da área útil seguinte).
 */
export function calcularPaginacao(blocos: BlocoMedido[], layout: LayoutPagina): ResultadoPaginacao {
  const passo = layout.alturaPagina + layout.gap;
  const espacadores: Espacador[] = [];
  let paginas = 1;
  if (!blocos.length) return { espacadores, paginas };

  let origem = blocos[0].top;
  let forcar = false;
  for (const b of blocos) {
    const usado = b.top - origem;
    const estoura = b.top + b.height - origem > layout.alturaConteudo;
    if (usado > 0 && (forcar || estoura)) {
      const saltos = Math.max(1, Math.ceil(usado / passo));
      espacadores.push({ pos: b.pos, altura: saltos * passo - usado });
      paginas += saltos;
      origem = b.top;
    }
    forcar = b.quebraForcadaDepois;
  }
  const ultimo = blocos[blocos.length - 1];
  const excesso = ultimo.top + ultimo.height - origem - layout.alturaConteudo;
  if (excesso > 0) paginas += Math.ceil(excesso / passo);
  return { espacadores, paginas };
}

export interface PaginationOptions {
  layout: () => LayoutPagina;
  onPaginas: (n: number) => void;
}

export const paginacaoKey = new PluginKey<Espacador[]>('pePaginacao');

const CLASSE_ESPACADOR = 'pe-page-spacer';

function mesmosEspacadores(a: Espacador[], b: Espacador[]): boolean {
  return a.length === b.length && a.every((x, i) => x.pos === b[i].pos && Math.abs(x.altura - b[i].altura) < 0.5);
}

function medir(view: EditorView): BlocoMedido[] {
  const deslocamento = new Map<Element, number>();
  let acumulado = 0;
  for (const filho of Array.from(view.dom.children)) {
    if (filho.classList.contains(CLASSE_ESPACADOR)) acumulado += (filho as HTMLElement).offsetHeight;
    else deslocamento.set(filho, acumulado);
  }
  const blocos: BlocoMedido[] = [];
  view.state.doc.forEach((node, offset) => {
    const el = view.nodeDOM(offset) as HTMLElement | null;
    if (!el || !deslocamento.has(el)) return;
    blocos.push({
      pos: offset,
      top: el.offsetTop - deslocamento.get(el)!,
      height: el.offsetHeight,
      quebraForcadaDepois: node.type.name === 'pageBreak',
    });
  });
  return blocos;
}

/**
 * Paginação visual estilo Word: folhas separadas com espaço entre elas.
 * O documento continua um fluxo único; espaçadores (decorations) empurram
 * o bloco que não cabe para a próxima folha. Nada é gravado no JSON.
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
                      const div = document.createElement('div');
                      div.className = CLASSE_ESPACADOR;
                      div.contentEditable = 'false';
                      div.style.height = `${e.altura}px`;
                      return div;
                    },
                    { side: -1, key: `pe-esp-${e.pos}-${Math.round(e.altura)}`, ignoreSelection: true },
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
              if (!ativo) return;
              const { espacadores, paginas } = calcularPaginacao(medir(editorView), options.layout());
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
