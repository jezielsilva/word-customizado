# editor-pecas

Editor de peças jurídicas (Angular + Tiptap 3) com folha A4 paginada, papel timbrado, campos,
modos Modelo/Documento, salvamento automático, versões, blocos e localizar/substituir.

A pasta é **autocontida**: copie `src/editor-pecas/` para o webproadv e importe só de `public-api.ts`.

## Requisitos do host

- Angular **19+** (usa `linkedSignal`, `input()`/`output()` e controle de fluxo `@if`).
- Dependências (mesmas versões de `frontend/package.json`):

```bash
npm i @tiptap/core@^3.16 @tiptap/pm@^3.16 @tiptap/starter-kit@^3.16 @tiptap/extension-text-align@^3.16 @tiptap/extension-text-style@^3.16 @tiptap/extension-table@^3.16 @tiptap/extensions@^3.16
```

## Integração (3 passos)

1. **Providers** (`app.config.ts`):

```ts
provideHttpClient(withInterceptors([authInterceptor])), // os interceptors do webproadv valem para o editor
provideEditorPecas({
  apiBaseUrl: environment.apiUrl,       // ex.: 'https://api.webproadv.com.br/api'
  usarMock: false,                      // true = API simulada em localStorage
  usuario: () => auth.usuarioAtual().nome,
}),
```

2. **Rotas** (em qualquer ponto da árvore do webproadv):

```ts
{ path: 'pecas', loadChildren: () => import('./editor-pecas/public-api').then(m => m.EDITOR_PECAS_ROUTES) }
```

`/pecas` mostra a biblioteca e `/pecas/documentos/:id` abre o editor. Os links internos são relativos,
então o prefixo pode ser qualquer um.

3. **Estilos** (`styles.scss` global; o DOM do ProseMirror não é do Angular, por isso são globais):

```scss
@use 'editor-pecas/styles';
```

Todas as classes usam o prefixo `pe-`. As cores ficam em variáveis `--pe-*` sobre `.pe-editor`,
`.pe-page-lib` e `.pe-page-doc`; sobrescreva-as para usar o tema do webproadv.

### Usar só o editor, sem as telas prontas

```html
<pe-editor [conteudo]="json" [pagina]="config" [campos]="grupos" [formatos]="formatos"
  [readonly]="!podeEditar" [usuario]="nome" (conteudoChange)="salvar($event)" />
```

API do componente: `insertField(chave, formato)`, `insertBlock(json)`, `loadVersion(json)`, `getJSON()`,
`getSelectionJSON()`, `converterEmModelo()` e `focar()`.

## Contrato com o back-end

`EditorPecasApi` (abstrata) tem `HttpEditorPecasApi` (real) e `MockEditorPecasApi` (simulada).
Endpoints esperados (todos JSON):

| Método e rota | Corpo / resposta |
|---|---|
| `GET /documentos?modo=&busca=` | `DocumentoResumo[]` |
| `POST /documentos` | `NovoDocumento` → `Documento` |
| `GET /documentos/{id}` | `Documento` (com `conteudo`, `revisao`, `permissao`) |
| `PUT /documentos/{id}` | `SalvarDocumento` → `DocumentoSalvo`; **409** `{ revisao }` se divergir |
| `DELETE /documentos/{id}` | — |
| `GET /documentos/{id}/versoes` | `DocumentoVersao[]` (mais recente primeiro) |
| `GET /documentos/{id}/versoes/{n}` | `DocumentoVersaoCompleta` |
| `POST /documentos/{id}/versoes` | `{ nome }` → `DocumentoVersao` |
| `POST /documentos/{id}/versoes/{n}/restaurar` | → `Documento` (cria nova versão) |
| `GET /campos` | `{ grupos: GrupoCampos[], formatos: FormatoCampo[] }` |
| `GET /configuracoes-pagina/{id}` | `ConfiguracaoPagina` |
| `GET /blocos` · `POST /blocos` | `Bloco[]` · `Omit<Bloco,'id'>` → `Bloco` |
| `GET /documentos/{id}/exportar?formato=docx\|pdf` | arquivo (blob) |

Os tipos estão em `dados/api.models.ts` e `editor/models/editor.models.ts`.
`SalvarDocumento.primeiraDaSessao = true` indica que o servidor deve criar a versão "sessão".

## Nós do documento (JSON ProseMirror)

| Nó / marca | Atributos | Observação |
|---|---|---|
| `doc` | `mode` (`template`/`document`), `schemaVersion` | |
| `field` | `key`, `format`, `fallback` | inline atômico (chip) |
| `variant` | `key`, `formas: { ms, fs, mp, fp }` | plural/gênero, resolvido na mesclagem |
| `conditional` | `condicao` | bloco; entra só se a condição tiver valor |
| `repeat` | `lista` | bloco; repete para cada item |
| `paragraph` / `heading` | `textAlign`, `firstLineIndent` (mm), `lineHeight` | `heading` 1 = título, 2 = tópico (I, II…), 3 = subtítulo |
| `blockquote` | — | citação ABNT |
| `table`, `tableRow`, `tableCell`, `tableHeader` | `colspan`, `rowspan` | |
| `pageBreak` | — | quebra manual |
| `comentario` (marca) | `id`, `texto`, `autor`, `criadoEm` | **nunca** sai no DOCX/PDF |
| `textStyle` (marca) | `fontFamily`, `fontSize` (pt) | |
