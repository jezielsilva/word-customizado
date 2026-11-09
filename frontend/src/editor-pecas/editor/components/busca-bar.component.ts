import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, input, output, signal, viewChild } from '@angular/core';
import type { EstadoBusca, OpcoesBusca } from '../extensions/busca';
import { IconComponent } from './icon.component';

/** Barra flutuante de localizar e substituir (Ctrl+F / Ctrl+H). */
@Component({
  selector: 'pe-busca-bar',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pe-search" role="search" (keydown.escape)="fechar.emit()">
      <div class="pe-search__row">
        <input #campo class="pe-input" placeholder="Localizar" aria-label="Localizar" [value]="estado().termo"
          (input)="buscar.emit({ termo: campo.value })"
          (keydown.enter)="$event.preventDefault(); navegar.emit($any($event).shiftKey ? -1 : 1)" />
        <span class="pe-search__count">{{ estado().resultados.length ? (estado().atual + 1) + ' de ' + estado().resultados.length : (estado().termo ? 'Nada' : '') }}</span>
        <button type="button" class="pe-tb pe-tb--sm" title="Anterior (Shift+Enter)" aria-label="Anterior" (click)="navegar.emit(-1)"><pe-icon nome="up" [tamanho]="14" /></button>
        <button type="button" class="pe-tb pe-tb--sm" title="Próximo (Enter)" aria-label="Próximo" (click)="navegar.emit(1)"><pe-icon nome="down" [tamanho]="14" /></button>
        <button type="button" class="pe-tb pe-tb--sm pe-search__opt" title="Diferenciar maiúsculas" [class.is-on]="estado().opcoes.diferenciarMaiusculas"
          (click)="buscar.emit({ termo: estado().termo, opcoes: { diferenciarMaiusculas: !estado().opcoes.diferenciarMaiusculas } })">Aa</button>
        <button type="button" class="pe-tb pe-tb--sm pe-search__opt" title="Diferenciar acentos" [class.is-on]="estado().opcoes.diferenciarAcentos"
          (click)="buscar.emit({ termo: estado().termo, opcoes: { diferenciarAcentos: !estado().opcoes.diferenciarAcentos } })">á</button>
        @if (podeSubstituir()) {
          <button type="button" class="pe-tb pe-tb--sm" title="Substituir (Ctrl+H)" aria-label="Mostrar substituir" [class.is-on]="substituindo()" (click)="substituindo.update(v => !v)"><pe-icon nome="replace" [tamanho]="14" /></button>
        }
        <button type="button" class="pe-tb pe-tb--sm" title="Fechar (Esc)" aria-label="Fechar busca" (click)="fechar.emit()"><pe-icon nome="close" [tamanho]="14" /></button>
      </div>
      @if (substituindo() && podeSubstituir()) {
        <div class="pe-search__row">
          <input #troca class="pe-input" placeholder="Substituir por (ou {{ '{{campo}}' }})" aria-label="Substituir por" />
          <button type="button" class="pe-btn pe-btn--sm" [disabled]="!estado().resultados.length" (click)="substituir.emit({ texto: troca.value, todos: false })">Substituir</button>
          <button type="button" class="pe-btn pe-btn--sm" [disabled]="!estado().resultados.length" (click)="substituir.emit({ texto: troca.value, todos: true })">Tudo</button>
        </div>
      }
    </div>
  `,
})
export class BuscaBarComponent {
  readonly estado = input.required<EstadoBusca>();
  readonly podeSubstituir = input(true);
  readonly comSubstituir = input(false);
  readonly buscar = output<{ termo: string; opcoes?: Partial<OpcoesBusca> }>();
  readonly navegar = output<1 | -1>();
  readonly substituir = output<{ texto: string; todos: boolean }>();
  readonly fechar = output<void>();

  protected readonly substituindo = signal(false);
  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');

  constructor() {
    afterNextRender(() => {
      this.substituindo.set(this.comSubstituir());
      this.focar();
    });
  }

  focar(substituir = false): void {
    if (substituir) this.substituindo.set(true);
    const el = this.campo().nativeElement;
    el.focus();
    el.select();
  }
}
