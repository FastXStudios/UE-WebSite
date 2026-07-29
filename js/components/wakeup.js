// js/components/wakeup.js
import API from '../core/api.js';
import CONFIG from '../core/config.js';

const MAP_BG = [
  { name: 'Bermuda', image: 'assets/bm.png', tip: 'Bermuda es el mapa más icónico de Free Fire. Sus zonas abiertas favorecen combates a media distancia.' },
  { name: 'Purgatorio', image: 'assets/pg.png', tip: 'Purgatorio es una isla rodeada de lava. Ideal para emboscadas en zonas elevadas.' },
  { name: 'Kalahari', image: 'assets/kh.png', tip: 'Kalahari es un desierto con poca cobertura. El francotirador domina este terreno.' },
  { name: 'Nexterra', image: 'assets/nt.png', tip: 'Nexterra ofrece combates futuristas con múltiples niveles de altura en sus edificios.' },
  { name: 'Solara', image: 'assets/sl.png', tip: 'Solara combina amplias zonas urbanas con espacios abiertos, ofreciendo combates dinámicos y constantes oportunidades para la rotación estratégica.' }
];

const TIPS = [
  'La comunicación en equipo es más importante que la puntería individual.',
  'Rotar temprano puede salvarte de la zona azul y darte ventaja posicional.',
  'Conocer los spawns de loot te da ventaja en los primeros segundos de partida.',
  'Un buen IGL lee el mapa y anticipa los movimientos del enemigo.',
  'Practica el uso de granadas: una bien lanzada cambia el resultado de un combate.',
  'El revivir a un compañero en zona segura puede ser la diferencia entre ganar o perder.',
  'Mantén la calma en el clutch. La paciencia gana más partidas que la prisa.',
  'Los mejores jugadores no son los que más matan, sino los que saben cuándo pelear.',
  'Cada derrota es una lección. Revisa tus partidas para mejorar.',
  'UZX Esports entrena duro para representar a LATAM al más alto nivel.'
];

const Wakeup = {
  _tipIndex: 0,
  _bgIndex: 0,
  _tipInterval: null,
  _bgInterval: null,
  _isShown: false,
  
  show() {
    if (this._isShown) return;
    this._isShown = true;
    
    const screen = document.getElementById('wakeup-screen');
    if (screen) {
      screen.style.display = 'flex';
      screen.classList.remove('hidden');
    }
    
    // Iniciar animaciones
    const tipEl = document.getElementById('wakeup-tip');
    const bgContainer = document.getElementById('wakeup-bg-slideshow');
    
    this._startBackgroundSlideshow(bgContainer);
    this._startTipRotation(tipEl);
  },
  
  async waitForServer() {
    const statusEl = document.getElementById('wakeup-status');
    const loaderFill = document.querySelector('.wakeup-loader-fill');
    let attempts = 0;
    
    const updateLoader = (percent) => {
      if (loaderFill) loaderFill.style.width = `${Math.min(percent, 90)}%`;
    };
    
    while (attempts < 60) {
      attempts++;
      updateLoader(attempts * 1.5);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(CONFIG.API_BASE + '/health', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          updateLoader(100);
          statusEl.textContent = 'Listo';
          statusEl.classList.add('ready');
          return; // ✅ Servidor listo
        }
      } catch (e) {
        // Error silencioso, seguir intentando
      }
      
      // Actualizar mensaje de estado
      if (attempts <= 4) {
        statusEl.textContent = 'Conectando al servidor...';
      } else if (attempts <= 15) {
        statusEl.textContent = 'El servidor está iniciando (modo suspensión)...';
      } else {
        const elapsed = (attempts - 15) * 3;
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        statusEl.textContent = `Iniciando servidor... ${mins > 0 ? `${mins}min ` : ''}${secs}s`;
      }
      
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // SERVIDOR NO RESPONDIÓ
    this._showError();
    throw new Error('Servidor no responde');
  },
  
  _showError() {
    const statusEl = document.getElementById('wakeup-status');
    const loaderFill = document.querySelector('.wakeup-loader-fill');
    const loaderTrack = document.querySelector('.wakeup-loader-track');
    const tipEl = document.getElementById('wakeup-tip');
    
    this._stopIntervals();
    
    // Cambiar loader a rojo
    if (loaderFill) {
      loaderFill.style.width = '100%';
      loaderFill.style.background = '#ef4444';
      loaderFill.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.5)';
    }
    if (loaderTrack) {
      loaderTrack.style.background = 'rgba(239, 68, 68, 0.15)';
    }
    
    if (statusEl) {
      statusEl.textContent = 'No se pudo conectar al servidor';
      statusEl.style.color = '#ef4444';
      statusEl.style.fontWeight = '600';
    }
    
    if (tipEl) {
      tipEl.textContent = 'Verifica tu conexión a internet o inténtalo de nuevo más tarde.';
      tipEl.style.opacity = '1';
      tipEl.style.color = 'rgba(255,255,255,0.6)';
    }
    
    // Botón de reintentar
    const contentEl = document.querySelector('.wakeup-content');
    if (contentEl) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'wakeup-retry-btn';
      retryBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Reintentar
      `;
      retryBtn.onclick = () => {
        retryBtn.remove();
        if (statusEl) {
          statusEl.textContent = 'Reconectando...';
          statusEl.style.color = 'rgba(255,255,255,0.5)';
          statusEl.style.fontWeight = '500';
        }
        if (loaderFill) {
          loaderFill.style.width = '0%';
          loaderFill.style.background = 'var(--primary)';
          loaderFill.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.5)';
        }
        if (loaderTrack) {
          loaderTrack.style.background = 'rgba(255, 255, 255, 0.1)';
        }
        if (tipEl) {
          tipEl.style.color = 'rgba(255,255,255,0.45)';
        }
        this.waitForServer();
      };
      contentEl.appendChild(retryBtn);
    }
  },
  
  _startTipRotation(tipEl) {
    if (!tipEl) return;
    tipEl.textContent = TIPS[0];
    tipEl.style.opacity = '1';
    
    this._tipInterval = setInterval(() => {
      this._tipIndex = (this._tipIndex + 1) % TIPS.length;
      tipEl.style.opacity = '0';
      setTimeout(() => {
        tipEl.textContent = TIPS[this._tipIndex];
        tipEl.style.opacity = '1';
      }, 400);
    }, 8000);
  },
  
  _startBackgroundSlideshow(container) {
    if (!container) return;
    container.style.backgroundImage = `url('${MAP_BG[0].image}')`;
    
    this._bgInterval = setInterval(() => {
      this._bgIndex = (this._bgIndex + 1) % MAP_BG.length;
      container.style.opacity = '0';
      setTimeout(() => {
        container.style.backgroundImage = `url('${MAP_BG[this._bgIndex].image}')`;
        container.style.opacity = '1';
      }, 500);
    }, 10000);
  },
  
  _stopIntervals() {
    if (this._tipInterval) clearInterval(this._tipInterval);
    if (this._bgInterval) clearInterval(this._bgInterval);
  },
  
  hide() {
    this._isShown = false;
    this._stopIntervals();
    
    const screen = document.getElementById('wakeup-screen');
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => {
        screen.style.display = 'none';
      }, 500);
    }
  }
};

export default Wakeup;