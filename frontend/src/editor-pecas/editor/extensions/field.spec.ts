import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DocumentoAttrs } from './documento-attrs';
import { Field } from './field';
import { ParagraphFormat } from './paragraph-format';

function criar(modo: 'template' | 'document', content: JSONContent[] = [{ type: 'paragraph' }]): Editor {
  return new Editor({
    extensions: [StarterKit, DocumentoAttrs, ParagraphFormat, Field.configure({ resolve: (k) => (k === 'cliente.cpf' ? { rotulo: 'CPF' } : null) })],
    content: { type: 'doc', attrs: { mode: modo, schemaVersion: 1 }, content },
  });
}

describe('Field', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('insere campo no modo Modelo', () => {
    editor = criar('template');
    expect(editor.commands.insertField('cliente.cpf', 'cpf')).toBe(true);
    expect(editor.getText()).toContain('{{cliente.cpf}}');
  });

  it('não insere campo no modo Documento', () => {
    editor = criar('document');
    expect(editor.commands.insertField('cliente.cpf')).toBe(false);
    expect(editor.getText()).not.toContain('{{');
  });

  it('ida e volta do JSON preserva atributos e marcas', () => {
    const p: JSONContent = {
      type: 'paragraph',
      attrs: { firstLineIndent: 0 },
      content: [{ type: 'field', attrs: { key: 'cliente.cpf', format: 'cpf', fallback: 'x' }, marks: [{ type: 'bold' }] }],
    };
    editor = criar('template', [p]);
    const json = editor.getJSON();
    expect(json.attrs?.['mode']).toBe('template');
    const no = json.content?.[0].content?.[0] as JSONContent;
    expect(no?.attrs).toEqual({ key: 'cliente.cpf', format: 'cpf', fallback: 'x' });
    expect(no?.marks).toEqual([{ type: 'bold' }]);
    expect(json.content?.[0].attrs?.['firstLineIndent']).toBe(0);
  });

  it('atualiza atributos do campo', () => {
    editor = criar('template', [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'a' } }] }]);
    expect(editor.commands.updateField(1, { key: 'cliente.cpf', format: 'cpf' })).toBe(true);
    expect(editor.state.doc.nodeAt(1)?.attrs).toEqual({ key: 'cliente.cpf', format: 'cpf', fallback: '' });
  });

  it('marca chip desconhecido', () => {
    editor = criar('template', [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'nao.existe' } }] }]);
    expect(editor.view.dom.querySelector('.pe-field.is-unknown')).not.toBeNull();
  });
});
