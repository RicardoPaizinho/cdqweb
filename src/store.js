import { reactive } from 'vue';

export const globalState = reactive({
  // Controle de Navegação Global
  // Isso permite que qualquer componente (como o GpuTests) troque a tela do App.vue
  activeMenu: 'informacoes', 

  // Estado dos Resultados dos Testes Individuais
  testResults: {
    lcd: { label: 'Testar cores e pixels', result: '' },
    touchpad: { label: 'Testar botoes tp', result: '' },
    teclado: { label: 'Testar botoes tp', result: '' },
    microfone: { label: 'Teste Mic Loop e gravar', result: '' },
    speaker: { label: 'Testar saída de áudio', result: '' },
    webcam: { label: 'PASS', result: '' },
    redes: { label: 'Wlan Bluettoth', result: '' },
    battery: { label: 'charge & capacity', result: '' },
    cpu: { label: 'Speed', result: '' },
    ssd: { label: 'Fail', result: '' },
    gpu: { label: 'Verificar', result: '' },
    memoria: { label: 'Verificar RAM', result: '' },
    joystick: { label: 'Pass', result: '' },
    usb: { result: null, label: 'Aguardando dispositivos' }, 
  },
  
  // Lista de Relatórios (Histórico da Sessão)
  testReports: [], 

  /**
   * Salva o resultado de um teste e gera um log no relatório
   * @param {string} testKey - A chave do teste (ex: 'gpu')
   * @param {string} status - O status (ex: 'Aprovado', 'Falhou')
   */
  saveResult(testKey, status) {
    if (this.testResults[testKey]) {
      this.testResults[testKey].result = status;
    }

    const reportNames = {
      teclado: 'Teclado', 
      speaker: 'Alto-falantes', 
      webcam: 'Câmera',
      lcd: 'Tela LCD', 
      microfone: 'Microfone', 
      joystick: 'Controle/Joystick',
      gpu: 'Placa de Vídeo (Benchmark)'
    };

    // Adiciona ao topo da lista de relatórios
    this.testReports.unshift({
      id: Date.now(),
      name: reportNames[testKey] || testKey.toUpperCase(),
      status: status,
      date: new Date().toLocaleString('pt-BR')
    });
  }
});