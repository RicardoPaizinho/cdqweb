// Monta o texto de detalhe que vai junto do PASS/FAIL de cada teste no banco
// (ex: "PASS: 1920x1080 - FHD - 60Hz - ID: DISPLAY\LGD05F2\..."). Cada teste
// chama a função dele ao terminar e emite o texto como 2º argumento do
// 'test-completed'; o TestesView repassa pro globalState.saveResult.
//
// Tudo aqui é "melhor esforço": se uma leitura falhar, o detalhe sai sem
// aquela parte (ou vazio) e o banco recebe só PASS/FAIL, como antes.

const API_BASE_URL = 'http://localhost:5000/api';

// --- AGENTE LOCAL ---
// /api/report-details: { tela: { largura, altura, frequencia, id, nome }, bluetooth }
let detalhesAgente = null;
export function buscarDetalhesAgente() {
  if (!detalhesAgente) {
    detalhesAgente = fetch(`${API_BASE_URL}/report-details`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((dados) => {
        if (!dados) detalhesAgente = null; // tenta de novo na próxima vez
        return dados;
      });
  }
  return detalhesAgente;
}

export async function buscarNomeLeitorBiometrico() {
  try {
    const r = await fetch(`${API_BASE_URL}/devices/presence`);
    const dados = r.ok ? await r.json() : null;
    return dados?.leitoresBiometricos?.[0]?.nome || null;
  } catch {
    return null;
  }
}

// --- NAVEGADOR ---
// Remove o prefixo que o Windows/Chromium coloca no dispositivo padrão
// ("Padrão - Alto-falantes (Realtek...)") e o "(0bda:5532)" das câmeras USB.
export function limparNomeDispositivo(nome) {
  return String(nome || '')
    .replace(/^(padrão|default|comunicações|communications)\s*-\s*/i, '')
    .replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '')
    .trim();
}

export async function buscarNomeSaidaAudio() {
  try {
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    const saidas = dispositivos.filter((d) => d.kind === 'audiooutput');
    const padrao = saidas.find((d) => d.deviceId === 'default') || saidas[0];
    return limparNomeDispositivo(padrao?.label) || null;
  } catch {
    return null;
  }
}

export function nomeDaTrilha(stream, tipo = 'audio') {
  const trilha = tipo === 'audio' ? stream?.getAudioTracks?.()[0] : stream?.getVideoTracks?.()[0];
  return limparNomeDispositivo(trilha?.label) || null;
}

// Resolução máxima suportada pela câmera, em megapixels (ex: 1280x720 = 0,92 MP)
export function megapixelsDaCamera(stream) {
  const trilha = stream?.getVideoTracks?.()[0];
  if (!trilha) return null;
  const cap = trilha.getCapabilities?.() || {};
  const conf = trilha.getSettings?.() || {};
  const largura = cap.width?.max || conf.width;
  const altura = cap.height?.max || conf.height;
  if (!largura || !altura) return null;
  return ((largura * altura) / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- FORMATOS POR TESTE ---
export function classeResolucao(largura, altura) {
  const tabela = [
    [3840, 2160, '4K UHD'], [2560, 1600, 'WQXGA'], [2560, 1440, 'QHD'],
    [1920, 1200, 'WUXGA'], [1920, 1080, 'FHD'], [1680, 1050, 'WSXGA+'],
    [1600, 900, 'HD+'], [1440, 900, 'WXGA+'], [1366, 768, 'HD'], [1280, 800, 'WXGA'], [1280, 720, 'HD'],
  ];
  return tabela.find(([l, a]) => l === largura && a === altura)?.[2] || null;
}

// "1920x1080 - FHD - 60Hz - ID: DISPLAY\LGD05F2\4&2A06D433&0&UID8388688"
export function detalheLcd(tela, larguraNavegador, alturaNavegador) {
  const largura = tela?.largura || larguraNavegador;
  const altura = tela?.altura || alturaNavegador;
  return [
    largura && altura ? `${largura}x${altura}` : null,
    classeResolucao(largura, altura),
    tela?.frequencia ? `${tela.frequencia}Hz` : null,
    tela?.id ? `ID: ${tela.id}` : null,
  ].filter(Boolean).join(' - ');
}

// "LAN:Realtek PCIe GbE... / WIFI:Intel(R) Wireless-AC 9462 / BLUETOOTH:..."
export function detalheRedes(rede, bluetooth) {
  return [
    rede?.LanPresent && rede.LanDesc ? `LAN:${rede.LanDesc}` : null,
    rede?.WifiPresent && rede.WifiDesc ? `WIFI:${rede.WifiDesc}` : null,
    bluetooth ? `BLUETOOTH:${bluetooth}` : null,
  ].filter(Boolean).join(' / ');
}

const numeroBR = (valor) =>
  valor == null ? null : Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// "DISPOSITIVO:Primary SÉRIE:54414 FABRICANTE:SMP VIDA:100% CARGA:32,95 Wh PROJETADA (DESIGN):36,48 Wh"
export function detalheBateria({ dispositivo, serie, fabricante, vida, carga, projetada }) {
  const valido = (v) => v != null && v !== '' && v !== '—';
  return [
    valido(dispositivo) ? `DISPOSITIVO:${dispositivo}` : null,
    valido(serie) ? `SÉRIE:${serie}` : null,
    valido(fabricante) ? `FABRICANTE:${fabricante}` : null,
    vida != null ? `VIDA:${numeroBR(vida)}%` : null,
    carga != null ? `CARGA:${numeroBR(carga)} Wh` : null,
    projetada != null ? `PROJETADA (DESIGN):${numeroBR(projetada)} Wh` : null,
  ].filter(Boolean).join(' ');
}
