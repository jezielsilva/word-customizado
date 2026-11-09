import type { JSONContent } from '@tiptap/core';

/** Modo do documento: Modelo (com campos) ou Documento (texto final). */
export type ModoDocumento = 'template' | 'document';

export const SCHEMA_VERSION = 1;

/** Item do catálogo de campos (vem de GET /api/campos). */
export interface CampoDefinicao {
  chave: string;
  rotulo: string;
  grupo: string;
  tipo: 'texto' | 'numero' | 'data' | 'moeda' | 'lista' | 'booleano';
  formatoPadrao: string | null;
  obrigatorio: boolean;
  descricao?: string;
  /** Valor de exemplo já formatado pelo servidor; usado na prévia ("Camadas"). */
  exemplo?: string;
}

export interface GrupoCampos {
  nome: string;
  campos: CampoDefinicao[];
}

/** Formatador disponível (a formatação real roda no servidor). */
export interface FormatoCampo {
  valor: string;
  rotulo: string;
}

export interface FieldAttrs {
  key: string;
  format: string | null;
  fallback: string;
}

/** Formas de concordância de um nó `variant` (plural e gênero). */
export interface FormasVariacao {
  /** Singular masculino ("o autor"). */
  ms: string;
  fs: string;
  mp: string;
  fp: string;
}

export interface VariantAttrs {
  key: string;
  formas: FormasVariacao;
}

export interface ComentarioAttrs {
  id: string;
  texto: string;
  autor: string;
  criadoEm: string;
}

export interface MargensMm {
  superior: number;
  inferior: number;
  esquerda: number;
  direita: number;
}

/** Papel timbrado e página (vem de GET /api/configuracoes-pagina/{id}). */
export interface ConfiguracaoPagina {
  id: string;
  nome: string;
  tamanho: 'A4';
  margens: MargensMm;
  cabecalhoHtml: string;
  rodapeHtml: string;
  marcaDaguaUrl: string | null;
  marcaDaguaTexto: string | null;
  fontePadrao: string;
  /** Em pontos. */
  tamanhoPadrao: number;
  entrelinha: number;
  /** Recuo da 1ª linha em mm. */
  recuoPrimeiraLinha: number;
  corMarca: string;
  numerarPaginas: boolean;
}

export interface EstadoBarra {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right' | 'justify' | null;
  bulletList: boolean;
  orderedList: boolean;
  fontFamily: string;
  fontSize: number | null;
  lineHeight: number | null;
  firstLineIndent: boolean;
  canUndo: boolean;
  canRedo: boolean;
  estilo: EstiloParagrafo;
  emTabela: boolean;
  temSelecao: boolean;
  comentario: boolean;
}

export type EstiloParagrafo = 'normal' | 'titulo' | 'topico' | 'subtitulo' | 'citacao';

export const ESTILOS_PARAGRAFO: { valor: EstiloParagrafo; rotulo: string }[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'titulo', rotulo: 'Título da ação' },
  { valor: 'topico', rotulo: 'Tópico (I, II…)' },
  { valor: 'subtitulo', rotulo: 'Subtítulo' },
  { valor: 'citacao', rotulo: 'Citação' },
];

export interface ContagemDocumento {
  paginas: number;
  palavras: number;
}

export type ConteudoDocumento = JSONContent;

export const MM_PX = 96 / 25.4;
export const A4_MM = { largura: 210, altura: 297 } as const;
export const GAP_PAGINAS_PX = 24;

export const FONTES = ['Times New Roman', 'Arial', 'Calibri', 'Garamond', 'Courier New'] as const;
export const TAMANHOS_FONTE = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72] as const;
export const ENTRELINHAS = [1, 1.15, 1.5, 2] as const;
export const ZOOM = { min: 50, max: 200, passo: 10 } as const;

/** Pilha de fontes com alternativas livres de métricas idênticas. */
export function pilhaFonte(fonte: string): string {
  const alternativas: Record<string, string> = {
    'Times New Roman': '"Times New Roman", "Liberation Serif", Tinos, serif',
    Arial: 'Arial, "Liberation Sans", Arimo, sans-serif',
    Calibri: 'Calibri, Carlito, sans-serif',
    Garamond: 'Garamond, "EB Garamond", serif',
    'Courier New': '"Courier New", "Liberation Mono", Cousine, monospace',
  };
  return alternativas[fonte] ?? `"${fonte}", serif`;
}
