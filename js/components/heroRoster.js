// js/components/heroRoster.js
import { getDefaultAvatar } from '../core/avatar.js';

const MAP_ART = {
  BERMUDA: '../assets/bm.png',
  PURGATORIO: '../assets/pg.png',
  KALAHARI: '../assets/kh.png',
  NEXTERRA: '../assets/nt.png'
};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function renderHeroRoster(players, squadColors, scrims = [], squad = 'OFICIAL') {
  if (!players || players.length === 0) {
    return `
      <div class="hero-roster-empty">
        <span>Sin jugadores registrados</span>
      </div>
    `;
  }

  const defaultAvatar = getDefaultAvatar();

  const sorted = [...players]
    .filter(p => p.isActive !== false && p.isVisible !== false)
    .sort((a, b) => (b.stats?.avgPerformance || 0) - (a.stats?.avgPerformance || 0))
    .slice(0, 6);

  const squadKey = String(squad).toUpperCase();
  const squadScrims = scrims.filter(scrim => String(scrim.squad || squadKey).toUpperCase() === squadKey);
  const mapPool = new Map();

  squadScrims.forEach(scrim => {
    (scrim.rooms || []).forEach(room => {
      const name = String(room.mapName || '').toUpperCase();
      if (!MAP_ART[name]) return;
      const entry = mapPool.get(name) || { name, sessions: 0, positions: [], kills: 0 };
      entry.sessions += 1;
      if (Number(room.position) > 0) entry.positions.push(Number(room.position));
      entry.kills += Number(room.roomKills || 0);
      mapPool.set(name, entry);
    });
  });

  const featuredMaps = [...mapPool.values()]
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))
    .slice(0, 4);

  // === CAMBIO AQUÍ: Si no hay mapas, generamos 4 elementos vacíos ===
  const mapPoolHTML = (() => {
    // Si hay mapas, los mostramos normalmente
    if (featuredMaps.length > 0) {
      return `
        <section class="hero-roster-map-pool" aria-label="Map pool del equipo">
          <div class="hero-roster-map-pool__heading">
            <span>Map pool</span><small>Mapas más trabajados</small>
          </div>
          <div class="hero-roster-map-pool__list">
            ${featuredMaps.map(map => {
              // Cálculo de porcentaje basado en la posición media
              let performancePercentage = 0;
              let avgPositionDisplay = 'Sin posición';

              if (map.positions.length > 0) {
                const avgPosition = map.positions.reduce((total, pos) => total + pos, 0) / map.positions.length;
                // Fórmula: ( (Número de equipos - Posición media) / (Número de equipos - 1) ) * 100
                // Asumimos que el máximo de equipos por partida es 16 (Free Fire estándar)
                const maxTeams = 16;
                const rawPercentage = ((maxTeams - avgPosition) / (maxTeams - 1)) * 100;
                performancePercentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));
                avgPositionDisplay = `Pos. media #${Math.round(avgPosition)}`;
              }

              return `
                <article class="hero-roster-map operation-map" style="--map-image:url('${MAP_ART[map.name]}')">
                  <div class="operation-map__header">
                    <strong>${escapeHTML(map.name)}</strong>
                    <span>${map.sessions} ${map.sessions === 1 ? 'partida' : 'partidas'}</span>
                  </div>
                  <div class="operation-map__footer">
                    <span class="operation-map__team"><small>Equipo</small><b>${map.kills} bajas</b></span>
                    <span class="operation-map__best"><small>Rendimiento del mapa</small><b>${performancePercentage}% (${avgPositionDisplay})</b></span>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </section>
      `;
    }

    // SI NO HAY MAPAS: Mostramos 4 bloques vacíos con el diseño intacto
    const emptyMaps = Array(4).fill(0);
    return `
      <section class="hero-roster-map-pool" aria-label="Map pool del equipo">
        <div class="hero-roster-map-pool__heading">
          <span>Map pool</span><small>Sin partidas registradas</small>
        </div>
        <div class="hero-roster-map-pool__list">
          ${emptyMaps.map(() => `
            <article class="hero-roster-map operation-map" style="--map-image: none; background: rgba(0,0,0,0.3);">
              <div class="operation-map__header">
                <strong style="opacity: 0.4;">—</strong>
                <span style="opacity: 0.2;">0 partidas</span>
              </div>
              <div class="operation-map__footer">
                <span class="operation-map__team"><small>Equipo</small><b style="opacity: 0.2;">0 bajas</b></span>
                <span class="operation-map__best"><small>Rendimiento del mapa</small><b style="opacity: 0.3;">Sin datos</b></span>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  })();

  const positions = [
    { slot: 5, grid: 'left-4' },
    { slot: 3, grid: 'left-3' },
    { slot: 1, grid: 'left-2' },
    { slot: 0, grid: 'mvp' },
    { slot: 2, grid: 'right-2' },
    { slot: 4, grid: 'right-3' }
  ];

  const playersHTML = positions.map(pos => {
    const player = sorted[pos.slot];
    if (!player) return '';

    const photo = player.photo || defaultAvatar;
    const name = player.gameName || 'Jugador';
    const isMvp = pos.grid === 'mvp';

    return `
      <div class="hero-roster-player hero-roster-${pos.grid}">
        <div class="hero-roster-player-photo ${isMvp ? 'is-mvp' : ''}">
          <img src="${photo}" alt="${name}" loading="lazy" decoding="async" />
        </div>
      </div>
    `;
  }).join('');

  const ROSTER_BG = {
    OFICIAL: '/assets/fd-rooster-oficial.png',
    TIER: '/assets/fd-rooster-tier.png',
    GIRLS: '/assets/fd-rooster-girls.png'
  };
  const rosterBgImage = ROSTER_BG[squadKey] || ROSTER_BG.OFICIAL;

  return `
    <div class="hero-roster-container" style="--roster-accent: ${squadColors?.primary || '#10b981'}; --roster-bg-image: url('${rosterBgImage}')">
      <header class="hero-roster-brief">
        <p>UZX ${escapeHTML(squadKey)} / Unidad competitiva</p>
        <h3>ROSTER PRINCIPAL</h3>
        <span>Formación ordenada por rendimiento interno</span>
        <dl>
          <div><dt>Jornadas</dt><dd>${squadScrims.length}</dd></div>
          <div><dt>Mapas</dt><dd>${mapPool.size}</dd></div>
        </dl>
      </header>
      <div class="hero-roster-stage">
        <div class="hero-roster-grid">
          ${playersHTML}
        </div>
      </div>
      ${mapPoolHTML}
    </div>
  `;
}

const HeroRoster = {
  render(players, squadColors, scrims, squad) {
    return renderHeroRoster(players, squadColors, scrims, squad);
  }
};

export default HeroRoster;