import { proximoTamanho } from './font-size-shortcuts';

describe('proximoTamanho', () => {
  it('sobe e desce pela lista', () => {
    expect(proximoTamanho(12, 1)).toBe(14);
    expect(proximoTamanho(12, -1)).toBe(11);
    expect(proximoTamanho(13, 1)).toBe(14);
    expect(proximoTamanho(13, -1)).toBe(12);
  });

  it('para nos limites', () => {
    expect(proximoTamanho(72, 1)).toBe(72);
    expect(proximoTamanho(8, -1)).toBe(8);
  });
});
