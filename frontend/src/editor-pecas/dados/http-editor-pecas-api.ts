import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ConfiguracaoPagina, ModoDocumento } from '../editor/models/editor.models';
import {
  ConflitoRevisaoError, type Bloco, type CatalogoCampos, type Documento, type DocumentoResumo, type DocumentoSalvo,
  type DocumentoVersao, type DocumentoVersaoCompleta, type FormatoExportacao, type NovoDocumento, type SalvarDocumento,
} from './api.models';
import { EditorPecasApi } from './editor-pecas-api';
import { EDITOR_PECAS_CONFIG } from './editor-pecas.config';

/** Implementação real: endpoints da especificação (ASP.NET Core). */
@Injectable()
export class HttpEditorPecasApi extends EditorPecasApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(EDITOR_PECAS_CONFIG).apiBaseUrl.replace(/\/$/, '');

  private get<T>(url: string, params?: HttpParams) {
    return firstValueFrom(this.http.get<T>(`${this.base}${url}`, { params }));
  }

  private post<T>(url: string, corpo: unknown = {}) {
    return firstValueFrom(this.http.post<T>(`${this.base}${url}`, corpo));
  }

  listarDocumentos(filtro: { modo?: ModoDocumento; busca?: string } = {}) {
    let params = new HttpParams();
    if (filtro.modo) params = params.set('modo', filtro.modo);
    if (filtro.busca) params = params.set('busca', filtro.busca);
    return this.get<DocumentoResumo[]>('/documentos', params);
  }

  obterDocumento(id: string) {
    return this.get<Documento>(`/documentos/${encodeURIComponent(id)}`);
  }

  criarDocumento(novo: NovoDocumento) {
    return this.post<Documento>('/documentos', novo);
  }

  async salvarDocumento(id: string, dados: SalvarDocumento) {
    try {
      return await firstValueFrom(this.http.put<DocumentoSalvo>(`${this.base}/documentos/${encodeURIComponent(id)}`, dados));
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 409) throw new ConflitoRevisaoError(e.error?.revisao ?? -1);
      throw e;
    }
  }

  async excluirDocumento(id: string) {
    await firstValueFrom(this.http.delete(`${this.base}/documentos/${encodeURIComponent(id)}`));
  }

  listarVersoes(id: string) {
    return this.get<DocumentoVersao[]>(`/documentos/${encodeURIComponent(id)}/versoes`);
  }

  obterVersao(id: string, numero: number) {
    return this.get<DocumentoVersaoCompleta>(`/documentos/${encodeURIComponent(id)}/versoes/${numero}`);
  }

  criarVersao(id: string, nome: string) {
    return this.post<DocumentoVersao>(`/documentos/${encodeURIComponent(id)}/versoes`, { nome });
  }

  restaurarVersao(id: string, numero: number) {
    return this.post<Documento>(`/documentos/${encodeURIComponent(id)}/versoes/${numero}/restaurar`);
  }

  catalogoCampos() {
    return this.get<CatalogoCampos>('/campos');
  }

  configuracaoPagina(id: string) {
    return this.get<ConfiguracaoPagina>(`/configuracoes-pagina/${encodeURIComponent(id)}`);
  }

  listarBlocos() {
    return this.get<Bloco[]>('/blocos');
  }

  criarBloco(bloco: Omit<Bloco, 'id'>) {
    return this.post<Bloco>('/blocos', bloco);
  }

  exportar(id: string, formato: FormatoExportacao) {
    const params = new HttpParams().set('formato', formato);
    return firstValueFrom(
      this.http.get(`${this.base}/documentos/${encodeURIComponent(id)}/exportar`, { params, responseType: 'blob' }),
    );
  }
}
