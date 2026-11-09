import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewEncapsulation,
  afterNextRender, computed, effect, inject, input, output, signal, untracked, viewChild,
} from '@angular/core';
import { Editor, type JSONContent } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { TableKit } from '@tiptap/extension-table';

import { Field, type FieldClickEvent, CHAVE_CAMPO_REGEX } from './extensions/field';
import { Variant, type VariantClickEvent } from './extensions/variant';
import { Conditional, Repeat, type BlocoLogicoClickEvent, type TipoBlocoLogico } from './extensions/blocos-logicos';
import { Comentario, type ComentarioClickEvent } from './extensions/comentario';
import { CaixaAlta } from './extensions/caixa-alta';
import { Busca, buscaKey, type EstadoBusca, type OpcoesBusca } from './extensions/busca';
import { limparHtmlColado } from './extensions/limpar-colagem';
import { DocumentoAttrs } from './extensions/documento-attrs';
import { ParagraphFormat } from './extensions/paragraph-format';
import { PageBreak } from './extensions/page-break';
import { FontSizeShortcuts, proximoTamanho } from './extensions/font-size-shortcuts';
import { Pagination, recalcularPaginacao, type LayoutPagina } from './extensions/pagination';
import { FieldPickerComponent } from './components/field-picker.component';
import { FieldPopoverComponent } from './components/field-popover.component';
import { VariantPopoverComponent } from './components/variant-popover.component';
import { BlocoLogicoPopoverComponent } from './components/bloco-logico-popover.component';
import { ComentarioPopoverComponent } from './components/comentario-popover.component';
import { BuscaBarComponent } from './components/busca-bar.component';
import { IconComponent } from './components/icon.component';
import {
  A4_MM, ENTRELINHAS, ESTILOS_PARAGRAFO, FONTES, GAP_PAGINAS_PX, MM_PX, SCHEMA_VERSION, TAMANHOS_FONTE, ZOOM, pilhaFonte,
  type CampoDefinicao, type ComentarioAttrs, type ConfiguracaoPagina, type ContagemDocumento, type EstadoBarra,
  type EstiloParagrafo, type FieldAttrs, type FormatoCampo, type GrupoCampos, type ModoDocumento, type VariantAttrs,
} from './models/editor.models';

/** Tipo MIME usado para arrastar campos e blocos da barra lateral para o texto. */
export const MIME_CONTEUDO = 'application/x-pe-conteudo';

const ESTADO_INICIAL: EstadoBarra = {
  bold: false, italic: false, underline: false, align: null, bulletList: false, orderedList: false,
  fontFamily: '', fontSize: null, lineHeight: null, firstLineIndent: true, canUndo: false, canRedo: false,
  estilo: 'normal', emTabela: false, temSelecao: false, comentario: false,
};

const BUSCA_VAZIA: EstadoBusca = {
  termo: '', opcoes: { diferenciarMaiusculas: false, diferenciarAcentos: false }, resultados: [], atual: -1,
};

interface EdicaoVariacao { pos: number | null; attrs: VariantAttrs; rect: DOMRect }
interface EdicaoBlocoLogico { tipo: TipoBlocoLogico; pos: number | null; valor: string; rect: DOMRect }
interface EdicaoComentario { attrs: ComentarioAttrs; rect: DOMRect }

const novoId = () => crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

/**
 * Editor de peças: folha A4 paginada com papel timbrado, barra de ferramentas e campos.
 * Um único componente atende os modos Modelo (com campos) e Documento.
 * Só edita e emite JSON do ProseMirror; mesclagem, formatação e exportação são do servidor.
 */
@Component({
  selector: 'pe-editor',
  imports: [
    FieldPickerComponent, FieldPopoverComponent, VariantPopoverComponent, BlocoLogicoPopoverComponent,
    ComentarioPopoverComponent, BuscaBarComponent, IconComponent,
  ],
  templateUrl: './editor.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pe-editor',
    '[class.is-readonly]': 'readonly()',
    '[class.is-preview]': 'previa()',
    '(keydown)': 'atalhosTela($event)',
  },
})
export class EditorComponent {
  /** Modo usado só quando `conteudo` é nulo (documento novo). */
  readonly modo = input<ModoDocumento>('document');
  readonly conteudo = input<JSONContent | null>(null);
  readonly readonly = input(false);
  readonly pagina = input.required<ConfiguracaoPagina>();
  readonly campos = input<GrupoCampos[]>([]);
  readonly formatos = input<FormatoCampo[]>([]);
  /** Autor dos comentários internos. */
  readonly usuario = input('Usuário');

  readonly conteudoChange = output<JSONContent>();
  readonly modoChange = output<ModoDocumento>();
  readonly contagemChange = output<ContagemDocumento>();

  protected readonly fontes = FONTES;
  protected readonly tamanhos = TAMANHOS_FONTE;
  protected readonly entrelinhas = ENTRELINHAS;
  protected readonly estilos = ESTILOS_PARAGRAFO;

  protected readonly estado = signal<EstadoBarra>(ESTADO_INICIAL);
  protected readonly modoAtual = signal<ModoDocumento>('document');
  protected readonly paginas = signal(1);
  protected readonly palavras = signal(0);
  protected readonly zoom = signal(100);
  protected readonly previa = signal(false);
  protected readonly seletorAberto = signal(false);
  protected readonly edicaoCampo = signal<FieldClickEvent | null>(null);
  protected readonly edicaoVariacao = signal<EdicaoVariacao | null>(null);
  protected readonly edicaoBloco = signal<EdicaoBlocoLogico | null>(null);
  protected readonly edicaoComentario = signal<EdicaoComentario | null>(null);
  protected readonly buscaAberta = signal<'buscar' | 'substituir' | null>(null);
  protected readonly busca = signal<EstadoBusca>(BUSCA_VAZIA);
  protected readonly avisos = signal({ desconhecidos: 0, marcacoesSobrando: 0 });

  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly buscaBar = viewChild(BuscaBarComponent);
  private readonly destroyRef = inject(DestroyRef);

  private readonly indiceCampos = computed(
    () => new Map<string, CampoDefinicao>(this.campos().flatMap((g) => g.campos.map((c) => [c.chave, c] as const))),
  );

  /** Medidas em px (antes do zoom). */
  protected readonly medidas = computed(() => {
    const { margens } = this.pagina();
    const altura = A4_MM.altura * MM_PX;
    return {
      largura: A4_MM.largura * MM_PX,
      altura,
      passo: altura + GAP_PAGINAS_PX,
      conteudo: (A4_MM.altura - margens.superior - margens.inferior) * MM_PX,
    };
  });
  protected readonly alturaTotal = computed(() => this.paginas() * this.medidas().passo - GAP_PAGINAS_PX);
  protected readonly listaPaginas = computed(() => Array.from({ length: this.paginas() }, (_, i) => i + 1));
  protected readonly escala = computed(() => this.zoom() / 100);
  protected readonly reguaCm = Array.from({ length: A4_MM.largura / 10 + 1 }, (_, i) => i);
  protected readonly ehModelo = computed(() => this.modoAtual() === 'template');

  protected readonly variaveisDoc = computed(() => {
    const p = this.pagina();
    return {
      '--pe-font': pilhaFonte(p.fontePadrao),
      '--pe-size': `${p.tamanhoPadrao}pt`,
      '--pe-line': `${p.entrelinha}`,
      '--pe-indent': `${p.recuoPrimeiraLinha}mm`,
      '--pe-brand': p.corMarca,
      '--pe-m-top': `${p.margens.superior}mm`,
      '--pe-m-bottom': `${p.margens.inferior}mm`,
      '--pe-m-left': `${p.margens.esquerda}mm`,
      '--pe-m-right': `${p.margens.direita}mm`,
    };
  });

  readonly editor: Editor;

  constructor() {
    const layout = (): LayoutPagina => {
      const m = untracked(this.medidas);
      return { alturaPagina: m.altura, alturaConteudo: m.conteudo, gap: GAP_PAGINAS_PX };
    };
    const editavel = () => this.editor?.isEditable ?? false;

    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: false,
          code: false,
          codeBlock: false,
          horizontalRule: false,
          strike: false,
          undoRedo: { depth: 200, newGroupDelay: 500 },
        }),
        TextStyle,
        FontFamily,
        FontSize,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
          defaultAlignment: 'justify',
        }),
        TableKit.configure({ table: { resizable: false } }),
        DocumentoAttrs,
        ParagraphFormat,
        PageBreak,
        CaixaAlta,
        FontSizeShortcuts.configure({ tamanhoPadrao: () => untracked(this.pagina).tamanhoPadrao }),
        Field.configure({
          resolve: (key) => {
            const c = untracked(this.indiceCampos).get(key);
            return c ? { rotulo: c.rotulo, exemplo: c.exemplo } : null;
          },
          onTrigger: () => this.abrirSeletor(),
          onEdit: (ev) => editavel() && this.edicaoCampo.set(ev),
        }),
        Variant.configure({
          onEdit: (ev: VariantClickEvent) => editavel() && this.edicaoVariacao.set({ pos: ev.pos, attrs: ev.attrs, rect: ev.rect }),
        }),
        Conditional.configure({ onEdit: (ev: BlocoLogicoClickEvent) => editavel() && this.edicaoBloco.set(ev) }),
        Repeat.configure({ onEdit: (ev: BlocoLogicoClickEvent) => editavel() && this.edicaoBloco.set(ev) }),
        Comentario.configure({ onClick: (ev: ComentarioClickEvent) => this.edicaoComentario.set(ev) }),
        Busca.configure({ rotuloCampo: (key) => untracked(this.indiceCampos).get(key)?.rotulo ?? null }),
        Pagination.configure({ layout, onPaginas: (n) => this.definirPaginas(n) }),
      ],
      editorProps: {
        attributes: { spellcheck: 'true', lang: 'pt-BR', class: 'pe-doc', 'aria-label': 'Texto do documento' },
        transformPastedHTML: limparHtmlColado,
        handleDrop: (view, event) => {
          const dados = event.dataTransfer?.getData(MIME_CONTEUDO);
          if (!dados || !view.editable) return false;
          const alvo = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!alvo) return false;
          event.preventDefault();
          try {
            this.editor.chain().focus().insertContentAt(alvo.pos, JSON.parse(dados)).run();
          } catch {
            return false;
          }
          return true;
        },
      },
      content: documentoVazio('document'),
    });

    this.editor.on('transaction', () => this.atualizarEstado());
    this.editor.on('update', ({ editor }) => {
      this.conteudoChange.emit(editor.getJSON());
      this.contarPalavras();
    });
    this.destroyRef.onDestroy(() => this.editor.destroy());

    // Conteúdo inicial: só na primeira vez; depois use loadVersion().
    let carregado = false;
    effect(() => {
      const conteudo = this.conteudo();
      const modo = this.modo();
      if (carregado) return;
      carregado = true;
      untracked(() => this.loadVersion(conteudo ?? documentoVazio(modo)));
    });

    effect(() => {
      const ro = this.readonly();
      untracked(() => {
        this.editor.setEditable(!ro);
        this.atualizarEstado();
      });
    });

    // Catálogo ou página mudaram: redesenha chips e recalcula a paginação.
    effect(() => {
      this.indiceCampos();
      this.medidas();
      this.pagina();
      untracked(() => {
        if (this.editor.isDestroyed || !this.editor.isInitialized) return;
        this.editor.storage.field.renderizadores.forEach((render) => render());
        recalcularPaginacao(this.editor.view);
        this.atualizarAvisos(this.modoAtual());
      });
    });

    afterNextRender(() => {
      this.editor.mount(this.host().nativeElement);
      this.contarPalavras();
      const el = this.canvas().nativeElement;
      const roda = (e: WheelEvent) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        this.alterarZoom(e.deltaY < 0 ? ZOOM.passo : -ZOOM.passo);
      };
      el.addEventListener('wheel', roda, { passive: false });
      this.destroyRef.onDestroy(() => el.removeEventListener('wheel', roda));
    });
  }

  // ---------- API pública (usada pela página, barra lateral e host) ----------

  insertField(key: string, format: string | null = null): boolean {
    return this.editor.chain().focus().insertField(key, format).run();
  }

  insertBlock(conteudo: JSONContent | JSONContent[]): boolean {
    return this.editor.chain().focus().insertContent(conteudo).run();
  }

  /** Mudança vinda de fora: não entra no desfazer e limpa o histórico. */
  loadVersion(json: JSONContent): void {
    const attrs = { mode: 'document', schemaVersion: SCHEMA_VERSION, ...(json.attrs ?? {}) };
    this.editor.commands.setContent({ ...json, attrs }, { emitUpdate: false });
    // setContent troca só o conteúdo; os atributos do nó raiz (modo) entram à parte.
    const { tr } = this.editor.state;
    for (const [k, v] of Object.entries(attrs)) tr.setDocAttribute(k, v);
    this.editor.view.dispatch(tr.setMeta('addToHistory', false));
    this.limparHistorico();
    this.fecharPopovers();
    this.atualizarEstado();
    this.contarPalavras();
  }

  getJSON(): JSONContent {
    return this.editor.getJSON();
  }

  /** Trecho selecionado como JSON (para "Salvar seleção como bloco"). */
  getSelectionJSON(): JSONContent[] {
    const { selection } = this.editor.state;
    if (selection.empty) return [];
    return (selection.content().content.toJSON() as JSONContent[]) ?? [];
  }

  /** "Salvar como modelo": Documento passa a aceitar campos. */
  converterEmModelo(): void {
    this.editor.chain().command(({ tr }) => {
      tr.setDocAttribute('mode', 'template');
      return true;
    }).run();
  }

  focar(): void {
    this.editor.commands.focus();
  }

  // ---------- Barra de ferramentas ----------

  protected cmd(acao: (c: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>): void {
    acao(this.editor.chain().focus()).run();
  }

  protected definirFonte(fonte: string): void {
    this.cmd((c) => c.setFontFamily(fonte));
  }

  protected definirTamanho(valor: string): void {
    const n = parseFloat(valor.replace(',', '.'));
    if (Number.isFinite(n) && n >= 1 && n <= 400) this.cmd((c) => c.setFontSize(`${n}pt`));
  }

  protected passoTamanho(direcao: 1 | -1): void {
    const atual = this.estado().fontSize ?? this.pagina().tamanhoPadrao;
    this.cmd((c) => c.setFontSize(`${proximoTamanho(atual, direcao)}pt`));
  }

  protected definirEntrelinha(valor: string): void {
    this.cmd((c) => c.setParagraphLineHeight(valor ? parseFloat(valor) : null));
  }

  protected alternarRecuo(): void {
    this.cmd((c) => c.setFirstLineIndent(this.estado().firstLineIndent ? 0 : null));
  }

  protected aplicarEstilo(estilo: EstiloParagrafo): void {
    this.cmd((c) => {
      let ch = this.editor.isActive('blockquote') && estilo !== 'citacao' ? c.lift('blockquote') : c;
      switch (estilo) {
        case 'titulo': return ch.setHeading({ level: 1 });
        case 'topico': return ch.setHeading({ level: 2 });
        case 'subtitulo': return ch.setHeading({ level: 3 });
        case 'citacao':
          ch = ch.setParagraph();
          return this.editor.isActive('blockquote') ? ch : ch.setBlockquote();
        default: return ch.setParagraph();
      }
    });
  }

  protected alterarZoom(delta: number): void {
    this.zoom.update((z) => Math.min(ZOOM.max, Math.max(ZOOM.min, z + delta)));
  }

  protected abrirSeletor(): void {
    if (this.ehModelo() && this.editor.isEditable) this.seletorAberto.set(true);
  }

  protected escolherCampo(c: CampoDefinicao): void {
    this.seletorAberto.set(false);
    this.insertField(c.chave, c.formatoPadrao);
  }

  protected fecharSeletor(): void {
    this.seletorAberto.set(false);
    this.editor.commands.focus();
  }

  protected aplicarCampo(attrs: FieldAttrs): void {
    const ev = this.edicaoCampo();
    this.edicaoCampo.set(null);
    if (ev) this.editor.chain().focus().updateField(ev.pos, attrs).run();
  }

  protected removerNo(pos: number): void {
    this.fecharPopovers();
    this.editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
  }

  protected novaVariacao(botao: HTMLElement): void {
    this.edicaoVariacao.set({
      pos: null,
      attrs: { key: '', formas: { ms: '', fs: '', mp: '', fp: '' } },
      rect: botao.getBoundingClientRect(),
    });
  }

  protected aplicarVariacao(attrs: VariantAttrs): void {
    const ev = this.edicaoVariacao();
    this.edicaoVariacao.set(null);
    if (!ev) return;
    if (ev.pos == null) this.editor.chain().focus().insertVariant(attrs).run();
    else this.editor.chain().focus().updateVariant(ev.pos, attrs).run();
  }

  protected novoBlocoLogico(tipo: TipoBlocoLogico, botao: HTMLElement): void {
    this.edicaoBloco.set({ tipo, pos: null, valor: '', rect: botao.getBoundingClientRect() });
  }

  protected aplicarBlocoLogico(valor: string): void {
    const ev = this.edicaoBloco();
    this.edicaoBloco.set(null);
    if (!ev) return;
    if (ev.pos != null) this.editor.chain().focus().updateBlocoLogico(ev.pos, valor).run();
    else if (ev.tipo === 'conditional') this.editor.chain().focus().setConditional(valor).run();
    else this.editor.chain().focus().setRepeat(valor).run();
  }

  protected desfazerBlocoLogico(): void {
    const ev = this.edicaoBloco();
    this.edicaoBloco.set(null);
    if (ev?.pos != null) this.editor.chain().focus().unwrapBlocoLogico(ev.pos).run();
  }

  protected novoComentario(botao: HTMLElement): void {
    if (this.editor.state.selection.empty) return;
    this.edicaoComentario.set({
      attrs: { id: '', texto: '', autor: this.usuario(), criadoEm: new Date().toISOString() },
      rect: botao.getBoundingClientRect(),
    });
  }

  protected salvarComentario(texto: string): void {
    const ev = this.edicaoComentario();
    this.edicaoComentario.set(null);
    if (!ev) return;
    if (ev.attrs.id) this.editor.chain().focus().updateComentario(ev.attrs.id, texto).run();
    else this.editor.chain().focus().setComentario({ ...ev.attrs, id: novoId(), texto }).run();
  }

  protected removerComentario(): void {
    const ev = this.edicaoComentario();
    this.edicaoComentario.set(null);
    if (ev?.attrs.id) this.editor.chain().focus().removeComentario(ev.attrs.id).run();
  }

  protected fecharPopovers(): void {
    this.edicaoCampo.set(null);
    this.edicaoVariacao.set(null);
    this.edicaoBloco.set(null);
    this.edicaoComentario.set(null);
  }

  protected fecharPopoverEFocar(): void {
    this.fecharPopovers();
    this.editor.commands.focus();
  }

  // ---------- Localizar e substituir ----------

  protected abrirBusca(modo: 'buscar' | 'substituir'): void {
    const permitido = modo === 'substituir' && this.editor.isEditable ? 'substituir' : 'buscar';
    const selecao = this.editor.state.selection;
    const termo = selecao.empty ? '' : this.editor.state.doc.textBetween(selecao.from, selecao.to, ' ').slice(0, 100);
    if (termo && !termo.includes('\n')) this.editor.commands.definirBusca(termo);
    if (this.buscaAberta()) this.buscaBar()?.focar(permitido === 'substituir');
    this.buscaAberta.set(permitido);
  }

  protected buscar(e: { termo: string; opcoes?: Partial<OpcoesBusca> }): void {
    this.editor.commands.definirBusca(e.termo, e.opcoes);
  }

  protected navegarBusca(direcao: 1 | -1): void {
    this.editor.commands.irParaResultado(direcao);
  }

  protected substituir(e: { texto: string; todos: boolean }): void {
    if (!this.editor.isEditable) return;
    if (e.todos) this.editor.commands.substituirTodos(e.texto);
    else this.editor.commands.substituirAtual(e.texto);
  }

  protected fecharBusca(): void {
    this.buscaAberta.set(null);
    this.editor.chain().limparBusca().focus().run();
  }

  /** Atalhos que mexem só na tela (zoom, camadas, busca), não no documento. */
  protected atalhosTela(e: KeyboardEvent): void {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (!e.shiftKey && (k === '=' || k === '+')) this.alterarZoom(ZOOM.passo);
    else if (!e.shiftKey && k === '-') this.alterarZoom(-ZOOM.passo);
    else if (!e.shiftKey && k === 'f') this.abrirBusca('buscar');
    else if (!e.shiftKey && k === 'h') this.abrirBusca('substituir');
    else if (e.shiftKey && k === 'p' && this.ehModelo()) this.previa.update((v) => !v);
    else return;
    e.preventDefault();
  }

  // ---------- Estado ----------

  private definirPaginas(n: number): void {
    if (n === this.paginas()) return;
    this.paginas.set(n);
    this.emitirContagem();
  }

  private contarPalavras(): void {
    if (this.editor.isDestroyed) return;
    const texto = this.editor.state.doc.textBetween(0, this.editor.state.doc.content.size, ' ', ' ');
    const n = texto.match(/[\p{L}\p{N}]+(?:[-'’.][\p{L}\p{N}]+)*/gu)?.length ?? 0;
    if (n === this.palavras()) return;
    this.palavras.set(n);
    this.emitirContagem();
  }

  private emitirContagem(): void {
    this.contagemChange.emit({ paginas: this.paginas(), palavras: this.palavras() });
  }

  private limparHistorico(): void {
    // Recria o estado com o mesmo doc e plugins: o histórico começa vazio.
    const { state, view } = this.editor;
    view.updateState(EditorState.create({ doc: state.doc, plugins: state.plugins, selection: state.selection }));
  }

  /** Fonte da seleção; vazio se a seleção mistura fontes. */
  private fonteSelecao(): string {
    const { state } = this.editor;
    const { from, to, empty } = state.selection;
    if (empty) return (this.editor.getAttributes('textStyle')['fontFamily'] as string) ?? '';
    const fontes = new Set<string>();
    state.doc.nodesBetween(from, to, (node) => {
      if (!node.isText) return;
      const m = node.marks.find((mk) => mk.type.name === 'textStyle');
      fontes.add((m?.attrs['fontFamily'] as string) ?? '');
    });
    return fontes.size === 1 ? [...fontes][0] : '';
  }

  private atualizarEstado(): void {
    const e = this.editor;
    if (e.isDestroyed) return;
    const ts = e.getAttributes('textStyle');
    const par = { ...e.getAttributes('heading'), ...e.getAttributes('paragraph') };
    const align = (['left', 'center', 'right', 'justify'] as const).find((a) => e.isActive({ textAlign: a })) ?? null;
    const modo = (e.state.doc.attrs['mode'] as ModoDocumento) ?? 'document';
    if (modo !== this.modoAtual()) {
      this.modoAtual.set(modo);
      this.modoChange.emit(modo);
      if (modo === 'document') this.previa.set(false);
    }
    const estilo: EstiloParagrafo = e.isActive('blockquote') ? 'citacao'
      : e.isActive('heading', { level: 1 }) ? 'titulo'
      : e.isActive('heading', { level: 2 }) ? 'topico'
      : e.isActive('heading', { level: 3 }) ? 'subtitulo'
      : 'normal';
    this.estado.set({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      align,
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      fontFamily: this.fonteSelecao(),
      fontSize: ts['fontSize'] ? parseFloat(ts['fontSize']) : null,
      lineHeight: par['lineHeight'] ?? null,
      firstLineIndent: par['firstLineIndent'] !== 0,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      estilo,
      emTabela: e.isActive('table'),
      temSelecao: !e.state.selection.empty,
      comentario: e.isActive('comentario'),
    });
    const b = buscaKey.getState(e.state);
    if (b && b !== this.busca()) this.busca.set(b);
    this.atualizarAvisos(modo);
  }

  private atualizarAvisos(modo: ModoDocumento): void {
    const indice = this.indiceCampos();
    const doc = this.editor.state.doc;
    let desconhecidos = 0;
    if (modo === 'template' && indice.size) {
      doc.descendants((n) => {
        if (n.type.name === 'field' && !indice.has(n.attrs['key'])) desconhecidos++;
      });
    }
    const marcacoesSobrando = modo === 'document'
      ? (doc.textBetween(0, doc.content.size, '\n', '\n').match(CHAVE_CAMPO_REGEX)?.length ?? 0)
      : 0;
    const atual = this.avisos();
    if (atual.desconhecidos !== desconhecidos || atual.marcacoesSobrando !== marcacoesSobrando) {
      this.avisos.set({ desconhecidos, marcacoesSobrando });
    }
  }
}

function documentoVazio(modo: ModoDocumento): JSONContent {
  return { type: 'doc', attrs: { mode: modo, schemaVersion: SCHEMA_VERSION }, content: [{ type: 'paragraph' }] };
}
