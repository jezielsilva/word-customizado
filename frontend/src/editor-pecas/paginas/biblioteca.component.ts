import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconComponent } from '../editor/components/icon.component';
import type { ModoDocumento } from '../editor/models/editor.models';
import type { DocumentoResumo } from '../dados/api.models';
import { EditorPecasApi } from '../dados/editor-pecas-api';
import { AvisosComponent } from './avisos.component';
import { AvisosService } from './avisos.service';

/** Lista de modelos e documentos, com busca e criação. */
@Component({
  selector: 'pe-biblioteca',
  imports: [RouterLink, IconComponent, AvisosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pe-page-lib' },
  template: `
    <div class="pe-lib">
      <div class="pe-lib__head">
        <div class="pe-seg" role="tablist">
          <button type="button" role="tab" [class.on]="aba() === 'template'" [attr.aria-selected]="aba() === 'template'" (click)="trocarAba('template')">Modelos</button>
          <button type="button" role="tab" [class.on]="aba() === 'document'" [attr.aria-selected]="aba() === 'document'" (click)="trocarAba('document')">Documentos</button>
        </div>
        <label class="pe-lib__search">
          <pe-icon nome="search" [tamanho]="16" />
          <input #q type="search" [placeholder]="aba() === 'template' ? 'Buscar modelos…' : 'Buscar documentos…'" aria-label="Buscar"
            (input)="busca.set(q.value); carregar()" />
        </label>
        <span class="pe-flex"></span>
        <button type="button" class="pe-btn pe-btn--primary" [disabled]="criando()" (click)="novo()">
          <pe-icon nome="plus" [tamanho]="15" />{{ aba() === 'template' ? 'Novo modelo' : 'Novo documento' }}
        </button>
      </div>

      @if (carregando()) {
        <p class="pe-muted">Carregando…</p>
      } @else {
        <div class="pe-lib__grid">
          @for (d of itens(); track d.id) {
            <a class="pe-card" [routerLink]="['documentos', d.id]">
              <span class="pe-card__sheet"><span>{{ d.titulo }}</span></span>
              <span class="pe-card__info">
                <b>{{ d.titulo }}</b>
                <small>{{ d.categoria ?? (d.modo === 'template' ? 'Modelo' : 'Documento') }} · {{ data(d.atualizadoEm) }}</small>
                @if (d.permissao === 'ler') { <small class="pe-card__lock"><pe-icon nome="lock" [tamanho]="11" /> Somente leitura</small> }
              </span>
            </a>
          } @empty {
            <p class="pe-muted">Nada por aqui ainda.</p>
          }
        </div>
      }
    </div>
    <pe-avisos />
  `,
})
export class BibliotecaComponent {
  private readonly api = inject(EditorPecasApi);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly avisos = inject(AvisosService);

  protected readonly aba = signal<ModoDocumento>('template');
  protected readonly busca = signal('');
  protected readonly itens = signal<DocumentoResumo[]>([]);
  protected readonly carregando = signal(true);
  protected readonly criando = signal(false);
  private seq = 0;

  constructor() {
    this.carregar();
  }

  protected trocarAba(aba: ModoDocumento): void {
    this.aba.set(aba);
    this.carregar();
  }

  protected async carregar(): Promise<void> {
    const n = ++this.seq;
    try {
      const lista = await this.api.listarDocumentos({ modo: this.aba(), busca: this.busca() });
      if (n === this.seq) this.itens.set(lista);
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível carregar a lista.');
    } finally {
      if (n === this.seq) this.carregando.set(false);
    }
  }

  protected async novo(): Promise<void> {
    this.criando.set(true);
    try {
      const modo = this.aba();
      const d = await this.api.criarDocumento({ titulo: modo === 'template' ? 'Novo modelo' : 'Novo documento', modo });
      await this.router.navigate(['documentos', d.id], { relativeTo: this.rota });
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.criando.set(false);
    }
  }

  protected data(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
