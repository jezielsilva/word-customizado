import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DocumentoAttrs } from './documento-attrs';
import { Variant, textoVariacao } from './variant';
import type { VariantAttrs } from '../models/editor.models';

const attrs: VariantAttrs = { key: 'autores', formas: { ms: 'o autor', fs: 'a autora', mp: 'os autores', fp: 'as autoras' } };

describe('Variant', () => {
  it('gera o texto {{#flex}}', () => {
    expect(textoVariacao(attrs)).toBe('{{#flex autores: o autor | a autora | os autores | as autoras}}');
  });

  it('insere só no modo Modelo e preserva as formas no JSON', () => {
    const editor = new Editor({
      extensions: [StarterKit, DocumentoAttrs, Variant],
      content: { type: 'doc', attrs: { mode: 'template' }, content: [{ type: 'paragraph' }] },
    });
    expect(editor.commands.insertVariant(attrs)).toBe(true);
    expect((editor.getJSON().content?.[0].content?.[0] as { attrs?: unknown }).attrs).toEqual(attrs);
    editor.view.dispatch(editor.state.tr.setDocAttribute('mode', 'document'));
    expect(editor.commands.insertVariant(attrs)).toBe(false);
    editor.destroy();
  });
});
