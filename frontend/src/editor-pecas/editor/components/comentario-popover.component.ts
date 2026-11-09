import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import type { ComentarioAttrs } from '../models/editor.models';
import { posicaoAbaixo } from './posicao';

/** Comentário interno: não sai no documento final. */
@Component({
  selector: 'pe-comentario-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pe-overlay" (mousedown)="fechar.emit()"></div>
    <form class="pe-popover" [style.top.px]="posicao().top" [style.left.px]="posicao().left"
      (submit)="$event.preventDefault(); texto().trim() && salvar.emit(texto().trim())" (keydown.escape)="fechar.emit()">
      <strong class="pe-popover__title">Comentário interno</strong>
      @if (attrs().autor) { <small class="pe-muted">{{ attrs().autor }} · {{ data() }}</small> }
      <textarea class="pe-input pe-textarea" rows="4" [value]="texto()" placeholder="Nota para a equipe (não sai no PDF)"
        [readOnly]="somenteLeitura()" (input)="texto.set($any($event.target).value)"></textarea>
      <div class="pe-popover__actions">
        @if (attrs().id && !somenteLeitura()) { <button type="button" class="pe-btn pe-btn--danger" (click)="remover.emit()">Excluir</button> }
        <span class="pe-spacer"></span>
        <button type="button" class="pe-btn" (click)="fechar.emit()">{{ somenteLeitura() ? 'Fechar' : 'Cancelar' }}</button>
        @if (!somenteLeitura()) { <button type="submit" class="pe-btn pe-btn--primary" [disabled]="!texto().trim()">Salvar</button> }
      </div>
    </form>
  `,
})
export class ComentarioPopoverComponent {
  readonly attrs = input.required<ComentarioAttrs>();
  readonly rect = input.required<DOMRect>();
  readonly somenteLeitura = input(false);
  readonly salvar = output<string>();
  readonly remover = output<void>();
  readonly fechar = output<void>();

  protected readonly texto = linkedSignal(() => this.attrs().texto);
  protected readonly posicao = computed(() => posicaoAbaixo(this.rect(), 300, 240));
  protected readonly data = computed(() => {
    const d = new Date(this.attrs().criadoEm);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  });
}
