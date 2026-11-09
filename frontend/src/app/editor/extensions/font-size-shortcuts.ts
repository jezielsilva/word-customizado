import { Extension } from '@tiptap/core';
import { TAMANHOS_FONTE } from '../models/editor.models';

export interface FontSizeShortcutsOptions {
  tamanhoPadrao: () => number;
}

/** Próximo tamanho da lista, para cima (+1) ou para baixo (-1). */
export function proximoTamanho(atual: number, direcao: 1 | -1): number {
  const lista = TAMANHOS_FONTE as readonly number[];
  if (direcao > 0) return lista.find((t) => t > atual) ?? lista[lista.length - 1];
  return [...lista].reverse().find((t) => t < atual) ?? lista[0];
}

/** Ctrl+Shift+> / Ctrl+Shift+< alteram o tamanho da fonte (em pontos). */
export const FontSizeShortcuts = Extension.create<FontSizeShortcutsOptions>({
  name: 'fontSizeShortcuts',

  addOptions() {
    return { tamanhoPadrao: () => 12 };
  },

  addKeyboardShortcuts() {
    const passo = (direcao: 1 | -1) => () => {
      const atual = parseFloat(this.editor.getAttributes('textStyle')['fontSize']) || this.options.tamanhoPadrao();
      return this.editor.chain().focus().setFontSize(`${proximoTamanho(atual, direcao)}pt`).run();
    };
    return {
      'Mod-Shift->': passo(1),
      'Mod-Shift-.': passo(1),
      'Mod-Shift-<': passo(-1),
      'Mod-Shift-,': passo(-1),
    };
  },
});
