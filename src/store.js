// src/store.js
import { reactive } from 'vue';
import { messages } from './locales/i18n.js';

// --- CONFIGURAÇÃO DA API DE LOGIN ---
const LOGIN_API_URL = 'https://api.cdqweb.com.br/api/auth/login';

// --- CONFIGURAÇÃO DA API DE RELATÓRIOS (salva o diagnóstico completo no banco) ---
// ATENÇÃO: ajuste esta URL para a rota real do seu servidor Node.
const RELATORIO_API_URL = 'https://api.cdqweb.com.br/api/relatorios';

export const globalState = reactive({
  language: localStorage.getItem('app-lang') || 'pt',
  activeMenu: 'informacoes', 

  // --- AUTENTICAÇÃO ---
  isAuthenticated: false,
  authLoading: false,
  authError: '',
  user: null, // { tipo, nome, local }
  userConfig: null, // { idioma, batteryHealth, diskHealth, ... } vindo da filial (config.<local>.json)

  // --- NAVEGAÇÃO ENTRE JANELAS PRINCIPAIS (Diagnóstico / Dashboard) ---
  activeWindow: 'diagnostico', // 'diagnostico' | 'dashboard'

  setActiveWindow(win) {
    this.activeWindow = win;
  },

  // Tenta restaurar sessão salva localmente (opcional, ao abrir o app)
  restoreSession() {
    try {
      const savedUser = localStorage.getItem('cdqweb-user');
      const savedConfig = localStorage.getItem('cdqweb-config');
      if (savedUser) {
        this.user = JSON.parse(savedUser);
        this.userConfig = savedConfig ? JSON.parse(savedConfig) : null;
        this.isAuthenticated = true;
        if (this.userConfig?.idioma) this.setLanguage(this.userConfig.idioma);
      }
    } catch (e) {
      this.user = null;
      this.userConfig = null;
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

      // Payload de sucesso: { success, nomeUsuario, tipo, local, config }
      this.user = {
        tipo: data.tipo || '',
        nome: data.nomeUsuario || '',
        local: data.local || ''
      };
      this.userConfig = data.config || {};

      // Aplica automaticamente o idioma configurado para a filial do usuário
      if (this.userConfig.idioma) {
        this.setLanguage(this.userConfig.idioma);
      }

      this.isAuthenticated = true;
      localStorage.setItem('cdqweb-user', JSON.stringify(this.user));
      localStorage.setItem('cdqweb-config', JSON.stringify(this.userConfig));
      return true;
    } catch (err) {
      this.authError = err.message || 'Erro ao conectar com o servidor.';
      this.isAuthenticated = false;
      return false;
    } finally {
      this.authLoading = false;
    }
  },

  logout() {
    this.user = null;
    this.userConfig = null;
    this.isAuthenticated = false;
    this.activeWindow = 'diagnostico';
    localStorage.removeItem('cdqweb-user');
    localStorage.removeItem('cdqweb-config');
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
    touchscreen: { label: 'Touchscreen', result: '' }
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

  // Envia o relatório completo (O.S. + status geral + comentários + todos os
  // resultados de teste) para o servidor Node, que grava no banco de dados.
  async saveFinalReport(os, comments) {
    this.savingReport = true;
    this.saveReportError = '';
    try {
      if (!os || !os.trim()) {
        throw new Error('Informe o número da O.S. antes de salvar.');
      }
      const status = this.overallTestStatus;
      if (!status) {
        throw new Error('Nenhum teste foi executado ainda.');
      }

      const payload = {
        os: os.trim(),
        status,
        comments: comments || '',
        tecnico: this.user?.nome || '',
        tipoUsuario: this.user?.tipo || '',
        local: this.user?.local || '',
        testResults: this.testResults,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(RELATORIO_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error(data?.message || 'Falha ao salvar relatório no servidor.');
      }

      // Reflete o envio no histórico local imediatamente
      const locale = this.language === 'pt' ? 'pt-BR' : this.language === 'en' ? 'en-US' : 'es-ES';
      this.testReports.unshift({
        id: Date.now(),
        os: payload.os,
        name: `Relatório completo — O.S. ${payload.os}`,
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