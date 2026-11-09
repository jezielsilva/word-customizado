import type { ConfiguracaoPagina, ModoDocumento } from '../editor/models/editor.models';
import type {
  Bloco, CatalogoCampos, Documento, DocumentoResumo, DocumentoSalvo, DocumentoVersao, DocumentoVersaoCompleta,
  FormatoExportacao, NovoDocumento, SalvarDocumento,
} from './api.models';

/**
 * Contrato com o back-end (ASP.NET Core). Há duas implementações:
 * `HttpEditorPecasApi` (real) e `MockEditorPecasApi` (localStorage, para desenvolver sem servidor).
 * O host escolhe em `provideEditorPecas()`.
 */
export abstract class EditorPecasApi {
  abstract listarDocumentos(filtro?: { modo?: ModoDocumento; busca?: string }): Promise<DocumentoResumo[]>;
  abstract obterDocumento(id: string): Promise<Documento>;
  abstract criarDocumento(novo: NovoDocumento): Promise<Documento>;
  /** Lança `ConflitoRevisaoError` em 409. */
  abstract salvarDocumento(id: string, dados: SalvarDocumento): Promise<DocumentoSalvo>;
  abstract excluirDocumento(id: string): Promise<void>;

  abstract listarVersoes(id: string): Promise<DocumentoVersao[]>;
  abstract obterVersao(id: string, numero: number): Promise<DocumentoVersaoCompleta>;
  abstract criarVersao(id: string, nome: string): Promise<DocumentoVersao>;
  /** Gera uma nova versão com o conteúdo da escolhida e devolve o documento atualizado. */
  abstract restaurarVersao(id: string, numero: number): Promise<Documento>;

  abstract catalogoCampos(): Promise<CatalogoCampos>;
  abstract configuracaoPagina(id: string): Promise<ConfiguracaoPagina>;

  abstract listarBlocos(): Promise<Bloco[]>;
  abstract criarBloco(bloco: Omit<Bloco, 'id'>): Promise<Bloco>;

  /** Baixa o arquivo gerado no servidor. */
  abstract exportar(id: string, formato: FormatoExportacao): Promise<Blob>;
}
