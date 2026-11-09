import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { EditorPecasApi } from './dados/editor-pecas-api';
import { HttpEditorPecasApi } from './dados/http-editor-pecas-api';
import { MockEditorPecasApi } from './dados/mock-editor-pecas-api';
import { EDITOR_PECAS_CONFIG, EDITOR_PECAS_CONFIG_PADRAO, type EditorPecasConfig } from './dados/editor-pecas.config';

/**
 * Registra o editor de peças no app host (ex.: webproadv).
 *
 * ```ts
 * providers: [provideHttpClient(), provideEditorPecas({ apiBaseUrl: environment.api, usuario: () => auth.nome() })]
 * ```
 * Com `usarMock: false` (padrão), exige `provideHttpClient()` no host; interceptors de
 * autenticação do host valem para as chamadas do editor.
 */
export function provideEditorPecas(config: Partial<EditorPecasConfig> = {}): EnvironmentProviders {
  const final: EditorPecasConfig = {
    ...EDITOR_PECAS_CONFIG_PADRAO,
    ...config,
    salvamento: { ...EDITOR_PECAS_CONFIG_PADRAO.salvamento, ...config.salvamento },
  };
  return makeEnvironmentProviders([
    { provide: EDITOR_PECAS_CONFIG, useValue: final },
    { provide: EditorPecasApi, useClass: final.usarMock ? MockEditorPecasApi : HttpEditorPecasApi },
  ]);
}
