/** Estilos de bloco que sobrevivem à colagem; o resto (fontes, cores, tamanhos do Word/web) sai. */
const ESTILOS_MANTIDOS = new Set(['text-align']);

/**
 * Limpa HTML colado: mantém só negrito, itálico, sublinhado, alinhamento, listas e tabelas
 * (o esquema já descarta nós desconhecidos; aqui saem os estilos inline).
 */
export function limparHtmlColado(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, meta, link, script, title, xml, o\\:p').forEach((el) => el.remove());
  doc.body.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const css = (el.getAttribute('style') ?? '').toLowerCase().replace(/\s+/g, '');
    const envolver = (tag: string) => {
      const w = doc.createElement(tag);
      while (el.firstChild) w.appendChild(el.firstChild);
      el.appendChild(w);
    };
    if (/font-weight:(bold|[6-9]00)/.test(css)) envolver('strong');
    if (/font-style:italic/.test(css)) envolver('em');
    if (/text-decoration[^;]*underline/.test(css)) envolver('u');
    const estilos = (el.getAttribute('style') ?? '')
      .split(';')
      .map((d) => d.trim())
      .filter((d) => ESTILOS_MANTIDOS.has(d.split(':')[0]?.trim().toLowerCase()));
    if (estilos.length) el.setAttribute('style', estilos.join(';'));
    else el.removeAttribute('style');
    el.removeAttribute('class');
    el.removeAttribute('face');
    el.removeAttribute('color');
    el.removeAttribute('size');
  });
  return doc.body.innerHTML;
}
