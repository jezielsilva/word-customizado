import { Injectable } from '@angular/core';
import type { JSONContent } from '@tiptap/core';

export interface Rascunho {
  id: string;
  titulo: string;
  conteudo: JSONContent;
  revisaoBase: number;
  salvoEm: string;
}

const BANCO = 'editor-pecas';
const LOJA = 'rascunhos';

/** Rascunho local em IndexedDB: não perder nada se o navegador fechar ou a rede cair. */
@Injectable({ providedIn: 'root' })
export class RascunhoLocalService {
  private banco: Promise<IDBDatabase | null> | null = null;

  private abrir(): Promise<IDBDatabase | null> {
    this.banco ??= new Promise((resolve) => {
      try {
        const req = indexedDB.open(BANCO, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(LOJA, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.banco;
  }

  private async executar<T>(modo: IDBTransactionMode, fn: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
    const db = await this.abrir();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const req = fn(db.transaction(LOJA, modo).objectStore(LOJA));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async obter(id: string): Promise<Rascunho | null> {
    return (await this.executar<Rascunho>('readonly', (l) => l.get(id))) ?? null;
  }

  async salvar(r: Rascunho): Promise<void> {
    await this.executar('readwrite', (l) => l.put(r));
  }

  async remover(id: string): Promise<void> {
    await this.executar('readwrite', (l) => l.delete(id));
  }
}
