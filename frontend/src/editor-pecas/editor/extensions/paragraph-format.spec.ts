import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ParagraphFormat } from './paragraph-format';

describe('ParagraphFormat', () => {
  let editor: Editor;
  beforeEach(() => (editor = new Editor({ extensions: [StarterKit, ParagraphFormat], content: '<p>texto</p>' })));
  afterEach(() => editor.destroy());

  it('define recuo e entrelinha no parágrafo', () => {
    editor.chain().setTextSelection(2).setFirstLineIndent(0).setParagraphLineHeight(2).run();
    expect(editor.getAttributes('paragraph')).toMatchObject({ firstLineIndent: 0, lineHeight: 2 });
    expect(editor.getHTML()).toMatch(/text-indent:\s*0mm/);
  });

  it('lê os atributos do HTML', () => {
    editor.commands.setContent('<p style="text-indent:25mm;line-height:1.5">a</p>');
    expect(editor.getJSON().content?.[0].attrs).toMatchObject({ firstLineIndent: 25, lineHeight: 1.5 });
  });
});
