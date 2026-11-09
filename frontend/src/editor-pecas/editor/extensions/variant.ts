import { Node, PasteRule, mergeAttributes } from '@tiptap/core';
import type { FormasVariacao, VariantAttrs } from '../models/editor.models';

export interface VariantClickEvent {
  pos: number;
  attrs: VariantAttrs;
  rect: DOMRect;
}

export interface VariantOptions {
  onEdit: (ev: VariantClickEvent) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variant: {
      insertVariant: (attrs: VariantAttrs) => ReturnType;
      updateVariant: (pos: number, attrs: VariantAttrs) => ReturnType;
    };
  }
}

const FORMAS_VAZIAS: FormasVariacao = { ms: '', fs: '', mp: '', fp: '' };
export const VARIANT_REGEX = /\{\{#flex\s+([\w.]+)\s*:\s*([^|}]*)\|([^|}]*)\|([^|}]*)\|([^|}]*)\}\}/g;

export function textoVariacao(a: VariantAttrs): string {
  const f = a.formas;
  return `{{#flex ${a.key}: ${f.ms} | ${f.fs} | ${f.mp} | ${f.fp}}}`;
}

const ICONE =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>';

/**
 * Plural e gênero automáticos: guarda as quatro formas; o servidor escolhe na mesclagem
 * pela quantidade e gênero da lista. Na tela, chip com a forma singular masculina.
 */
export const Variant = Node.create<VariantOptions>({
  name: 'variant',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { onEdit: () => undefined };
  },

  addAttributes() {
    return {
      key: { default: '', parseHTML: (el) => el.getAttribute('data-key') ?? '', renderHTML: (a) => ({ 'data-key': a['key'] }) },
      formas: {
        default: FORMAS_VAZIAS,
        parseHTML: (el) => {
          try {
            return { ...FORMAS_VAZIAS, ...JSON.parse(el.getAttribute('data-formas') ?? '{}') };
          } catch {
            return FORMAS_VAZIAS;
          }
        },
        renderHTML: (a) => ({ 'data-formas': JSON.stringify(a['formas']) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variant]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-variant': '' }, HTMLAttributes), textoVariacao(node.attrs as VariantAttrs)];
  },

  renderText({ node }) {
    return textoVariacao(node.attrs as VariantAttrs);
  },

  addNodeView() {
    const options = this.options;
    return ({ node: inicial, getPos }) => {
      let node = inicial;
      const dom = document.createElement('span');
      dom.className = 'pe-field pe-field--variant';
      dom.contentEditable = 'false';
      dom.spellcheck = false;
      dom.innerHTML = `${ICONE}<span class="pe-field__label"></span><span class="pe-field__preview"></span>`;
      const label = dom.querySelector('.pe-field__label') as HTMLElement;
      const preview = dom.querySelector('.pe-field__preview') as HTMLElement;
      const render = () => {
        const a = node.attrs as VariantAttrs;
        label.textContent = a.formas.ms || a.key || 'variação';
        preview.textContent = a.formas.mp || a.formas.ms;
        dom.title = `Plural e gênero conforme {{${a.key}}}: ${a.formas.ms} / ${a.formas.fs} / ${a.formas.mp} / ${a.formas.fp}`;
      };
      render();
      dom.addEventListener('click', (e) => {
        e.preventDefault();
        const pos = getPos();
        if (typeof pos === 'number') {
          options.onEdit({ pos, attrs: structuredClone(node.attrs as VariantAttrs), rect: dom.getBoundingClientRect() });
        }
      });
      return {
        dom,
        update: (novo) => {
          if (novo.type !== node.type) return false;
          node = novo;
          render();
          return true;
        },
        selectNode: () => dom.classList.add('is-selected'),
        deselectNode: () => dom.classList.remove('is-selected'),
        ignoreMutation: () => true,
      };
    };
  },

  addCommands() {
    return {
      insertVariant:
        (attrs) =>
        ({ state, commands }) =>
          state.doc.attrs['mode'] === 'template' && commands.insertContent({ type: this.name, attrs }),
      updateVariant:
        (pos, attrs) =>
        ({ tr, state }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          tr.setNodeMarkup(pos, undefined, attrs, node.marks);
          return true;
        },
    };
  },

  addPasteRules() {
    const type = this.type;
    return [
      new PasteRule({
        find: VARIANT_REGEX,
        handler: ({ state, range, match }) => {
          if (state.doc.attrs['mode'] !== 'template') return null;
          const [, key, ms, fs, mp, fp] = match.map((m) => (m ?? '').trim());
          state.tr.replaceWith(range.from, range.to, type.create({ key, formas: { ms, fs, mp, fp } }));
          return undefined;
        },
      }),
    ];
  },
});
