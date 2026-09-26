// Causas prováveis de tela azul, catalogadas pela equipe técnica (fonte: "Tela azul.csv").
// Chave = código do bugcheck em hexadecimal (comparado por valor numérico, não por string,
// então "0x1A" e "0x0000001A" batem com a mesma entrada).
const RAW_CAUSES = [
  ['0x000000CE', 'ATUALIZAR DRIVER NVIDIA PARA VERSÃO HOMOLOGADA'],
  ['0x000000BC', 'IP DUPLICADO ATRIBUÍDO NA REDE'],
  ['0x0000001A', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x0000001B', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x0000001C', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x0000004E', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x00000065', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x0000007D', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x000000A2', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x000000AC', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x000000BE', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x000000C1', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x000000CF', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x000000FC', 'MEMÓRIA — PODE SER MEMÓRIA OU PLACA MÃE, TESTAR SEPARADO'],
  ['0x0000007A', 'MEMÓRIA — PORÉM TESTAR MEMÓRIA E PLACA MÃE SEPARADOS'],
  ['0x0000007B', 'MUDAR O VMD CONTROLLER OU SATA MODE NA BIOS'],
  ['0x000000DA', 'OCORRE DURANTE ATUALIZAÇÃO DA BIOS, NÃO É VÍCIO — ATUALIZE NOVAMENTE'],
  ['0x0000010E', 'PLACA DE VÍDEO (PLACA MÃE SE A PLACA DE VÍDEO FOR ONBOARD)'],
  ['0x00000113', 'PLACA DE VÍDEO (PLACA MÃE SE A PLACA DE VÍDEO FOR ONBOARD)'],
  ['0x00000116', 'PLACA DE VÍDEO (PLACA MÃE SE A PLACA DE VÍDEO FOR ONBOARD)'],
  ['0x00000117', 'PLACA DE VÍDEO (PLACA MÃE SE A PLACA DE VÍDEO FOR ONBOARD)'],
  ['0x000001E4', 'PLACA DE VÍDEO (PLACA MÃE SE A PLACA DE VÍDEO FOR ONBOARD)'],
  ['0x00000001', 'PLACA MÃE'],
  ['0x00000015', 'PLACA MÃE'],
  ['0x0000003B', 'PLACA MÃE'],
  ['0x00000050', 'PLACA MÃE'],
  ['0x0000005C', 'PLACA MÃE'],
  ['0x00000076', 'PLACA MÃE'],
  ['0x00000080', 'PLACA MÃE'],
  ['0x0000008E', 'PLACA MÃE'],
  ['0x00000101', 'PLACA MÃE'],
  ['0x00000102', 'PLACA MÃE'],
  ['0x00000111', 'PLACA MÃE'],
  ['0x0000011D', 'PLACA MÃE'],
  ['0x00000133', 'PLACA MÃE'],
  ['0x00000139', 'PLACA MÃE'],
  ['0x00020001', 'PLACA MÃE'],
  ['0x1000007E', 'PLACA MÃE'],
  ['0x00000008', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x00000009', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x0000000A', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x0000004A', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x0000009F', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x000000C2', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x000000C8', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x000000D1', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x000000D4', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x000000E1', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x00000192', 'PROCESSADOR (PLACA MÃE QUANDO O PROCESSADOR É ONBOARD)'],
  ['0x00000074', 'SSD'],
  ['0x000000E6', 'SSD'],
  ['0x000000ED', 'SSD'],
  ['0x000000EF', 'SSD'],
  ['0x000001D5', 'SSD'],
  ['0x000001D6', 'SSD'],
  ['0x00000154', 'SSD'],
  ['0x0000001E', 'SSD OU PLACA MÃE'],
  ['0x0000009C', 'SSD — CASO APRESENTE NOVAMENTE APÓS A TROCA, SUBSTITUIR A PLACA MÃE'],
  ['0x00000122', 'SSD — SE O VÍCIO PERSISTIR, TROCAR A PLACA MÃE'],
  ['0x00000124', 'SSD — SE O VÍCIO PERSISTIR, TROCAR A PLACA MÃE'],
  ['0xC0000225', 'POSSÍVEL REMOÇÃO DE DRIVE DE BOOT OU FALHA NO RECONHECIMENTO DO DISCO'],
];

// Causas complementares sugeridas pelo Claude (não vêm da planilha da equipe) para códigos
// com correlação de hardware bem documentada. Prefixadas com "IA:" na exibição para deixar
// claro que não passaram pela mesma validação empírica da tabela acima — sirva como ponto de
// partida, não como diagnóstico definitivo.
const RAW_CAUSES_AI = [
  ['0x000001AA', 'MEMÓRIA RAM OU PROCESSADOR — corrupção de pilha do kernel geralmente indica RAM instável ou CPU com erro; placa mãe entra como causa secundária/indireta (barramento ou alimentação).'],
  ['0x000001AB', 'MEMÓRIA RAM OU PROCESSADOR — mesma família de EXCEPTION_ON_INVALID_STACK; placa mãe é causa secundária/indireta.'],
  ['0x00000019', 'MEMÓRIA RAM — corrupção de cabeçalho de pool; também pode ser causada por driver defeituoso, não só hardware.'],
  ['0x0000002E', 'MEMÓRIA RAM OU PLACA MÃE — erro físico no barramento de memória; testar os módulos separadamente.'],
  ['0x00000109', 'MEMÓRIA RAM — estrutura crítica do kernel corrompida, geralmente por RAM instável (também pode ser driver malicioso).'],
  ['0x0000013A', 'MEMÓRIA RAM — corrupção de heap do kernel; testar os módulos de memória separadamente.'],
  ['0x0000012B', 'MEMÓRIA RAM OU PROCESSADOR — o próprio Windows (via WHEA) já identifica isso como falha física de hardware detectada.'],
  ['0x00000024', 'SSD/HD OU CABO SATA — corrupção do sistema de arquivos NTFS, geralmente causada por disco ou conexão com defeito.'],
  ['0x00000023', 'SSD/HD OU CABO SATA — mesma origem do NTFS_FILE_SYSTEM, em partições FAT/FAT32.'],
  ['0x000000F4', 'SSD — processo crítico do sistema encerrado inesperadamente, geralmente por falha de leitura/gravação no disco.'],
  ['0x00000119', 'PLACA DE VÍDEO (PLACA MÃE SE FOR ONBOARD) — erro interno do escalonador de vídeo.'],
  ['0x000000EA', 'PLACA DE VÍDEO — geralmente ligado a driver de vídeo travado/desatualizado; se persistir após atualizar o driver, testar a placa de vídeo.'],
  ['0x0000007E', 'Geralmente causado por driver (verificar driver de vídeo/rede primeiro); se persistir após reinstalar/atualizar drivers, pode indicar MEMÓRIA RAM ou PROCESSADOR com defeito.'],
  ['0x0000007F', 'PROCESSADOR — geralmente indica CPU com defeito (núcleo ou cache); também pode ser causado por overclock ou superaquecimento.'],
];

const AI_PREFIX = 'IA: ';

export const BSOD_CAUSES = new Map([
  ...RAW_CAUSES.map(([hex, causa]) => [parseInt(hex, 16), causa]),
  ...RAW_CAUSES_AI.map(([hex, causa]) => [parseInt(hex, 16), AI_PREFIX + causa]),
]);

export function getCauseForCode(code) {
  if (code == null) return null;
  return BSOD_CAUSES.get(code) || null;
}
