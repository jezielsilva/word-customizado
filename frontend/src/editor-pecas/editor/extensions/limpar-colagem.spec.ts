import { limparHtmlColado } from './limpar-colagem';

describe('limparHtmlColado', () => {
  it('remove fontes, cores e classes do Word e mantém alinhamento', () => {
    const html = '<p class="MsoNormal" style="text-align:center;font-family:Calibri;color:red"><span style="font-size:20pt">Olá</span></p>';
    expect(limparHtmlColado(html)).toBe('<p style="text-align:center"><span>Olá</span></p>');
  });

  it('converte negrito/itálico/sublinhado por estilo em marcas', () => {
    const r = limparHtmlColado('<span style="font-weight:700;font-style:italic">x</span>');
    expect(r).toContain('<strong>');
    expect(r).toContain('<em>');
  });
});
