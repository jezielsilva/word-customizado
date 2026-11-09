import { TestBed } from '@angular/core/testing';
import { ConflitoRevisaoError } from './api.models';
import { MockEditorPecasApi } from './mock-editor-pecas-api';

describe('MockEditorPecasApi', () => {
  let api: MockEditorPecasApi;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [MockEditorPecasApi] });
    api = TestBed.inject(MockEditorPecasApi);
  });

  it('salva com revisão e devolve 409 em revisão velha', async () => {
    const d = await api.obterDocumento('acao-cobranca');
    const r = await api.salvarDocumento(d.id, { titulo: 'X', conteudo: d.conteudo, revisao: d.revisao, primeiraDaSessao: true });
    expect(r.revisao).toBe(d.revisao + 1);
    await expect(api.salvarDocumento(d.id, { titulo: 'Y', conteudo: d.conteudo, revisao: d.revisao, primeiraDaSessao: false }))
      .rejects.toBeInstanceOf(ConflitoRevisaoError);
    const versoes = await api.listarVersoes(d.id);
    expect(versoes[0].motivo).toBe('sessao');
  });

  it('restaurar cria nova versão', async () => {
    const antes = (await api.listarVersoes('juntada-joao')).length;
    await api.restaurarVersao('juntada-joao', 1);
    expect((await api.listarVersoes('juntada-joao')).length).toBe(antes + 1);
  });
});
