import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import type { FormasVariacao, GrupoCampos, VariantAttrs } from '../models/editor.models';
import { posicaoAbaixo } from './posicao';

/** Edita um nó de plural e gênero: lista de referência e as quatro formas. */
@Component({
  selector: 'pe-variant-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pe-overlay" (mousedown)="fechar.emit()"></div>
    <form class="pe-popover pe-popover--wide" [style.top.px]="posicao().top" [style.left.px]="posicao().left"
      (submit)="$event.preventDefault(); valido() && aplicar.emit(rascunho())" (keydown.escape)="fechar.emit()">
      <strong class="pe-popover__title">Plural e gênero automáticos</strong>
      <label>Concordar com a lista
        <select class="pe-input" [value]="rascunho().key" (change)="rascunho.update(r => ({ ...r, key: $any($event.target).value }))">
          <option value="" disabled>Escolha…</option>
          @for (c of listas(); track c.chave) { <option [value]="c.chave">{{ c.rotulo }}</option> }
        </select>
      </label>
      <div class="pe-popover__grid">
        @for (f of formas; track f.k) {
          <label>{{ f.rotulo }}
            <input class="pe-input" [value]="rascunho().formas[f.k]" [placeholder]="f.exemplo" (input)="forma(f.k, $any($event.target).value)" />
          </label>
        }
      </div>
      <small class="pe-muted">O servidor escolhe a forma pela quantidade e gênero da lista ao gerar a peça.</small>
      <div class="pe-popover__actions">
        @if (podeRemover()) { <button type="button" class="pe-btn pe-btn--danger" (click)="remover.emit()">Remover</button> }
        <span class="pe-spacer"></span>
        <button type="button" class="pe-btn" (click)="fechar.emit()">Cancelar</button>
        <button type="submit" class="pe-btn pe-btn--primary" [disabled]="!valido()">Aplicar</button>
      </div>
    </form>
  `,
})
export class VariantPopoverComponent {
  readonly attrs = input.required<VariantAttrs>();
  readonly rect = input.required<DOMRect>();
  readonly grupos = input.required<GrupoCampos[]>();
  readonly podeRemover = input(true);
  readonly aplicar = output<VariantAttrs>();
  readonly remover = output<void>();
  readonly fechar = output<void>();

  protected readonly formas: { k: keyof FormasVariacao; rotulo: string; exemplo: string }[] = [
    { k: 'ms', rotulo: 'Singular masculino', exemplo: 'o autor' },
    { k: 'fs', rotulo: 'Singular feminino', exemplo: 'a autora' },
    { k: 'mp', rotulo: 'Plural masculino', exemplo: 'os autores' },
    { k: 'fp', rotulo: 'Plural feminino', exemplo: 'as autoras' },
  ];
  protected readonly rascunho = linkedSignal(() => structuredClone(this.attrs()));
  protected readonly listas = computed(() => this.grupos().flatMap((g) => g.campos).filter((c) => c.tipo === 'lista'));
  protected readonly valido = computed(() => !!this.rascunho().key && Object.values(this.rascunho().formas).every((v) => v.trim()));
  protected readonly posicao = computed(() => posicaoAbaixo(this.rect(), 420, 340));

  protected forma(k: keyof FormasVariacao, v: string): void {
    this.rascunho.update((r) => ({ ...r, formas: { ...r.formas, [k]: v } }));
  }
}
