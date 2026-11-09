import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DocumentoAttrs } from './documento-attrs';
import { Field } from './field';
import { Busca, buscaKey, normalizar } from './busca';

const sem = { diferenciarMaiusculas: false, diferenciarAcentos: false };

function criar(modo: 'template' | 'document', html: string) {
  const e = new Editor({
    extensions: [StarterKit, DocumentoAttrs, Field, Busca.configure({ rotuloCampo: (k) => (k === 'cliente.cpf' ? 'CPF' : null) })],
    content: html,
  });
  e.view.dispatch(e.state.tr.setDocAttribute('mode', modo));
  return e;
}

describe('normalizar', () => {
  it('ignora acentos e maiúsculas preservando o comprimento', () => {
    expect(normalizar('Ação JOÃO', sem)).toBe('acao joao');
    expect(normalizar('Ação', { ...sem, diferenciarAcentos: true })).toBe('ação');
  });
});

describe('Busca', () => {
  let editor: Editor;
  afterEach(() => editor.destroy());

  it('acha sem diferenciar acentos e maiúsculas', () => {
    editor = criar('document', '<p>A ação e a ACAO.</p>');
    editor.commands.definirBusca('acao');
    expect(buscaKey.getState(editor.state)?.resultados.length).toBe(2);
  });

  it('substituir tudo é um único passo de desfazer', () => {
    editor = criar('document', '<p>réu, réu e réu</p>');
    editor.commands.definirBusca('reu');
    editor.commands.substituirTodos('requerido');
    expect(editor.getText()).toBe('requerido, requerido e requerido');
    editor.commands.undo();
    expect(editor.getText()).toBe('réu, réu e réu');
  });

  it('no modo Modelo encontra campos pelo rótulo e troca por outro campo', () => {
    editor = criar('template', '<p>CPF: <span data-field data-key="cliente.cpf"></span></p>');
    editor.commands.definirBusca('cpf');
    expect(buscaKey.getState(editor.state)?.resultados.length).toBe(2);
    editor.commands.definirBusca('CPF', { diferenciarMaiusculas: true });
    editor.commands.substituirTodos('{{cliente.cnpj}}');
    expect(editor.getText()).toBe('{{cliente.cnpj}}: {{cliente.cnpj}}');
  });
});
