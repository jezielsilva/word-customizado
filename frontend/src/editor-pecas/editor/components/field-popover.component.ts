import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { posicaoAbaixo } from './posicao';
import type { FieldAttrs, FormatoCampo, GrupoCampos } from '../models/editor.models';

/** Popover do chip: chave, formato e texto padrão. */
@Component({
  selector: 'pe-field-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pe-overlay" (mousedown)="fechar.emit()"></div>
    <form class="pe-popover" [style.top.px]="posicao().top" [style.left.px]="posicao().left"
      (submit)="$event.preventDefault(); aplicar.emit(rascunho())" (keydown.escape)="fechar.emit()">
      <label>Campo
        <select class="pe-input" [value]="rascunho().key" (change)="alterar('key', $any($event.target).value)">
          @if (!conhecido()) { <option [value]="rascunho().key">{{ rascunho().key }} (fora do catálogo)</option> }
          @for (g of grupos(); track g.nome) {
            <optgroup [label]="g.nome">
              @for (c of g.campos; track c.chave) { <option [value]="c.chave">{{ c.rotulo }}</option> }
            </optgroup>
          }
        </select>
      </label>
      <label>Formato
        <select class="pe-input" [value]="rascunho().format ?? ''" (change)="alterar('format', $any($event.target).value || null)">
          <option value="">Sem formatação</option>
          @for (f of formatos(); track f.valor) { <option [value]="f.valor">{{ f.rotulo }}</option> }
        </select>
      </label>
      <label>Texto se vier vazio
        <input class="pe-input" [value]="rascunho().fallback" placeholder="Vazio = bloqueia a geração"
          (input)="alterar('fallback', $any($event.target).value)" />
      </label>
      <div class="pe-popover__actions">
        <button type="button" class="pe-btn pe-btn--danger" (click)="remover.emit()">Remover</button>
        <span class="pe-spacer"></span>
        <button type="button" class="pe-btn" (click)="fechar.emit()">Cancelar</button>
        <button type="submit" class="pe-btn pe-btn--primary">Aplicar</button>
      </div>
    </form>
  `,
})
export class FieldPopoverComponent {
  readonly attrs = input.required<FieldAttrs>();
  readonly rect = input.required<DOMRect>();
  readonly grupos = input.required<GrupoCampos[]>();
  readonly formatos = input.required<FormatoCampo[]>();
  readonly aplicar = output<FieldAttrs>();
  readonly remover = output<void>();
  readonly fechar = output<void>();

  protected readonly rascunho = linkedSignal(() => ({ ...this.attrs() }));
  protected readonly conhecido = computed(() =>
    this.grupos().some((g) => g.campos.some((c) => c.chave === this.rascunho().key)),
  );
  protected readonly posicao = computed(() => posicaoAbaixo(this.rect(), 300, 290));

  protected alterar<K extends keyof FieldAttrs>(k: K, v: FieldAttrs[K]): void {
    this.rascunho.update((a) => ({ ...a, [k]: v }));
  }
}
