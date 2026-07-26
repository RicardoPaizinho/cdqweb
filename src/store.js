// src/store.js
import { reactive } from 'vue';
import { messages } from './locales/i18n.js';

// --- CONFIGURAÇÃO DA API (servidor Node em api.cdqweb.com.br) ---
const API_BASE = 'https://api.cdqweb.com.br/api';
const LOGIN_API_URL = `${API_BASE}/auth/login`;
const TEMA_API_URL = `${API_BASE}/usuario/tema`;
const RELATORIO_CHECK_URL = `${API_BASE}/relatorios/check`;
const RELATORIO_API_URL = `${API_BASE}/relatorios`;

export const globalState = reactive({
  language: localStorage.getItem('app-lang') || 'pt',
  activeMenu: 'informacoes', 

  // --- AUTENTICAÇÃO ---
  isAuthenticated: false,
  authLoading: false,
  authError: '',
  user: null, // { idUsuario, tipo, nome, local, tema }

  // --- DADOS DO EQUIPAMENTO (lidos pelo agente C# via /api/pc-info) ---
  // Preenchido pelo Diagnostico.vue assim que busca os dados do PC — fica
  // aqui pra Relatorios.vue conseguir montar o relatório final sem precisar
  // rebuscar tudo de novo.
  pcInfo: null,

  // --- NAVEGAÇÃO ENTRE JANELAS PRINCIPAIS (Diagnóstico / Dashboard) ---
  activeWindow: 'diagnostico', // 'diagnostico' | 'dashboard'

  setActiveWindow(win) {
    this.activeWindow = win;
  },

  // Tenta restaurar sessão salva localmente (opcional, ao abrir o app)
  restoreSession() {
    try {
      const savedUser = localStorage.getItem('cdqweb-user');
      if (savedUser) {
        this.user = JSON.parse(savedUser);
        this.isAuthenticated = true;
        const idioma = this.user?.local === 'UY' ? 'es' : 'pt';
        this.setLanguage(idioma);
      }
    } catch (e) {
      this.user = null;
      this.isAuthenticated = false;
    }
  },

  // Realiza login no servidor Node (api.cdqweb.com.br/api/auth/login)
  async login(usuario, senha) {
    this.authLoading = true;
    this.authError = '';
    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
      });

      // O backend sempre retorna JSON, mesmo em 400/401/500, então lemos
      // o corpo independentemente do status para pegar a mensagem certa.
      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success) {
        throw new Error(data?.message || 'Usuário ou senha inválidos.');
      }

      // Payload de sucesso: { success, idUsuario, nomeUsuario, tipo, local, tema, idioma }
      this.user = {
        idUsuario: data.idUsuario,
        tipo: data.tipo || '',
        nome: data.nomeUsuario || '',
        local: data.local || 'BR',
        tema: data.tema || null
      };

      // Idioma é selecionado automaticamente a partir do local do usuário
      // (o servidor já calcula isso, mas usamos um fallback local por segurança)
      this.setLanguage(data.idioma || (this.user.local === 'UY' ? 'es' : 'pt'));

      this.isAuthenticated = true;
      localStorage.setItem('cdqweb-user', JSON.stringify(this.user));
      return true;
    } catch (err) {
      this.authError = err.message || 'Erro ao conectar com o servidor.';
      this.isAuthenticated = false;
      return false;
    } finally {
      this.authLoading = false;
    }
  },

  // Salva o tema escolhido em Configurações também no banco (persiste entre
  // sessões/dispositivos). Chamado pelo ConfiguraView.vue a cada troca de tema.
  async updateTheme(tema) {
    if (!this.user?.idUsuario) return false;
    try {
      this.user.tema = tema;
      localStorage.setItem('cdqweb-user', JSON.stringify(this.user));

      const response = await fetch(TEMA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario: this.user.idUsuario, tema })
      });
      const data = await response.json().catch(() => null);
      return response.ok && data?.success !== false;
    } catch (err) {
      console.error('Erro ao salvar tema no servidor:', err);
      return false;
    }
  },

  logout() {
    this.user = null;
    this.pcInfo = null;
    this.isAuthenticated = false;
    this.activeWindow = 'diagnostico';
    localStorage.removeItem('cdqweb-user');
  },
  
  testResults: {
    lcd: { label: 'LCD', result: '' },
    touchpad: { label: 'Touchpad', result: '' },
    teclado: { label: 'Teclado', result: '' },
    microfone: { label: 'Mic', result: '' },
    speaker: { label: 'Audio', result: '' },
    webcam: { label: 'Webcam', result: '' },
    redes: { label: 'Network', result: '' },
    battery: { label: 'Battery', result: '' },
    joystick: { label: 'Joystick', result: '' },
    usb: { label: 'USB', result: '' },
    touchscreen: { label: 'Touchscreen', result: '' },
    fingerprint: { label: 'Fingerprint', result: '' },
    auto: { label: 'Auto Diagnóstico', result: '' }
  },
  
  testReports: [],

  // --- RELATÓRIO FINAL (Relatorios.vue) ---
  currentOS: '',
  reportComments: '',
  savingReport: false,
  saveReportError: '',

  // Calcula o status geral com base em todos os testes já executados.
  // Retorna null se nenhum teste foi rodado ainda.
  get overallTestStatus() {
    const executed = Object.values(this.testResults).filter(
      (r) => r.result === 'PASS' || r.result === 'FAIL'
    );
    if (executed.length === 0) return null;
    return executed.every((r) => r.result === 'PASS') ? 'PASS' : 'FAIL';
  },

  // Mapeia as chaves internas de testResults para os nomes das colunas no banco.
  // joystick/touchscreen não têm coluna correspondente e são ignorados aqui.
  TEST_FIELD_MAP: {
    lcd: 'testeLcd',
    touchpad: 'testeTouchpad',
    teclado: 'testeTeclado',
    microfone: 'testeMicrofone',
    speaker: 'testeSpeakers',
    usb: 'testeUsb',
    webcam: 'testeCamera',
    redes: 'testeRedes',
    battery: 'testeBateria',
    fingerprint: 'testeFingerPrint',
    auto: 'testeAuto'
  },

  // Monta o bloco de dados de hardware a partir do que o Diagnostico.vue já
  // buscou do agente C# (/api/pc-info) e guardou em globalState.pcInfo.
  // Campos que o backend C# ainda não expõe (systemSkuNumber, biosVersion,
  // windowsAtivado, gpu2, memoriaDetalhada) vão em branco por enquanto.
  buildHardwarePayload() {
    const info = this.pcInfo || {};
    return {
      fabricante: info.systemFamily || '',
      modelo: info.model || '',
      systemFamily: info.systemFamily || '',
      systemSkuNumber: '',
      serialNumber: info.serialNumber || '',
      biosVersion: '',
      operacionalSystem: [info.system, info.systemBuild, info.systemVersion].filter(Boolean).join(' '),
      windowsAtivado: '',
      chaveWindows: info.systemKey || '',
      processador: info.processador_Name || '',
      lcdResolution: info.lcd || '',
      gpu: Array.isArray(info.placaVideo) ? info.placaVideo.join(' | ') : (info.placaVideo || ''),
      gpu2: '',
      memoriaTotal: info.memoria || '',
      memoriaDetalhada: '',
      discosDetalhado: Array.isArray(info.armazenamento) ? info.armazenamento.join(' | ') : (info.armazenamento || '')
    };
  },

  // Envia o relatório completo (O.S. + status geral + comentários + todos os
  // resultados de teste + dados de hardware) para o servidor Node.
  // Fluxo: 1) valida O.S. preenchida  2) consulta se já existe um registro
  // com essa O.S. na região do usuário  3) se existir, pergunta se deseja
  // atualizar  4) insere (novo) ou atualiza (existente) no banco.
  async saveFinalReport(os, comments) {
    this.savingReport = true;
    this.saveReportError = '';
    try {
      const osCDQ = (os || '').trim();
      if (!osCDQ) {
        throw new Error('Informe o número da O.S. antes de salvar.');
      }
      const status = this.overallTestStatus;
      if (!status) {
        throw new Error('Nenhum teste foi executado ainda.');
      }
      const local = this.user?.local || 'BR';

      // 1) Verifica se já existe um registro com essa O.S. nesta região
      let osPXExistente = null;
      try {
        const checkUrl = `${RELATORIO_CHECK_URL}?local=${encodeURIComponent(local)}&osCDQ=${encodeURIComponent(osCDQ)}`;
        const checkResponse = await fetch(checkUrl);
        const checkData = await checkResponse.json().catch(() => null);

        if (checkData?.exists) {
          const confirmar = confirm(
            `Já existe um relatório para a O.S. ${osCDQ} (registrado por ${checkData.userTecnico || '—'}). ` +
            `Deseja atualizar o registro existente?`
          );
          if (!confirmar) {
            this.saveReportError = 'Operação cancelada — o registro existente não foi alterado.';
            return false;
          }
          osPXExistente = checkData.osPX;
        }
      } catch (err) {
        console.warn('Não foi possível verificar O.S. existente, seguindo para salvar como novo:', err);
      }

      // 2) Monta o payload com testes + hardware
      const testesPayload = {};
      Object.entries(this.TEST_FIELD_MAP).forEach(([key, campo]) => {
        testesPayload[campo] = this.testResults[key]?.result || '';
      });

      const payload = {
        local,
        osCDQ,
        osPXExistente,
        statusTecnico: status,
        userTecnico: this.user?.nome || '',
        comentarios: comments || '',
        ...testesPayload,
        ...this.buildHardwarePayload()
      };

      const response = await fetch(RELATORIO_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.success === false) {
        throw new Error(data?.message || 'Falha ao salvar relatório no servidor.');
      }

      // Reflete o envio no histórico local imediatamente
      const locale = this.language === 'pt' ? 'pt-BR' : this.language === 'en' ? 'en-US' : 'es-ES';
      this.testReports.unshift({
        id: Date.now(),
        os: osCDQ,
        name: `Relatório completo — O.S. ${osCDQ}${data.updated ? ' (atualizado)' : ''}`,
        status: status === 'PASS' ? this.t('status.approved') : this.t('status.rejected'),
        date: new Date().toLocaleString(locale)
      });

      this.currentOS = '';
      this.reportComments = '';
      return true;
    } catch (err) {
      this.saveReportError = err.message || 'Erro ao salvar relatório.';
      return false;
    } finally {
      this.savingReport = false;
    }
  },

  // Zera os resultados de todos os testes (útil para começar um novo equipamento)
  resetAllTests() {
    Object.keys(this.testResults).forEach((key) => {
      this.testResults[key].result = '';
    });
  },

  // Função de Tradução que consome o arquivo i18n.js
  t(path) {
    const keys = path.split('.');
    let translation = messages[this.language];
    keys.forEach(key => {
      translation = translation ? translation[key] : null;
    });
    return translation || path; 
  },

  setLanguage(lang) {
    this.language = lang;
    localStorage.setItem('app-lang', lang);
  },

  saveResult(testKey, status) {
    if (this.testResults[testKey]) {
      this.testResults[testKey].result = status;
    }

    const hardwareName = this.t(`hardware.${testKey}`);
    const reportStatus = status === 'PASS' ? this.t('status.approved') : this.t('status.rejected');
    const locale = this.language === 'pt' ? 'pt-BR' : this.language === 'en' ? 'en-US' : 'es-ES';

    this.testReports.unshift({
      id: Date.now(),
      name: hardwareName,
      status: reportStatus,
      date: new Date().toLocaleString(locale)
    });
  }
});