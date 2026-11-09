import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CaixaAlta } from './caixa-alta';

describe('CaixaAlta', () => {
  it('alterna maiúsculas e minúsculas mantendo o negrito', () => {
    const editor = new Editor({ extensions: [StarterKit, CaixaAlta], content: '<p>ação <strong>cível</strong></p>' });
    editor.chain().selectAll().alternarCaixa().run();
    expect(editor.getHTML()).toBe('<p>AÇÃO <strong>CÍVEL</strong></p>');
    editor.chain().selectAll().alternarCaixa().run();
    expect(editor.getText()).toBe('ação cível');
    editor.destroy();
  });
});
