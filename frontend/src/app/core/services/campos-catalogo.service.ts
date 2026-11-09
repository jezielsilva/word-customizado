import { Injectable, signal } from '@angular/core';
import type { FormatoCampo, GrupoCampos } from '../../editor/models/editor.models';
import { CAMPOS_MOCK, FORMATOS_MOCK } from '../mocks/dados-mock';

/** Catálogo de campos e formatadores. Futuro: GET /api/campos. */
@Injectable({ providedIn: 'root' })
export class CamposCatalogoService {
  readonly grupos = signal<GrupoCampos[]>(CAMPOS_MOCK);
  readonly formatos = signal<FormatoCampo[]>(FORMATOS_MOCK);
}
