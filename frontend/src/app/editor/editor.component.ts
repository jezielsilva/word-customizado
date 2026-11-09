import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewEncapsulation,
  afterNextRender, computed, effect, inject, input, output, signal, untracked, viewChild,
} from '@angular/core';
import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { EditorState } from '@tiptap/pm/state';
import { TiptapEditorDirective } from 'ngx-tiptap';

import { Field, type FieldClickEvent, CHAVE_CAMPO_REGEX } from './extensions/field';
import { DocumentoAttrs } from './extensions/documento-attrs';
import { ParagraphFormat } from './extensions/paragraph-format';
import { PageBreak } from './extensions/page-break';
import { FontSizeShortcuts, proximoTamanho } from './extensions/font-size-shortcuts';
import { Pagination, recalcularPaginacao, type LayoutPagina } from './extensions/pagination';
import { FieldPickerComponent } from './components/field-picker.component';
import { FieldPopoverComponent } from './components/field-popover.component';
import { IconComponent } from './components/icon.component';
import {
  A4_MM, ENTRELINHAS, FONTES, GAP_PAGINAS_PX, MM_PX, SCHEMA_VERSION, TAMANHOS_FONTE, ZOOM, pilhaFonte,
  type CampoDefinicao, type ConfiguracaoPagina, type EstadoBarra, type FieldAttrs, type FormatoCampo,
  type GrupoCampos, type ModoDocumento,
} from './models/editor.models';

const ESTADO_INICIAL: EstadoBarra = {
  bold: false, italic: false, underline: false, align: null, bulletList: false, orderedList: false,
  fontFamily: '', fontSize: null, lineHeight: null, firstLineIndent: true, canUndo: false, canRedo: false,
};

/**
 * Editor de peças: folha A4 paginada com papel timbrado, barra de ferramentas e campos.
 * Um único componente atende os modos Modelo (com campos) e Documento.
 * Só edita e emite JSON do ProseMirror; mesclagem, formatação e exportação são do servidor.
 */
@Component({
  selector: 'pe-editor',
  imports: [TiptapEditorDirective, FieldPickerComponent, FieldPopoverComponent, IconComponent],
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

  readonly conteudoChange = output<JSONContent>();
  readonly modoChange = output<ModoDocumento>();

  protected readonly fontes = FONTES;
  protected readonly tamanhos = TAMANHOS_FONTE;
  protected readonly entrelinhas = ENTRELINHAS;

  protected readonly estado = signal<EstadoBarra>(ESTADO_INICIAL);
  protected readonly modoAtual = signal<ModoDocumento>('document');
  protected readonly paginas = signal(1);
  protected readonly zoom = signal(100);
  protected readonly previa = signal(false);
  protected readonly seletorAberto = signal(false);
  protected readonly edicaoCampo = signal<FieldClickEvent | null>(null);
  protected readonly avisos = signal({ desconhecidos: 0, marcacoesSobrando: 0 });

  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
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
      topo: margens.superior * MM_PX,
      conteudo: (A4_MM.altura - margens.superior - margens.inferior) * MM_PX,
    };
  });
  protected readonly alturaTotal = computed(() => this.paginas() * this.medidas().passo - GAP_PAGINAS_PX);
  protected readonly listaPaginas = computed(() => Array.from({ length: this.paginas() }, (_, i) => i + 1));
  protected readonly escala = computed(() => this.zoom() / 100);
  protected readonly reguaCm = Array.from({ length: A4_MM.largura / 10 + 1 }, (_, i) => i);

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

    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: false,
          code: false,
          codeBlock: false,
          blockquote: false,
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
        DocumentoAttrs,
        ParagraphFormat,
        PageBreak,
        FontSizeShortcuts.configure({ tamanhoPadrao: () => untracked(this.pagina).tamanhoPadrao }),
        Field.configure({
          resolve: (key) => {
            const c = untracked(this.indiceCampos).get(key);
            return c ? { rotulo: c.rotulo, exemplo: c.exemplo } : null;
          },
          onTrigger: () => this.abrirSeletor(),
          onEdit: (ev) => {
            if (this.editor.isEditable) this.edicaoCampo.set(ev);
          },
        }),
        Pagination.configure({ layout, onPaginas: (n) => this.paginas.set(n) }),
      ],
      editorProps: {
        attributes: { spellcheck: 'true', lang: 'pt-BR', class: 'pe-doc', 'aria-label': 'Texto do documento' },
      },
      content: documentoVazio('document'),
    });

    this.editor.on('transaction', () => this.atualizarEstado());
    this.editor.on('update', ({ editor }) => this.conteudoChange.emit(editor.getJSON()));
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

    effect(() => this.editor.setEditable(!this.readonly()));

    // Catálogo ou página mudaram: redesenha chips e recalcula a paginação.
    effect(() => {
      this.indiceCampos();
      this.medidas();
      this.pagina();
      untracked(() => {
        if (this.editor.isDestroyed || !this.editor.isInitialized) return;
        this.editor.storage.field.renderizadores.forEach((render) => render());
        recalcularPaginacao(this.editor.view);
      });
    });

    afterNextRender(() => {
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

  // ---------- API pública (usada pela barra lateral) ----------

  insertField(key: string, format: string | null = null): boolean {
    return this.editor.chain().focus().insertField(key, format).run();
  }

  insertBlock(conteudo: JSONContent | JSONContent[]): boolean {
    return this.editor.chain().focus().insertContent(conteudo).run();
  }

  /** Mudança vinda de fora: não entra no desfazer e limpa o histórico. */
  loadVersion(json: JSONContent): void {
    const doc: JSONContent = {
      ...json,
      attrs: { mode: 'document', schemaVersion: SCHEMA_VERSION, ...(json.attrs ?? {}) },
    };
    this.editor.commands.setContent(doc, { emitUpdate: false });
    this.limparHistorico();
    this.edicaoCampo.set(null);
    this.atualizarEstado();
  }

  getJSON(): JSONContent {
    return this.editor.getJSON();
  }

  /** "Salvar como modelo": Documento passa a aceitar campos. */
  converterEmModelo(): void {
    this.editor.chain().command(({ tr }) => {
      tr.setDocAttribute('mode', 'template');
      return true;
    }).run();
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

  protected alterarZoom(delta: number): void {
    this.zoom.update((z) => Math.min(ZOOM.max, Math.max(ZOOM.min, z + delta)));
  }

  protected abrirSeletor(): void {
    if (this.modoAtual() === 'template' && this.editor.isEditable) this.seletorAberto.set(true);
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

  protected removerCampo(): void {
    const ev = this.edicaoCampo();
    this.edicaoCampo.set(null);
    if (ev) this.editor.chain().focus().deleteRange({ from: ev.pos, to: ev.pos + 1 }).run();
  }

  protected fecharPopover(): void {
    this.edicaoCampo.set(null);
    this.editor.commands.focus();
  }

  /** Atalhos que mexem só na tela (zoom e camadas), não no documento. */
  protected atalhosTela(e: KeyboardEvent): void {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (!e.shiftKey && (e.key === '=' || e.key === '+')) this.alterarZoom(ZOOM.passo);
    else if (!e.shiftKey && e.key === '-') this.alterarZoom(-ZOOM.passo);
    else if (e.shiftKey && e.key.toLowerCase() === 'p' && this.modoAtual() === 'template') this.previa.update((v) => !v);
    else return;
    e.preventDefault();
  }

  private limparHistorico(): void {
    // Recria o estado com o mesmo doc e plugins: o histórico começa vazio.
    const { state, view } = this.editor;
    view.updateState(EditorState.create({ doc: state.doc, plugins: state.plugins, selection: state.selection }));
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
    this.estado.set({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      align,
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      fontFamily: (ts['fontFamily'] as string) ?? '',
      fontSize: ts['fontSize'] ? parseFloat(ts['fontSize']) : null,
      lineHeight: par['lineHeight'] ?? null,
      firstLineIndent: par['firstLineIndent'] !== 0,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    });
    this.atualizarAvisos(modo);
  }

  private atualizarAvisos(modo: ModoDocumento): void {
    const indice = this.indiceCampos();
    let desconhecidos = 0;
    if (modo === 'template') {
      this.editor.state.doc.descendants((n) => {
        if (n.type.name === 'field' && !indice.has(n.attrs['key'])) desconhecidos++;
      });
    }
    const marcacoesSobrando = modo === 'document'
      ? (this.editor.state.doc.textBetween(0, this.editor.state.doc.content.size, '\n', '\n').match(CHAVE_CAMPO_REGEX)?.length ?? 0)
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
