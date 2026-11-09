import type { JSONContent } from '@tiptap/core';
import type { FormatoCampo, GrupoCampos, ModoDocumento } from '../editor/models/editor.models';

export type Permissao = 'ler' | 'editar';
export type MotivoVersao = 'manual' | 'geracao' | 'sessao' | 'restauracao';
export type FormatoExportacao = 'docx' | 'pdf';

export interface DocumentoResumo {
  id: string;
  titulo: string;
  modo: ModoDocumento;
  categoria: string | null;
  atualizadoEm: string;
  atualizadoPor: string;
  permissao: Permissao;
}

export interface Documento extends DocumentoResumo {
  conteudo: JSONContent;
  revisao: number;
  configuracaoPaginaId: string;
  modeloOrigemId: string | null;
}

export interface DocumentoVersao {
  numero: number;
  nome: string | null;
  motivo: MotivoVersao;
  criadoPor: string;
  criadoEm: string;
}

export interface DocumentoVersaoCompleta extends DocumentoVersao {
  conteudo: JSONContent;
}

export interface NovoDocumento {
  titulo: string;
  modo: ModoDocumento;
  /** Copia o conteúdo de outro documento ou modelo. */
  origemId?: string;
  conteudo?: JSONContent;
}

export interface SalvarDocumento {
  titulo: string;
  conteudo: JSONContent;
  revisao: number;
  /** Primeira gravação da sessão: o servidor cria uma versão "sessão". */
  primeiraDaSessao: boolean;
}

export interface DocumentoSalvo {
  revisao: number;
  atualizadoEm: string;
}

export interface CatalogoCampos {
  grupos: GrupoCampos[];
  formatos: FormatoCampo[];
}

export interface Bloco {
  id: string;
  nome: string;
  descricao: string | null;
  conteudo: JSONContent[];
}

/** O servidor tem outra revisão (409 Conflict). */
export class ConflitoRevisaoError extends Error {
  constructor(readonly revisaoServidor: number) {
    super('O documento foi alterado em outro lugar.');
    this.name = 'ConflitoRevisaoError';
  }
}
