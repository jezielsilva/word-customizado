import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Diálogo modal simples; o conteúdo e as ações vêm por projeção. */
@Component({
  selector: 'pe-dialogo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pe-modal-bg" (mousedown)="fechar.emit()"></div>
    <div class="pe-modal" role="dialog" aria-modal="true" [attr.aria-label]="titulo()" (keydown.escape)="fechar.emit()">
      <h2 class="pe-modal__title">{{ titulo() }}</h2>
      <div class="pe-modal__body"><ng-content /></div>
      <div class="pe-modal__actions"><ng-content select="[acoes]" /></div>
    </div>
  `,
})
export class DialogoComponent {
  readonly titulo = input.required<string>();
  readonly fechar = output<void>();
}
