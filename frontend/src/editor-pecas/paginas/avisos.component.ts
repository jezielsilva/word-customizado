import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvisosService } from './avisos.service';

@Component({
  selector: 'pe-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pe-toasts" aria-live="polite">
      @for (a of avisos.lista(); track a.id) { <div class="pe-toast" [class.is-error]="a.tipo === 'erro'">{{ a.texto }}</div> }
    </div>
  `,
})
export class AvisosComponent {
  protected readonly avisos = inject(AvisosService);
}
