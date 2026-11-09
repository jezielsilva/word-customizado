import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { provideEditorPecas, EDITOR_PECAS_ROUTES } from '../editor-pecas/public-api';

/** App de demonstração: hospeda o editor como o webproadv fará. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(
      [
        { path: '', pathMatch: 'full', redirectTo: 'pecas' },
        { path: 'pecas', children: EDITOR_PECAS_ROUTES },
        { path: '**', redirectTo: 'pecas' },
      ],
      withHashLocation(),
      withComponentInputBinding(),
    ),
    provideEditorPecas({ usarMock: true, usuario: () => 'Jeziel Silva' }),
  ],
};
