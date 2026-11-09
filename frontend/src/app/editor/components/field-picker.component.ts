import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild, afterNextRender } from '@angular/core';
import type { CampoDefinicao, GrupoCampos } from '../models/editor.models';

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Seletor de campos com busca (Ctrl+Shift+F, "{{" ou botão "Inserir campo"). */
@Component({
  selector: 'pe-field-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pe-overlay" (mousedown)="fechar.emit()"></div>
    <div class="pe-picker" role="dialog" aria-label="Inserir campo" (keydown)="teclado($event)">
      <input #busca class="pe-input" type="search" placeholder="Buscar campo por nome…" [value]="termo()"
        (input)="termo.set(busca.value); ativo.set(0)" aria-label="Buscar campo" />
      <div class="pe-picker__list" role="listbox">
        @for (g of filtrados(); track g.nome) {
          <div class="pe-picker__group">{{ g.nome }}</div>
          @for (c of g.campos; track c.chave) {
            <button type="button" role="option" class="pe-picker__item" [class.is-active]="indice(c) === ativo()"
              [attr.aria-selected]="indice(c) === ativo()" (mouseenter)="ativo.set(indice(c))" (click)="selecionar.emit(c)">
              <b>{{ c.rotulo }}</b><small>{{ '{{' + c.chave + '}}' }}</small>
            </button>
          }
        } @empty {
          <div class="pe-picker__empty">Nenhum campo encontrado.</div>
        }
      </div>
    </div>
  `,
})
export class FieldPickerComponent {
  readonly grupos = input.required<GrupoCampos[]>();
  readonly selecionar = output<CampoDefinicao>();
  readonly fechar = output<void>();

  protected readonly termo = signal('');
  protected readonly ativo = signal(0);
  private readonly busca = viewChild.required<ElementRef<HTMLInputElement>>('busca');

  protected readonly filtrados = computed(() => {
    const t = normalizar(this.termo().trim());
    return this.grupos()
      .map((g) => ({ ...g, campos: g.campos.filter((c) => !t || normalizar(`${c.rotulo} ${c.chave} ${g.nome}`).includes(t)) }))
      .filter((g) => g.campos.length);
  });
  private readonly planos = computed(() => this.filtrados().flatMap((g) => g.campos));

  constructor() {
    afterNextRender(() => this.busca().nativeElement.focus());
  }

  protected indice(c: CampoDefinicao): number {
    return this.planos().indexOf(c);
  }

  protected teclado(e: KeyboardEvent): void {
    const n = this.planos().length;
    if (e.key === 'Escape') this.fechar.emit();
    else if (e.key === 'ArrowDown' && n) this.ativo.update((i) => (i + 1) % n);
    else if (e.key === 'ArrowUp' && n) this.ativo.update((i) => (i - 1 + n) % n);
    else if (e.key === 'Enter' && n) this.selecionar.emit(this.planos()[this.ativo()]);
    else return;
    e.preventDefault();
  }
}
