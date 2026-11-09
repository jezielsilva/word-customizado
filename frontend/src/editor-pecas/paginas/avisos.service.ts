import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  texto: string;
  tipo: 'info' | 'erro';
}

/** Mensagens rápidas (snackbar) das telas do editor. */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  readonly lista = signal<Aviso[]>([]);
  private seq = 0;

  mostrar(texto: string, tipo: Aviso['tipo'] = 'info'): void {
    const id = ++this.seq;
    this.lista.update((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => this.lista.update((l) => l.filter((a) => a.id !== id)), 4000);
  }

  erro(e: unknown, padrao = 'Não foi possível concluir a operação.'): void {
    this.mostrar(e instanceof Error && e.message ? e.message : padrao, 'erro');
  }
}
