import { Injectable, inject } from '@angular/core';
import type { JSONContent } from '@tiptap/core';
import type { ConfiguracaoPagina, ModoDocumento } from '../editor/models/editor.models';
import {
  ConflitoRevisaoError, type Bloco, type Documento, type DocumentoResumo, type DocumentoVersao,
  type DocumentoVersaoCompleta, type FormatoExportacao, type MotivoVersao, type NovoDocumento, type SalvarDocumento,
} from './api.models';
import { criarConfiguracaoPadrao } from './configuracao-padrao';
import {
  BLOCOS_MOCK, CAMPOS_MOCK, DOCUMENTO_JUNTADA, ESCRITORIO_MOCK, FORMATOS_MOCK, MODELO_ACAO_COBRANCA, MODELO_PROCURACAO,
} from './dados-mock';
import { EditorPecasApi } from './editor-pecas-api';
import { EDITOR_PECAS_CONFIG } from './editor-pecas.config';

interface Banco {
  documentos: Documento[];
  versoes: Record<string, DocumentoVersaoCompleta[]>;
  blocos: Bloco[];
}

const CHAVE = 'editor-pecas-mock-v1';
const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const clonar = <T>(v: T): T => structuredClone(v);
const agora = () => new Date().toISOString();
const novoId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 8);

/** API simulada em localStorage: mesmo contrato e mesmos erros (409) do servidor. */
@Injectable()
export class MockEditorPecasApi extends EditorPecasApi {
  private readonly usuario = inject(EDITOR_PECAS_CONFIG).usuario;
  private banco: Banco = this.carregar();

  private carregar(): Banco {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) return JSON.parse(salvo) as Banco;
    } catch {
      /* sem localStorage: usa o banco em memória */
    }
    const autor = 'Sistema';
    const doc = (id: string, titulo: string, modo: ModoDocumento, conteudo: JSONContent, categoria: string, permissao: 'ler' | 'editar' = 'editar'): Documento => ({
      id, titulo, modo, categoria, conteudo, permissao, revisao: 1, atualizadoEm: agora(), atualizadoPor: autor,
      configuracaoPaginaId: 'padrao', modeloOrigemId: null,
    });
    const documentos = [
      doc('acao-cobranca', 'Ação de Cobrança', 'template', MODELO_ACAO_COBRANCA, 'Petição inicial'),
      doc('procuracao', 'Procuração Ad Judicia et Extra', 'template', MODELO_PROCURACAO, 'Procuração', 'ler'),
      doc('juntada-joao', 'Juntada de documentos — João Silva', 'document', DOCUMENTO_JUNTADA, 'Petição intermediária'),
    ];
    const versoes: Banco['versoes'] = {};
    for (const d of documentos) {
      versoes[d.id] = [{ numero: 1, nome: 'Versão inicial', motivo: 'manual', criadoPor: autor, criadoEm: agora(), conteudo: clonar(d.conteudo) }];
    }
    return { documentos, versoes, blocos: BLOCOS_MOCK.map((b) => ({ ...b, id: novoId() })) };
  }

  private gravar(): void {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(this.banco));
    } catch {
      /* cota cheia ou bloqueado: mantém em memória */
    }
  }

  private doc(id: string): Documento {
    const d = this.banco.documentos.find((x) => x.id === id);
    if (!d) throw new Error('Documento não encontrado.');
    return d;
  }

  private versionar(id: string, conteudo: JSONContent, motivo: MotivoVersao, nome: string | null): DocumentoVersao {
    const lista = (this.banco.versoes[id] ??= []);
    const v: DocumentoVersaoCompleta = {
      numero: (lista.at(-1)?.numero ?? 0) + 1, nome, motivo, criadoPor: this.usuario(), criadoEm: agora(), conteudo: clonar(conteudo),
    };
    lista.push(v);
    const { conteudo: _c, ...resumo } = v;
    return resumo;
  }

  async listarDocumentos(filtro: { modo?: ModoDocumento; busca?: string } = {}): Promise<DocumentoResumo[]> {
    await espera();
    const termo = (filtro.busca ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return this.banco.documentos
      .filter((d) => !filtro.modo || d.modo === filtro.modo)
      .filter((d) => !termo || d.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(termo))
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
      .map(({ conteudo: _c, revisao: _r, configuracaoPaginaId: _p, modeloOrigemId: _m, ...r }) => r);
  }

  async obterDocumento(id: string): Promise<Documento> {
    await espera();
    return clonar(this.doc(id));
  }

  async criarDocumento(novo: NovoDocumento): Promise<Documento> {
    await espera();
    const origem = novo.origemId ? this.doc(novo.origemId) : null;
    const conteudo: JSONContent = clonar(novo.conteudo ?? origem?.conteudo ?? { type: 'doc', content: [{ type: 'paragraph' }] });
    conteudo.attrs = { ...(conteudo.attrs ?? {}), mode: novo.modo, schemaVersion: 1 };
    const d: Documento = {
      id: novoId(), titulo: novo.titulo, modo: novo.modo, categoria: origem?.categoria ?? null, conteudo, revisao: 1,
      atualizadoEm: agora(), atualizadoPor: this.usuario(), permissao: 'editar', configuracaoPaginaId: 'padrao',
      modeloOrigemId: origem?.modo === 'template' ? origem.id : null,
    };
    this.banco.documentos.push(d);
    this.versionar(d.id, conteudo, 'manual', 'Criação');
    this.gravar();
    return clonar(d);
  }

  async salvarDocumento(id: string, dados: SalvarDocumento) {
    await espera(250);
    const d = this.doc(id);
    if (d.permissao !== 'editar') throw new Error('Sem permissão para editar.');
    if (dados.revisao !== d.revisao) throw new ConflitoRevisaoError(d.revisao);
    d.titulo = dados.titulo;
    d.conteudo = clonar(dados.conteudo);
    d.modo = (dados.conteudo.attrs?.['mode'] as ModoDocumento) ?? d.modo;
    d.revisao++;
    d.atualizadoEm = agora();
    d.atualizadoPor = this.usuario();
    if (dados.primeiraDaSessao) this.versionar(id, d.conteudo, 'sessao', null);
    this.gravar();
    return { revisao: d.revisao, atualizadoEm: d.atualizadoEm };
  }

  async excluirDocumento(id: string) {
    await espera();
    this.banco.documentos = this.banco.documentos.filter((d) => d.id !== id);
    delete this.banco.versoes[id];
    this.gravar();
  }

  async listarVersoes(id: string): Promise<DocumentoVersao[]> {
    await espera();
    return (this.banco.versoes[id] ?? []).map(({ conteudo: _c, ...v }) => v).reverse();
  }

  async obterVersao(id: string, numero: number): Promise<DocumentoVersaoCompleta> {
    await espera();
    const v = (this.banco.versoes[id] ?? []).find((x) => x.numero === numero);
    if (!v) throw new Error('Versão não encontrada.');
    return clonar(v);
  }

  async criarVersao(id: string, nome: string) {
    await espera();
    const v = this.versionar(id, this.doc(id).conteudo, 'manual', nome || null);
    this.gravar();
    return v;
  }

  async restaurarVersao(id: string, numero: number): Promise<Documento> {
    const v = await this.obterVersao(id, numero);
    const d = this.doc(id);
    d.conteudo = clonar(v.conteudo);
    d.revisao++;
    d.atualizadoEm = agora();
    this.versionar(id, v.conteudo, 'restauracao', `Restauração da versão ${numero}`);
    this.gravar();
    return clonar(d);
  }

  async catalogoCampos() {
    await espera();
    return { grupos: clonar(CAMPOS_MOCK), formatos: clonar(FORMATOS_MOCK) };
  }

  async configuracaoPagina(_id: string): Promise<ConfiguracaoPagina> {
    await espera();
    return criarConfiguracaoPadrao(ESCRITORIO_MOCK);
  }

  async listarBlocos(): Promise<Bloco[]> {
    await espera();
    return clonar(this.banco.blocos);
  }

  async criarBloco(bloco: Omit<Bloco, 'id'>): Promise<Bloco> {
    await espera();
    const b = { ...clonar(bloco), id: novoId() };
    this.banco.blocos.push(b);
    this.gravar();
    return b;
  }

  async exportar(_id: string, _formato: FormatoExportacao): Promise<Blob> {
    await espera();
    throw new Error('A exportação DOCX/PDF é feita no servidor e fica disponível quando a API estiver ligada.');
  }
}
