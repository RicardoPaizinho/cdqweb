// src/store.js
import { reactive } from 'vue';
import { messages } from './locales/i18n.js';

// --- CONFIGURAÇÃO DA API DE LOGIN ---
//const LOGIN_API_URL = 'https://app.cdqweb.com.br/api/login';
const LOGIN_API_URL = 'https://api.cdqweb.com.br/api/auth/login'; // URL de produção do servidor Node.js


export const globalState = reactive({
  language: localStorage.getItem('app-lang') || 'pt',
  activeMenu: 'informacoes', 

  // --- AUTENTICAÇÃO ---
  isAuthenticated: false,
  authLoading: false,
  authError: '',
  user: null, // { tipo, nome, local }

  // --- NAVEGAÇÃO ENTRE JANELAS PRINCIPAIS (Diagnóstico / Dashboard) ---
  activeWindow: 'diagnostico', // 'diagnostico' | 'dashboard'

  setActiveWindow(win) {
    this.activeWindow = win;
  },

  // Tenta restaurar sessão salva localmente (opcional, ao abrir o app)
  restoreSession() {
    try {
      const saved = localStorage.getItem('cdqweb-user');
      if (saved) {
        this.user = JSON.parse(saved);
        this.isAuthenticated = true;
      }
    } catch (e) {
      this.user = null;
      this.isAuthenticated = false;
    }
  },

  // Realiza login no servidor Node (app.cdqweb.com.br)
  async login(id, senha) {
    this.authLoading = true;
    this.authError = '';
    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, senha })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Usuário ou senha inválidos.');
      }

      const data = await response.json();
      // Espera-se que o servidor retorne: { tipo, nome, local }
      this.user = {
        tipo: data.tipo || '',
        nome: data.nome || '',
        local: data.local || ''
      };
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

  logout() {
    this.user = null;
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