import { TestBed } from '@angular/core/testing';
import { ConflitoRevisaoError, type Documento } from './api.models';
import { EditorPecasApi } from './editor-pecas-api';
import { RascunhoLocalService } from './rascunho-local';
import { SalvamentoAutomaticoService, hashDocumento, hashTexto } from './salvamento-automatico.service';

const doc: Documento = {
  id: 'd1', titulo: 'T', modo: 'document', categoria: null, atualizadoEm: '2026-01-01T00:00:00Z', atualizadoPor: 'x',
  permissao: 'editar', conteudo: { type: 'doc', content: [] }, revisao: 3, configuracaoPaginaId: 'p', modeloOrigemId: null,
};

describe('hash', () => {
  it('é estável e muda com o conteúdo', () => {
    expect(hashTexto('abc')).toBe(hashTexto('abc'));
    expect(hashDocumento('a', { type: 'doc' })).not.toBe(hashDocumento('b', { type: 'doc' }));
  });
});

describe('SalvamentoAutomaticoService', () => {
  let salvar: ReturnType<typeof vi.fn>;
  let servico: SalvamentoAutomaticoService;

  beforeEach(() => {
    vi.useFakeTimers();
    salvar = vi.fn().mockResolvedValue({ revisao: 4, atualizadoEm: '2026-01-01T00:01:00Z' });
    TestBed.configureTestingModule({
      providers: [
        SalvamentoAutomaticoService,
        { provide: EditorPecasApi, useValue: { salvarDocumento: salvar } },
        { provide: RascunhoLocalService, useValue: { salvar: vi.fn(), remover: vi.fn(), obter: vi.fn() } },
      ],
    });
    servico = TestBed.inject(SalvamentoAutomaticoService);
    servico.iniciar(doc);
  });

  afterEach(() => vi.useRealTimers());

  it('salva após 3 s sem digitar, só com mudança real', async () => {
    servico.alterado('T', doc.conteudo);
    expect(servico.status()).toBe('salvo');
    servico.alterado('T', { type: 'doc', content: [{ type: 'paragraph' }] });
    expect(servico.status()).toBe('pendente');
    await vi.advanceTimersByTimeAsync(2900);
    expect(salvar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(salvar).toHaveBeenCalledWith('d1', expect.objectContaining({ revisao: 3, primeiraDaSessao: true }));
    expect(servico.status()).toBe('salvo');
  });

  it('entra em conflito com 409', async () => {
    salvar.mockRejectedValueOnce(new ConflitoRevisaoError(5));
    servico.alterado('Novo título', doc.conteudo);
    await servico.salvarAgora();
    expect(servico.status()).toBe('conflito');
  });
});
