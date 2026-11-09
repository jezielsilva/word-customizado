import type { ConfiguracaoPagina } from '../editor/models/editor.models';

export interface DadosEscritorio {
  id: string;
  nome: string;
  iniciais: string;
  oab: string;
  endereco: string;
  telefone: string;
  email: string;
  site: string;
  corMarca: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Configuração padrão com que todo escritório começa. Depois cada um ajusta a sua
 * (GET/PUT /api/configuracoes-pagina/{id}); o HTML final é sanitizado no servidor.
 */
export function criarConfiguracaoPadrao(e: DadosEscritorio): ConfiguracaoPagina {
  return {
    id: `padrao-${e.id}`,
    nome: 'Papel timbrado padrão',
    tamanho: 'A4',
    margens: { superior: 30, esquerda: 30, inferior: 20, direita: 20 },
    cabecalhoHtml:
      `<div class="pe-letterhead"><div class="pe-letterhead__logo">${esc(e.iniciais)}</div>` +
      `<div><div class="pe-letterhead__nome">${esc(e.nome)}</div>` +
      `<div class="pe-letterhead__linha">${esc(e.oab)} · ${esc(e.endereco)} · ${esc(e.telefone)}</div></div></div>`,
    rodapeHtml: `${esc(e.email)} · ${esc(e.site)}`,
    marcaDaguaUrl: null,
    marcaDaguaTexto: e.iniciais,
    fontePadrao: 'Times New Roman',
    tamanhoPadrao: 12,
    entrelinha: 1.5,
    recuoPrimeiraLinha: 25,
    corMarca: e.corMarca,
    numerarPaginas: false,
  };
}
