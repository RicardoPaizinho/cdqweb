// src/store.js
import { reactive } from 'vue';
import { messages } from './locales/i18n.js';

// --- CONFIGURAÇÃO DA API DE LOGIN ---
const LOGIN_API_URL = 'https://api.cdqweb.com.br/api/auth/login';

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