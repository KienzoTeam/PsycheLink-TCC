import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { motivoParaRecusar } from './bancoDeTeste';

const URL_TESTE = 'postgresql://u:p@127.0.0.1:5432/psychelink_teste';

describe('motivoParaRecusar', () => {
  it('aceita URLs de banco _teste fora dos hosts da equipe', () => {
    assert.equal(motivoParaRecusar([URL_TESTE, URL_TESTE], ['equipe.exemplo.com']), null);
  });

  it('recusa URL ausente', () => {
    assert.match(motivoParaRecusar([URL_TESTE, undefined], []) ?? '', /precisam estar definidas/);
    assert.match(motivoParaRecusar(['', URL_TESTE], []) ?? '', /precisam estar definidas/);
  });

  it('recusa banco que não termina em _teste e cita o nome', () => {
    const motivo = motivoParaRecusar([URL_TESTE, 'postgresql://u:p@127.0.0.1:5432/neondb'], []);
    assert.match(motivo ?? '', /neondb/);
  });

  it('recusa host da equipe sem citar host nem senha', () => {
    const url = 'postgresql://u:segredo123@equipe.exemplo.com/psychelink_teste';
    const motivo = motivoParaRecusar([url, url], ['equipe.exemplo.com']);
    assert.ok(motivo);
    assert.ok(!motivo.includes('equipe.exemplo.com'));
    assert.ok(!motivo.includes('segredo123'));
  });

  it('recusa URL inválida sem repetir o texto', () => {
    const motivo = motivoParaRecusar(['nao é url', URL_TESTE], []);
    assert.ok(motivo);
    assert.ok(!motivo.includes('nao é url'));
  });
});
