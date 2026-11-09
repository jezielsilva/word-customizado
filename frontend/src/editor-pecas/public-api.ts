/*
 * API pública do editor de peças. É o único ponto de import para o app host (webproadv).
 */
export { provideEditorPecas } from './provide-editor-pecas';
export { EDITOR_PECAS_ROUTES } from './rotas';
export { EDITOR_PECAS_CONFIG, type EditorPecasConfig } from './dados/editor-pecas.config';

// Componente do editor (para usar sem as telas prontas).
export { EditorComponent, MIME_CONTEUDO } from './editor/editor.component';
export * from './editor/models/editor.models';

// Telas prontas.
export { BibliotecaComponent } from './paginas/biblioteca.component';
export { DocumentoEditorComponent } from './paginas/documento-editor.component';

// Dados e contrato com o back-end.
export { EditorPecasApi } from './dados/editor-pecas-api';
export { HttpEditorPecasApi } from './dados/http-editor-pecas-api';
export { MockEditorPecasApi } from './dados/mock-editor-pecas-api';
export * from './dados/api.models';
export { criarConfiguracaoPadrao, type DadosEscritorio } from './dados/configuracao-padrao';
export { SalvamentoAutomaticoService, type StatusSalvamento } from './dados/salvamento-automatico.service';
