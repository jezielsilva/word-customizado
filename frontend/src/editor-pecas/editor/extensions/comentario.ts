import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { ComentarioAttrs } from '../models/editor.models';

export interface ComentarioClickEvent {
  attrs: ComentarioAttrs;
  rect: DOMRect;
}

export interface ComentarioOptions {
  onClick: (ev: ComentarioClickEvent) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comentario: {
      setComentario: (attrs: ComentarioAttrs) => ReturnType;
      updateComentario: (id: string, texto: string) => ReturnType;
      removeComentario: (id: string) => ReturnType;
    };
  }
}

/** Nota interna entre advogados: marca o texto, nunca sai no DOCX/PDF. */
export const Comentario = Mark.create<ComentarioOptions>({
  name: 'comentario',
  inclusive: false,
  excludes: '',

  addOptions() {
    return { onClick: () => undefined };
  },

  addAttributes() {
    return {
      id: { default: '', parseHTML: (el) => el.getAttribute('data-id') ?? '', renderHTML: (a) => ({ 'data-id': a['id'] }) },
      texto: { default: '', parseHTML: (el) => el.getAttribute('data-texto') ?? '', renderHTML: (a) => ({ 'data-texto': a['texto'], title: a['texto'] }) },
      autor: { default: '', parseHTML: (el) => el.getAttribute('data-autor') ?? '', renderHTML: (a) => ({ 'data-autor': a['autor'] }) },
      criadoEm: { default: '', parseHTML: (el) => el.getAttribute('data-criado-em') ?? '', renderHTML: (a) => ({ 'data-criado-em': a['criadoEm'] }) },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comentario]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-comentario': '', class: 'pe-comment' }, HTMLAttributes), 0];
  },

  addCommands() {
    const aplicarPorId =
      (id: string, fn: (from: number, to: number, attrs: ComentarioAttrs) => void) =>
      (doc: import('@tiptap/pm/model').Node) => {
        let achou = false;
        doc.descendants((node, pos) => {
          const m = node.marks.find((mk) => mk.type.name === this.name && mk.attrs['id'] === id);
          if (m) {
            fn(pos, pos + node.nodeSize, m.attrs as ComentarioAttrs);
            achou = true;
          }
        });
        return achou;
      };
    return {
      setComentario:
        (attrs) =>
        ({ commands, state }) =>
          !state.selection.empty && commands.setMark(this.name, attrs),
      updateComentario:
        (id, texto) =>
        ({ tr, state }) =>
          aplicarPorId(id, (from, to, attrs) => {
            tr.removeMark(from, to, this.type);
            tr.addMark(from, to, this.type.create({ ...attrs, texto }));
          })(state.doc),
      removeComentario:
        (id) =>
        ({ tr, state }) =>
          aplicarPorId(id, (from, to, attrs) => tr.removeMark(from, to, this.type.create(attrs)))(state.doc),
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const type = this.type;
    return [
      new Plugin({
        key: new PluginKey('peComentarioClick'),
        props: {
          handleClick: (view, pos, event) => {
            const mark = view.state.doc.resolve(pos).marks().find((m) => m.type === type);
            const alvo = (event.target as HTMLElement).closest('.pe-comment');
            if (!mark || !alvo) return false;
            options.onClick({ attrs: mark.attrs as ComentarioAttrs, rect: alvo.getBoundingClientRect() });
            return false;
          },
        },
      }),
    ];
  },
});
