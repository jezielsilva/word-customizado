import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import type { TipoBlocoLogico } from '../extensions/blocos-logicos';
import type { GrupoCampos } from '../models/editor.models';
import { posicaoAbaixo } from './posicao';

/** Define a condição ("Se …") ou a lista ("Repetir para cada …") de um bloco. */
@Component({
  selector: 'pe-bloco-logico-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pe-overlay" (mousedown)="fechar.emit()"></div>
    <form class="pe-popover" [style.top.px]="posicao().top" [style.left.px]="posicao().left"
      (submit)="$event.preventDefault(); valor().trim() && aplicar.emit(valor().trim())" (keydown.escape)="fechar.emit()">
      <strong class="pe-popover__title">{{ tipo() === 'conditional' ? 'Bloco condicional' : 'Repetir bloco' }}</strong>
      <label>{{ tipo() === 'conditional' ? 'Só entra se este campo tiver valor' : 'Repetir para cada item de' }}
        <select class="pe-input" [value]="valor()" (change)="valor.set($any($event.target).value)">
          <option value="" disabled>Escolha…</option>
          @if (valor() && !opcoes().includes(valor())) { <option [value]="valor()">{{ valor() }}</option> }
          @for (c of campos(); track c.chave) { <option [value]="c.chave">{{ c.rotulo }}</option> }
        </select>
      </label>
      @if (tipo() === 'conditional') {
        <label>Ou escreva a condição
          <input class="pe-input" [value]="valor()" placeholder="ex.: cliente.justicaGratuita" (input)="valor.set($any($event.target).value)" />
        </label>
      }
      <div class="pe-popover__actions">
        @if (podeRemover()) { <button type="button" class="pe-btn pe-btn--danger" (click)="remover.emit()">Desfazer bloco</button> }
        <span class="pe-spacer"></span>
        <button type="button" class="pe-btn" (click)="fechar.emit()">Cancelar</button>
        <button type="submit" class="pe-btn pe-btn--primary" [disabled]="!valor().trim()">Aplicar</button>
      </div>
    </form>
  `,
})
export class BlocoLogicoPopoverComponent {
  readonly tipo = input.required<TipoBlocoLogico>();
  readonly valorInicial = input('');
  readonly rect = input.required<DOMRect>();
  readonly grupos = input.required<GrupoCampos[]>();
  readonly podeRemover = input(true);
  readonly aplicar = output<string>();
  readonly remover = output<void>();
  readonly fechar = output<void>();

  protected readonly valor = linkedSignal(() => this.valorInicial());
  protected readonly campos = computed(() => {
    const todos = this.grupos().flatMap((g) => g.campos);
    return this.tipo() === 'repeat' ? todos.filter((c) => c.tipo === 'lista') : todos;
  });
  protected readonly opcoes = computed(() => this.campos().map((c) => c.chave));
  protected readonly posicao = computed(() => posicaoAbaixo(this.rect(), 300, 260));
}
