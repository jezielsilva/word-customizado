import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphFormat: {
      /** Recuo da 1ª linha em mm; `null` volta ao padrão da página. */
      setFirstLineIndent: (mm: number | null) => ReturnType;
      /** Entrelinha do parágrafo (ex.: 1.5); `null` volta ao padrão da página. */
      setParagraphLineHeight: (valor: number | null) => ReturnType;
    };
  }
}

const TIPOS = ['paragraph', 'heading'];

/** Recuo de 1ª linha e entrelinha como atributos de parágrafo (não de texto). */
export const ParagraphFormat = Extension.create({
  name: 'paragraphFormat',

  addGlobalAttributes() {
    return [
      {
        types: TIPOS,
        attributes: {
          firstLineIndent: {
            default: null,
            parseHTML: (el) => {
              const v = parseFloat((el as HTMLElement).style.textIndent);
              return Number.isFinite(v) ? v : null;
            },
            renderHTML: (a) =>
              a['firstLineIndent'] == null ? {} : { style: `text-indent:${a['firstLineIndent']}mm` },
          },
          lineHeight: {
            default: null,
            parseHTML: (el) => {
              const v = parseFloat((el as HTMLElement).style.lineHeight);
              return Number.isFinite(v) ? v : null;
            },
            renderHTML: (a) => (a['lineHeight'] == null ? {} : { style: `line-height:${a['lineHeight']}` }),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFirstLineIndent:
        (mm) =>
        ({ commands }) =>
          TIPOS.map((t) => commands.updateAttributes(t, { firstLineIndent: mm })).some(Boolean),
      setParagraphLineHeight:
        (valor) =>
        ({ commands }) =>
          TIPOS.map((t) => commands.updateAttributes(t, { lineHeight: valor })).some(Boolean),
    };
  },
});
