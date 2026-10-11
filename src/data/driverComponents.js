// Driver (.sys) -> componente de hardware que ele controla. Usado pelo
// EventLogAnalyzer.vue pra traduzir o nome do driver envolvido numa falha
// (ex: "nvlddmkm.sys") no componente que o técnico deve testar.
//
// Lista própria da equipe, montada a partir dos nomes públicos dos drivers dos
// fabricantes. A ideia do bluskreener (github.com/Jibbscript/bluskreener) serviu
// de inspiração, mas o KnownBadDrivers.json dele não tem licença e cobre só 13
// drivers — por isso não é copiado aqui.
//
// "onboard: true" marca vídeo integrado: defeito físico nele = placa-mãe.

const COMPONENTES = {
  VIDEO: 'PLACA DE VÍDEO',
  VIDEO_ONBOARD: 'VÍDEO ONBOARD (PLACA-MÃE)',
  VIDEO_WINDOWS: 'SUBSISTEMA DE VÍDEO DO WINDOWS',
  ARMAZENAMENTO: 'ARMAZENAMENTO (SSD/HD)',
  REDE: 'REDE CABEADA',
  WIFI: 'WI-FI',
  REDE_WINDOWS: 'PILHA DE REDE DO WINDOWS',
  AUDIO: 'ÁUDIO',
  USB: 'USB',
  BLUETOOTH: 'BLUETOOTH',
  PLACA_MAE: 'PLACA-MÃE / CHIPSET',
  PROCESSADOR: 'PROCESSADOR / ENERGIA',
  ENTRADA: 'TOUCHPAD / TECLADO',
  LEITOR_CARTAO: 'LEITOR DE CARTÃO',
  SEGURANCA: 'ANTIVÍRUS / SEGURANÇA',
  VIRTUALIZACAO: 'VIRTUALIZAÇÃO',
  KERNEL: 'NÚCLEO DO WINDOWS',
};

// Nome exato do arquivo (minúsculo)
const DRIVERS = {
  // --- Vídeo dedicado ---
  'nvlddmkm.sys': { componente: COMPONENTES.VIDEO, fabricante: 'NVIDIA' },
  'nvhda64v.sys': { componente: COMPONENTES.VIDEO, fabricante: 'NVIDIA (áudio HDMI da placa de vídeo)' },
  'atikmdag.sys': { componente: COMPONENTES.VIDEO, fabricante: 'AMD Radeon' },
  'atikmpag.sys': { componente: COMPONENTES.VIDEO, fabricante: 'AMD Radeon' },
  'amdkmdag.sys': { componente: COMPONENTES.VIDEO, fabricante: 'AMD Radeon' },
  'amdkmpfd.sys': { componente: COMPONENTES.VIDEO, fabricante: 'AMD Radeon' },
  'amdwddmg.sys': { componente: COMPONENTES.VIDEO, fabricante: 'AMD Radeon' },

  // --- Vídeo integrado (onboard) ---
  'igdkmd64.sys': { componente: COMPONENTES.VIDEO_ONBOARD, fabricante: 'Intel HD/UHD/Iris', onboard: true },
  'igdkmdn64.sys': { componente: COMPONENTES.VIDEO_ONBOARD, fabricante: 'Intel UHD/Iris Xe', onboard: true },
  'igdkmdnd64.sys': { componente: COMPONENTES.VIDEO_ONBOARD, fabricante: 'Intel UHD/Iris Xe', onboard: true },
  'igdkmd32.sys': { componente: COMPONENTES.VIDEO_ONBOARD, fabricante: 'Intel HD', onboard: true },
  'intcdaud.sys': { componente: COMPONENTES.VIDEO_ONBOARD, fabricante: 'Intel (áudio HDMI do vídeo integrado)', onboard: true },

  // --- Vídeo genérico do Windows ---
  'dxgkrnl.sys': { componente: COMPONENTES.VIDEO_WINDOWS, fabricante: 'Microsoft (DirectX)', dica: 'Normalmente aponta para o driver da placa de vídeo instalada.' },
  'dxgmms1.sys': { componente: COMPONENTES.VIDEO_WINDOWS, fabricante: 'Microsoft (DirectX)', dica: 'Normalmente aponta para o driver da placa de vídeo instalada.' },
  'dxgmms2.sys': { componente: COMPONENTES.VIDEO_WINDOWS, fabricante: 'Microsoft (DirectX)', dica: 'Normalmente aponta para o driver da placa de vídeo instalada.' },
  'watchdog.sys': { componente: COMPONENTES.VIDEO_WINDOWS, fabricante: 'Microsoft', dica: 'Monitor de travamentos de vídeo — o problema real costuma ser o driver da placa de vídeo.' },
  'basicdisplay.sys': { componente: COMPONENTES.VIDEO_WINDOWS, fabricante: 'Microsoft (driver genérico)', dica: 'O driver de vídeo do fabricante não está instalado ou falhou ao carregar.' },
  'basicrender.sys': { componente: COMPONENTES.VIDEO_WINDOWS, fabricante: 'Microsoft (driver genérico)', dica: 'O driver de vídeo do fabricante não está instalado ou falhou ao carregar.' },

  // --- Armazenamento ---
  'stornvme.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Microsoft (SSD NVMe)' },
  'storahci.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Microsoft (SATA AHCI)' },
  'storport.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Microsoft' },
  'secnvme.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Samsung NVMe' },
  'iastor.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Intel Rapid Storage (RST)' },
  'iastorv.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Intel Rapid Storage (RST)' },
  'iastora.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Intel Rapid Storage (RST)' },
  'iastorac.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Intel Rapid Storage (RST)' },
  'iastorav.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Intel Rapid Storage (RST)' },
  'iastorvd.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Intel RST/VMD', dica: 'Se aparecer junto de INACCESSIBLE_BOOT_DEVICE, conferir o VMD Controller na BIOS.' },
  'amdsata.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'AMD SATA' },
  'amdxata.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'AMD SATA' },
  'disk.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Microsoft' },
  'classpnp.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Microsoft' },
  'ntfs.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Microsoft (sistema de arquivos)', dica: 'Corrupção no sistema de arquivos — rodar chkdsk e testar o disco.' },
  'volmgr.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Microsoft' },
  'partmgr.sys': { componente: COMPONENTES.ARMAZENAMENTO, fabricante: 'Microsoft' },

  // --- Rede cabeada ---
  'rt640x64.sys': { componente: COMPONENTES.REDE, fabricante: 'Realtek Ethernet' },
  'rt630x64.sys': { componente: COMPONENTES.REDE, fabricante: 'Realtek Ethernet' },
  'rt68cx21x64.sys': { componente: COMPONENTES.REDE, fabricante: 'Realtek Ethernet' },
  'rtux64w10.sys': { componente: COMPONENTES.REDE, fabricante: 'Realtek USB Ethernet' },
  'e1d68x64.sys': { componente: COMPONENTES.REDE, fabricante: 'Intel Ethernet' },
  'e1i68x64.sys': { componente: COMPONENTES.REDE, fabricante: 'Intel Ethernet' },
  'e2f68.sys': { componente: COMPONENTES.REDE, fabricante: 'Intel Ethernet' },
  'l1c63x64.sys': { componente: COMPONENTES.REDE, fabricante: 'Qualcomm Atheros Ethernet' },

  // --- Wi-Fi ---
  'rtwlane.sys': { componente: COMPONENTES.WIFI, fabricante: 'Realtek Wi-Fi' },
  'rtwlane01.sys': { componente: COMPONENTES.WIFI, fabricante: 'Realtek Wi-Fi' },
  'rtwlane02.sys': { componente: COMPONENTES.WIFI, fabricante: 'Realtek Wi-Fi' },
  'rtwlanu.sys': { componente: COMPONENTES.WIFI, fabricante: 'Realtek Wi-Fi USB' },
  'athw8x.sys': { componente: COMPONENTES.WIFI, fabricante: 'Qualcomm Atheros Wi-Fi' },
  'athwnx.sys': { componente: COMPONENTES.WIFI, fabricante: 'Qualcomm Atheros Wi-Fi' },
  'athw10x.sys': { componente: COMPONENTES.WIFI, fabricante: 'Qualcomm Atheros Wi-Fi' },
  'qcamain10x64.sys': { componente: COMPONENTES.WIFI, fabricante: 'Qualcomm Wi-Fi' },
  'bcmwl63a.sys': { componente: COMPONENTES.WIFI, fabricante: 'Broadcom Wi-Fi' },
  'bcmwl63al.sys': { componente: COMPONENTES.WIFI, fabricante: 'Broadcom Wi-Fi' },

  // --- Pilha de rede do Windows ---
  'ndis.sys': { componente: COMPONENTES.REDE_WINDOWS, fabricante: 'Microsoft', dica: 'Geralmente causado pelo driver de rede/Wi-Fi, VPN ou antivírus — atualizar esses primeiro.' },
  'tcpip.sys': { componente: COMPONENTES.REDE_WINDOWS, fabricante: 'Microsoft', dica: 'Geralmente causado pelo driver de rede/Wi-Fi, VPN ou antivírus — atualizar esses primeiro.' },
  'netio.sys': { componente: COMPONENTES.REDE_WINDOWS, fabricante: 'Microsoft', dica: 'Geralmente causado pelo driver de rede/Wi-Fi, VPN ou antivírus — atualizar esses primeiro.' },
  'afd.sys': { componente: COMPONENTES.REDE_WINDOWS, fabricante: 'Microsoft', dica: 'Geralmente causado pelo driver de rede/Wi-Fi, VPN ou antivírus — atualizar esses primeiro.' },

  // --- Áudio ---
  'rtkvhd64.sys': { componente: COMPONENTES.AUDIO, fabricante: 'Realtek HD Audio' },
  'rtkvhda.sys': { componente: COMPONENTES.AUDIO, fabricante: 'Realtek HD Audio' },
  'portcls.sys': { componente: COMPONENTES.AUDIO, fabricante: 'Microsoft' },
  'hdaudbus.sys': { componente: COMPONENTES.AUDIO, fabricante: 'Microsoft' },
  'hdaudio.sys': { componente: COMPONENTES.AUDIO, fabricante: 'Microsoft' },
  'intcaudiobus.sys': { componente: COMPONENTES.AUDIO, fabricante: 'Intel Smart Sound' },

  // --- USB ---
  'usbxhci.sys': { componente: COMPONENTES.USB, fabricante: 'Microsoft (USB 3)' },
  'ucx01000.sys': { componente: COMPONENTES.USB, fabricante: 'Microsoft (USB 3)' },
  'usbhub3.sys': { componente: COMPONENTES.USB, fabricante: 'Microsoft (USB 3)' },
  'usbport.sys': { componente: COMPONENTES.USB, fabricante: 'Microsoft' },
  'usbhub.sys': { componente: COMPONENTES.USB, fabricante: 'Microsoft' },
  'usbccgp.sys': { componente: COMPONENTES.USB, fabricante: 'Microsoft' },
  'usbstor.sys': { componente: COMPONENTES.USB, fabricante: 'Microsoft (armazenamento USB)' },
  'asmtxhci.sys': { componente: COMPONENTES.USB, fabricante: 'ASMedia USB 3' },
  'amdxhc.sys': { componente: COMPONENTES.USB, fabricante: 'AMD USB 3' },
  'ucmucsicx.sys': { componente: COMPONENTES.USB, fabricante: 'Microsoft (USB Type-C)' },

  // --- Bluetooth ---
  'bthport.sys': { componente: COMPONENTES.BLUETOOTH, fabricante: 'Microsoft' },
  'bthusb.sys': { componente: COMPONENTES.BLUETOOTH, fabricante: 'Microsoft' },
  'ibtusb.sys': { componente: COMPONENTES.BLUETOOTH, fabricante: 'Intel Bluetooth' },
  'btfilter.sys': { componente: COMPONENTES.BLUETOOTH, fabricante: 'Qualcomm Bluetooth' },

  // --- Placa-mãe / chipset / BIOS ---
  'acpi.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'Microsoft (ACPI/BIOS)', dica: 'Atualizar a BIOS e os drivers de chipset.' },
  'pci.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'Microsoft (barramento PCI)' },
  'heci.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'Intel Management Engine' },
  'teedriverw8x64.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'Intel Management Engine' },
  'teedriverw10x64.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'Intel Management Engine' },
  'amdpsp.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'AMD PSP' },
  'amdgpio2.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'AMD GPIO (chipset)' },
  'esif_lf.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'Intel DPTF (controle térmico)' },
  'dptf_acpi.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'Intel DPTF (controle térmico)' },
  'dptf_cpu.sys': { componente: COMPONENTES.PLACA_MAE, fabricante: 'Intel DPTF (controle térmico)' },

  // --- Processador / energia ---
  'intelppm.sys': { componente: COMPONENTES.PROCESSADOR, fabricante: 'Intel (energia do processador)', dica: 'Verificar temperatura, overclock e BIOS.' },
  'amdppm.sys': { componente: COMPONENTES.PROCESSADOR, fabricante: 'AMD (energia do processador)', dica: 'Verificar temperatura, overclock e BIOS.' },
  'processr.sys': { componente: COMPONENTES.PROCESSADOR, fabricante: 'Microsoft' },

  // --- Touchpad / teclado ---
  'syntp.sys': { componente: COMPONENTES.ENTRADA, fabricante: 'Synaptics' },
  'etd.sys': { componente: COMPONENTES.ENTRADA, fabricante: 'ELAN' },
  'i8042prt.sys': { componente: COMPONENTES.ENTRADA, fabricante: 'Microsoft (teclado/touchpad PS/2)' },
  'kbdclass.sys': { componente: COMPONENTES.ENTRADA, fabricante: 'Microsoft (teclado)' },
  'mouclass.sys': { componente: COMPONENTES.ENTRADA, fabricante: 'Microsoft (mouse/touchpad)' },
  'hidi2c.sys': { componente: COMPONENTES.ENTRADA, fabricante: 'Microsoft (touchpad I2C)' },

  // --- Leitor de cartão ---
  'rtsper.sys': { componente: COMPONENTES.LEITOR_CARTAO, fabricante: 'Realtek' },
  'rtsuer.sys': { componente: COMPONENTES.LEITOR_CARTAO, fabricante: 'Realtek USB' },
  'sdbus.sys': { componente: COMPONENTES.LEITOR_CARTAO, fabricante: 'Microsoft (barramento SD)' },

  // --- Antivírus / segurança ---
  'wdfilter.sys': { componente: COMPONENTES.SEGURANCA, fabricante: 'Windows Defender' },
  'wdboot.sys': { componente: COMPONENTES.SEGURANCA, fabricante: 'Windows Defender' },
  'klif.sys': { componente: COMPONENTES.SEGURANCA, fabricante: 'Kaspersky' },
  'avc3.sys': { componente: COMPONENTES.SEGURANCA, fabricante: 'Bitdefender' },
  'trufos.sys': { componente: COMPONENTES.SEGURANCA, fabricante: 'Bitdefender' },
  'mbamswissarmy.sys': { componente: COMPONENTES.SEGURANCA, fabricante: 'Malwarebytes' },
  'eamonm.sys': { componente: COMPONENTES.SEGURANCA, fabricante: 'ESET' },
  'ehdrv.sys': { componente: COMPONENTES.SEGURANCA, fabricante: 'ESET' },

  // --- Virtualização ---
  'vboxdrv.sys': { componente: COMPONENTES.VIRTUALIZACAO, fabricante: 'VirtualBox' },
  'vmx86.sys': { componente: COMPONENTES.VIRTUALIZACAO, fabricante: 'VMware' },

  // --- Núcleo do Windows (raramente é a causa real) ---
  'ntoskrnl.exe': { componente: COMPONENTES.KERNEL, fabricante: 'Microsoft', dica: 'O próprio kernel raramente é a causa — costuma ser RAM ou outro driver. Testar a memória.' },
  'hal.dll': { componente: COMPONENTES.KERNEL, fabricante: 'Microsoft', dica: 'Camada de hardware do Windows — verificar BIOS, chipset e RAM.' },
  'wdf01000.sys': { componente: COMPONENTES.KERNEL, fabricante: 'Microsoft (framework de drivers)', dica: 'Framework usado por vários drivers — o problema costuma ser outro driver.' },
  'fltmgr.sys': { componente: COMPONENTES.KERNEL, fabricante: 'Microsoft (filtros de arquivo)', dica: 'Normalmente é antivírus ou outro filtro de arquivos.' },
  'cng.sys': { componente: COMPONENTES.KERNEL, fabricante: 'Microsoft (criptografia)' },
};

// Famílias com o número da versão no nome (ex: Netwtw04.sys ... Netwtw14.sys)
const PREFIXOS = [
  ['netwtw', { componente: COMPONENTES.WIFI, fabricante: 'Intel Wi-Fi' }],
  ['netwbw', { componente: COMPONENTES.WIFI, fabricante: 'Intel Wi-Fi' }],
  ['netwns', { componente: COMPONENTES.WIFI, fabricante: 'Intel Wi-Fi' }],
  ['mtkwl', { componente: COMPONENTES.WIFI, fabricante: 'MediaTek Wi-Fi' }],
  ['rtwlan', { componente: COMPONENTES.WIFI, fabricante: 'Realtek Wi-Fi' }],
  ['rtl8', { componente: COMPONENTES.WIFI, fabricante: 'Realtek Wi-Fi' }],
  ['ialpss', { componente: COMPONENTES.PLACA_MAE, fabricante: 'Intel Serial IO (I2C/GPIO — touchpad)' }],
  ['igdkmd', { componente: COMPONENTES.VIDEO_ONBOARD, fabricante: 'Intel HD/UHD/Iris', onboard: true }],
  ['asw', { componente: COMPONENTES.SEGURANCA, fabricante: 'Avast/AVG' }],
  ['mfe', { componente: COMPONENTES.SEGURANCA, fabricante: 'McAfee' }],
];

export function getDriverInfo(driver) {
  if (!driver) return null;
  const nome = String(driver).trim().toLowerCase().split(/[\\/]/).pop();
  const info = DRIVERS[nome] || PREFIXOS.find(([prefixo]) => nome.startsWith(prefixo))?.[1];
  return info ? { driver: nome, ...info } : { driver: nome, componente: null, fabricante: null };
}
