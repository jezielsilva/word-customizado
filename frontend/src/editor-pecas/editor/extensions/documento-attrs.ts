import { Extension } from '@tiptap/core';
import { SCHEMA_VERSION } from '../models/editor.models';

/** Atributos do nó raiz: modo (template | document) e versão do esquema. */
export const DocumentoAttrs = Extension.create({
  name: 'documentoAttrs',
  addGlobalAttributes() {
    return [
      {
        types: ['doc'],
        attributes: {
          mode: { default: 'document', rendered: false },
          schemaVersion: { default: SCHEMA_VERSION, rendered: false },
        },
      },
    ];
  },
});
