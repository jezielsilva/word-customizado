import { Node, PasteRule, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { FieldAttrs } from '../models/editor.models';

export interface CampoResolvido {
  rotulo: string;
  exemplo?: string;
}

export interface FieldClickEvent {
  pos: number;
  attrs: FieldAttrs;
  rect: DOMRect;
}

export interface FieldOptions {
  /** Busca o campo no catálogo; `null` = chave desconhecida (borda vermelha). */
  resolve: (key: string) => CampoResolvido | null;
  /** Abrir o seletor de campos (Ctrl+Shift+F ou "{{"). */
  onTrigger: () => void;
  /** Clique no chip: abrir o popover de edição. */
  onEdit: (ev: FieldClickEvent) => void;
}

export interface FieldStorage {
  /** Redesenho dos chips quando o catálogo muda (sem alterar o documento). */
  renderizadores: Set<() => void>;
}

declare module '@tiptap/core' {
  interface Storage {
    field: FieldStorage;
  }
  interface Commands<ReturnType> {
    field: {
      insertField: (key: string, format?: string | null) => ReturnType;
      updateField: (pos: number, attrs: Partial<FieldAttrs>) => ReturnType;
    };
  }
}

export const CHAVE_CAMPO_REGEX = /\{\{\s*([\w.]+)\s*\}\}/g;

const ICONE_TAG =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>';

const ehModelo = (doc: { attrs: Record<string, unknown> }) => doc.attrs['mode'] === 'template';

/** Campo: nó inline atômico; no JSON guarda a chave, na tela é um chip. */
export const Field = Node.create<FieldOptions, FieldStorage>({
  name: 'field',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { resolve: () => null, onTrigger: () => undefined, onEdit: () => undefined };
  },

  addStorage() {
    return { renderizadores: new Set<() => void>() };
  },

  addAttributes() {
    return {
      key: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-key') ?? '',
        renderHTML: (a) => ({ 'data-key': a['key'] }),
      },
      format: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-format') || null,
        renderHTML: (a) => (a['format'] ? { 'data-format': a['format'] } : {}),
      },
      fallback: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-fallback') ?? '',
        renderHTML: (a) => (a['fallback'] ? { 'data-fallback': a['fallback'] } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-field]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-field': '' }, HTMLAttributes), `{{${node.attrs['key']}}}`];
  },

  renderText({ node }) {
    return `{{${node.attrs['key']}}}`;
  },

  addNodeView() {
    const options = this.options;
    const renderizadores = this.storage.renderizadores;
    return ({ node: inicial, getPos }) => {
      let node = inicial;
      const dom = document.createElement('span');
      dom.className = 'pe-field';
      dom.contentEditable = 'false';
      dom.spellcheck = false;
      dom.setAttribute('data-field', '');
      dom.innerHTML = `${ICONE_TAG}<span class="pe-field__label"></span><span class="pe-field__preview"></span>`;
      const label = dom.querySelector('.pe-field__label') as HTMLElement;
      const preview = dom.querySelector('.pe-field__preview') as HTMLElement;

      const render = () => {
        const attrs = node.attrs as FieldAttrs;
        const campo = options.resolve(attrs.key);
        dom.dataset['key'] = attrs.key;
        dom.classList.toggle('is-unknown', !campo);
        label.textContent = campo?.rotulo ?? attrs.key;
        preview.textContent = campo?.exemplo || attrs.fallback || campo?.rotulo || attrs.key;
        dom.title = `{{${attrs.key}}}${attrs.format ? ' · ' + attrs.format : ''}${campo ? '' : ' · fora do catálogo'}`;
      };
      render();
      renderizadores.add(render);

      dom.addEventListener('click', (e) => {
        e.preventDefault();
        const pos = getPos();
        if (typeof pos !== 'number') return;
        options.onEdit({ pos, attrs: { ...(node.attrs as FieldAttrs) }, rect: dom.getBoundingClientRect() });
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
        destroy: () => renderizadores.delete(render),
      };
    };
  },

  addCommands() {
    return {
      insertField:
        (key, format = null) =>
        ({ state, commands }) => {
          if (!ehModelo(state.doc) || !key) return false;
          return commands.insertContent({ type: this.name, attrs: { key, format, fallback: '' } });
        },
      updateField:
        (pos, attrs) =>
        ({ tr, state }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }, node.marks);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-f': () => {
        if (!ehModelo(this.editor.state.doc) || !this.editor.isEditable) return false;
        this.options.onTrigger();
        return true;
      },
    };
  },

  addPasteRules() {
    const type = this.type;
    return [
      new PasteRule({
        find: CHAVE_CAMPO_REGEX,
        handler: ({ state, range, match }) => {
          if (!ehModelo(state.doc) || !match[1]) return null;
          const { tr } = state;
          const marks = tr.doc.resolve(range.from).marks();
          tr.replaceWith(range.from, range.to, type.create({ key: match[1] }, null, marks));
          return undefined;
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key: new PluginKey('peFieldTrigger'),
        props: {
          handleTextInput: (view, from, to, text) => {
            if (text !== '{' || !view.editable || !ehModelo(view.state.doc) || from < 1) return false;
            if (view.state.doc.textBetween(from - 1, from) !== '{') return false;
            view.dispatch(view.state.tr.delete(from - 1, to));
            options.onTrigger();
            return true;
          },
        },
      }),
    ];
  },
});
