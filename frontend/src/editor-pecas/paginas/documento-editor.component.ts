import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { JSONContent } from '@tiptap/core';
import { EditorComponent, MIME_CONTEUDO } from '../editor/editor.component';
import { IconComponent } from '../editor/components/icon.component';
import type { CampoDefinicao, ConfiguracaoPagina, ContagemDocumento, FormatoCampo, GrupoCampos, ModoDocumento } from '../editor/models/editor.models';
import type { Bloco, Documento, DocumentoVersao, FormatoExportacao } from '../dados/api.models';
import { EditorPecasApi } from '../dados/editor-pecas-api';
import { EDITOR_PECAS_CONFIG } from '../dados/editor-pecas.config';
import { RascunhoLocalService, type Rascunho } from '../dados/rascunho-local';
import { SalvamentoAutomaticoService, hashDocumento } from '../dados/salvamento-automatico.service';
import { AvisosComponent } from './avisos.component';
import { AvisosService } from './avisos.service';
import { DialogoComponent } from './dialogo.component';

type Aba = 'campos' | 'blocos' | 'versoes';
type Dialogo =
  | { tipo: 'recuperar'; rascunho: Rascunho }
  | { tipo: 'versao' }
  | { tipo: 'bloco'; conteudo: JSONContent[] }
  | { tipo: 'restaurar'; versao: DocumentoVersao };

const MOTIVOS: Record<DocumentoVersao['motivo'], string> = {
  manual: 'Salva manualmente',
  geracao: 'Gerada a partir do modelo',
  sessao: 'Início da sessão de edição',
  restauracao: 'Restauração',
};

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tela de edição: cabeçalho, editor, barra lateral (Campos, Blocos, Versões) e salvamento automático. */
@Component({
  selector: 'pe-documento-editor',
  imports: [EditorComponent, IconComponent, RouterLink, DialogoComponent, AvisosComponent],
  templateUrl: './documento-editor.component.html',
  providers: [SalvamentoAutomaticoService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pe-page-doc', '(keydown)': 'atalhos($event)' },
})
export class DocumentoEditorComponent {
  private readonly api = inject(EditorPecasApi);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly rascunhos = inject(RascunhoLocalService);
  private readonly avisos = inject(AvisosService);
  protected readonly salvamento = inject(SalvamentoAutomaticoService);
  protected readonly usuario = inject(EDITOR_PECAS_CONFIG).usuario;

  protected readonly doc = signal<Documento | null>(null);
  protected readonly erroCarga = signal<string | null>(null);
  protected readonly titulo = signal('');
  protected readonly modo = signal<ModoDocumento>('document');
  protected readonly pagina = signal<ConfiguracaoPagina | null>(null);
  protected readonly grupos = signal<GrupoCampos[]>([]);
  protected readonly formatos = signal<FormatoCampo[]>([]);
  protected readonly blocos = signal<Bloco[]>([]);
  protected readonly versoes = signal<DocumentoVersao[] | null>(null);
  protected readonly aba = signal<Aba>('campos');
  protected readonly lateralAberta = signal(true);
  protected readonly filtroCampos = signal('');
  protected readonly dialogo = signal<Dialogo | null>(null);
  protected readonly menuExportar = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly contagem = signal<ContagemDocumento>({ paginas: 1, palavras: 0 });

  protected readonly editor = viewChild(EditorComponent);
  protected readonly somenteLeitura = computed(() => this.doc()?.permissao !== 'editar');
  protected readonly ehModelo = computed(() => this.modo() === 'template');
  protected readonly motivos = MOTIVOS;

  protected readonly gruposFiltrados = computed(() => {
    const t = normalizar(this.filtroCampos().trim());
    if (!t) return this.grupos();
    return this.grupos()
      .map((g) => ({ ...g, campos: g.campos.filter((c) => normalizar(`${c.rotulo} ${c.chave}`).includes(t)) }))
      .filter((g) => g.campos.length);
  });

  protected readonly textoStatus = computed(() => {
    const hora = this.salvamento.salvoEm()?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    switch (this.salvamento.status()) {
      case 'salvando': return 'Salvando…';
      case 'pendente': return 'Alterações não salvas';
      case 'offline': return 'Sem conexão — salvo neste aparelho';
      case 'erro': return 'Erro ao salvar — salvo neste aparelho';
      case 'conflito': return 'Conflito de versão';
      case 'somente-leitura': return 'Somente leitura';
      default: return hora ? `Salvo às ${hora}` : 'Salvo';
    }
  });

  constructor() {
    const sub = this.rota.paramMap.subscribe((p) => void this.carregar(p.get('id') ?? ''));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  private async carregar(id: string): Promise<void> {
    this.doc.set(null);
    this.erroCarga.set(null);
    this.versoes.set(null);
    this.dialogo.set(null);
    try {
      const doc = await this.api.obterDocumento(id);
      const [catalogo, pagina, blocos, rascunho] = await Promise.all([
        this.api.catalogoCampos(),
        this.api.configuracaoPagina(doc.configuracaoPaginaId),
        this.api.listarBlocos(),
        this.rascunhos.obter(id),
      ]);
      this.grupos.set(catalogo.grupos);
      this.formatos.set(catalogo.formatos);
      this.pagina.set(pagina);
      this.blocos.set(blocos);
      this.titulo.set(doc.titulo);
      this.modo.set(doc.modo);
      this.aba.set(doc.modo === 'template' ? 'campos' : 'blocos');
      this.salvamento.iniciar(doc);
      this.doc.set(doc);
      const maisNovo = rascunho && new Date(rascunho.salvoEm) > new Date(doc.atualizadoEm);
      if (maisNovo && doc.permissao === 'editar' && hashDocumento(rascunho.titulo, rascunho.conteudo) !== hashDocumento(doc.titulo, doc.conteudo)) {
        this.dialogo.set({ tipo: 'recuperar', rascunho });
      } else if (rascunho) {
        void this.rascunhos.remover(id);
      }
    } catch (e) {
      this.erroCarga.set(e instanceof Error ? e.message : 'Não foi possível abrir o documento.');
    }
  }

  // ---------- Edição ----------

  protected alterado(conteudo: JSONContent): void {
    this.salvamento.alterado(this.titulo(), conteudo);
  }

  protected alterarTitulo(valor: string): void {
    this.titulo.set(valor.trim() || 'Sem título');
    const ed = this.editor();
    if (ed) this.salvamento.alterado(this.titulo(), ed.getJSON());
  }

  protected atalhos(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void this.salvamento.salvarAgora();
    }
  }

  protected inserirCampo(c: CampoDefinicao): void {
    this.editor()?.insertField(c.chave, c.formatoPadrao);
  }

  protected arrastarCampo(e: DragEvent, c: CampoDefinicao): void {
    const no: JSONContent = { type: 'field', attrs: { key: c.chave, format: c.formatoPadrao, fallback: '' } };
    e.dataTransfer?.setData(MIME_CONTEUDO, JSON.stringify(no));
    e.dataTransfer?.setData('text/plain', `{{${c.chave}}}`);
  }

  protected inserirBloco(b: Bloco): void {
    this.editor()?.insertBlock(b.conteudo);
  }

  protected arrastarBloco(e: DragEvent, b: Bloco): void {
    e.dataTransfer?.setData(MIME_CONTEUDO, JSON.stringify(b.conteudo));
  }

  protected pedirSalvarBloco(): void {
    const conteudo = this.editor()?.getSelectionJSON() ?? [];
    if (!conteudo.length) {
      this.avisos.mostrar('Selecione no texto o trecho que vai virar bloco.');
      return;
    }
    this.dialogo.set({ tipo: 'bloco', conteudo });
  }

  protected async salvarBloco(nome: string, descricao: string, conteudo: JSONContent[]): Promise<void> {
    if (!nome.trim()) return;
    this.ocupado.set(true);
    try {
      const b = await this.api.criarBloco({ nome: nome.trim(), descricao: descricao.trim() || null, conteudo });
      this.blocos.update((l) => [...l, b]);
      this.dialogo.set(null);
      this.avisos.mostrar('Bloco salvo.');
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  // ---------- Versões ----------

  protected async abrirAba(aba: Aba): Promise<void> {
    this.aba.set(aba);
    if (aba === 'versoes') await this.carregarVersoes();
  }

  private async carregarVersoes(): Promise<void> {
    const d = this.doc();
    if (!d) return;
    try {
      this.versoes.set(await this.api.listarVersoes(d.id));
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível carregar as versões.');
    }
  }

  protected async salvarVersao(nome: string): Promise<void> {
    const d = this.doc();
    if (!d) return;
    this.ocupado.set(true);
    try {
      await this.salvamento.salvarAgora();
      await this.api.criarVersao(d.id, nome.trim());
      this.dialogo.set(null);
      this.avisos.mostrar('Versão salva.');
      if (this.aba() === 'versoes') await this.carregarVersoes();
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async restaurar(v: DocumentoVersao): Promise<void> {
    const d = this.doc();
    if (!d) return;
    this.ocupado.set(true);
    try {
      await this.salvamento.salvarAgora();
      const atualizado = await this.api.restaurarVersao(d.id, v.numero);
      this.editor()?.loadVersion(atualizado.conteudo);
      this.salvamento.sincronizar(atualizado);
      this.modo.set(atualizado.modo);
      this.dialogo.set(null);
      this.avisos.mostrar(`Versão ${v.numero} restaurada como nova versão.`);
      await this.carregarVersoes();
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  // ---------- Recuperação e conflito ----------

  protected recuperar(r: Rascunho): void {
    this.dialogo.set(null);
    this.editor()?.loadVersion(r.conteudo);
    this.titulo.set(r.titulo);
    this.salvamento.alterado(r.titulo, r.conteudo);
  }

  protected descartarRascunho(): void {
    const d = this.doc();
    this.dialogo.set(null);
    if (d) void this.rascunhos.remover(d.id);
  }

  protected async recarregarDoServidor(): Promise<void> {
    const d = this.doc();
    if (!d) return;
    try {
      const atual = await this.api.obterDocumento(d.id);
      this.editor()?.loadVersion(atual.conteudo);
      this.titulo.set(atual.titulo);
      this.modo.set(atual.modo);
      this.salvamento.sincronizar(atual);
    } catch (e) {
      this.avisos.erro(e);
    }
  }

  protected async salvarComoCopia(modo?: ModoDocumento): Promise<void> {
    const ed = this.editor();
    const d = this.doc();
    if (!ed || !d) return;
    this.ocupado.set(true);
    try {
      const destino = modo ?? this.modo();
      const conteudo = ed.getJSON();
      const titulo = modo === 'template' ? `${this.titulo()} (modelo)` : `${this.titulo()} (cópia)`;
      const novo = await this.api.criarDocumento({ titulo, modo: destino, conteudo });
      if (this.salvamento.status() === 'conflito') void this.rascunhos.remover(d.id);
      await this.router.navigate(['../', novo.id], { relativeTo: this.rota });
      this.avisos.mostrar(modo === 'template' ? 'Modelo criado. Agora insira os campos.' : 'Cópia criada.');
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  // ---------- Exportação ----------

  protected async exportar(formato: FormatoExportacao): Promise<void> {
    const d = this.doc();
    this.menuExportar.set(false);
    if (!d) return;
    try {
      await this.salvamento.salvarAgora();
      const blob = await this.api.exportar(d.id, formato);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.titulo()}.${formato}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível exportar.');
    }
  }

  protected data(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
}
