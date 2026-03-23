// src/store.js
import { reactive } from 'vue';
import { messages } from './locales/i18n.js';

export const globalState = reactive({
  language: localStorage.getItem('app-lang') || 'pt',
  activeMenu: 'informacoes', 
  
  testResults: {
    lcd: { label: 'LCD', result: '' },
    touchpad: { label: 'Touchpad', result: '' },
    teclado: { label: 'Teclado', result: '' },
    microfone: { label: 'Mic', result: '' },
    speaker: { label: 'Audio', result: '' },
    webcam: { label: 'Webcam', result: '' },
    redes: { label: 'Network', result: '' },
    battery: { label: 'Battery', result: '' },
    joystick: { label: 'Joystick', result: '' }
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