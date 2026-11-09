import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import type { JSONContent } from '@tiptap/core';
import { EditorComponent } from './editor/editor.component';
import type { CampoDefinicao, ModoDocumento } from './editor/models/editor.models';
import { CamposCatalogoService } from './core/services/campos-catalogo.service';
import { ConfiguracaoPaginaService } from './core/services/configuracao-pagina.service';
import { MODELO_ACAO_COBRANCA } from './core/mocks/dados-mock';

interface Exemplo {
  id: string;
  titulo: string;
  modo: ModoDocumento;
  conteudo: JSONContent | null;
}

/** Tela de demonstração do editor nos dois modos. */
@Component({
  selector: 'app-root',
  imports: [EditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly catalogo = inject(CamposCatalogoService);
  protected readonly pagina = inject(ConfiguracaoPaginaService).atual;

  protected readonly exemplos: Exemplo[] = [
    { id: 'modelo', titulo: 'Ação de Cobrança', modo: 'template', conteudo: MODELO_ACAO_COBRANCA },
    { id: 'documento', titulo: 'Documento em branco', modo: 'document', conteudo: null },
  ];
  protected readonly selecionado = signal(this.exemplos[0]);
  protected readonly modo = signal<ModoDocumento>('template');
  protected readonly somenteLeitura = signal(false);

  protected readonly editor = viewChild(EditorComponent);
  protected readonly ehModelo = computed(() => this.modo() === 'template');

  protected abrir(ex: Exemplo): void {
    this.selecionado.set(ex);
    this.modo.set(ex.modo);
  }

  protected inserir(c: CampoDefinicao): void {
    this.editor()?.insertField(c.chave, c.formatoPadrao);
  }

  protected arrastar(e: DragEvent, c: CampoDefinicao): void {
    e.dataTransfer?.setData('text/plain', `{{${c.chave}}}`);
  }
}
