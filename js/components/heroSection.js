// js/components/heroSection.js
import State from '../core/state.js';
import { getDefaultAvatar } from '../core/avatar.js';
import FLAGS from '../core/flags.js';

const MAP_ART = {
  BERMUDA: '../assets/bm.png',
  PURGATORIO: '../assets/pg.png',
  KALAHARI: '../assets/kh.png',
  NEXTERRA: '../assets/nt.png'
};

const ROTATION_INTERVAL = 6200;
const COUNTER_DURATION = 560;

// 🔥 COLORES POR SQUAD
const SQUAD_COLORS = {
  OFICIAL: [
    '#10b981', // Verde
    '#06b6d4', // Cian
    '#22c55e', // Verde claro
    '#3b82f6', // Azul
    '#16a34a', // Verde intenso
    '#14b8a6'  // Turquesa
  ],
  TIER: [
    '#3b82f6', // Azul
    '#3b82f6', // Violeta
    '#2563eb', // Azul intenso
    '#a855f7', // Morado
    '#60a5fa', // Celeste
    '#7c3aed'  // Púrpura
  ],
  GIRLS: [
    '#ec4899', // Rosa
    '#a855f7', // Morado
    '#f472b6', // Rosa claro
    '#7c3aed', // Púrpura
    '#fb7185', // Coral/Rosa
    '#c026d3'  // Magenta
  ]
};

// Colores por defecto (fallback)
const DEFAULT_COLORS = [
  '#24d18f',
  '#32c6ed',
  '#4d7cff',
  '#9d6cff',
  '#e86fb7',
  '#ff9d47'
];

function getSceneColors(squad) {
  return SQUAD_COLORS[squad] || DEFAULT_COLORS;
}

function sceneColor(index, squad) {
  const colors = getSceneColors(squad);
  return colors[index % colors.length];
}

function getBestMapForPlayer(player, scrims) {
  if (!player || !scrims || scrims.length === 0) return null;

  const mapStats = {};
 
  for (const scrim of scrims) {
    if (!scrim.rooms) continue;
    for (const room of scrim.rooms) {
      if (!room.players) continue;
      for (const p of room.players) {
        const playerId = player.id;
        const playerName = player.gameName;
 
        let isMatch = false;
        if (p.playerId) {
          isMatch = p.playerId === playerId;
        } else {
          isMatch = p.gameName === playerName;
        }
 
        if (isMatch) {
          const mapName = room.mapName;
          if (!mapStats[mapName]) {
            mapStats[mapName] = {
              mapName: mapName,
              totalPerformance: 0,
              gamesPlayed: 0,
              totalKills: 0,
              totalDamage: 0,
              avgPerformance: 0,
              avgKills: 0,
              avgDamage: 0,
              bestPerformance: 0,
              worstPerformance: 100
            };
          }
          mapStats[mapName].totalPerformance += p.performanceScore || 0;
          mapStats[mapName].gamesPlayed += 1;
          mapStats[mapName].totalKills += p.kills || 0;
          mapStats[mapName].totalDamage += p.damage || 0;
 
          const perf = p.performanceScore || 0;
          if (perf > mapStats[mapName].bestPerformance) mapStats[mapName].bestPerformance = perf;
          if (perf < mapStats[mapName].worstPerformance) mapStats[mapName].worstPerformance = perf;
        }
      }
    }
  }
 
  const mapStatsArray = Object.values(mapStats);
  for (const stat of mapStatsArray) {
    if (stat.gamesPlayed > 0) {
      stat.avgPerformance = Math.round(stat.totalPerformance / stat.gamesPlayed);
      stat.avgKills = Math.round(stat.totalKills / stat.gamesPlayed);
      stat.avgDamage = Math.round(stat.totalDamage / stat.gamesPlayed);
    }
  }
 
  mapStatsArray.sort((a, b) => b.avgPerformance - a.avgPerformance);
 
  return mapStatsArray.length > 0 ? mapStatsArray[0] : null;
}

function animateValue(element, value, suffix = '') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    element.textContent = '—';
    return;
  }

  const startedAt = performance.now();
  const target = Math.round(numeric);
  const tick = (now) => {
    const progress = Math.min((now - startedAt) / COUNTER_DURATION, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = `${Math.round(target * eased).toLocaleString('es-CO')}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const HeroSection = {
  _timer: null,
  _players: [],
  _scrims: [],
  _index: 0,
  _mounted: false,
  _root: null,
  _listenersAttached: false,
  _currentPlayerIds: '',

  render() {
    const squad = State.squad;
    return `
      <section class="command-hero" id="command-hero" aria-labelledby="command-hero-title">
        <div class="command-hero__atmosphere" aria-hidden="true">
          <div class="command-hero__grid"></div>
          <div class="command-hero__glow command-hero__glow--one"></div>
          <div class="command-hero__glow command-hero__glow--two"></div>
          <div class="command-hero__scanlines"></div>
          <div class="command-hero__coordinates">UZX // <span data-hero-coordinate>00.000 / 00.000</span></div>
        </div>

        <div class="command-hero__inner">
          <div class="command-hero__copy" data-reveal>
            <div class="command-hero__eyebrow">
              <span class="command-hero__pulse"></span>
              <span>UZX ${squad}</span>
              <span class="command-hero__rule"></span>
              <span>Free Fire · LATAM</span>
            </div>

            <h1 class="command-hero__title" id="command-hero-title">EL BOOYAH<br><em>SE CONQUISTA.</em></h1>
            <p class="command-hero__lede">La excelencia no es casualidad. En UZX entrenamos, competimos y ganamos con disciplina, estrategia y ejecución.</p>

            <div class="command-hero__actions">
              <button class="command-button command-button--primary" type="button" data-home-action="players">
                <span>Explorar jugadores</span>
                <span aria-hidden="true">↗</span>
              </button>
              <button class="command-button command-button--quiet" type="button" data-home-scroll="home-operations">
                Ver actividad
              </button>
            </div>

            <dl class="command-hero__stats" aria-label="Métricas del jugador en foco">
              <div class="command-stat"><dt>Bajas</dt><dd data-hero-stat="kills">—</dd></div>
              <div class="command-stat"><dt>Rendimiento</dt><dd data-hero-stat="performance">—</dd></div>
              <div class="command-stat"><dt>Jornadas</dt><dd data-hero-stat="scrims">—</dd></div>
              <div class="command-stat"><dt>Mapas</dt><dd data-hero-stat="maps">—</dd></div>
            </dl>
          </div>

          <div class="command-hero__stage" aria-live="polite">
            <div class="command-stage__map" data-hero-map-art></div>
            <div class="command-stage__light command-stage__light--back" aria-hidden="true"></div>
            <div class="command-stage__player-wrap">
              <div class="command-stage__shadow" aria-hidden="true"></div>
              <img class="command-stage__player" data-hero-photo alt="" />
              <div class="command-stage__fallback" data-hero-fallback aria-hidden="true">UZX</div>
              <div class="command-stage__light command-stage__light--front" aria-hidden="true"></div>
            </div>
            <div class="command-stage__identity">
              <div class="command-stage__identity-top">
                <span data-hero-role>Sin rol registrado</span>
                <span class="command-stage__index" data-hero-index>—</span>
              </div>
              <strong data-hero-name>Cargando</strong>
              <div class="command-stage__identity-bottom">
                <img data-hero-flag alt="" hidden />
                <span data-hero-country>—</span>
                <span class="command-stage__map-label" data-hero-map>Sin mapa registrado</span>
              </div>
            </div>
            <div class="command-stage__marks" aria-hidden="true"><span></span><span></span><span></span></div>
            <div class="command-stage__selectors" data-hero-selectors aria-label="Seleccionar jugador"></div>
          </div>
        </div>

        <button class="command-hero__scroll" type="button" data-home-scroll="home-story" aria-label="Continuar hacia el contenido">
          <span>Continuar</span><i aria-hidden="true"></i>
        </button>
      </section>
    `;
  },

  mount(players, scrims, signal) {
    // 🔥 Si ya está montado y los datos no han cambiado, no hacer nada
    if (this._mounted && this._root) {
      const currentPlayers = this._players.map(p => p.id).join(',');
      const newPlayers = players.map(p => p.id).join(',');
      
      // Si los jugadores son los mismos, solo actualizar scrims si es necesario
      if (currentPlayers === newPlayers) {
        // Solo actualizar scrims si hay cambios
        if (this._scrims.length !== scrims.length) {
          this._scrims = scrims;
          // Actualizar el mapa mostrado con nuevos datos
          this._applyScene(this._root, this._index, false);
        }
        return;
      }
    }
    
    // 🔥 Si hay montaje previo, limpiar
    this.destroy();
    
    // ORDENAR POR RENDIMIENTO
    const activePlayers = players.filter(player => player.isActive !== false && player.isVisible !== false);
    this._players = (activePlayers.length ? activePlayers : players)
      .slice()
      .sort((a, b) => (b.stats?.avgPerformance || 0) - (a.stats?.avgPerformance || 0));
    
    this._scrims = scrims;
    this._index = 0;
    this._mounted = true;
    this._currentPlayerIds = this._players.map(p => p.id).join(',');

    const root = document.getElementById('command-hero');
    if (!root) return;
    this._root = root;

    // 🔥 Limpiar listeners antiguos (usar event delegation)
    if (!this._listenersAttached) {
      // Delegación de eventos para data-home-scroll
      root.addEventListener('click', (e) => {
        const target = e.target.closest('[data-home-scroll]');
        if (target) {
          document.getElementById(target.dataset.homeScroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      this._listenersAttached = true;
    }

    if (!this._players.length) {
      root.classList.add('command-hero--empty');
      return;
    }

    this._renderSelectors(root);
    this._applyScene(root, 0, false);
    this._timer = window.setInterval(() => this._applyScene(root, this._index + 1, true), ROTATION_INTERVAL);

    signal?.addEventListener('abort', () => this.destroy(), { once: true });
  },

  destroy() {
    if (this._timer) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
    this._mounted = false;
    this._root = null;
  },

  _renderSelectors(root) {
    const container = root.querySelector('[data-hero-selectors]');
    if (!container) return;
    
    // 🔥 Solo recrear selectores si cambió la cantidad de jugadores
    const currentButtons = container.querySelectorAll('button').length;
    if (currentButtons === this._players.length && this._mounted) {
      // Actualizar solo los estados activos
      this._updateSelectorStates(root);
      return;
    }
    
    container.innerHTML = this._players.map((player, index) => `
      <button type="button" data-player-index="${index}" aria-label="Mostrar ${String(player.gameName || `jugador ${index + 1}`).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]))}">
        <span>${String(index + 1).padStart(2, '0')}</span>
      </button>
    `).join('');
    
    // 🔥 Limpiar listeners antiguos y agregar nuevos
    container.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => this._applyScene(root, Number(button.dataset.playerIndex), true));
    });
  },
  
  _updateSelectorStates(root) {
    const buttons = root.querySelectorAll('[data-player-index]');
    buttons.forEach(button => {
      button.classList.toggle('is-active', Number(button.dataset.playerIndex) === this._index);
    });
  },

  _applyScene(root, nextIndex, shouldTransition) {
    const count = this._players.length;
    if (count === 0) return;
    
    this._index = ((nextIndex % count) + count) % count;
    const player = this._players[this._index];
    const squad = State.squad;
    
    // 🔥 CALCULAR EL MEJOR MAPA DEL JUGADOR
    const bestMapData = getBestMapForPlayer(player, this._scrims);
    const mapName = bestMapData ? bestMapData.mapName : null;
    
    // ✅ MOSTRAR TOTAL DE KILLS ACUMULADOS EN ESE MAPA
    const mapStatsText = bestMapData 
      ? `${bestMapData.mapName} · ${bestMapData.avgPerformance}% · ${bestMapData.totalKills} kills` 
      : 'Sin mapa registrado';
    
    const color = sceneColor(this._index, squad);
    const photo = root.querySelector('[data-hero-photo]');
    const fallback = root.querySelector('[data-hero-fallback]');
    const flag = root.querySelector('[data-hero-flag]');

    if (shouldTransition) {
      root.classList.remove('is-changing');
      void root.offsetWidth;
      root.classList.add('is-changing');
    }

    root.style.setProperty('--scene-accent', color);
    root.style.setProperty('--scene-map-art', mapName && MAP_ART[mapName] ? `url("${MAP_ART[mapName]}")` : 'none');
    root.querySelector('[data-hero-name]').textContent = player.gameName || 'Sin identificador';
    root.querySelector('[data-hero-role]').textContent = player.role || 'Rol no registrado';
    root.querySelector('[data-hero-country]').textContent = player.country || 'País no registrado';
    root.querySelector('[data-hero-map]').textContent = mapStatsText;
    root.querySelector('[data-hero-index]').textContent = String(this._index + 1).padStart(2, '0');
    root.querySelector('[data-hero-coordinate]').textContent = `${String((this._index + 1) * 17).padStart(3, '0')}.${String((this._index + 1) * 43).padStart(3, '0')} / ${mapName || 'UZX'}`;

    const flagSource = FLAGS[player.country];
    flag.hidden = !flagSource;
    if (flagSource) {
      flag.src = flagSource;
      flag.alt = player.country;
    }

    const portrait = player.photo || getDefaultAvatar();
    fallback.textContent = String(player.gameName || 'UZX').slice(0, 2).toUpperCase();
    fallback.hidden = Boolean(portrait);
    photo.hidden = !portrait;
    if (portrait) {
      photo.src = portrait;
      photo.alt = `Retrato de ${player.gameName || 'jugador UZX'}`;
      photo.onerror = () => { photo.hidden = true; fallback.hidden = false; };
    }

    const stats = player.stats || {};
    animateValue(root.querySelector('[data-hero-stat="kills"]'), stats.totalKills);
    animateValue(root.querySelector('[data-hero-stat="performance"]'), stats.avgPerformance, '%');
    animateValue(root.querySelector('[data-hero-stat="scrims"]'), stats.totalScrims);
    animateValue(root.querySelector('[data-hero-stat="maps"]'), stats.totalMapsPlayed);

    // 🔥 Actualizar estados de selectores
    this._updateSelectorStates(root);
  }
};

export default HeroSection;
