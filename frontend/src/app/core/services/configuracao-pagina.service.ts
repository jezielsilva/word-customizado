import { Injectable, signal } from '@angular/core';
import type { ConfiguracaoPagina } from '../../editor/models/editor.models';
import { ESCRITORIO_MOCK } from '../mocks/dados-mock';
import { criarConfiguracaoPadrao } from './configuracao-pagina';

/** Papel timbrado do escritório. Futuro: GET /api/configuracoes-pagina/{id}. */
@Injectable({ providedIn: 'root' })
export class ConfiguracaoPaginaService {
  readonly atual = signal<ConfiguracaoPagina>(criarConfiguracaoPadrao(ESCRITORIO_MOCK));
}
