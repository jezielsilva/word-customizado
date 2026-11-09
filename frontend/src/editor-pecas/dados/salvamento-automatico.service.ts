import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import type { JSONContent } from '@tiptap/core';
import { ConflitoRevisaoError, type Documento } from './api.models';
import { EditorPecasApi } from './editor-pecas-api';
import { EDITOR_PECAS_CONFIG } from './editor-pecas.config';
import { RascunhoLocalService } from './rascunho-local';

export type StatusSalvamento = 'salvo' | 'pendente' | 'salvando' | 'offline' | 'conflito' | 'erro' | 'somente-leitura';

/** Hash rápido (cyrb53) para saber se houve mudança real. */
export function hashTexto(texto: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const hashDocumento = (titulo: string, conteudo: JSONContent) => hashTexto(titulo + '\u0000' + JSON.stringify(conteudo));

/**
 * Salvamento automático em duas camadas (como o Word):
 * rascunho local a cada alteração (1 s) e servidor após 3 s sem digitar,
 * ao perder o foco, ao esconder a aba e no máximo a cada 60 s — só se houver mudança real.
 * Fornecido por componente (um por documento aberto).
 */
@Injectable()
export class SalvamentoAutomaticoService {
  private readonly api = inject(EditorPecasApi);
  private readonly rascunhos = inject(RascunhoLocalService);
  private readonly tempos = inject(EDITOR_PECAS_CONFIG).salvamento;

  readonly status = signal<StatusSalvamento>('salvo');
  readonly salvoEm = signal<Date | null>(null);

  private id = '';
  private titulo = '';
  private conteudo: JSONContent | null = null;
  private revisao = 0;
  private hashSalvo = '';
  private primeiraDaSessao = true;
  private emAndamento: Promise<void> | null = null;
  private timerRascunho: ReturnType<typeof setTimeout> | undefined;
  private timerOcioso: ReturnType<typeof setTimeout> | undefined;
  private timerMaximo: ReturnType<typeof setTimeout> | undefined;

  private readonly aoSair = () => {
    if (document.visibilityState === 'hidden' || !document.hasFocus()) void this.salvarAgora();
  };
  private readonly aoFechar = (e: BeforeUnloadEvent) => {
    if (this.status() === 'pendente' || this.status() === 'salvando' || this.status() === 'offline') {
      this.gravarRascunho();
      void this.salvarAgora();
      e.preventDefault();
    }
  };
  private readonly aoVoltarRede = () => {
    if (this.status() === 'offline') void this.salvarAgora();
  };

  constructor() {
    window.addEventListener('blur', this.aoSair);
    document.addEventListener('visibilitychange', this.aoSair);
    window.addEventListener('beforeunload', this.aoFechar);
    window.addEventListener('online', this.aoVoltarRede);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('blur', this.aoSair);
      document.removeEventListener('visibilitychange', this.aoSair);
      window.removeEventListener('beforeunload', this.aoFechar);
      window.removeEventListener('online', this.aoVoltarRede);
      this.limparTimers();
      if (this.status() !== 'salvo' && this.status() !== 'somente-leitura') {
        this.gravarRascunho();
        void this.salvarAgora();
      }
    });
  }

  iniciar(doc: Documento): void {
    this.limparTimers();
    this.id = doc.id;
    this.titulo = doc.titulo;
    this.conteudo = doc.conteudo;
    this.revisao = doc.revisao;
    this.hashSalvo = hashDocumento(doc.titulo, doc.conteudo);
    this.salvoEm.set(new Date(doc.atualizadoEm));
    this.status.set(doc.permissao === 'editar' ? 'salvo' : 'somente-leitura');
  }

  /** Revisão vinda de fora (restauração de versão, recarregar após conflito). */
  sincronizar(doc: Documento): void {
    this.iniciar(doc);
    void this.rascunhos.remover(doc.id);
  }

  alterado(titulo: string, conteudo: JSONContent): void {
    if (this.status() === 'somente-leitura' || this.status() === 'conflito') return;
    this.titulo = titulo;
    this.conteudo = conteudo;
    if (hashDocumento(titulo, conteudo) === this.hashSalvo) {
      if (this.status() === 'pendente') this.status.set('salvo');
      return;
    }
    if (this.status() !== 'offline') this.status.set('pendente');
    clearTimeout(this.timerRascunho);
    this.timerRascunho = setTimeout(() => this.gravarRascunho(), this.tempos.rascunhoLocal);
    clearTimeout(this.timerOcioso);
    this.timerOcioso = setTimeout(() => void this.salvarAgora(), this.tempos.servidorOcioso);
    this.timerMaximo ??= setTimeout(() => void this.salvarAgora(), this.tempos.servidorMaximo);
  }

  async salvarAgora(): Promise<void> {
    if (this.emAndamento) {
      await this.emAndamento;
      if (hashDocumento(this.titulo, this.conteudo ?? {}) === this.hashSalvo) return;
    }
    this.emAndamento = this.executar().finally(() => (this.emAndamento = null));
    return this.emAndamento;
  }

  private async executar(): Promise<void> {
    if (!this.conteudo || !this.id) return;
    const st = this.status();
    if (st === 'somente-leitura' || st === 'conflito') return;
    const conteudo = this.conteudo;
    const titulo = this.titulo;
    const hash = hashDocumento(titulo, conteudo);
    if (hash === this.hashSalvo) {
      this.status.set('salvo');
      return;
    }
    this.limparTimers();
    this.status.set('salvando');
    try {
      const r = await this.api.salvarDocumento(this.id, {
        titulo, conteudo, revisao: this.revisao, primeiraDaSessao: this.primeiraDaSessao,
      });
      this.primeiraDaSessao = false;
      this.revisao = r.revisao;
      this.hashSalvo = hash;
      this.salvoEm.set(new Date(r.atualizadoEm));
      const mudouDepois = hashDocumento(this.titulo, this.conteudo) !== hash;
      if (mudouDepois) this.alterado(this.titulo, this.conteudo);
      else {
        this.status.set('salvo');
        void this.rascunhos.remover(this.id);
      }
    } catch (e) {
      if (e instanceof ConflitoRevisaoError) {
        this.status.set('conflito');
        this.gravarRascunho();
      } else {
        this.status.set(navigator.onLine ? 'erro' : 'offline');
        this.gravarRascunho();
        clearTimeout(this.timerOcioso);
        this.timerOcioso = setTimeout(() => void this.salvarAgora(), 15000);
      }
    }
  }

  private gravarRascunho(): void {
    if (!this.conteudo || !this.id) return;
    void this.rascunhos.salvar({
      id: this.id, titulo: this.titulo, conteudo: this.conteudo, revisaoBase: this.revisao, salvoEm: new Date().toISOString(),
    });
  }

  private limparTimers(): void {
    clearTimeout(this.timerRascunho);
    clearTimeout(this.timerOcioso);
    clearTimeout(this.timerMaximo);
    this.timerMaximo = undefined;
  }
}
