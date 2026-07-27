import FingerprintTest from "@/components/tests/FingerprintTest.vue";

// src/locales/i18n.js
export const messages = {
  pt: {
    titles: {
      informacoes: "Informações",
      reports: "Relatórios",
      peripherals: "Testes",
      diagnosticos: "Diagnósticos",
      monitor: "Monitor",
      settings: "Configurações",
      about: "Sobre",
      language: "Idioma do Sistema"
    },
    status: {
      approved: "Aprovado",
      rejected: "Reprovado",
      waiting: "Aguardando",
      loading: "Carregando..."
    },
    hardware: {
      lcd: 'Tela LCD',
      touchpad: 'Touchpad',
      keyboard: 'Teclado',
      mic: 'Microfone',
      speaker: 'Alto-falantes',
      webcam: 'Câmera',
      network: 'Redes Wireless',
      battery: 'Bateria',
      joystick: 'Controle Joystick',
      processador: 'Processador',
      memoria: 'Memória RAM',
      armazenamento: 'Armazenamento',
      usb: 'Portas USB',
      touchscreen: 'Tela Touchscreen',
      gpu: 'Placa de Vídeo',
      sistema: 'Sistema Operacional',
      auto_test: 'Teste Automático',
      fingerprint: 'Fingerprint Test' // 💡 Adicionado para o teste de impressão digital
    },
    popupSobre: {
      botao: "Fechar",
      descricao: "Transformamos dados brutos de hardware em inteligência operacional. Nosso sistema une testes de baixo nível a uma interface intuitiva, estabelecendo um fluxo de trabalho padronizado que elimina margens de erro. O resultado é um diagnóstico de alta precisão que assegura a qualidade em cada etapa da assistência técnica e auditoria."
    } 
  },

  en: {
    titles: {
      informacoes: "Information",
      reports: "Reports",
      peripherals: "Tests",
      diagnosticos: "Diagnostics",
      monitor: "Monitor",
      settings: "Settings",
      about: "About", // 💡 Termo padrão da indústria
      language: "System Language"
    },
    status: {
      approved: "Approved",
      rejected: "Rejected",
      waiting: "Waiting",
      loading: "Loading..."
    },
    hardware: {
      lcd: 'LCD Screen',
      touchpad: 'Touchpad',
      keyboard: 'Keyboard',
      mic: 'Microphone',
      speaker: 'Speakers',
      webcam: 'Camera',
      network: 'Wireless Networks', // 💡 Corrigido
      battery: 'Battery',
      joystick: 'Gamepad Joystick', // 💡 Corrigido erro de digitação
      processador: 'Processor',
      memoria: 'RAM Memory',
      armazenamento: 'Storage',
      usb: 'USB Ports', // 💡 Traduzido de "Portas USB"
      touchscreen: 'Touchscreen', // 💡 Traduzido de "Tela Touchscreen"
      gpu: 'Graphics Card',
      sistema: 'Operating System',
      auto_test: 'Automatic Test', // 💡 Traduzido de "Teste Automático"
      fingerprint: 'Fingerprint Test' // 💡 Adicionado para o teste de impressão digital
    },
    popupSobre: {
      botao: "Close",
      descricao: "We transform raw hardware data into operational intelligence. Our system merges low-level testing with an intuitive interface, establishing a standardized workflow that eliminates human error. The result is a high-precision diagnostic process that ensures quality at every stage of technical support and auditing."
    } 
  },
  
  es: {
    titles: {
      informacoes: "Información",
      reports: "Informes",
      peripherals: "Pruebas",
      diagnosticos: "Diagnósticos",
      monitor: "Monitor",
      settings: "Configuración",
      about: "Acerca de", // 💡 "Acerca de" é muito mais natural no Uruguai/México do que apenas "Sobre"
      language: "Idioma del Sistema"
    },
    status: {
      approved: "Aprobado",
      rejected: "Rechazado",
      waiting: "Esperando",
      loading: "Cargando..."
    },
    hardware: {
      lcd: 'Pantalla LCD',
      touchpad: 'Touchpad',
      keyboard: 'Teclado',
      mic: 'Micrófono',
      speaker: 'Altavoces', // 💡 Perfeito para MX e UY (parlantes também funciona, mas Altavoces é o padrão técnico)
      webcam: 'Cámara',
      network: 'Redes Inalámbricas', // 💡 Termo técnico correto em espanhol para redes sem fio
      battery: 'Batería',
      joystick: 'Mando / Joystick', // 💡 Termo técnico neutro excelente
      processador: 'Procesador',
      memoria: 'Memoria RAM',
      armazenamento: 'Almacenamiento',
      usb: 'Puertos USB', // 💡 Traduzido de "Portas USB"
      touchscreen: 'Pantalla Táctil', // 💡 Traduzido de "Tela Touchscreen"
      gpu: 'Tarjeta de Video', // 💡 Corrigido acento para o padrão latino (Vídeo -> Video)
      sistema: 'Sistema Operativo',
      auto_test: 'Prueba Automática', // 💡 Traduzido de "Teste Automático"
      fingerprint: 'Fingerprint Test' // 💡 Adicionado para o teste de impressão digital
    },
    popupSobre: {
      botao: "Cerrar",
      descricao: "Transformamos datos brutos de hardware en inteligencia operativa. Nuestro sistema une pruebas de bajo nivel con una interfaz intuitiva, estableciendo un flujo de trabajo estandarizado que elimina el margen de error. El resultado es un diagnóstico de alta precisión que asegura la calidad en cada etapa del servicio técnico y la auditoría."
    } 
  }
};