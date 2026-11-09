import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface OpcoesBusca {
  diferenciarMaiusculas: boolean;
  diferenciarAcentos: boolean;
}

export interface Resultado {
  from: number;
  to: number;
}

export interface EstadoBusca {
  termo: string;
  opcoes: OpcoesBusca;
  resultados: Resultado[];
  atual: number;
}

export interface BuscaOptions {
  /** Rótulo do campo (para achar campos pelo nome no modo Modelo). */
  rotuloCampo: (key: string) => string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    busca: {
      definirBusca: (termo: string, opcoes?: Partial<OpcoesBusca>) => ReturnType;
      irParaResultado: (direcao: 1 | -1) => ReturnType;
      substituirAtual: (texto: string) => ReturnType;
      substituirTodos: (texto: string) => ReturnType;
      limparBusca: () => ReturnType;
    };
  }
}

export const buscaKey = new PluginKey<EstadoBusca>('peBusca');

const SEM_ACENTO = /[̀-ͯ]/g;
/** Normaliza caractere a caractere, preservando o comprimento (posições continuam batendo). */
export function normalizar(texto: string, opcoes: OpcoesBusca): string {
  let r = '';
  for (const c of texto) {
    let n = opcoes.diferenciarAcentos ? c : c.normalize('NFD').replace(SEM_ACENTO, '') || c;
    if (!opcoes.diferenciarMaiusculas) n = n.toLowerCase();
    r += n.length === c.length ? n : c;
  }
  return r;
}

/** Busca no texto de cada parágrafo; no modo Modelo, campos casam pelo rótulo. */
export function buscar(doc: PMNode, termo: string, opcoes: OpcoesBusca, rotulo: (k: string) => string | null): Resultado[] {
  if (!termo) return [];
  const alvo = normalizar(termo, opcoes);
  const modelo = doc.attrs['mode'] === 'template';
  const resultados: Resultado[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let texto = '';
    const mapa: number[] = [];
    node.forEach((filho, offset) => {
      const p = pos + 1 + offset;
      if (filho.isText && filho.text) {
        for (let i = 0; i < filho.text.length; i++) mapa.push(p + i);
        texto += filho.text;
      } else {
        if (modelo && filho.type.name === 'field') {
          const r = rotulo(filho.attrs['key']) ?? filho.attrs['key'];
          if (normalizar(r, opcoes).includes(alvo)) resultados.push({ from: p, to: p + 1 });
        }
        mapa.push(-1);
        texto += '￼';
      }
    });
    const base = normalizar(texto, opcoes);
    let i = base.indexOf(alvo);
    while (i >= 0 && alvo) {
      const ini = mapa[i];
      const fim = mapa[i + alvo.length - 1];
      if (ini >= 0 && fim >= 0) resultados.push({ from: ini, to: fim + 1 });
      i = base.indexOf(alvo, i + alvo.length);
    }
    return false;
  });
  return resultados.sort((a, b) => a.from - b.from);
}

const VAZIO: EstadoBusca = {
  termo: '',
  opcoes: { diferenciarMaiusculas: false, diferenciarAcentos: false },
  resultados: [],
  atual: -1,
};

/** Localizar e substituir (Ctrl+F / Ctrl+H) com realce por decorations. */
export const Busca = Extension.create<BuscaOptions>({
  name: 'busca',

  addOptions() {
    return { rotuloCampo: () => null };
  },

  addCommands() {
    const recalcular = (state: EditorState, termo: string, opcoes: OpcoesBusca, atual = 0): EstadoBusca => {
      const resultados = buscar(state.doc, termo, opcoes, this.options.rotuloCampo);
      return { termo, opcoes, resultados, atual: resultados.length ? Math.min(Math.max(atual, 0), resultados.length - 1) : -1 };
    };
    const selecionar = (tr: import('@tiptap/pm/state').Transaction, r?: Resultado) => {
      if (r) tr.setSelection(TextSelection.create(tr.doc, r.from, r.to)).scrollIntoView();
    };
    const inserir = (state: EditorState, texto: string) => {
      const m = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(texto.trim());
      if (m && state.doc.attrs['mode'] === 'template' && state.schema.nodes['field']) {
        return state.schema.nodes['field'].create({ key: m[1] });
      }
      return texto ? state.schema.text(texto) : null;
    };

    return {
      definirBusca:
        (termo, opcoes) =>
        ({ state, tr }) => {
          const atual = buscaKey.getState(state) ?? VAZIO;
          const novo = recalcular(state, termo, { ...atual.opcoes, ...opcoes });
          tr.setMeta(buscaKey, novo).setMeta('addToHistory', false);
          return true;
        },
      irParaResultado:
        (direcao) =>
        ({ state, tr }) => {
          const atual = buscaKey.getState(state) ?? VAZIO;
          const n = atual.resultados.length;
          if (!n) return false;
          const idx = (atual.atual + direcao + n) % n;
          tr.setMeta(buscaKey, { ...atual, atual: idx }).setMeta('addToHistory', false);
          selecionar(tr, atual.resultados[idx]);
          return true;
        },
      substituirAtual:
        (texto) =>
        ({ state, tr }) => {
          const atual = buscaKey.getState(state) ?? VAZIO;
          const r = atual.resultados[atual.atual];
          if (!r) return false;
          const no = inserir(state, texto);
          const marcas = state.doc.resolve(r.from).marksAcross(state.doc.resolve(r.to)) ?? undefined;
          if (no) tr.replaceWith(r.from, r.to, no.isText && marcas ? no.mark(marcas) : no);
          else tr.delete(r.from, r.to);
          const proximo = recalcular(state.apply(tr), atual.termo, atual.opcoes, atual.atual);
          tr.setMeta(buscaKey, proximo);
          selecionar(tr, proximo.resultados[proximo.atual]);
          return true;
        },
      substituirTodos:
        (texto) =>
        ({ state, tr }) => {
          const atual = buscaKey.getState(state) ?? VAZIO;
          if (!atual.resultados.length) return false;
          // De trás para frente: um único passo de desfazer.
          for (const r of [...atual.resultados].reverse()) {
            const no = inserir(state, texto);
            const marcas = state.doc.resolve(r.from).marksAcross(state.doc.resolve(r.to)) ?? undefined;
            if (no) tr.replaceWith(r.from, r.to, no.isText && marcas ? no.mark(marcas) : no);
            else tr.delete(r.from, r.to);
          }
          tr.setMeta(buscaKey, recalcular(state.apply(tr), atual.termo, atual.opcoes));
          return true;
        },
      limparBusca:
        () =>
        ({ tr }) => {
          tr.setMeta(buscaKey, VAZIO).setMeta('addToHistory', false);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const rotulo = this.options.rotuloCampo;
    return [
      new Plugin<EstadoBusca>({
        key: buscaKey,
        state: {
          init: () => VAZIO,
          apply: (tr, valor, _velho, novoEstado) => {
            const meta = tr.getMeta(buscaKey) as EstadoBusca | undefined;
            if (meta) return meta;
            if (!tr.docChanged || !valor.termo) return valor;
            const resultados = buscar(novoEstado.doc, valor.termo, valor.opcoes, rotulo);
            return { ...valor, resultados, atual: Math.min(valor.atual, resultados.length - 1) };
          },
        },
        props: {
          decorations: (state) => {
            const b = buscaKey.getState(state);
            if (!b?.resultados.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              b.resultados.map((r, i) => {
                const node = state.doc.nodeAt(r.from);
                const classe = i === b.atual ? 'pe-search-hit is-current' : 'pe-search-hit';
                return node && !node.isText && r.to - r.from === 1
                  ? Decoration.node(r.from, r.to, { class: classe })
                  : Decoration.inline(r.from, r.to, { class: classe });
              }),
            );
          },
        },
      }),
    ];
  },
});

