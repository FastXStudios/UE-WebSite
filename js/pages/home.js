// js/pages/home.js
import State from '../core/state.js';
import HeroSection from '../components/heroSection.js';
import API from '../core/api.js';
import { getDefaultAvatar, loadDefaultAvatar } from '../core/avatar.js';
import HeroRoster from '../components/heroRoster.js';
import FLAGS from '../core/flags.js';

// 🔥 Cache en memoria para datos
const _dataCache = {
  players: null,
  scrims: null,
  squad: null, // 🔥 NUEVO: Guardar el squad para evitar mezclar datos
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutos
};

const MAP_ART = {
  BERMUDA: '../assets/bm.png',
  PURGATORIO: '../assets/pg.png',
  KALAHARI: '../assets/kh.png',
  NEXTERRA: '../assets/nt.png'
};

const SQUAD_PLAYER_BACKGROUNDS = {
  OFICIAL: 'assets/player-bg.png',
  TIER: 'assets/player-bg-tier.png',
  GIRLS: 'assets/player-bg-girls.png',
  GOLD: 'assets/player-bg-gold.png'
};

// 🔥 NUEVO: funciones auxiliares centralizadas para assets por squad
function getMvpBgImage(squad) {
  const mvpBgMap = {
    'OFICIAL': '../assets/designmvp.png',
    'TIER': '../assets/designmvptier.png',
    'GIRLS': '../assets/designmvpgirls.png',
    'GOLD': '../assets/designmvpgold.png'
  };
  return mvpBgMap[squad] || mvpBgMap.OFICIAL;
}

function getMvpOverlayImage(squad) {
  const overlayMap = {
    'OFICIAL': '../assets/tf.png',
    'TIER': '../assets/tftier.png',
    'GIRLS': '../assets/tfgirls.png',
    'GOLD': '../assets/tfgold.png'
  };
  return overlayMap[squad] || overlayMap.OFICIAL;
}

function getClosingLogo(squad) {
  const logoMap = {
    'OFICIAL': 'logo-oficial.png',
    'TIER': 'logo-tier.png',
    'GIRLS': 'logo-girls.png',
    'GOLD': 'logo-gold.png'
  };
  return logoMap[squad] || logoMap.OFICIAL;
}

const ICON_KILLS = '<img width="20" height="20" src="https://img.icons8.com/glyph-neue/64/down.png" alt="">';
const ICON_ASSISTS = '<img width="30" height="30" src="https://img.icons8.com/sf-regular-filled/48/define-location.png" alt="">';
const ICON_DAMAGE = '<svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="23" height="23" aria-hidden="true"><path d="M12 2 5 5v6c0 5 3.5 8.5 7 11 3.5-2.5 7-6 7-11V5l-7-3z"/><path d="M13 5 10 10l3 1-2 4 3 1-2 4"/></svg>';

const ROLE_ABBREVIATIONS = {
  'SIN ROL ASIGNADO': 'SR',
  'L1 (ENTRY)': 'L1',
  'L2 (SUPPORT)': 'L2',
  'L3 (FLEX)': 'L3',
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
  FLEX: 'FX',
  GRANADERO: 'GR',
  SOPORTE: 'SP',
  TITULAR: 'TI'
};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no registrada' : date.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

function formatPlayerStat(value, suffix = '') {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString('es-CO')}${suffix}` : '—';
}

function getRoleAbbreviation(role) {
  const normalizedRole = String(role || 'Sin rol asignado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  return ROLE_ABBREVIATIONS[normalizedRole] || 'SR';
}

function formatSessionDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no registrada';

  const dateLabel = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(date);
  const timeFormat = timeZone => new Intl.DateTimeFormat('es-CO', {
    timeZone, hour: '2-digit', minute: '2-digit'
  }).format(date);

  return `${dateLabel} · ${timeFormat('America/Mexico_City')} MX / ${timeFormat('America/Bogota')} CO`;
}

function getBestRoomPlayer(room) {
  return [...(room.players || [])].sort((first, second) => {
    const performanceDiff = Number(second.performanceScore || 0) - Number(first.performanceScore || 0);
    return performanceDiff || Number(second.kills || 0) - Number(first.kills || 0);
  })[0];
}

function samePlayer(player, playerId, playerName) {
  if (playerId && String(player.playerId || player.id || '') === String(playerId)) return true;
  return String(player.matchedName || player.gameName || '').trim().toLowerCase() === String(playerName || '').trim().toLowerCase();
}

function renderRoster(players, defaultAvatar, squad) {
  const target = document.getElementById('home-roster-list');
  const metric = document.getElementById('home-roster-metric');
  if (!target || !metric) return;

  const activePlayers = players.filter(player => player.isActive !== false && player.isVisible !== false);
  const roster = (activePlayers.length ? activePlayers : players)
    .slice()
    .sort((first, second) => (second.stats?.avgPerformance || 0) - (first.stats?.avgPerformance || 0));
  const playerBackground = SQUAD_PLAYER_BACKGROUNDS[squad] || SQUAD_PLAYER_BACKGROUNDS.OFICIAL;
  metric.textContent = roster.length.toLocaleString('es-CO');

  if (!roster.length) {
    target.innerHTML = '<p class="command-empty">Aún no hay jugadores disponibles para este squad.</p>';
    return;
  }

  target.innerHTML = roster.map((player, index) => {
    const portrait = player.photo || defaultAvatar;
    const stats = player.stats || {};
    const performance = Number(stats.avgPerformance);
    const performanceValue = Number.isFinite(performance) ? Math.round(performance) : null;
    const performanceWidth = performanceValue === null ? 0 : Math.max(0, Math.min(performanceValue, 100));
    const photo = portrait ? `<img src="${escapeHTML(portrait)}" alt="${escapeHTML(player.gameName || 'Jugador UZX')}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">` : '';
    const flagBadge = FLAGS[player.country]
      ? `<span class="roster-unit__flag-badge"><img src="${FLAGS[player.country]}" alt="${escapeHTML(player.country)}"></span>`
      : '';
    const role = player.role || 'Sin rol asignado';
    return `
      <article class="roster-unit" style="--roster-order:${index}">
        <div class="roster-unit__portrait" style="background-image:url('${playerBackground}');background-size:cover;background-position:center">
          ${photo}
          <span class="roster-unit__fallback" ${portrait ? 'hidden' : ''}>${escapeHTML(String(player.gameName || 'UZX').slice(0, 2).toUpperCase())}</span>
          ${flagBadge}
          <span class="roster-unit__role-badge" title="${escapeHTML(role)}" aria-label="Rol: ${escapeHTML(role)}">${getRoleAbbreviation(role)}</span>
          <span class="roster-unit__number">${String(index + 1).padStart(2, '0')}</span>
        </div>
        <div class="roster-unit__copy">
          <h3>${escapeHTML(player.gameName || 'Sin identificador')}</h3>
          <div class="roster-unit__performance">
            <div><span>Rendimiento</span><strong>${formatPlayerStat(performanceValue, '%')}</strong></div>
            <i><b style="width:${performanceWidth}%"></b></i>
          </div>
        </div>
        <div class="roster-unit__stats">
          <div class="roster-unit__stat">
            <div class="roster-unit__stat-icon">${ICON_KILLS}</div>
            <div class="roster-unit__stat-value">${formatPlayerStat(stats.totalKills)}</div>
            <div class="roster-unit__stat-label">Bajas</div>
          </div>
          <div class="roster-unit__stat">
            <div class="roster-unit__stat-icon">${ICON_ASSISTS}</div>
            <div class="roster-unit__stat-value">${formatPlayerStat(stats.totalAssists)}</div>
            <div class="roster-unit__stat-label">Asist.</div>
          </div>
          <div class="roster-unit__stat">
            <div class="roster-unit__stat-icon roster-unit__stat-icon--damage">${ICON_DAMAGE}</div>
            <div class="roster-unit__stat-value">${formatPlayerStat(stats.totalDamage)}</div>
            <div class="roster-unit__stat-label">Daño</div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderOperations(scrims, players, defaultAvatar, squad) {
  const target = document.getElementById('home-operations-data');
  if (!target) return;

  const latest = scrims.slice().sort((a, b) => new Date(b.dateUtc || 0) - new Date(a.dateUtc || 0))[0];
  if (!latest) {
    target.innerHTML = '<p class="command-empty">No hay jornadas registradas para este squad.</p>';
    return;
  }

  const rooms = latest.rooms || [];
  const summary = latest.summary || {};
  const value = (entry, suffix = '') => Number.isFinite(Number(entry)) ? `${Number(entry).toLocaleString('es-CO')}${suffix}` : '—';
  const mvpName = summary.mvpPlayerName || 'Jugador destacado';
  const mvpPlayer = players.find(player => samePlayer(player, summary.mvpPlayerId, mvpName));
  const mvpRoomStats = rooms.flatMap(room => room.players || []).filter(player => samePlayer(player, summary.mvpPlayerId, mvpName));
  const mvpTotals = mvpRoomStats.reduce((totals, player) => ({
    kills: totals.kills + Number(player.kills || 0),
    assists: totals.assists + Number(player.assists || 0),
    damage: totals.damage + Number(player.damage || 0)
  }), { kills: 0, assists: 0, damage: 0 });
  const mvpPhoto = mvpPlayer?.photo || defaultAvatar;
  const bestPosition = rooms.reduce((best, room) => {
    const position = Number(room.position);
    return Number.isFinite(position) && position > 0 && (!best || position < best) ? position : best;
  }, 0);

  target.innerHTML = `
    <article class="operation-record">
      <div class="operation-record__lead">
        <p class="command-kicker">Actividad más reciente</p>
        <h3>Sesión de práctica</h3>
      </div>
      <div class="operation-record__topbar">
        <p class="operation-record__date">${formatSessionDateTime(latest.dateUtc)}</p>
        <dl class="operation-record__metrics">
          <div><dt>Bajas registradas</dt><dd>${value(summary.totalKills)}</dd></div>
          <div><dt>Rendimiento medio</dt><dd>${value(summary.avgTeamPerformance, '%')}</dd></div>
          <div><dt>Mapas jugados</dt><dd>${value(rooms.length)}</dd></div>
          <div><dt>Mejor posición</dt><dd>${bestPosition ? `#${bestPosition}` : '—'}</dd></div>
        </dl>
        <button class="command-button command-button--quiet operation-record__button" type="button" data-open-scrim="${escapeHTML(latest.id || '')}">
          Abrir jornada <span aria-hidden="true">↗</span>
        </button>
      </div>
      <aside class="operation-record__mvp" aria-label="MVP de la jornada">
        <p class="operation-record__mvp-label">MVP de la jornada</p>
        <div class="mvp-card-pro" style="background-image: url('${getMvpBgImage(squad)}')">
          <div class="mvp-card-pro-overlay" style="background-image: url('${getMvpOverlayImage(squad)}')"></div>
          <div class="mvp-photo-overlay">
            ${mvpPhoto ? `<img src="${escapeHTML(mvpPhoto)}" alt="${escapeHTML(mvpName)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false">` : ''}
            <div class="mvp-photo-placeholder" ${mvpPhoto ? 'hidden' : ''}>${escapeHTML(mvpName.charAt(0).toUpperCase())}</div>
          </div>
          <div class="mvp-stats-overlay">
            <div class="mvp-stat-num-overlay mvp-stat-elims">${value(mvpTotals.kills || summary.mvpKills || 0)}</div>
            <div class="mvp-stat-num-overlay mvp-stat-asist">${value(mvpTotals.assists)}</div>
            <div class="mvp-stat-num-overlay mvp-stat-dano">${value(mvpTotals.damage)}</div>
          </div>
          <div class="operation-record__mvp-identity">
            <strong>${escapeHTML(mvpName)}</strong>
          </div>
        </div>
        <div class="operation-record__mvp-squad">UZX ${escapeHTML(latest.squad || squad)}</div>
      </aside>
      <div class="operation-record__maps" aria-label="Resumen por mapa">
        ${rooms.length ? rooms.map(room => {
          const bestPlayer = getBestRoomPlayer(room);
          const performance = Number(bestPlayer?.performanceScore || 0);
          return `
            <article class="operation-map" style="--map-image:${MAP_ART[room.mapName] ? `url('${MAP_ART[room.mapName]}')` : 'none'}">
              <div class="operation-map__header"><strong>${escapeHTML(room.mapName || 'Mapa')}</strong><span>Pos. #${value(room.position)}/${value(room.totalTeams)}</span></div>
              <div class="operation-map__footer">
                <span class="operation-map__team"><small>Equipo</small><b>${value(room.roomKills)} bajas</b></span>
                <span class="operation-map__best"><small>MVP del mapa</small><b>${escapeHTML(bestPlayer?.matchedName || bestPlayer?.gameName || 'Sin datos')} · ${value(bestPlayer?.kills)} bajas · ${value(performance, '%')}</b></span>
              </div>
            </article>
          `;
        }).join('') : '<span class="operation-record__no-map">Sin mapas registrados</span>'}
      </div>
      <div class="operation-record__footer">
        <span>${rooms.length} mapa${rooms.length === 1 ? '' : 's'} registrados · ${value(summary.totalKills)} bajas de equipo</span>
      </div>
    </article>
  `;

  const existingListener = target._openScrimListener;
  if (existingListener) {
    target.removeEventListener('click', existingListener);
  }
  
  const openScrimHandler = (e) => {
    const btn = e.target.closest('[data-open-scrim]');
    if (btn && latest.id) {
      window.App.openScrimDetail(latest.id);
    }
  };
  
  target._openScrimListener = openScrimHandler;
  target.addEventListener('click', openScrimHandler);
}

const HomePage = {
  _initialized: false,
  _heroMounted: false,
  _listenersConfigured: false,
  _cachedViewRestored: false,
  _isLoading: false,
  _squadChanging: false,

  invalidateCache() {
    _dataCache.players = null;
    _dataCache.scrims = null;
    _dataCache.squad = null;
    _dataCache.timestamp = null;
    this._initialized = false;
    this._heroMounted = false;
    this._cachedViewRestored = false;
    this._isLoading = false;
    this._squadChanging = false;
  },

  _setCachedData(players, scrims, squad) {
    _dataCache.players = players;
    _dataCache.scrims = scrims;
    _dataCache.squad = squad;
    _dataCache.timestamp = Date.now();
  },

  _showLoadingOverlay() {
    let overlay = document.getElementById('home-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'home-loading-overlay';
      overlay.innerHTML = `
        <div class="loading-spinner-container">
          <div class="loading-spinner"></div>
          <p class="loading-text">Cargando roster...</p>
        </div>
      `;
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(7, 9, 12, 0.75);
        backdrop-filter: blur(3px);
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    void overlay.offsetWidth; // Forzar reflow para la transición
    overlay.style.opacity = '1';
  },

  _hideLoadingOverlay() {
    const overlay = document.getElementById('home-loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
  },

  // 🔥 Renderizar el panel del roster dentro de la sección "home-story"
  // (el contenedor #hero-roster-panel ya existe en el HTML de render(),
  // ocupando el slot donde antes iba .command-story__signal)
  _renderHeroRosterPanel(players, squad, scrims) {
    const squadColors = {
      OFICIAL: { primary: '#10b981' },
      TIER: { primary: '#3b82f6' },
      GIRLS: { primary: '#ec4899' },
      GOLD: { primary: '#f59e0b' }
    };

    const rosterContainer = document.getElementById('hero-roster-panel');
    if (!rosterContainer) return;

    rosterContainer.innerHTML = HeroRoster.render(players, squadColors[squad], scrims, squad);
  },
  
  async render() {
    const squad = State.squad;
    
    return `
      <div class="command-center" data-squad="${squad}">
        ${HeroSection.render()}
        
        <!-- Skeleton -->
        <div class="home-skeleton" id="home-skeleton">
          <div class="skeleton-story"></div>
          <div class="skeleton-roster">
            <div class="skeleton-roster-item"></div>
            <div class="skeleton-roster-item"></div>
            <div class="skeleton-roster-item"></div>
          </div>
          <div class="skeleton-operations"></div>
        </div>
        
        <!-- Sección 1: Story -->
        <section class="command-story" id="home-story" style="display:none" aria-labelledby="command-story-title">
          <div class="command-story__frame">
            <p class="command-kicker">UZX / Protocolo competitivo</p>
            <h2 id="command-story-title">EL EQUIPO EMPIEZA CUANDO NADIE ESTÁ MIRANDO.</h2>
            <p class="command-story__statement">La confianza no es una pose. Es la consecuencia de repetir lo esencial hasta que cada decisión sea instantánea.</p>
          </div>
          <div class="command-story__roster" id="hero-roster-panel"></div>
          
          <button class="command-hero__scroll" type="button" data-home-scroll="home-roster" aria-label="Continuar hacia el roster">
            <span>Continuar</span><i aria-hidden="true"></i>
          </button>
        </section>

        <!-- Sección 2: Roster -->
        <section class="roster-field" id="home-roster" style="display:none" aria-labelledby="roster-field-title">
          <header class="command-section-heading">
            <div>
              <p class="command-kicker">UZX ${squad}</p>
              <h2 id="roster-field-title">LAS PERSONAS<br>DETRÁS DE LA PRESIÓN.</h2>
            </div>
            <div class="command-section-heading__metric"><strong id="home-roster-metric">—</strong><span>integrantes activos</span></div>
          </header>
          <div class="roster-field__line" aria-hidden="true"></div>
          <div class="roster-field__list" id="home-roster-list" aria-live="polite"></div>
          <button class="command-text-link" type="button" data-home-action="players">Ver perfiles de jugadores <span aria-hidden="true">→</span></button>
          
          <button class="command-hero__scroll" type="button" data-home-scroll="home-operations" aria-label="Continuar hacia actividad">
            <span>Continuar</span><i aria-hidden="true"></i>
          </button>
        </section>

        <!-- Sección 3: Operations -->
        <section class="operations-deck" id="home-operations" style="display:none" aria-labelledby="operations-title">
          <header class="operations-deck__heading">
            <p class="command-kicker">Registro operativo</p>
            <h2 id="operations-title">EL TRABAJO<br>DEJA RASTRO.</h2>
          </header>
          <div id="home-operations-data" class="operations-deck__data" aria-live="polite"></div>
          <button class="command-text-link" type="button" data-home-action="scrims">Ir a jornadas <span aria-hidden="true">→</span></button>
          
          <button class="command-hero__scroll" type="button" data-home-scroll="home-closing" aria-label="Continuar hacia accesos">
            <span>Continuar</span><i aria-hidden="true"></i>
          </button>
        </section>

        <!-- Sección 4: Closing -->
        <section class="command-closing" style="display:none" aria-label="Accesos de UZX" id="home-closing">
          <div class="command-closing__mark" aria-hidden="true"><img src="assets/${getClosingLogo(squad)}" alt=""></div>
          <div>
            <p class="command-kicker">UZX ${squad}</p>
            <h2>PREPARADOS<br>PARA RESPONDER.</h2>
          </div>
          <div class="command-closing__links">
            <button class="command-button command-button--primary" type="button" data-home-action="players">Jugadores <span aria-hidden="true">↗</span></button>
            <button class="command-button command-button--quiet" type="button" data-home-action="announcements">Comunicados <span aria-hidden="true">↗</span></button>
          </div>
          
          <button class="command-hero__scroll" type="button" data-home-scroll="command-hero" aria-label="Volver arriba">
            <span>Volver arriba</span><i aria-hidden="true"></i>
          </button>
        </section>
      </div>
    `;
  },

  async afterRender(abortController) {
    const signal = abortController?.signal;
    const squad = State.squad;
    
    if (!this._listenersConfigured) {
      document.querySelectorAll('[data-home-action]').forEach(button => {
        button.addEventListener('click', () => window.App.navigate(button.dataset.homeAction));
      });
      
      document.querySelectorAll('[data-home-scroll]').forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = button.dataset.homeScroll;
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
      
      this._listenersConfigured = true;
    }
    
    const cached = this._getCachedData();
    // 🔥 Verificamos si hay datos en caché pero de un squad diferente
    const isSquadMismatch = cached && cached.squad && cached.squad !== squad;
    const isViewRestoredFromCache = this._initialized && !this._cachedViewRestored;
    
    // 🔥 Si hay un mismatch de squad, mostramos el modal y reutilizamos los datos antiguos como fondo
    if (isSquadMismatch) {
      this._showLoadingOverlay();
      
      // Reutilizar la UI anterior para que no se vea el skeleton/vacío
      // PASAMOS 'false' para NO ocultar el overlay todavía
      if (this._initialized) {
        this._updateUI(cached.players, cached.scrims, cached.squad, false);
      }
    } else if (isViewRestoredFromCache && this._squadChanging) {
      this._showLoadingOverlay();
    }
    
    // Si está inicializado, NO hay mismatch, y el hero está montado, usar caché directamente
    if (this._initialized && !isSquadMismatch && !isViewRestoredFromCache && this._heroMounted) {
      if (cached && !this._isCacheStale()) {
        this._updateUI(cached.players, cached.scrims, squad);
        return;
      }
    }
    
    if (isViewRestoredFromCache) {
      this._heroMounted = false;
      this._cachedViewRestored = true;
    }
    
    // Forzar remontaje del hero si cambió el squad
    if (isSquadMismatch) {
      this._heroMounted = false;
    }
    
    // Cargar los datos nuevos en segundo plano
    const data = await this._loadData(squad, signal);
    if (signal?.aborted) return;
    
    // Guardar en caché
    this._setCachedData(data.players, data.scrims, squad);
    
    // Actualizar la UI con los datos nuevos (esto ahora SÍ ocultará el modal)
    this._updateUI(data.players, data.scrims, squad, true);
    
    this._initialized = true;
    this._cachedViewRestored = true;
    this._squadChanging = false;
  },
  
  _getCachedData() {
    if (_dataCache.players && _dataCache.scrims) {
      return {
        players: _dataCache.players,
        scrims: _dataCache.scrims,
        squad: _dataCache.squad
      };
    }
    return null;
  },
  
  _isCacheStale() {
    if (!_dataCache.timestamp) return true;
    return Date.now() - _dataCache.timestamp > _dataCache.ttl;
  },
  
  async _loadData(squad, signal) {
    await loadDefaultAvatar();
    if (signal?.aborted) return { players: [], scrims: [] };
    
    const [playersResult, scrimsResult] = await Promise.allSettled([
      API.get(`/players?squad=${encodeURIComponent(squad)}`),
      API.get(`/scrims?limit=all`)
    ]);
    
    if (signal?.aborted) return { players: [], scrims: [] };
    
    const players = playersResult.status === 'fulfilled' ? (playersResult.value.data || []) : [];
    const scrims = scrimsResult.status === 'fulfilled' ? (scrimsResult.value.data || []) : [];
    
    if (playersResult.status === 'rejected') console.warn('No se pudieron cargar los jugadores de portada.', playersResult.reason);
    if (scrimsResult.status === 'rejected') console.warn('No se pudieron cargar las jornadas de portada.', scrimsResult.reason);
    
    return { players, scrims };
  },
  
  _updateUI(players, scrims, squad, hideOverlay = true) {
    // 🔥 Ocultar overlay de carga SOLO si se indica (por defecto sí)
    if (hideOverlay) {
      this._hideLoadingOverlay();
    }
    
    const defaultAvatar = getDefaultAvatar();
    
    document.querySelectorAll('#home-story, #home-roster, #home-operations, .command-closing').forEach(el => {
      el.style.display = '';
    });
    
    const skeleton = document.getElementById('home-skeleton');
    if (skeleton) skeleton.style.display = 'none';
    
    const heroElement = document.getElementById('command-hero');
    const needsHeroMount = !this._heroMounted || !heroElement || heroElement.children.length === 0;
    
    if (needsHeroMount) {
      HeroSection.mount(players, scrims, null);
      this._heroMounted = true;
    } else {
      HeroSection.mount(players, scrims, null);
    }
    
    // 🔥 NUEVO: Renderizar el panel del roster dentro del Hero
    this._renderHeroRosterPanel(players, squad, scrims);
    
    renderRoster(players, defaultAvatar, squad);
    
    const ownSquadScrims = scrims.filter(s => s.squad === squad);
    renderOperations(ownSquadScrims, players, defaultAvatar, squad);
  },

  // 🔥 NUEVO: Actualiza el contenido sin destruir el DOM existente
  updateSquadContent(squad, players, scrims) {
    const defaultAvatar = getDefaultAvatar();
    
    // 1. Actualizar atributo del contenedor principal
    const commandCenter = document.querySelector('.command-center');
    if (commandCenter) {
      commandCenter.dataset.squad = squad;
    }
    
    // 2. Actualizar textos específicos del squad (evita tocar "UZX / Protocolo...")
    const kickers = document.querySelectorAll('.command-kicker');
    kickers.forEach(el => {
      const text = el.textContent.trim();
      if (/^UZX\s+(OFICIAL|TIER|GIRLS|GOLD)$/i.test(text)) {
        el.textContent = `UZX ${squad}`;
      }
    });
    
    // 3. Actualizar logos del closing section
    const closingMark = document.querySelector('.command-closing__mark img');
    if (closingMark) {
      closingMark.src = `assets/${getClosingLogo(squad)}`;
    }
    
    // 4. Actualizar toda la UI con los nuevos datos (esto también oculta el skeleton y muestra las secciones)
    this._updateUI(players, scrims, squad);
    
    // 5. Marcar como inicializado
    this._initialized = true;
    this._cachedViewRestored = true;
    this._squadChanging = false;
  }
};

export default HomePage;