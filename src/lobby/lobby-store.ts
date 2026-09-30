import { computed, reactive, readonly } from 'vue';
import { ErroBluetooth, traduzirErroBluetooth } from '../bluetooth/bluetooth-error';
import type { MensagemBluetooth, TipoMensagem } from '../bluetooth/messages';
import type { PartidaAnunciada } from '../bluetooth/ports';
import { gerarId, gerarIdPartida, VERSAO_PROTOCOLO } from '../bluetooth/protocol';
import { ErroProtocolo, RegistroMensagens } from '../bluetooth/protocol-validation';
import { centralBleTransport } from '../bluetooth/transports/central-ble.transport';
import { peripheralBleTransport } from '../bluetooth/transports/peripheral-ble.transport';
import {
  confirmarJogada as confirmarJogadaNoMotor,
  criarPartidaEmAndamento,
  declararObjetivo as declararObjetivoNoMotor,
  encerrarSemVencedor,
  estadoPublico,
} from '../domain/game-engine';
import { temQuatroCartasIguais } from '../domain/game-rules';
import type { Carta, EstadoPublicoPartida, Jogador, Partida } from '../domain/models';
import { obterHistoricoRepository, paraHistorico } from '../persistence/history-service';
import {
  avaliarEntrada,
  criarJogadorDaSala,
  definirEstadoConexao,
  podeIniciarPartida,
  podeReconectarJogador,
} from './lobby-rules';

type PapelSala = 'NENHUM' | 'ANFITRIAO' | 'CONVIDADO';
type FaseSala =
  | 'INATIVA' | 'PREPARANDO' | 'PROCURANDO' | 'CONECTANDO' | 'AGUARDANDO_ACEITE'
  | 'NA_SALA' | 'RECONECTANDO' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'ERRO';

export interface SolicitacaoEntrada {
  dispositivoId: string;
  jogador: Pick<Jogador, 'id' | 'nome'>;
  recebidaEm: string;
}

interface EstadoSala {
  jogadorLocal: Pick<Jogador, 'id' | 'nome'> | null;
  papel: PapelSala;
  fase: FaseSala;
  partidaId: string | null;
  anfitriaoId: string | null;
  dispositivoAnfitriaoId: string | null;
  jogadores: Jogador[];
  solicitacoes: SolicitacaoEntrada[];
  partidasEncontradas: PartidaAnunciada[];
  estadoPartida: EstadoPublicoPartida | null;
  maoLocal: Carta[];
  cartaSelecionadaId: string | null;
  acaoPendente: boolean;
  erro: string | null;
  aviso: string | null;
  tentativasReconexao: number;
}

const estado = reactive<EstadoSala>({
  jogadorLocal: null,
  papel: 'NENHUM',
  fase: 'INATIVA',
  partidaId: null,
  anfitriaoId: null,
  dispositivoAnfitriaoId: null,
  jogadores: [],
  solicitacoes: [],
  partidasEncontradas: [],
  estadoPartida: null,
  maoLocal: [],
  cartaSelecionadaId: null,
  acaoPendente: false,
  erro: null,
  aviso: null,
  tentativasReconexao: 0,
});

const registro = new RegistroMensagens();
const jogadorPorDispositivo = new Map<string, string>();
const dispositivoPorJogador = new Map<string, string>();
const dispositivoConhecidoPorJogador = new Map<string, string>();
let partidaAutoritativa: Partida | null = null;
let sequenciaLocal = 0;
let pararScan: (() => Promise<void>) | null = null;
let listenersConfigurados = false;
let saidaIntencional = false;
let reconectando = false;

function armazenamento(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function carregarIdentificacao(): void {
  const salvo = armazenamento()?.getItem('burro:jogador');
  if (!salvo) return;
  try {
    const jogador = JSON.parse(salvo) as Record<string, unknown>;
    if (typeof jogador.id === 'string' && typeof jogador.nome === 'string') {
      estado.jogadorLocal = { id: jogador.id, nome: jogador.nome };
    }
  } catch {
    armazenamento()?.removeItem('burro:jogador');
  }
}

carregarIdentificacao();

function definirJogador(nomeInformado: string): void {
  const nome = nomeInformado.trim().replace(/\s+/g, ' ');
  if (nome.length < 2 || nome.length > 24) throw new Error('Informe um nome entre 2 e 24 caracteres.');
  const jogador = { id: estado.jogadorLocal?.id ?? gerarId(), nome };
  estado.jogadorLocal = jogador;
  armazenamento()?.setItem('burro:jogador', JSON.stringify(jogador));
}

function exigirContexto(): { jogador: Pick<Jogador, 'id' | 'nome'>; partidaId: string } {
  if (!estado.jogadorLocal || !estado.partidaId) throw new Error('Identificação ou partida ausente.');
  return { jogador: estado.jogadorLocal, partidaId: estado.partidaId };
}

function novaMensagem<T extends TipoMensagem>(
  tipo: T,
  dados: Extract<MensagemBluetooth, { tipo: T }>['dados'],
): Extract<MensagemBluetooth, { tipo: T }> {
  const { jogador, partidaId } = exigirContexto();
  return {
    versao: 1,
    id: gerarId(),
    tipo,
    partidaId,
    remetenteId: jogador.id,
    sequencia: sequenciaLocal++,
    enviadaEm: new Date().toISOString(),
    dados,
  } as Extract<MensagemBluetooth, { tipo: T }>;
}

function configurarListeners(): void {
  if (listenersConfigurados) return;
  peripheralBleTransport.aoReceber((dispositivoId, mensagem) => void receberComoAnfitriao(dispositivoId, mensagem));
  peripheralBleTransport.aoAlterarConexao((dispositivoId, conectado) => {
    if (!conectado) registrarDesconexaoDoConvidado(dispositivoId);
  });
  centralBleTransport.aoReceber((mensagem) => void receberComoConvidado(mensagem));
  centralBleTransport.aoDesconectar(() => {
    const faseReconectavel = ['AGUARDANDO_ACEITE', 'NA_SALA', 'EM_ANDAMENTO'].includes(estado.fase);
    if (!saidaIntencional && estado.papel === 'CONVIDADO' && faseReconectavel) void tentarReconectar();
  });
  listenersConfigurados = true;
}

async function criarPartida(): Promise<void> {
  if (!estado.jogadorLocal) throw new Error('Informe seu nome antes de criar a partida.');
  configurarListeners();
  limparSessao(false);
  estado.papel = 'ANFITRIAO';
  estado.fase = 'PREPARANDO';
  estado.partidaId = gerarIdPartida();
  estado.anfitriaoId = estado.jogadorLocal.id;
  estado.jogadores = [criarJogadorDaSala(estado.jogadorLocal, 'ANFITRIAO', 0)];
  try {
    await peripheralBleTransport.anunciarPartida({
      partidaId: estado.partidaId,
      anfitriaoId: estado.jogadorLocal.id,
      nome: estado.jogadorLocal.nome,
      versaoProtocolo: VERSAO_PROTOCOLO,
    });
    estado.fase = 'NA_SALA';
  } catch (erro) {
    falhar(erro);
    throw erro;
  }
}

async function procurarPartidas(): Promise<void> {
  configurarListeners();
  limparSessao(false);
  estado.papel = 'CONVIDADO';
  estado.fase = 'PROCURANDO';
  try {
    pararScan = await centralBleTransport.procurarPartidas((partida) => {
      const indice = estado.partidasEncontradas.findIndex((item) => item.dispositivoId === partida.dispositivoId);
      if (indice >= 0) estado.partidasEncontradas.splice(indice, 1, partida);
      else estado.partidasEncontradas.push(partida);
      estado.partidasEncontradas.sort((a, b) => (b.intensidadeSinal ?? -999) - (a.intensidadeSinal ?? -999));
    });
  } catch (erro) {
    falhar(erro);
    throw erro;
  }
}

async function pararProcura(): Promise<void> {
  await pararScan?.().catch(() => undefined);
  pararScan = null;
  if (estado.fase === 'PROCURANDO') estado.fase = 'INATIVA';
}

async function conectarPartida(partida: PartidaAnunciada): Promise<void> {
  if (!estado.jogadorLocal) throw new Error('Informe seu nome antes de entrar.');
  estado.fase = 'CONECTANDO';
  estado.erro = null;
  await pararProcura();
  try {
    const apresentacao = await centralBleTransport.conectar(partida.dispositivoId);
    estado.partidaId = apresentacao.partidaId;
    estado.anfitriaoId = apresentacao.anfitriaoId;
    estado.dispositivoAnfitriaoId = partida.dispositivoId;
    estado.jogadores = [criarJogadorDaSala({ id: apresentacao.anfitriaoId, nome: apresentacao.nome }, 'ANFITRIAO', 0)];
    estado.fase = 'AGUARDANDO_ACEITE';
    await centralBleTransport.enviar(novaMensagem('SOLICITACAO_ENTRADA', { jogador: { ...estado.jogadorLocal } }));
  } catch (erro) {
    falhar(erro);
    throw erro;
  }
}

async function receberComoAnfitriao(dispositivoId: string, mensagem: MensagemBluetooth): Promise<void> {
  if (estado.papel !== 'ANFITRIAO' || !estado.partidaId) return;
  try {
    if (mensagem.tipo === 'SOLICITACAO_ENTRADA') {
      registro.aceitar(mensagem, { partidaId: estado.partidaId, remetenteEsperado: mensagem.dados.jogador.id });
      if (mensagem.remetenteId !== mensagem.dados.jogador.id) throw new ErroProtocolo('Identidade da solicitação não confere.');
      if (estado.fase !== 'NA_SALA') throw new ErroProtocolo('A partida já foi iniciada.');
      const jaExiste = estado.jogadores.some((jogador) => jogador.id === mensagem.remetenteId);
      const jaPendente = estado.solicitacoes.some((pedido) => pedido.jogador.id === mensagem.remetenteId);
      if (!jaExiste && !jaPendente) estado.solicitacoes.push({ dispositivoId, jogador: mensagem.dados.jogador, recebidaEm: new Date().toISOString() });
      return;
    }

    if (mensagem.tipo === 'RECONEXAO') {
      const dispositivoConhecido = dispositivoConhecidoPorJogador.get(mensagem.dados.jogadorId);
      if (!dispositivoConhecido || dispositivoConhecido !== dispositivoId) {
        throw new ErroProtocolo('A reconexão não veio do dispositivo originalmente aceito.');
      }
      registro.aceitar(mensagem, { partidaId: estado.partidaId, remetenteEsperado: mensagem.dados.jogadorId });
      if (!podeReconectarJogador(estado.jogadores, mensagem.dados.jogadorId)) {
        throw new ErroProtocolo('Jogador de reconexão não pertence à sala.');
      }
      definirEstadoConexao(estado.jogadores, mensagem.dados.jogadorId, 'CONECTADO');
      const jogador = estado.jogadores.find((item) => item.id === mensagem.dados.jogadorId)!;
      const jogadorPartida = partidaAutoritativa?.jogadores.find((item) => item.id === jogador.id);
      if (jogadorPartida) jogadorPartida.estadoConexao = 'CONECTADO';
      jogadorPorDispositivo.set(dispositivoId, jogador.id);
      dispositivoPorJogador.set(jogador.id, dispositivoId);
      if (partidaAutoritativa) await sincronizarJogador(jogador.id);
      else await transmitirSala();
      return;
    }

    const jogadorId = jogadorPorDispositivo.get(dispositivoId);
    if (!jogadorId) throw new ErroProtocolo('Dispositivo não foi aceito na sala.');
    registro.aceitar(mensagem, { partidaId: estado.partidaId, remetenteEsperado: jogadorId });

    if (mensagem.tipo === 'JOGADOR_SAIU') {
      if (mensagem.dados.jogadorId !== jogadorId) throw new ErroProtocolo('Jogador tentou remover outro participante.');
      if (partidaAutoritativa?.status === 'EM_ANDAMENTO') await finalizarPorInterrupcao('ABANDONO', jogadorId);
      else {
        removerJogador(jogadorId);
        await transmitirSala();
      }
      return;
    }

    if (estado.fase !== 'EM_ANDAMENTO' || !partidaAutoritativa) throw new ErroProtocolo('Ação não permitida durante a sala de espera.');
    if (mensagem.tipo === 'JOGADA') {
      await processarJogada(jogadorId, mensagem.dados.cartaId, mensagem.dados.rodada);
      return;
    }
    if (mensagem.tipo === 'JOGADOR_COMPLETOU') {
      if (mensagem.dados.jogadorId !== jogadorId) throw new ErroProtocolo('Jogador tentou declarar por outro participante.');
      await processarDeclaracao(jogadorId, mensagem.dados.rodada);
      return;
    }
    throw new ErroProtocolo('Mensagem não permitida neste estado da partida.');
  } catch (erro) {
    const mensagemErro = erro instanceof Error ? erro.message : 'Mensagem Bluetooth descartada.';
    estado.aviso = `Mensagem descartada: ${mensagemErro}`;
    const jogadorId = jogadorPorDispositivo.get(dispositivoId);
    if (jogadorId && estado.fase === 'EM_ANDAMENTO') {
      await enviarParaJogador(jogadorId, novaMensagem('ACAO_RECUSADA', { mensagem: mensagemErro })).catch(() => undefined);
    }
  }
}

async function receberComoConvidado(mensagem: MensagemBluetooth): Promise<void> {
  if (estado.papel !== 'CONVIDADO' || !estado.partidaId || !estado.anfitriaoId) return;
  try {
    registro.aceitar(mensagem, { partidaId: estado.partidaId, remetenteEsperado: estado.anfitriaoId });
    switch (mensagem.tipo) {
      case 'RESPOSTA_ENTRADA':
        if (!mensagem.dados.aceita) {
          estado.erro = mensagem.dados.motivo ?? 'O anfitrião recusou sua entrada.';
          estado.fase = 'ERRO';
          saidaIntencional = true;
          await centralBleTransport.desconectar();
          saidaIntencional = false;
          return;
        }
        estado.jogadores = mensagem.dados.jogadores ?? estado.jogadores;
        estado.fase = 'NA_SALA';
        break;
      case 'JOGADOR_ENTROU':
      case 'SALA_ATUALIZADA':
        estado.jogadores = mensagem.dados.jogadores;
        estado.fase = 'NA_SALA';
        break;
      case 'JOGADOR_DESCONECTADO': {
        const jogador = estado.jogadores.find((item) => item.id === mensagem.dados.jogadorId);
        if (jogador) jogador.estadoConexao = 'DESCONECTADO';
        const jogadorPartida = estado.estadoPartida?.jogadores.find((item) => item.id === mensagem.dados.jogadorId);
        if (jogadorPartida) jogadorPartida.estadoConexao = 'DESCONECTADO';
        estado.aviso = 'A partida está pausada enquanto um jogador tenta reconectar.';
        break;
      }
      case 'SALA_ENCERRADA':
        estado.erro = mensagem.dados.motivo;
        estado.fase = 'ERRO';
        saidaIntencional = true;
        await centralBleTransport.desconectar();
        saidaIntencional = false;
        break;
      case 'PARTIDA_INICIADA':
        aplicarEstadoPartida(mensagem.dados.estado, mensagem.dados.maoLocal);
        estado.fase = 'EM_ANDAMENTO';
        break;
      case 'ESTADO_SINCRONIZADO':
      case 'TROCA_REALIZADA':
        aplicarEstadoPartida(mensagem.dados.estado, mensagem.dados.maoLocal);
        estado.fase = mensagem.dados.estado.status === 'EM_ANDAMENTO' ? 'EM_ANDAMENTO' : 'FINALIZADA';
        if (estado.fase === 'FINALIZADA') await salvarHistoricoLocal();
        break;
      case 'PARTIDA_FINALIZADA':
        aplicarEstadoPartida(mensagem.dados.estado, estado.maoLocal);
        estado.estadoPartida!.resultado = mensagem.dados.resultado;
        estado.fase = 'FINALIZADA';
        await salvarHistoricoLocal();
        break;
      case 'ACAO_RECUSADA':
        estado.acaoPendente = false;
        estado.erro = mensagem.dados.mensagem;
        break;
      default:
        throw new ErroProtocolo('Mensagem não permitida neste dispositivo ou estado.');
    }
  } catch (erro) {
    estado.aviso = erro instanceof Error ? `Mensagem descartada: ${erro.message}` : 'Mensagem Bluetooth descartada.';
  }
}

async function aceitarSolicitacao(solicitacao: SolicitacaoEntrada): Promise<void> {
  if (estado.papel !== 'ANFITRIAO' || estado.fase !== 'NA_SALA') return;
  const decisao = avaliarEntrada(estado.jogadores, solicitacao.jogador);
  if (!decisao.aceita) {
    await recusarSolicitacao(solicitacao, decisao.motivo);
    return;
  }
  const jogador = criarJogadorDaSala(solicitacao.jogador, 'CONVIDADO', estado.jogadores.length);
  estado.jogadores.push(jogador);
  jogadorPorDispositivo.set(solicitacao.dispositivoId, jogador.id);
  dispositivoPorJogador.set(jogador.id, solicitacao.dispositivoId);
  dispositivoConhecidoPorJogador.set(jogador.id, solicitacao.dispositivoId);
  removerSolicitacao(jogador.id);
  try {
    await peripheralBleTransport.enviarPara(solicitacao.dispositivoId, novaMensagem('RESPOSTA_ENTRADA', {
      aceita: true,
      anfitriao: estado.jogadores[0],
      jogadores: [...estado.jogadores],
    }));
    await enviarAConvidados(novaMensagem('JOGADOR_ENTROU', { jogador, jogadores: [...estado.jogadores] }));
  } catch (erro) {
    removerJogador(jogador.id);
    falharSemTrocarFase(erro);
  }
}

async function recusarSolicitacao(solicitacao: SolicitacaoEntrada, motivo = 'O anfitrião recusou sua entrada.'): Promise<void> {
  removerSolicitacao(solicitacao.jogador.id);
  try {
    await peripheralBleTransport.enviarPara(solicitacao.dispositivoId, novaMensagem('RESPOSTA_ENTRADA', { aceita: false, motivo }));
  } catch (erro) {
    falharSemTrocarFase(erro);
  } finally {
    registro.esquecerRemetente(solicitacao.jogador.id);
  }
}

async function iniciarPartida(): Promise<void> {
  if (estado.papel !== 'ANFITRIAO') throw new Error('Somente o anfitrião pode iniciar.');
  const conectados = estado.jogadores.filter((jogador) => jogador.estadoConexao === 'CONECTADO');
  if (conectados.length < 2) throw new Error('São necessários pelo menos dois jogadores conectados.');
  if (conectados.length !== estado.jogadores.length) throw new Error('Aguarde todos os jogadores reconectarem antes de iniciar.');
  const { jogador, partidaId } = exigirContexto();
  partidaAutoritativa = criarPartidaEmAndamento(partidaId, jogador.id, jogador.id, conectados);
  aplicarEstadoPartida(estadoPublico(partidaAutoritativa, jogador.id), partidaAutoritativa.maos[jogador.id]!);
  estado.fase = 'EM_ANDAMENTO';
  try {
    await Promise.all(conectados.filter((item) => item.id !== jogador.id).map((item) =>
      enviarParaJogador(item.id, novaMensagem('PARTIDA_INICIADA', {
        estado: estadoPublico(partidaAutoritativa!, item.id),
        maoLocal: partidaAutoritativa!.maos[item.id]!,
      })),
    ));
    await peripheralBleTransport.pararAnuncio();
  } catch (erro) {
    await finalizarPorInterrupcao('DESCONEXAO', null);
    estado.erro = 'Não foi possível entregar o início a todos. A partida foi interrompida.';
    throw erro;
  }
}

async function confirmarCarta(cartaId: string): Promise<void> {
  const { jogador } = exigirContexto();
  exigirAcaoPossivel();
  if (!estado.maoLocal.some((carta) => carta.id === cartaId)) throw new Error('Selecione uma carta da sua mão.');
  estado.acaoPendente = true;
  estado.erro = null;
  try {
    if (estado.papel === 'ANFITRIAO') await processarJogada(jogador.id, cartaId, estado.estadoPartida!.rodadaAtual);
    else await centralBleTransport.enviar(novaMensagem('JOGADA', { cartaId, rodada: estado.estadoPartida!.rodadaAtual }));
  } catch (erro) {
    estado.acaoPendente = false;
    throw erro;
  }
}

async function processarJogada(jogadorId: string, cartaId: string, rodada: number): Promise<void> {
  if (!partidaAutoritativa) throw new Error('Estado autoritativo da partida ausente.');
  if (partidaAutoritativa.jogadores.some((jogador) => jogador.estadoConexao !== 'CONECTADO')) {
    throw new Error('A partida está pausada até todos reconectarem.');
  }
  const resultado = confirmarJogadaNoMotor(partidaAutoritativa, jogadorId, cartaId, rodada);
  await sincronizarTodos(resultado.trocaExecutada ? 'TROCA_REALIZADA' : 'ESTADO_SINCRONIZADO', resultado.rodadaConcluida ?? rodada);
}

async function declararObjetivo(): Promise<void> {
  const { jogador } = exigirContexto();
  exigirAcaoPossivel(false);
  if (!temQuatroCartasIguais(estado.maoLocal)) throw new Error('Você ainda não formou quatro cartas do mesmo valor.');
  estado.acaoPendente = true;
  estado.erro = null;
  try {
    if (estado.papel === 'ANFITRIAO') await processarDeclaracao(jogador.id, estado.estadoPartida!.rodadaAtual);
    else await centralBleTransport.enviar(novaMensagem('JOGADOR_COMPLETOU', { jogadorId: jogador.id, rodada: estado.estadoPartida!.rodadaAtual }));
  } catch (erro) {
    estado.acaoPendente = false;
    throw erro;
  }
}

async function processarDeclaracao(jogadorId: string, rodada: number): Promise<void> {
  if (!partidaAutoritativa) throw new Error('Estado autoritativo da partida ausente.');
  declararObjetivoNoMotor(partidaAutoritativa, jogadorId, rodada);
  const localId = estado.jogadorLocal!.id;
  aplicarEstadoPartida(estadoPublico(partidaAutoritativa, localId), partidaAutoritativa.maos[localId]!);
  estado.fase = 'FINALIZADA';
  await salvarHistoricoLocal();
  await enviarFinalizacaoATodos();
}

async function sincronizarTodos(tipo: 'ESTADO_SINCRONIZADO' | 'TROCA_REALIZADA', rodada: number): Promise<void> {
  if (!partidaAutoritativa || !estado.jogadorLocal) return;
  aplicarEstadoPartida(estadoPublico(partidaAutoritativa, estado.jogadorLocal.id), partidaAutoritativa.maos[estado.jogadorLocal.id]!);
  await Promise.all(partidaAutoritativa.jogadores
    .filter((jogador) => jogador.id !== estado.jogadorLocal!.id && jogador.estadoConexao === 'CONECTADO')
    .map((jogador) => {
      const base = { estado: estadoPublico(partidaAutoritativa!, jogador.id), maoLocal: partidaAutoritativa!.maos[jogador.id]! };
      const mensagem = tipo === 'TROCA_REALIZADA'
        ? novaMensagem('TROCA_REALIZADA', { ...base, rodada })
        : novaMensagem('ESTADO_SINCRONIZADO', base);
      return enviarParaJogador(jogador.id, mensagem);
    }));
}

async function sincronizarJogador(jogadorId: string): Promise<void> {
  if (!partidaAutoritativa) return;
  await enviarParaJogador(jogadorId, novaMensagem('ESTADO_SINCRONIZADO', {
    estado: estadoPublico(partidaAutoritativa, jogadorId),
    maoLocal: partidaAutoritativa.maos[jogadorId]!,
  }));
}

async function enviarFinalizacaoATodos(): Promise<void> {
  if (!partidaAutoritativa || !estado.jogadorLocal) return;
  await Promise.all(partidaAutoritativa.jogadores
    .filter((jogador) => jogador.id !== estado.jogadorLocal!.id && jogador.estadoConexao === 'CONECTADO')
    .map((jogador) => {
      const publico = estadoPublico(partidaAutoritativa!, jogador.id);
      return enviarParaJogador(jogador.id, novaMensagem('PARTIDA_FINALIZADA', { estado: publico, resultado: publico.resultado! }));
    }));
}

async function finalizarPorInterrupcao(motivo: 'ABANDONO' | 'DESCONEXAO' | 'CANCELAMENTO', penalizadoId: string | null): Promise<void> {
  if (!partidaAutoritativa || partidaAutoritativa.status !== 'EM_ANDAMENTO') return;
  encerrarSemVencedor(partidaAutoritativa, motivo === 'CANCELAMENTO' ? 'CANCELADA' : 'INTERROMPIDA', motivo, penalizadoId);
  const localId = estado.jogadorLocal!.id;
  aplicarEstadoPartida(estadoPublico(partidaAutoritativa, localId), partidaAutoritativa.maos[localId]!);
  estado.fase = 'FINALIZADA';
  await salvarHistoricoLocal();
  await enviarFinalizacaoATodos().catch(() => undefined);
}

async function sairDaSala(): Promise<void> {
  saidaIntencional = true;
  try {
    if (estado.fase === 'EM_ANDAMENTO' && estado.estadoPartida && estado.jogadorLocal) {
      if (estado.papel === 'ANFITRIAO') await finalizarPorInterrupcao('CANCELAMENTO', null);
      else {
        await centralBleTransport.enviar(novaMensagem('JOGADOR_SAIU', { jogadorId: estado.jogadorLocal.id })).catch(() => undefined);
        const local = { ...estado.estadoPartida, jogadores: estado.estadoPartida.jogadores.map((jogador) => ({ ...jogador })) };
        local.status = 'INTERROMPIDA';
        local.encerradaEm = new Date().toISOString();
        local.jogadorDaVezId = null;
        local.resultado = {
          vencedorId: null,
          jogadorPenalizadoId: estado.jogadorLocal.id,
          resultadoJogadorLocal: 'PENALIZADO',
          motivo: 'ABANDONO',
        };
        estado.estadoPartida = local;
        await salvarHistoricoLocal();
      }
    }
    if (estado.papel === 'ANFITRIAO' && estado.partidaId) {
      if (!estado.estadoPartida) {
        await enviarAConvidados(novaMensagem('SALA_ENCERRADA', { motivo: 'O anfitrião encerrou a sala.' })).catch(() => undefined);
      }
      await peripheralBleTransport.pararAnuncio().catch(() => undefined);
      await peripheralBleTransport.desconectarTodos().catch(() => undefined);
    } else if (estado.papel === 'CONVIDADO') {
      if (!estado.estadoPartida && estado.partidaId && estado.jogadorLocal) {
        await centralBleTransport.enviar(novaMensagem('JOGADOR_SAIU', { jogadorId: estado.jogadorLocal.id })).catch(() => undefined);
      }
      await centralBleTransport.desconectar().catch(() => undefined);
    }
  } finally {
    limparSessao(true);
    saidaIntencional = false;
  }
}

async function solicitarAtivacaoBluetooth(): Promise<void> {
  estado.erro = null;
  if (estado.papel === 'ANFITRIAO') await peripheralBleTransport.solicitarAtivacao();
  else await centralBleTransport.solicitarAtivacao();
}

async function abrirConfiguracoes(): Promise<void> {
  if (estado.papel === 'ANFITRIAO') await peripheralBleTransport.abrirConfiguracoes();
  else await centralBleTransport.abrirConfiguracoes();
}

async function transmitirSala(): Promise<void> {
  await enviarAConvidados(novaMensagem('SALA_ATUALIZADA', { jogadores: [...estado.jogadores] }));
}

async function enviarAConvidados(mensagem: MensagemBluetooth): Promise<void> {
  const destinos = Array.from(new Set(dispositivoPorJogador.values()));
  const resultados = await Promise.allSettled(destinos.map((dispositivoId) => peripheralBleTransport.enviarPara(dispositivoId, mensagem)));
  const falha = resultados.find((resultado) => resultado.status === 'rejected');
  if (falha?.status === 'rejected') throw falha.reason;
}

async function enviarParaJogador(jogadorId: string, mensagem: MensagemBluetooth): Promise<void> {
  const dispositivoId = dispositivoPorJogador.get(jogadorId);
  if (!dispositivoId) throw new Error('O jogador não possui uma conexão Bluetooth ativa.');
  await peripheralBleTransport.enviarPara(dispositivoId, mensagem);
}

function registrarDesconexaoDoConvidado(dispositivoId: string): void {
  const jogadorId = jogadorPorDispositivo.get(dispositivoId);
  if (!jogadorId || estado.papel !== 'ANFITRIAO') return;
  jogadorPorDispositivo.delete(dispositivoId);
  dispositivoPorJogador.delete(jogadorId);
  dispositivoConhecidoPorJogador.delete(jogadorId);
  const jogador = estado.jogadores.find((item) => item.id === jogadorId);
  if (jogador) jogador.estadoConexao = 'DESCONECTADO';
  const jogadorPartida = partidaAutoritativa?.jogadores.find((item) => item.id === jogadorId);
  if (jogadorPartida) jogadorPartida.estadoConexao = 'DESCONECTADO';
  if (partidaAutoritativa && estado.jogadorLocal) {
    aplicarEstadoPartida(estadoPublico(partidaAutoritativa, estado.jogadorLocal.id), partidaAutoritativa.maos[estado.jogadorLocal.id]!);
  }
  void enviarAConvidados(novaMensagem('JOGADOR_DESCONECTADO', { jogadorId, podeReconectar: true })).catch(() => undefined);
}

async function tentarReconectar(): Promise<void> {
  if (reconectando || saidaIntencional || !estado.dispositivoAnfitriaoId || !estado.partidaId || !estado.jogadorLocal) return;
  reconectando = true;
  estado.fase = 'RECONECTANDO';
  estado.erro = null;
  const partidaIdEsperada = estado.partidaId;
  for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
    estado.tentativasReconexao = tentativa;
    await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** (tentativa - 1)));
    try {
      const apresentacao = await centralBleTransport.conectar(estado.dispositivoAnfitriaoId);
      if (apresentacao.partidaId !== partidaIdEsperada) throw new ErroProtocolo('A partida anunciada mudou.');
      await centralBleTransport.enviar(novaMensagem('RECONEXAO', {
        jogadorId: estado.jogadorLocal.id,
        ultimaSequenciaRecebida: registro.ultimaSequencia(estado.anfitriaoId ?? ''),
      }));
      estado.fase = estado.estadoPartida ? 'EM_ANDAMENTO' : 'NA_SALA';
      estado.tentativasReconexao = 0;
      reconectando = false;
      return;
    } catch {
      // Nova tentativa com espera exponencial.
    }
  }
  estado.erro = 'Não foi possível reconectar após quatro tentativas. A partida local será registrada como interrompida.';
  if (estado.estadoPartida?.status === 'EM_ANDAMENTO') {
    const local = { ...estado.estadoPartida };
    local.status = 'INTERROMPIDA';
    local.encerradaEm = new Date().toISOString();
    local.jogadorDaVezId = null;
    local.resultado = {
      vencedorId: null,
      jogadorPenalizadoId: null,
      resultadoJogadorLocal: 'NAO_CONCLUIDO',
      motivo: 'DESCONEXAO',
    };
    estado.estadoPartida = local;
    await salvarHistoricoLocal();
  }
  estado.fase = 'ERRO';
  reconectando = false;
}

function aplicarEstadoPartida(publico: EstadoPublicoPartida, maoLocal: Carta[]): void {
  estado.estadoPartida = publico;
  estado.jogadores = publico.jogadores;
  estado.maoLocal = [...maoLocal];
  estado.cartaSelecionadaId = null;
  estado.acaoPendente = false;
  estado.erro = null;
}

function selecionarCarta(cartaId: string): void {
  if (!estado.maoLocal.some((carta) => carta.id === cartaId)) return;
  estado.cartaSelecionadaId = estado.cartaSelecionadaId === cartaId ? null : cartaId;
}

function exigirAcaoPossivel(exigirVez = true): void {
  if (!estado.estadoPartida || estado.estadoPartida.status !== 'EM_ANDAMENTO') throw new Error('A partida não está em andamento.');
  if (!estado.jogadorLocal) throw new Error('Jogador local ausente.');
  if (estado.acaoPendente) throw new Error('Aguarde a confirmação do anfitrião.');
  if (estado.estadoPartida.jogadores.some((jogador) => jogador.estadoConexao !== 'CONECTADO')) {
    throw new Error('A partida está pausada até todos reconectarem.');
  }
  if (exigirVez && estado.estadoPartida.jogadorDaVezId !== estado.jogadorLocal.id) throw new Error('Aguarde a sua vez.');
  if (estado.estadoPartida.jogadoresQueConfirmaram.includes(estado.jogadorLocal.id)) {
    throw new Error('Sua jogada nesta rodada já foi confirmada.');
  }
}

async function salvarHistoricoLocal(): Promise<void> {
  if (!estado.estadoPartida) return;
  try {
    const repositorio = obterHistoricoRepository();
    await repositorio.inicializar();
    await repositorio.salvar(paraHistorico(estado.estadoPartida));
  } catch (erro) {
    estado.aviso = `Não foi possível salvar o histórico: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`;
  }
}

function removerSolicitacao(jogadorId: string): void {
  const indice = estado.solicitacoes.findIndex((pedido) => pedido.jogador.id === jogadorId);
  if (indice >= 0) estado.solicitacoes.splice(indice, 1);
}

function removerJogador(jogadorId: string): void {
  const indice = estado.jogadores.findIndex((jogador) => jogador.id === jogadorId);
  if (indice >= 0) estado.jogadores.splice(indice, 1);
  const dispositivoId = dispositivoPorJogador.get(jogadorId);
  if (dispositivoId) jogadorPorDispositivo.delete(dispositivoId);
  dispositivoPorJogador.delete(jogadorId);
  registro.esquecerRemetente(jogadorId);
  estado.jogadores.forEach((jogador, ordem) => (jogador.ordem = ordem));
}

function limparSessao(limparPapel: boolean): void {
  registro.limpar();
  jogadorPorDispositivo.clear();
  dispositivoPorJogador.clear();
  dispositivoConhecidoPorJogador.clear();
  partidaAutoritativa = null;
  sequenciaLocal = 0;
  estado.fase = 'INATIVA';
  estado.partidaId = null;
  estado.anfitriaoId = null;
  estado.dispositivoAnfitriaoId = null;
  estado.jogadores = [];
  estado.solicitacoes = [];
  estado.partidasEncontradas = [];
  estado.estadoPartida = null;
  estado.maoLocal = [];
  estado.cartaSelecionadaId = null;
  estado.acaoPendente = false;
  estado.erro = null;
  estado.aviso = null;
  estado.tentativasReconexao = 0;
  if (limparPapel) estado.papel = 'NENHUM';
}

function falhar(erro: unknown): void {
  estado.erro = erro instanceof ErroBluetooth ? erro.message : traduzirErroBluetooth(erro).message;
  estado.fase = 'ERRO';
}

function falharSemTrocarFase(erro: unknown): void {
  estado.erro = erro instanceof Error ? erro.message : 'Falha na comunicação Bluetooth.';
}

export function useLobbyStore() {
  return {
    estado: readonly(estado),
    podeIniciar: computed(() => estado.papel === 'ANFITRIAO' && podeIniciarPartida(estado.jogadores)),
    ehMinhaVez: computed(() => estado.estadoPartida?.jogadorDaVezId === estado.jogadorLocal?.id),
    podeDeclarar: computed(() =>
      estado.fase === 'EM_ANDAMENTO' &&
      temQuatroCartasIguais(estado.maoLocal) &&
      !estado.acaoPendente &&
      !!estado.jogadorLocal &&
      !estado.estadoPartida?.jogadoresQueConfirmaram.includes(estado.jogadorLocal.id) &&
      estado.estadoPartida?.jogadores.every((jogador) => jogador.estadoConexao === 'CONECTADO') === true,
    ),
    definirJogador,
    criarPartida,
    procurarPartidas,
    pararProcura,
    conectarPartida,
    aceitarSolicitacao,
    recusarSolicitacao,
    iniciarPartida,
    selecionarCarta,
    confirmarCarta,
    declararObjetivo,
    sairDaSala,
    solicitarAtivacaoBluetooth,
    abrirConfiguracoes,
  };
}
