import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { inject } from '@angular/core';

const ICONES: Record<string, string> = {
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italic: '<path d="M10 5h8M6 19h8M14 5l-4 14"/>',
  underline: '<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>',
  left: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  center: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
  right: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  justify: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  olist: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4h1v4M4 8h2M4 12.5a1 1 0 0 1 2 0c0 1-2 1.5-2 3h2M4 17h2v4H4M4 19h2"/>',
  indent: '<path d="M4 6h16M10 10h10M4 14h16M4 18h16"/><path d="M4 9l3 2-3 2z"/>',
  pagebreak: '<path d="M6 3v5h12V3M6 21v-5h12v5"/><path d="M3 12h3M9 12h2M13 12h2M18 12h3"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  fontup: '<path d="M3 19l5-13 5 13M5 14h6"/><path d="M17 10V4M14 7l3-3 3 3"/>',
  fontdown: '<path d="M3 19l5-13 5 13M5 14h6"/><path d="M17 4v6M14 7l3 3 3-3"/>',
};

@Component({
  selector: 'pe-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pe-icon', 'aria-hidden': 'true' },
  template: `<svg [attr.width]="tamanho()" [attr.height]="tamanho()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [innerHTML]="svg()"></svg>`,
})
export class IconComponent {
  readonly nome = input.required<string>();
  readonly tamanho = input(16);
  private readonly sanitizer = inject(DomSanitizer);
  // Conteúdo estático e controlado (constante acima).
  protected readonly svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(ICONES[this.nome()] ?? ''));
}
