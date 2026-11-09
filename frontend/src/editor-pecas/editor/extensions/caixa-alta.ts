import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    caixaAlta: {
      /** MAIÚSCULAS ↔ minúsculas no texto selecionado (Shift+F3, como no Word). */
      alternarCaixa: () => ReturnType;
    };
  }
}

/** Troca o texto de fato (não só a aparência), mantendo as marcas. */
export const CaixaAlta = Extension.create({
  name: 'caixaAlta',

  addCommands() {
    return {
      alternarCaixa:
        () =>
        ({ state, tr, dispatch }) => {
          const { from, to, empty } = state.selection;
          if (empty) return false;
          const texto = state.doc.textBetween(from, to, ' ', ' ');
          const paraMaiusculas = texto !== texto.toLocaleUpperCase('pt-BR');
          if (!dispatch) return true;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!node.isText || !node.text) return;
            const ini = Math.max(from, pos);
            const fim = Math.min(to, pos + node.text.length);
            const trecho = node.text.slice(ini - pos, fim - pos);
            const novo = paraMaiusculas ? trecho.toLocaleUpperCase('pt-BR') : trecho.toLocaleLowerCase('pt-BR');
            if (novo !== trecho && novo.length === trecho.length) {
              tr.replaceWith(tr.mapping.map(ini), tr.mapping.map(fim), state.schema.text(novo, node.marks));
            }
          });
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return { 'Shift-F3': () => this.editor.commands.alternarCaixa() };
  },
});
