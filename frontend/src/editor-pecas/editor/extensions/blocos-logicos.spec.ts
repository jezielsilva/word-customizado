import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DocumentoAttrs } from './documento-attrs';
import { Conditional, Repeat } from './blocos-logicos';

function criar() {
  return new Editor({
    extensions: [StarterKit, DocumentoAttrs, Conditional, Repeat],
    content: { type: 'doc', attrs: { mode: 'template' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pedido' }] }] },
  });
}

describe('Blocos lógicos', () => {
  it('envolve, altera e desfaz um bloco condicional', () => {
    const editor = criar();
    editor.chain().setTextSelection(2).setConditional('cliente.justicaGratuita').run();
    const bloco = editor.getJSON().content?.[0];
    expect(bloco?.type).toBe('conditional');
    expect(bloco?.attrs).toEqual({ condicao: 'cliente.justicaGratuita' });
    editor.commands.updateBlocoLogico(0, 'outra');
    expect(editor.getJSON().content?.[0].attrs).toEqual({ condicao: 'outra' });
    editor.commands.unwrapBlocoLogico(0);
    expect(editor.getJSON().content?.[0].type).toBe('paragraph');
    editor.destroy();
  });

  it('cria bloco de repetição', () => {
    const editor = criar();
    editor.chain().setTextSelection(2).setRepeat('reus').run();
    expect(editor.getJSON().content?.[0]).toMatchObject({ type: 'repeat', attrs: { lista: 'reus' } });
    editor.destroy();
  });
});
