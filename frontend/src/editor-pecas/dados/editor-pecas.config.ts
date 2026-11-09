import { InjectionToken } from '@angular/core';

export interface EditorPecasConfig {
  /** Base dos endpoints, ex.: '/api' ou 'https://api.webproadv.com.br/api'. */
  apiBaseUrl: string;
  /** true = usa a API simulada em localStorage (sem servidor). */
  usarMock: boolean;
  /** Nome exibido em versões e comentários (no host, vem do usuário logado). */
  usuario: () => string;
  /** Intervalos do salvamento automático (ms). */
  salvamento: {
    rascunhoLocal: number;
    servidorOcioso: number;
    servidorMaximo: number;
  };
}

export const EDITOR_PECAS_CONFIG_PADRAO: EditorPecasConfig = {
  apiBaseUrl: '/api',
  usarMock: false,
  usuario: () => 'Usuário',
  salvamento: { rascunhoLocal: 1000, servidorOcioso: 3000, servidorMaximo: 60000 },
};

export const EDITOR_PECAS_CONFIG = new InjectionToken<EditorPecasConfig>('EDITOR_PECAS_CONFIG', {
  providedIn: 'root',
  factory: () => EDITOR_PECAS_CONFIG_PADRAO,
});
