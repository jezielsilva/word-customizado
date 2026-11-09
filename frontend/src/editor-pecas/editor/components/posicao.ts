/** Posição fixa de um popover abaixo de um elemento, sem sair da tela. */
export function posicaoAbaixo(rect: DOMRect, largura: number, altura: number): { top: number; left: number } {
  const top = rect.bottom + 6 + altura > window.innerHeight ? Math.max(8, rect.top - altura - 6) : rect.bottom + 6;
  return { top, left: Math.max(8, Math.min(rect.left, window.innerWidth - largura - 8)) };
}
