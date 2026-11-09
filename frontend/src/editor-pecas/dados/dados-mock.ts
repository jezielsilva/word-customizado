import type { JSONContent } from '@tiptap/core';
import type { FormatoCampo, GrupoCampos } from '../editor/models/editor.models';
import type { DadosEscritorio } from './configuracao-padrao';

// Dados iniciais da API simulada (MockEditorPecasApi). No servidor real, vêm do banco.

export const ESCRITORIO_MOCK: DadosEscritorio = {
  id: '1',
  nome: 'Jeziel Silva Advocacia',
  iniciais: 'JS',
  oab: 'OAB/AP 999.999',
  endereco: 'Rua Exemplo, 100 · Macapá/AP',
  telefone: '(96) 99999-0000',
  email: 'contato@jezielsilva.adv.br',
  site: 'www.jezielsilva.adv.br',
  corMarca: '#6B3FA0',
};

export const CAMPOS_MOCK: GrupoCampos[] = [
  {
    nome: 'Processo',
    campos: [
      { chave: 'processo.numero', rotulo: 'Número do processo', grupo: 'Processo', tipo: 'texto', formatoPadrao: 'cnj', obrigatorio: true, exemplo: '1000002-92.2025.8.19.8411' },
      { chave: 'processo.tribunal', rotulo: 'Tribunal', grupo: 'Processo', tipo: 'texto', formatoPadrao: null, obrigatorio: false, exemplo: 'Tribunal de Justiça do Estado do Rio de Janeiro' },
      { chave: 'processo.vara', rotulo: 'Vara', grupo: 'Processo', tipo: 'texto', formatoPadrao: 'maiusculas', obrigatorio: true, exemplo: '3ª VARA CÍVEL' },
      { chave: 'processo.comarca', rotulo: 'Comarca', grupo: 'Processo', tipo: 'texto', formatoPadrao: null, obrigatorio: true, exemplo: 'Rio de Janeiro' },
      { chave: 'processo.uf', rotulo: 'UF', grupo: 'Processo', tipo: 'texto', formatoPadrao: null, obrigatorio: true, exemplo: 'RJ' },
    ],
  },
  {
    nome: 'Partes',
    campos: [
      { chave: 'autores', rotulo: 'Autor(es)', grupo: 'Partes', tipo: 'lista', formatoPadrao: 'lista', obrigatorio: true, exemplo: 'João Silva e Maria Silva' },
      { chave: 'reus', rotulo: 'Réu(s)', grupo: 'Partes', tipo: 'lista', formatoPadrao: 'lista', obrigatorio: true, exemplo: 'Banco Horizonte S.A.' },
    ],
  },
  {
    nome: 'Cliente',
    campos: [
      { chave: 'cliente.nome', rotulo: 'Nome', grupo: 'Cliente', tipo: 'texto', formatoPadrao: null, obrigatorio: true, exemplo: 'João Silva' },
      { chave: 'cliente.cpf', rotulo: 'CPF', grupo: 'Cliente', tipo: 'texto', formatoPadrao: 'cpf', obrigatorio: true, exemplo: '123.456.789-09' },
      { chave: 'cliente.estadoCivil', rotulo: 'Estado civil', grupo: 'Cliente', tipo: 'texto', formatoPadrao: null, obrigatorio: false, exemplo: 'casado' },
      { chave: 'cliente.profissao', rotulo: 'Profissão', grupo: 'Cliente', tipo: 'texto', formatoPadrao: null, obrigatorio: false, exemplo: 'engenheiro' },
      { chave: 'cliente.justicaGratuita', rotulo: 'Pede justiça gratuita', grupo: 'Cliente', tipo: 'booleano', formatoPadrao: null, obrigatorio: false, exemplo: 'sim' },
      { chave: 'cliente.endereco', rotulo: 'Endereço', grupo: 'Cliente', tipo: 'texto', formatoPadrao: null, obrigatorio: true, exemplo: 'Rua das Laranjeiras, 120, Rio de Janeiro/RJ' },
    ],
  },
  {
    nome: 'Valores e datas',
    campos: [
      { chave: 'valor', rotulo: 'Valor da causa', grupo: 'Valores e datas', tipo: 'moeda', formatoPadrao: 'moeda', obrigatorio: true, exemplo: 'R$ 1.500,00' },
      { chave: 'data', rotulo: 'Data da peça', grupo: 'Valores e datas', tipo: 'data', formatoPadrao: 'data_extenso', obrigatorio: true, exemplo: '4 de novembro de 2026' },
    ],
  },
  {
    nome: 'Escritório',
    campos: [
      { chave: 'adv.nome', rotulo: 'Advogado(a)', grupo: 'Escritório', tipo: 'texto', formatoPadrao: null, obrigatorio: true, exemplo: 'Jeziel Silva' },
      { chave: 'adv.oab', rotulo: 'OAB', grupo: 'Escritório', tipo: 'texto', formatoPadrao: null, obrigatorio: true, exemplo: 'OAB/AP 999.999' },
    ],
  },
];

export const FORMATOS_MOCK: FormatoCampo[] = [
  { valor: 'cnj', rotulo: 'Número CNJ' },
  { valor: 'cpf', rotulo: 'CPF' },
  { valor: 'cnpj', rotulo: 'CNPJ' },
  { valor: 'moeda', rotulo: 'Moeda (R$ 1.500,50)' },
  { valor: 'moeda_extenso', rotulo: 'Moeda por extenso' },
  { valor: 'data', rotulo: 'Data (09/11/2026)' },
  { valor: 'data_extenso', rotulo: 'Data por extenso' },
  { valor: 'lista', rotulo: 'Lista (A, B e C)' },
  { valor: 'maiusculas', rotulo: 'MAIÚSCULAS' },
];

const f = (key: string, format: string | null = null, marks?: JSONContent['marks']): JSONContent => ({
  type: 'field',
  attrs: { key, format, fallback: '' },
  ...(marks ? { marks } : {}),
});
const t = (text: string, marks?: JSONContent['marks']): JSONContent => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const p = (content: JSONContent[], attrs: Record<string, unknown> = {}): JSONContent => ({ type: 'paragraph', attrs, content });
const negrito = [{ type: 'bold' }];
const centro = { textAlign: 'center', firstLineIndent: 0 };
const semRecuo = { firstLineIndent: 0 };

export const MODELO_ACAO_COBRANCA: JSONContent = {
  type: 'doc',
  attrs: { mode: 'template', schemaVersion: 1 },
  content: [
    p([t('EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA '), f('processo.vara', 'maiusculas'), t(' DA COMARCA DE '), f('processo.comarca', 'maiusculas'), t('/'), f('processo.uf')], semRecuo),
    p([], semRecuo),
    p([t('Processo nº '), f('processo.numero', 'cnj')], semRecuo),
    p([], semRecuo),
    p([f('cliente.nome', null, negrito), t(', brasileiro, '), f('cliente.estadoCivil'), t(', '), f('cliente.profissao'), t(', inscrito no CPF sob o nº '), f('cliente.cpf', 'cpf'), t(', residente e domiciliado na '), f('cliente.endereco'), t(', por seu advogado infra-assinado, vem, respeitosamente, à presença de Vossa Excelência, propor a presente')]),
    { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [t('Ação de Cobrança')] },
    p([t('em face de '), f('reus', 'lista'), t(', pelos fatos e fundamentos a seguir expostos.')]),
    p([t('I — DOS FATOS. ', negrito), t('O autor mantém relação jurídica com o réu, conforme documentos anexos, restando inadimplido o montante de '), f('valor', 'moeda'), t(' ('), f('valor', 'moeda_extenso'), t(').')]),
    p([t('II — DOS PEDIDOS. ', negrito), t('Ante o exposto, requer a citação do réu e a procedência do pedido, condenando-o ao pagamento da quantia indicada, acrescida de correção monetária e juros legais.')]),
    p([t('Dá-se à causa o valor de '), f('valor', 'moeda'), t('.')]),
    p([t('Nestes termos, pede deferimento.')]),
    p([], centro),
    p([f('processo.comarca'), t(', '), f('data', 'data_extenso'), t('.')], centro),
    p([], centro),
    p([t('______________________________________')], centro),
    p([f('adv.nome')], centro),
    p([f('adv.oab')], centro),
  ],
};

export const MODELO_PROCURACAO: JSONContent = {
  type: 'doc',
  attrs: { mode: 'template', schemaVersion: 1 },
  content: [
    { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [t('Procuração Ad Judicia et Extra')] },
    p([t('OUTORGANTE: ', negrito), f('cliente.nome', null, negrito), t(', '), f('cliente.estadoCivil'), t(', '), f('cliente.profissao'), t(', inscrito no CPF sob o nº '), f('cliente.cpf', 'cpf'), t(', residente e domiciliado na '), f('cliente.endereco'), t('.')]),
    p([t('OUTORGADO: ', negrito), f('adv.nome', null, negrito), t(', advogado inscrito na '), f('adv.oab'), t('.')]),
    p([t('PODERES: ', negrito), t('os da cláusula ad judicia et extra, para o foro em geral, podendo propor ações, contestar, recorrer, transigir, desistir, receber e dar quitação, substabelecer com ou sem reservas e praticar todos os atos necessários ao fiel cumprimento deste mandato.')]),
    p([], centro),
    p([f('processo.comarca'), t(', '), f('data', 'data_extenso'), t('.')], centro),
    p([], centro),
    p([t('______________________________________')], centro),
    p([f('cliente.nome')], centro),
  ],
};

export const DOCUMENTO_JUNTADA: JSONContent = {
  type: 'doc',
  attrs: { mode: 'document', schemaVersion: 1 },
  content: [
    p([t('EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA 3ª VARA CÍVEL DA COMARCA DO RIO DE JANEIRO/RJ')], semRecuo),
    p([], semRecuo),
    p([t('Processo nº 1000002-92.2025.8.19.8411')], semRecuo),
    p([], semRecuo),
    p([t('JOÃO SILVA', negrito), t(', já qualificado nos autos do processo em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, requerer a juntada dos documentos anexos, para os devidos fins.')]),
    p([t('Nestes termos, pede deferimento.')]),
    p([], centro),
    p([t('Rio de Janeiro, {{data}}.')], centro),
  ],
};

export const BLOCOS_MOCK: { nome: string; descricao: string; conteudo: JSONContent[] }[] = [
  {
    nome: 'Qualificação do cliente',
    descricao: 'Nome, estado civil, profissão, CPF e endereço',
    conteudo: [p([f('cliente.nome', null, negrito), t(', brasileiro, '), f('cliente.estadoCivil'), t(', '), f('cliente.profissao'), t(', inscrito no CPF sob o nº '), f('cliente.cpf', 'cpf'), t(', residente e domiciliado na '), f('cliente.endereco'), t(',')])],
  },
  {
    nome: 'Pedido de justiça gratuita',
    descricao: 'Só entra se o cliente pedir gratuidade',
    conteudo: [{ type: 'conditional', attrs: { condicao: 'cliente.justicaGratuita' }, content: [p([t('Requer a concessão dos benefícios da justiça gratuita, nos termos do art. 98 do CPC, por não ter condições de arcar com as custas processuais sem prejuízo do próprio sustento.')])] }],
  },
  {
    nome: 'Fecho com assinatura',
    descricao: 'Local, data, linha e advogado',
    conteudo: [
      p([t('Nestes termos, pede deferimento.')]),
      p([f('processo.comarca'), t(', '), f('data', 'data_extenso'), t('.')], centro),
      p([], centro),
      p([t('______________________________________')], centro),
      p([f('adv.nome')], centro),
      p([f('adv.oab')], centro),
    ],
  },
  {
    nome: 'Citação de jurisprudência',
    descricao: 'Recuo de 4 cm, fonte 10, entrelinha simples',
    conteudo: [{ type: 'blockquote', content: [p([t('“Texto da ementa ou do trecho citado.” (STJ, REsp nº 0.000.000/UF, Rel. Min. Fulano, julgado em 00/00/0000)')])] }],
  },
];
