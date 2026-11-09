import { Node, mergeAttributes } from '@tiptap/core';

export type TipoBlocoLogico = 'conditional' | 'repeat';

export interface BlocoLogicoClickEvent {
  tipo: TipoBlocoLogico;
  pos: number;
  valor: string;
  rect: DOMRect;
}

export interface BlocoLogicoOptions {
  onEdit: (ev: BlocoLogicoClickEvent) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blocosLogicos: {
      /** Envolve os parágrafos selecionados num bloco condicional. */
      setConditional: (condicao: string) => ReturnType;
      /** Envolve os parágrafos selecionados num bloco que repete por item da lista. */
      setRepeat: (lista: string) => ReturnType;
      updateBlocoLogico: (pos: number, valor: string) => ReturnType;
      /** Remove o bloco e mantém o conteúdo. */
      unwrapBlocoLogico: (pos: number) => ReturnType;
    };
  }
}

function criar(tipo: TipoBlocoLogico, attr: 'condicao' | 'lista', rotulo: (v: string) => string) {
  return Node.create<BlocoLogicoOptions>({
    name: tipo,
    group: 'block',
    content: 'block+',
    defining: true,

    addOptions() {
      return { onEdit: () => undefined };
    },

    addAttributes() {
      return {
        [attr]: {
          default: '',
          parseHTML: (el) => el.getAttribute(`data-${attr}`) ?? '',
          renderHTML: (a) => ({ [`data-${attr}`]: a[attr] }),
        },
      };
    },

    parseHTML() {
      return [{ tag: `div[data-${tipo}]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return ['div', mergeAttributes({ [`data-${tipo}`]: '' }, HTMLAttributes), 0];
    },

    addNodeView() {
      const options = this.options;
      return ({ node: inicial, getPos }) => {
        let node = inicial;
        const dom = document.createElement('div');
        dom.className = `pe-logic pe-logic--${tipo}`;
        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'pe-logic__label';
        label.contentEditable = 'false';
        const content = document.createElement('div');
        content.className = 'pe-logic__content';
        dom.append(label, content);
        const render = () => (label.textContent = rotulo(node.attrs[attr] as string));
        render();
        label.addEventListener('mousedown', (e) => e.preventDefault());
        label.addEventListener('click', () => {
          const pos = getPos();
          if (typeof pos === 'number') {
            options.onEdit({ tipo, pos, valor: node.attrs[attr] as string, rect: label.getBoundingClientRect() });
          }
        });
        return {
          dom,
          contentDOM: content,
          update: (novo) => {
            if (novo.type !== node.type) return false;
            node = novo;
            render();
            return true;
          },
          ignoreMutation: (m) => label.contains(m.target as globalThis.Node),
        };
      };
    },
  });
}

export const Conditional = criar('conditional', 'condicao', (v) => `Se ${v || '…'}`).extend({
  addCommands() {
    return {
      setConditional:
        (condicao) =>
        ({ state, commands }) =>
          state.doc.attrs['mode'] === 'template' && commands.wrapIn(this.name, { condicao }),
      updateBlocoLogico:
        (pos, valor) =>
        ({ tr, state }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || !['conditional', 'repeat'].includes(node.type.name)) return false;
          tr.setNodeMarkup(pos, undefined, node.type.name === 'conditional' ? { condicao: valor } : { lista: valor });
          return true;
        },
      unwrapBlocoLogico:
        (pos) =>
        ({ tr, state }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || !['conditional', 'repeat'].includes(node.type.name)) return false;
          tr.replaceWith(pos, pos + node.nodeSize, node.content);
          return true;
        },
    };
  },
});

export const Repeat = criar('repeat', 'lista', (v) => `Repetir para cada item de ${v || '…'}`).extend({
  addCommands() {
    return {
      setRepeat:
        (lista) =>
        ({ state, commands }) =>
          state.doc.attrs['mode'] === 'template' && commands.wrapIn(this.name, { lista }),
    };
  },
});
