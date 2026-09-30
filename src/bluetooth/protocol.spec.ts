import { describe, expect, it } from 'vitest';
import { fragmentar, RemontadorFrames } from './framing';
import type { MensagemBluetooth } from './messages';
import { desserializarMensagem, ErroProtocolo, RegistroMensagens, serializarMensagem, validarMensagem } from './protocol-validation';

const mensagem: MensagemBluetooth = {
  versao: 1,
  id: 'msg-1',
  tipo: 'SOLICITACAO_ENTRADA',
  partidaId: 'a1b2c3d4',
  remetenteId: 'jogador-1',
  sequencia: 0,
  enviadaEm: '2026-09-30T18:00:00.000Z',
  dados: { jogador: { id: 'jogador-1', nome: 'Ana' } },
};

describe('protocolo Bluetooth', () => {
  it('serializa, fragmenta no MTU mínimo e remonta a mensagem', () => {
    const serializada = serializarMensagem(mensagem);
    const frames = fragmentar(serializada, 20, 123);
    const remontador = new RemontadorFrames();
    let resultado: string | null = null;
    for (const frame of frames) resultado = remontador.adicionar('telefone-a', frame);
    expect(resultado).toBe(serializada);
    expect(desserializarMensagem(resultado!)).toEqual(mensagem);
  });

  it('rejeita formato inválido', () => {
    expect(() => desserializarMensagem('{"tipo":"JOGADA"}')).toThrow(ErroProtocolo);
    expect(() => desserializarMensagem(JSON.stringify({
      ...mensagem,
      tipo: 'JOGADA',
      dados: { cartaId: '', rodada: -1 },
    }))).toThrow(ErroProtocolo);
  });

  it('rejeita mãos inseridas em um estado declarado como público', () => {
    const estado = {
      id: 'p1',
      anfitriaoId: 'j1',
      jogadores: [],
      ordemJogadores: [],
      status: 'EM_ANDAMENTO',
      iniciadaEm: '2026-09-30T18:00:00.000Z',
      encerradaEm: null,
      rodadaAtual: 1,
      jogadorDaVezId: 'j1',
      jogadoresQueConfirmaram: [],
      resultado: null,
      maos: { j1: [] },
    };
    expect(() => serializarMensagem({
      ...mensagem,
      tipo: 'PARTIDA_INICIADA',
      dados: {
        estado,
        maoLocal: ['PAUS', 'COPAS', 'ESPADAS', 'OUROS'].map((naipe) => ({
          id: `AS-${naipe}`,
          valor: 'AS',
          naipe,
        })),
      },
    } as unknown as MensagemBluetooth)).toThrow('saída inválida');
  });

  it('rejeita partida, remetente, sequência e ID duplicados', () => {
    const registro = new RegistroMensagens();
    registro.aceitar(mensagem, { partidaId: 'a1b2c3d4', remetenteEsperado: 'jogador-1' });
    expect(() => registro.aceitar(mensagem, { partidaId: 'a1b2c3d4' })).toThrow('duplicada');
    expect(() =>
      registro.aceitar({ ...mensagem, id: 'msg-2', partidaId: 'outra' }, { partidaId: 'a1b2c3d4' }),
    ).toThrow('outra partida');
    expect(() =>
      registro.aceitar({ ...mensagem, id: 'msg-3', sequencia: 1 }, { partidaId: 'a1b2c3d4', remetenteEsperado: 'outro' }),
    ).toThrow('Remetente');
  });

  it('valida aceite, recusa, desconexão e reconexão', () => {
    const base = { ...mensagem, id: 'estado', sequencia: 2 };
    expect(validarMensagem({
      ...base,
      tipo: 'RESPOSTA_ENTRADA',
      dados: { aceita: false, motivo: 'Sala cheia.' },
    })).toBe(true);
    expect(validarMensagem({
      ...base,
      tipo: 'JOGADOR_DESCONECTADO',
      dados: { jogadorId: 'jogador-1', podeReconectar: true },
    })).toBe(true);
    expect(validarMensagem({
      ...base,
      tipo: 'RECONEXAO',
      dados: { jogadorId: 'jogador-1', ultimaSequenciaRecebida: 8 },
    })).toBe(true);
    expect(validarMensagem({
      ...base,
      tipo: 'RECONEXAO',
      dados: { jogadorId: 'outro', ultimaSequenciaRecebida: -1 },
    })).toBe(false);
  });
});
