import {
  NAIPES,
  VALORES_CARTA,
  type Carta,
  type EstadoPublicoPartida,
  type Jogador,
  type Partida,
  type ResultadoJogadorLocal,
  type ResultadoPartida,
  type StatusPartida,
} from './models';
import { CARTAS_POR_JOGADOR, MAXIMO_JOGADORES, MINIMO_JOGADORES, obterProximoJogadorId, temQuatroCartasIguais } from './game-rules';

export class ErroRegraJogo extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErroRegraJogo';
  }
}

export interface ResultadoJogada {
  trocaExecutada: boolean;
  rodadaConcluida: number | null;
}

const LETRAS_BURRO = 'BURRO';

export function criarBaralho(quantidadeJogadores: number): Carta[] {
  if (quantidadeJogadores < MINIMO_JOGADORES || quantidadeJogadores > MAXIMO_JOGADORES) {
    throw new ErroRegraJogo('A partida deve ter entre 2 e 6 jogadores.');
  }

  return VALORES_CARTA.slice(0, quantidadeJogadores).flatMap((valor) =>
    NAIPES.map((naipe) => ({ id: `${valor}-${naipe}`, valor, naipe })),
  );
}

export function embaralhar<T>(itens: readonly T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...itens];
  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const sorteado = Math.floor(aleatorio() * (indice + 1));
    [copia[indice], copia[sorteado]] = [copia[sorteado]!, copia[indice]!];
  }
  return copia;
}

export function criarPartidaEmAndamento(
  id: string,
  anfitriaoId: string,
  jogadorLocalId: string,
  jogadoresInformados: readonly Jogador[],
  aleatorio: () => number = Math.random,
  agora = new Date().toISOString(),
): Partida {
  if (jogadoresInformados.length < MINIMO_JOGADORES || jogadoresInformados.length > MAXIMO_JOGADORES) {
    throw new ErroRegraJogo('A partida deve ter entre 2 e 6 jogadores.');
  }
  if (!jogadoresInformados.some((jogador) => jogador.id === anfitriaoId)) {
    throw new ErroRegraJogo('O anfitrião não pertence à partida.');
  }

  const jogadores = [...jogadoresInformados]
    .sort((a, b) => a.ordem - b.ordem)
    .map((jogador, ordem) => ({ ...jogador, ordem }));
  const baralho = embaralhar(criarBaralho(jogadores.length), aleatorio);
  const maos: Record<string, Carta[]> = {};
  jogadores.forEach((jogador, indice) => {
    maos[jogador.id] = baralho.slice(indice * CARTAS_POR_JOGADOR, (indice + 1) * CARTAS_POR_JOGADOR);
  });

  return {
    id,
    anfitriaoId,
    jogadorLocalId,
    jogadores,
    ordemJogadores: jogadores.map((jogador) => jogador.id),
    status: 'EM_ANDAMENTO',
    iniciadaEm: agora,
    encerradaEm: null,
    rodadaAtual: 1,
    jogadorDaVezId: jogadores[0]!.id,
    maos,
    cartasSelecionadas: {},
    resultado: null,
  };
}

export function confirmarJogada(
  partida: Partida,
  jogadorId: string,
  cartaId: string,
  rodada: number,
): ResultadoJogada {
  exigirEmAndamento(partida);
  if (rodada !== partida.rodadaAtual) throw new ErroRegraJogo('A jogada pertence a outra rodada.');
  if (partida.jogadorDaVezId !== jogadorId) throw new ErroRegraJogo('Não é a vez deste jogador.');
  if (partida.cartasSelecionadas[jogadorId]) throw new ErroRegraJogo('Este jogador já confirmou uma carta na rodada.');
  if (!partida.maos[jogadorId]?.some((carta) => carta.id === cartaId)) {
    throw new ErroRegraJogo('A carta informada não pertence à mão do jogador.');
  }

  partida.cartasSelecionadas[jogadorId] = cartaId;
  const indiceAtual = partida.ordemJogadores.indexOf(jogadorId);
  const ultimo = indiceAtual === partida.ordemJogadores.length - 1;
  if (!ultimo) {
    partida.jogadorDaVezId = partida.ordemJogadores[indiceAtual + 1]!;
    return { trocaExecutada: false, rodadaConcluida: null };
  }

  executarTrocaCircular(partida);
  const rodadaConcluida = partida.rodadaAtual;
  partida.rodadaAtual += 1;
  partida.cartasSelecionadas = {};
  partida.jogadorDaVezId = partida.ordemJogadores[0]!;
  return { trocaExecutada: true, rodadaConcluida };
}

function executarTrocaCircular(partida: Partida): void {
  const cartas = new Map<string, Carta>();
  for (const jogadorId of partida.ordemJogadores) {
    const cartaId = partida.cartasSelecionadas[jogadorId];
    const carta = partida.maos[jogadorId]?.find((item) => item.id === cartaId);
    if (!carta) throw new ErroRegraJogo('A rodada não possui uma carta válida de cada jogador.');
    cartas.set(jogadorId, carta);
  }

  for (const jogadorId of partida.ordemJogadores) {
    const carta = cartas.get(jogadorId)!;
    const destinoId = obterProximoJogadorId(partida.jogadores, jogadorId)!;
    partida.maos[jogadorId] = partida.maos[jogadorId]!.filter((item) => item.id !== carta.id);
    partida.maos[destinoId] = [...partida.maos[destinoId]!, carta];
  }
  validarConservacao(partida);
}

export function declararObjetivo(
  partida: Partida,
  jogadorId: string,
  rodada: number,
  agora = new Date().toISOString(),
): ResultadoPartida {
  exigirEmAndamento(partida);
  if (rodada !== partida.rodadaAtual) throw new ErroRegraJogo('A declaração pertence a outra rodada.');
  if (partida.cartasSelecionadas[jogadorId]) {
    throw new ErroRegraJogo('O jogador já confirmou uma carta nesta rodada.');
  }
  if (partida.jogadores.some((jogador) => jogador.estadoConexao !== 'CONECTADO')) {
    throw new ErroRegraJogo('A partida está pausada até todos reconectarem.');
  }
  const mao = partida.maos[jogadorId];
  if (!mao || !temQuatroCartasIguais(mao)) throw new ErroRegraJogo('O jogador ainda não possui quatro cartas do mesmo valor.');

  const indice = partida.ordemJogadores.indexOf(jogadorId);
  const penalizadoId = partida.ordemJogadores[(indice - 1 + partida.ordemJogadores.length) % partida.ordemJogadores.length]!;
  const penalizado = partida.jogadores.find((jogador) => jogador.id === penalizadoId)!;
  penalizado.letrasPenalidade = proximaPenalidade(penalizado.letrasPenalidade);

  const resultado: ResultadoPartida = {
    vencedorId: jogadorId,
    jogadorPenalizadoId: penalizadoId,
    resultadoJogadorLocal: resultadoLocal(jogadorId, penalizadoId, partida.jogadorLocalId),
    motivo: penalizado.letrasPenalidade === LETRAS_BURRO ? 'PALAVRA_BURRO' : 'VITORIA',
  };
  partida.status = 'FINALIZADA';
  partida.encerradaEm = agora;
  partida.jogadorDaVezId = null;
  partida.resultado = resultado;
  return resultado;
}

export function encerrarSemVencedor(
  partida: Partida,
  status: Extract<StatusPartida, 'CANCELADA' | 'INTERROMPIDA'>,
  motivo: Extract<ResultadoPartida['motivo'], 'ABANDONO' | 'DESCONEXAO' | 'CANCELAMENTO'>,
  penalizadoId: string | null,
  agora = new Date().toISOString(),
): ResultadoPartida {
  exigirEmAndamento(partida);
  const resultado: ResultadoPartida = {
    vencedorId: null,
    jogadorPenalizadoId: penalizadoId,
    resultadoJogadorLocal: penalizadoId === partida.jogadorLocalId ? 'PENALIZADO' : 'NAO_CONCLUIDO',
    motivo,
  };
  partida.status = status;
  partida.encerradaEm = agora;
  partida.jogadorDaVezId = null;
  partida.resultado = resultado;
  return resultado;
}

export function estadoPublico(partida: Partida, jogadorLocalId: string): EstadoPublicoPartida {
  return {
    id: partida.id,
    anfitriaoId: partida.anfitriaoId,
    jogadores: partida.jogadores.map((jogador) => ({ ...jogador })),
    ordemJogadores: [...partida.ordemJogadores],
    status: partida.status,
    iniciadaEm: partida.iniciadaEm,
    encerradaEm: partida.encerradaEm,
    rodadaAtual: partida.rodadaAtual,
    jogadorDaVezId: partida.jogadorDaVezId,
    jogadoresQueConfirmaram: Object.keys(partida.cartasSelecionadas),
    resultado: partida.resultado ? { ...partida.resultado, resultadoJogadorLocal: resultadoPara(partida, jogadorLocalId) } : null,
  };
}

export function resultadoPara(partida: Partida, jogadorId: string): ResultadoJogadorLocal {
  if (!partida.resultado) return 'NAO_CONCLUIDO';
  return resultadoLocal(partida.resultado.vencedorId, partida.resultado.jogadorPenalizadoId, jogadorId);
}

export function validarConservacao(partida: Partida): void {
  const todas = Object.values(partida.maos).flat();
  const ids = new Set(todas.map((carta) => carta.id));
  if (todas.length !== partida.jogadores.length * CARTAS_POR_JOGADOR || ids.size !== todas.length) {
    throw new ErroRegraJogo('A quantidade total de cartas ficou inconsistente.');
  }
  if (Object.values(partida.maos).some((mao) => mao.length !== CARTAS_POR_JOGADOR)) {
    throw new ErroRegraJogo('Cada jogador deve permanecer com quatro cartas.');
  }
}

function exigirEmAndamento(partida: Partida): void {
  if (partida.status !== 'EM_ANDAMENTO') throw new ErroRegraJogo('A partida não está em andamento.');
}

function proximaPenalidade(atual: string): string {
  const tamanho = Math.min(atual.length + 1, LETRAS_BURRO.length);
  return LETRAS_BURRO.slice(0, tamanho);
}

function resultadoLocal(vencedorId: string | null, penalizadoId: string | null, jogadorId: string): ResultadoJogadorLocal {
  if (jogadorId === vencedorId) return 'VENCEDOR';
  if (jogadorId === penalizadoId) return 'PENALIZADO';
  return vencedorId ? 'PARTICIPANTE' : 'NAO_CONCLUIDO';
}
