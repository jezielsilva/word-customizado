import type { Routes } from '@angular/router';

/**
 * Rotas do editor de peças. No host:
 * `{ path: 'pecas', loadChildren: () => import('editor-pecas').then(m => m.EDITOR_PECAS_ROUTES) }`
 */
export const EDITOR_PECAS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./paginas/biblioteca.component').then((m) => m.BibliotecaComponent), title: 'Modelos e peças' },
  {
    path: 'documentos/:id',
    loadComponent: () => import('./paginas/documento-editor.component').then((m) => m.DocumentoEditorComponent),
    title: 'Editor de peças',
  },
];
