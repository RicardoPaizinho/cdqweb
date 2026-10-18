// Erros de hardware WHEA (provedor Microsoft-Windows-WHEA-Logger): o que cada
// tipo indica e o que o técnico deve fazer. Usado pelo EventLogAnalyzer.vue e
// pelo CpuStress.vue. O agente C# (WheaService.cs) entrega os campos já
// separados: id do evento, componente, tipo, ApicId, MCABank, MciStat.
//
// Referências: códigos MCA "simples" e "compostos" do Intel SDM vol. 3B
// (cap. 16/17, Machine-Check Architecture) e IDs de evento do WHEA-Logger.

// IDs de evento mais comuns do WHEA-Logger
export const WHEA_EVENTOS = {
  1: { titulo: 'ERRO FATAL DE HARDWARE', gravidade: 'high', corrigido: false },
  2: { titulo: 'ERRO DE HARDWARE CORRIGIDO (REGISTRO BRUTO)', gravidade: 'medium', corrigido: true },
  16: { titulo: 'ERRO DE HARDWARE CORRIGIDO NO BARRAMENTO PCI', gravidade: 'medium', corrigido: true },
  17: { titulo: 'ERRO CORRIGIDO NO PCI EXPRESS', gravidade: 'medium', corrigido: true },
  18: { titulo: 'ERRO FATAL DE HARDWARE (MACHINE CHECK)', gravidade: 'high', corrigido: false },
  19: { titulo: 'ERRO CORRIGIDO NO PROCESSADOR (MACHINE CHECK)', gravidade: 'high', corrigido: true },
  20: { titulo: 'ERRO FATAL NO PCI EXPRESS', gravidade: 'high', corrigido: false },
  46: { titulo: 'ERRO FATAL DE MEMÓRIA', gravidade: 'high', corrigido: false },
  47: { titulo: 'ERRO CORRIGIDO DE MEMÓRIA', gravidade: 'medium', corrigido: true },
};

// Códigos MCA simples (MCACOD = 16 bits baixos do MciStat)
const MCACOD_SIMPLES = {
  0x0001: 'Erro não classificado',
  0x0002: 'Erro de paridade na ROM do microcode',
  0x0003: 'Erro externo (sinal de outro processador/chipset)',
  0x0004: 'Erro FRC (redundância funcional)',
  0x0005: 'Erro de paridade interno (Internal parity error)',
  0x0006: 'Violação de acesso ao código do SMM',
  0x0400: 'Erro de timer interno (watchdog do núcleo)',
};

const NIVEL_CACHE = ['L0', 'L1', 'L2', 'Genérico'];
const TIPO_TRANSACAO = ['Instrução', 'Dados', 'Genérico', '?'];

// Traduz o MCACOD (Intel SDM tabela 16-7/16-9) para texto
export function decodificarMciStat(mciStat) {
  if (!mciStat) return null;
  let valor;
  try { valor = BigInt(mciStat); } catch { return null; }
  const mcacod = Number(valor & 0xFFFFn);
  const corrigidoPorHw = (valor >> 61n) & 1n; // bit UC (61): 1 = não corrigido
  const base = { codigo: '0x' + mcacod.toString(16).toUpperCase().padStart(4, '0'), naoCorrigido: corrigidoPorHw === 1n };

  if (MCACOD_SIMPLES[mcacod]) return { ...base, descricao: MCACOD_SIMPLES[mcacod] };
  if ((mcacod & 0xFFF0) === 0x0010) {
    return { ...base, descricao: `Erro de TLB (${TIPO_TRANSACAO[(mcacod >> 2) & 3]}, ${NIVEL_CACHE[mcacod & 3]})` };
  }
  if ((mcacod & 0xFF00) === 0x0100) {
    return { ...base, descricao: `Erro na hierarquia de cache (${TIPO_TRANSACAO[(mcacod >> 2) & 3]}, ${NIVEL_CACHE[mcacod & 3]})` };
  }
  if ((mcacod & 0xFF80) === 0x0080) {
    return { ...base, descricao: 'Erro no controlador de memória (canal de RAM)' };
  }
  if ((mcacod & 0xF800) === 0x0800) {
    return { ...base, descricao: 'Erro de barramento/interconexão' };
  }
  return { ...base, descricao: 'Código MCA não catalogado' };
}

// Diagnóstico por evento. Retorna { componente, causa, acao, nucleo } — "nucleo"
// = true quando dá pra testar o núcleo específico no CPU Stress (tem APIC ID).
export function diagnosticarWhea(evento, contagemNoApic = 1) {
  const componente = (evento.componente || '').toLowerCase();
  const ehProcessador = evento.id === 19 || evento.id === 18 || /processador|processor|núcleo|core/.test(componente);
  const mca = decodificarMciStat(evento.mciStat);

  if (ehProcessador && evento.apicId != null) {
    const recorrente = contagemNoApic >= 3;
    return {
      componente: 'PROCESSADOR',
      nucleo: true,
      mca,
      causa: recorrente
        ? `Erro recorrente no mesmo núcleo (APIC ${evento.apicId}, ${contagemNoApic} ocorrências). Indica núcleo instável — em Intel Core 13ª/14ª geração é o padrão da degradação de silício por tensão alta.`
        : `Erro de hardware no núcleo APIC ${evento.apicId}. Uma ocorrência isolada pode ser transitória; repetição no mesmo núcleo indica defeito.`,
      acao: 'Atualizar a BIOS (microcode mais recente), rodar o CPU Stress nesse núcleo e acompanhar se surgem novos WHEA ou tela azul. Persistindo após a atualização: processador com defeito (em notebook com CPU soldada = troca da placa-mãe).',
    };
  }

  if (evento.id === 47 || evento.id === 46 || /mem/.test(componente)) {
    return {
      componente: 'MEMÓRIA RAM', nucleo: false, mca,
      causa: 'Erro detectado na memória ou no controlador de memória.',
      acao: 'Testar os pentes separadamente (MemTest86), limpar contatos e slots. Em memória soldada, o defeito é da placa-mãe.',
    };
  }

  if (evento.id === 17 || evento.id === 20 || evento.id === 16 || /pci/.test(componente)) {
    return {
      componente: 'PCI EXPRESS', nucleo: false, mca,
      causa: 'Erro no barramento PCIe — normalmente o SSD NVMe, a placa de vídeo dedicada ou o Wi-Fi conectados a essa porta.',
      acao: 'Atualizar BIOS e drivers de chipset; reencaixar SSD/placas; se repetir, testar o dispositivo em outra máquina.',
    };
  }

  return {
    componente: 'HARDWARE', nucleo: false, mca,
    causa: WHEA_EVENTOS[evento.id]?.corrigido === false
      ? 'Erro fatal de hardware — costuma gerar tela azul WHEA_UNCORRECTABLE_ERROR (0x124).'
      : 'Erro de hardware corrigido pelo próprio sistema. Verificar se há outros eventos WHEA mais detalhados no mesmo horário.',
    acao: 'Atualizar BIOS e drivers de chipset; checar temperatura e fonte; analisar o arquivo de provas.',
  };
}
