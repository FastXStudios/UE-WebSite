// mapPerformance.js
import API from '../core/api.js';
import { loadDefaultAvatar, getDefaultAvatar } from '../core/avatar.js';

const MapPerformance = (() => {
  const MAPS = ['BERMUDA', 'PURGATORIO', 'KALAHARI', 'NEXTERRA'];

  const MAP_META = {
    BERMUDA: { color: '#10b981', art: 'mp-art-BERMUDA', image: 'assets/bm.png' },
    PURGATORIO: { color: '#ef4444', art: 'mp-art-PURGATORIO', image: 'assets/pg.png' },
    KALAHARI: { color: '#f59e0b', art: 'mp-art-KALAHARI', image: 'assets/kh.png' },
    NEXTERRA: { color: '#3b82f6', art: 'mp-art-NEXTERRA', image: 'assets/nt.png' },
  };

  const MAP_ICON = {
    BERMUDA: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    PURGATORIO: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    KALAHARI: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/></svg>`,
    NEXTERRA: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  };

  const _overviewCache = new Map();
  const _playerCache = new Map();
  const _photoCache = new Map();

  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short' });
  }

  function fmtDateLong(d) {
    const date = new Date(d);
    const dateStr = date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = date.toLocaleTimeString('es', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Mexico_City'
    });
    return `${dateStr} · ${time}`;
  }

// Agrupar el breakdown por scrimId (CORREGIDO)
function groupBreakdownByScrim(breakdown) {
  const grouped = new Map();
  for (const item of breakdown) {
    const key = item.scrimId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        scrimId: item.scrimId,
        dateUtc: item.dateUtc,
        opponent: item.opponent,
        mvpPlayerName: item.mvpPlayerName || null, // 🔥 AGREGAR MVP
        maps: [],
        totalKills: 0,
        totalDamage: 0,
        performances: [],
      });
    }
    const group = grouped.get(key);
    group.maps.push(item);
    group.totalKills += item.kills;
    group.totalDamage += item.damage;
    group.performances.push(item.performanceScore);
  }
  return Array.from(grouped.values());
}

  // ============================================================
  // 1. OVERVIEW
  // ============================================================
  async function mountOverview(container, squad, opts = {}) {
    const topN = opts.topN || 3;
    container.innerHTML = `<div class="mp-loading-block">Cargando rendimiento por mapa...</div>`;

    try {
      // Cargar avatar default primero
      await loadDefaultAvatar();

      const cacheKey = squad || 'ALL';
      let data = _overviewCache.get(cacheKey);
      if (!data) {
        const res = await API.get(`/scrims/map-overview${squad ? `?squad=${squad}` : ''}`);
        data = res.data;
        _overviewCache.set(cacheKey, data);
      }

      // 🔥 OBTENER SOLO LOS JUGADORES DEL SQUAD ACTIVO
      let squadPlayers = [];
      try {
        const playersRes = await API.get(`/players?squad=${squad}`);
        squadPlayers = playersRes.data || [];
      } catch (e) {
        console.warn('No se pudieron cargar los jugadores:', e);
      }

      // 🔥 FILTRAR: Solo incluir jugadores del squad activo
      if (squadPlayers.length > 0) {
        const squadPlayerIds = new Set(squadPlayers.map(p => p.id));
        data = data.map(entry => ({
          ...entry,
          topPlayers: (entry.topPlayers || []).filter(p => squadPlayerIds.has(p.playerId))
        }));
      } else {
        // Si no hay jugadores del squad, vaciar los datos
        data = data.map(entry => ({
          ...entry,
          topPlayers: []
        }));
      }

      // Cargar fotos de jugadores (solo del squad activo)
      const playerIds = new Set();
      for (const entry of (data || [])) {
        for (const p of (entry.topPlayers || [])) {
          if (p.playerId && !_photoCache.has(p.playerId)) playerIds.add(p.playerId);
        }
      }
      if (playerIds.size > 0) {
        try {
          const res = await API.get(`/players?squad=${squad || ''}`);
          for (const player of (res.data || [])) {
            if (player.id && player.photo) _photoCache.set(player.id, player.photo);
          }
        } catch (e) { }
      }

      renderOverview(container, data, topN);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${esc(e.message)}</p></div>`;
    }
  }

  function renderOverview(container, entries, topN) {
    if (!Array.isArray(entries)) entries = [];
    const byMap = new Map(entries.map(e => [e.mapName, e]));
    const defaultAvatar = getDefaultAvatar();

    container.innerHTML = `
      <div class="mp-overview-grid">
        ${MAPS.map(mapName => {
      const meta = MAP_META[mapName];
      const entry = byMap.get(mapName);
      const players = (entry?.topPlayers || [])
        .slice()
        .sort((a, b) => b.avgPerformance - a.avgPerformance)
        .slice(0, topN);
      const totalGames = players.reduce((s, p) => s + (p.gamesPlayed || 0), 0);

      return `
          <div class="mp-map-card" style="--mp-accent:${meta.color}">
            <div class="mp-map-banner ${meta.art}" style="background-image: url('${meta.image}')">
              <div class="mp-map-label">
                <span class="mp-map-name">${mapName}</span>
                <span class="mp-map-count">${totalGames} partidas</span>
              </div>
            </div>
            <div class="mp-rank-list">
              ${players.length === 0
          ? `<div class="mp-empty-row">Sin datos registrados</div>`
          : players.map((p, i) => {
            const hasPhoto = _photoCache.has(p.playerId);
            const photoUrl = hasPhoto ? _photoCache.get(p.playerId) : defaultAvatar;

            return `
                  <div class="mp-rank-row" data-rank="${i + 1}">
                    <div class="mp-rank-pos">${i + 1}</div>
                    ${photoUrl
                ? `<img class="mp-rank-avatar-img" src="${photoUrl}" alt="${esc(p.gameName)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                         <div class="mp-rank-avatar-fallback" style="display:none">${esc((p.gameName || '?').charAt(0).toUpperCase())}</div>`
                : `<div class="mp-rank-avatar-fallback">${esc((p.gameName || '?').charAt(0).toUpperCase())}</div>`
              }
                    <div>
                      <div class="mp-rank-name" title="ID: ${esc(p.playerId || 'N/A')}">${esc(p.gameName || 'Desconocido')}</div>
                      <div class="mp-rank-games">${p.gamesPlayed || 0} partida${p.gamesPlayed === 1 ? '' : 's'}</div>
                    </div>
                    <div class="mp-rank-score" style="color:${meta.color}">${p.avgPerformance || 0}%</div>
                  </div>
                `}).join('')
        }
            </div>
          </div>`;
    }).join('')}
      </div>
    `;
  }

  // ============================================================
  // 2. PLAYER DRILLDOWN
  // ============================================================
  async function mountPlayerDetail(container, playerId, opts = {}) {
    container.innerHTML = `<div class="mp-loading-block">Cargando rendimiento del jugador...</div>`;
  
    try {
      await loadDefaultAvatar();
      
      let data = _playerCache.get(playerId);
      if (!data) {
        const res = await API.get(`/scrims/players/${playerId}/map-performance`);
        data = res.data;
        _playerCache.set(playerId, data);
      }
      
      // 🔥 PASAR LA FOTO DESDE opts
      renderPlayerDetail(container, data, { photo: opts.photo || null });
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${esc(e.message)}</p></div>`;
    }
  }

  // 🔥 MODIFICAR: renderPlayerDetail (CORREGIDO)
  function renderPlayerDetail(container, data, opts = {}) {
    const { player, mapStats, scrimBreakdown } = data || {};
    const defaultAvatar = getDefaultAvatar();

    // 🔥 Guardar datos del jugador actual
    _currentPlayerData = data;

    // 🔥 Determinar la foto a usar (PRIORIDAD: opts.photo > player.photo > default)
    let photo = opts.photo || null;
    if (!photo && player?.photo) {
      photo = player.photo;
    }
    if (!photo) {
      photo = defaultAvatar;
    }
    // 🔥 Guardar la foto actual
    _currentPhoto = photo;

    const statsByMap = new Map((mapStats || []).map(s => [s.mapName, s]));

    // Actualizar título
    const titleEl = document.getElementById('mp-modal-title');
    if (titleEl && player?.squad) {
      const squadColors = { OFICIAL: '#10b981', TIER: '#3b82f6', GIRLS: '#ec4899', GOLD: '#f59e0b'};
      const color = squadColors[player.squad] || '#10b981';
      titleEl.innerHTML = `Rendimiento por Mapa — Equipo: <span style="color:${color}">UZX ${esc(player.squad)}</span>`;
    }

    const squadBgMap = {
      OFICIAL: 'player-bg.png',
      TIER: 'player-bg-tier.png',
      GIRLS: 'player-bg-girls.png',
      GOLD: 'player-bg-gold.png'
    };
    const bgImage = squadBgMap[player?.squad] || 'player-bg.png';

    // 🔥 HEADER con la foto correcta
    const headerHTML = opts.hideHeader ? '' : `
    <div class="mp-player-hero">
      <div class="mp-player-hero-left" style="background-image: url('../assets/${bgImage}')">
        <div class="mp-player-hero-photo">
          ${photo
        ? `<img src="${photo}" alt="${esc(player?.gameName || '')}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
               <div class="mp-player-hero-avatar" style="display:none">${esc((player?.gameName || '?').charAt(0).toUpperCase())}</div>`
        : `<div class="mp-player-hero-avatar">${esc((player?.gameName || '?').charAt(0).toUpperCase())}</div>`
      }
        </div>
        <div class="mp-player-hero-name">${esc(player?.gameName || 'Desconocido')}</div>
        ${player?.role ? `<div class="mp-player-hero-role">${esc(player.role)}</div>` : ''}
      </div>
      
      <div class="mp-player-hero-right">
        <div class="mp-stat-cards">
          ${MAPS.map(mapName => {
        const meta = MAP_META[mapName];
        const s = statsByMap.get(mapName);
        if (!s) {
          return `
              <div class="mp-stat-card ${meta.art}" style="--mp-accent:${meta.color}; background-image: url('${meta.image}')">
                <div class="mp-stat-card-body">
                  <div class="mp-stat-card-map">${mapName}</div>
                  <div style="font-size:0.68rem;color:rgba(255,255,255,0.7);position:relative;z-index:1">Sin datos</div>
                </div>
              </div>`;
        }
        return `
            <div class="mp-stat-card ${meta.art}" style="--mp-accent:${meta.color}; background-image: url('${meta.image}')">
              <span class="mp-stat-card-range">${s.worstPerformance || 0}–${s.bestPerformance || 0}%</span>
              <div class="mp-stat-card-body">
                <div class="mp-stat-card-map">${mapName}</div>
                <div class="mp-stat-card-grid">
                  <div class="mp-stat-card-metric">
                    <div class="mp-stat-card-val">${s.avgPerformance || 0}%</div>
                    <div class="mp-stat-card-lbl">Rendim.</div>
                  </div>
                  <div class="mp-stat-card-metric">
                      <div class="mp-stat-card-val">${s.totalKills || 0}</div>
                      <div class="mp-stat-card-lbl">Kills</div>
                  </div>
                  <div class="mp-stat-card-metric">
                    <div class="mp-stat-card-val">${s.gamesPlayed || 0}</div>
                    <div class="mp-stat-card-lbl">Mapas</div>
                  </div>
                </div>
              </div>
            </div>`;
      }).join('')}
        </div>
      </div>
    </div>
  `;

    // 🔥 Breakdown con filtros - PASAMOS EL playerId para el filtro MVP
    const playerId = player?.id || null;
    const breakdownHTML = renderCollapsibleBreakdown(scrimBreakdown || [], playerId);

    container.innerHTML = headerHTML + breakdownHTML;

    // 🔥 Adjuntar listeners después de renderizar
    if (scrimBreakdown && scrimBreakdown.length > 0) {
      attachFilterListeners(container, playerId, data, photo);
    }
  }
  // ============================================================
  // NUEVO: RENDER COLAPSABLE DEL HISTORIAL
  // ============================================================

  // 🔥 Estado de filtros y paginación
  let _filters = {
    date: null,          // 🔥 Un solo día
    showOnlyMvp: false,
    page: 1,
    pageSize: 5
  };
  
  let _currentPlayerData = null;
  let _currentPhoto = null;
  let _currentPlayerId = null;


  function renderCollapsibleBreakdown(breakdown, playerId) {
    if (!breakdown || breakdown.length === 0) {
      return `
        <div class="mp-breakdown-wrap">
          <div class="mp-breakdown-head">Historial por Jornada</div>
          <div class="mp-empty-row">Este jugador todavía no tiene scrims registradas</div>
        </div>`;
    }

    const grouped = groupBreakdownByScrim(breakdown);
    grouped.sort((a, b) => new Date(b.dateUtc) - new Date(a.dateUtc));

    // 🔥 Aplicar filtros
    let filtered = [...grouped];

    // 🔥 Filtro por fecha - UN SOLO DÍA
    if (_filters.date) {
      const targetDate = new Date(_filters.date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filtered = filtered.filter(s => {
        const scrimDate = new Date(s.dateUtc);
        return scrimDate >= targetDate && scrimDate < nextDay;
      });
    }

    // 🔥 Filtro por MVP - Usamos el nombre del MVP almacenado en la scrim
    if (_filters.showOnlyMvp && playerId) {
      const playerName = _currentPlayerData?.player?.gameName || '';
      if (playerName) {
        filtered = filtered.filter(scrim => {
          return scrim.mvpPlayerName === playerName;
        });
      }
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / _filters.pageSize) || 1;

    if (_filters.page > totalPages) _filters.page = totalPages;
    if (_filters.page < 1) _filters.page = 1;

    const start = (_filters.page - 1) * _filters.pageSize;
    const end = start + _filters.pageSize;
    const paginated = filtered.slice(start, end);

    // 🔥 HTML de filtros - CAMBIADO a un solo día
    const filtersHTML = `
      <div class="mp-filters-bar">
        <div class="mp-filters-group">
          <label class="mp-filter-label">
            <span>Fecha</span>
            <input type="date" class="mp-filter-date" id="mp-filter-date" value="${_filters.date || ''}" />
          </label>
        </div>
        <div class="mp-filters-group">
          <label class="mp-filter-checkbox">
            <input type="checkbox" id="mp-filter-mvp" ${_filters.showOnlyMvp ? 'checked' : ''} />
            <span>Solo MVP</span>
          </label>
          <button class="mp-filter-clear" id="mp-filter-clear">Limpiar</button>
          <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem">
            ${totalItems} jornada${totalItems !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    `;

    // 🔥 HTML de paginación
    const paginationHTML = totalPages > 1 ? `
      <div class="mp-pagination">
        <button class="mp-pagination-btn" data-page="${_filters.page - 1}" ${_filters.page <= 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Anterior
        </button>
        <span class="mp-pagination-info">
          ${_filters.page} / ${totalPages}
        </span>
        <button class="mp-pagination-btn" data-page="${_filters.page + 1}" ${_filters.page >= totalPages ? 'disabled' : ''}>
          Siguiente
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    ` : '';

    const scrimsHTML = paginated.map((scrim, index) => {
      const avgPerf = scrim.performances.length > 0
        ? Math.round(scrim.performances.reduce((a, b) => a + b, 0) / scrim.performances.length)
        : 0;

      const perfClass = avgPerf >= 65 ? 'hi' : avgPerf >= 40 ? 'md' : 'lo';
      const scrimId = `scrim-group-${_filters.page}-${index}`;

      const sortedMaps = MAPS.map(mapName =>
        scrim.maps.find(m => m.mapName === mapName)
      ).filter(Boolean);

      return `
        <div class="mp-scrim-accordion">
          <div class="mp-scrim-accordion-header" onclick="document.getElementById('${scrimId}').classList.toggle('open'); this.querySelector('.mp-accordion-arrow').classList.toggle('rotated')">
            <div class="mp-scrim-accordion-left">
              <div class="mp-scrim-accordion-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>${fmtDateLong(scrim.dateUtc)}</span>
              </div>
              <div class="mp-scrim-accordion-maps-count">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                ${sortedMaps.length} mapa${sortedMaps.length !== 1 ? 's' : ''}
              </div>
              ${scrim.opponent ? `<div class="mp-scrim-accordion-opponent">vs ${esc(scrim.opponent)}</div>` : ''}
            </div>
            <div class="mp-scrim-accordion-right">
              <div class="mp-scrim-accordion-stats">
                <div class="mp-scrim-accordion-stat">
                  <span class="mp-scrim-accordion-stat-val">${scrim.totalKills}</span>
                  <span class="mp-scrim-accordion-stat-lbl">Kills</span>
                </div>
                <div class="mp-scrim-accordion-stat">
                  <span class="mp-scrim-accordion-stat-val">${(scrim.totalDamage / 1000).toFixed(1)}K</span>
                  <span class="mp-scrim-accordion-stat-lbl">Daño</span>
                </div>
                <div class="mp-scrim-accordion-stat">
                  <span class="perf-pill ${perfClass}">${avgPerf}%</span>
                  <span class="mp-scrim-accordion-stat-lbl">Rend.</span>
                </div>
              </div>
              <button class="mp-scrim-detail-btn" onclick="event.stopPropagation(); App.openScrimDetail('${scrim.scrimId}')" title="Ver detalle completo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <div class="mp-accordion-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
          
          <div class="mp-scrim-accordion-body" id="${scrimId}">
            <table class="mp-scrim-table">
              <thead>
                <tr>
                  <th>Mapa</th>
                  <th>Pos.</th>
                  <th>Kills</th>
                  <th>Asist.</th>
                  <th>Daño</th>
                  <th>Tiempo</th>
                  <th>Rend.</th>
                </tr>
              </thead>
              <tbody>
                ${sortedMaps.map(m => {
  const meta = MAP_META[m.mapName] || { color: 'var(--text-muted)' };
  const perfClass = (m.performanceScore || 0) >= 65 ? 'hi' : (m.performanceScore || 0) >= 40 ? 'md' : 'lo';
  return `
    <tr>
      <td>
        <div class="mp-scrim-map-thumb" style="background-image: url('../${meta.image}')">
          <span class="mp-scrim-map-name-on-thumb">${m.mapName}</span>
        </div>
      </td>
      <td style="color:var(--text-muted)">#${m.position || '-'}</td>
      <td style="font-weight:700;color:var(--green)">${m.kills || 0}</td>
      <td>${m.assists || 0}</td>
      <td>${(m.damage || 0).toLocaleString()}</td>
      <td style="color:var(--text-muted)">${m.survivalTime || '00:00'}</td>
      <td><span class="perf-pill ${perfClass}">${m.performanceScore || 0}%</span></td>
    </tr>
  `;
}).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="mp-breakdown-wrap" id="mp-breakdown-container">
        <div class="mp-breakdown-head">
          <svg
  class="clock-icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  width="18"
  height="18"
>
  <circle cx="12" cy="12" r="10"/>
  <polyline points="12 6 12 12 16 14"/>
</svg>
          Historial por Jornada
        </div>
        ${filtersHTML}
        <div class="mp-scrim-list scrollbar-thin">
          ${scrimsHTML || `<div class="mp-empty-row">No hay jornadas que coincidan con los filtros</div>`}
        </div>
        ${paginationHTML}
      </div>
    `;
  }

  // 🔥 Función para actualizar filtros y re-renderizar (CORREGIDA)
  function updateFiltersAndRender(container, playerId, data, photo) {
    const dateInput = document.getElementById('mp-filter-date');
    const mvpCheck = document.getElementById('mp-filter-mvp');
  
    if (dateInput) _filters.date = dateInput.value || null;
    if (mvpCheck) _filters.showOnlyMvp = mvpCheck.checked;
  
    _filters.page = 1;
    renderPlayerDetail(container, data, { photo: photo });
    attachFilterListeners(container, playerId, data, photo);
  }

  // 🔥 Función para adjuntar listeners de filtros (CORREGIDA)
  function attachFilterListeners(container, playerId, data, photo) {
    const dateInput = document.getElementById('mp-filter-date');
    const mvpCheck = document.getElementById('mp-filter-mvp');
    const clearBtn = document.getElementById('mp-filter-clear');
    const paginationBtns = container.querySelectorAll('.mp-pagination-btn');
  
    const newDateInput = dateInput?.cloneNode(true);
    const newMvpCheck = mvpCheck?.cloneNode(true);
    const newClearBtn = clearBtn?.cloneNode(true);
  
    if (dateInput && newDateInput) {
      dateInput.parentNode?.replaceChild(newDateInput, dateInput);
      newDateInput.addEventListener('change', () => {
        updateFiltersAndRender(container, playerId, data, photo);
      });
    }
    if (mvpCheck && newMvpCheck) {
      mvpCheck.parentNode?.replaceChild(newMvpCheck, mvpCheck);
      newMvpCheck.addEventListener('change', () => {
        updateFiltersAndRender(container, playerId, data, photo);
      });
    }
    if (clearBtn && newClearBtn) {
      clearBtn.parentNode?.replaceChild(newClearBtn, clearBtn);
      newClearBtn.addEventListener('click', () => {
        // 🔥 Limpiar TODOS los filtros
        _filters.date = null;           // <- ESTO FALTABA
        _filters.showOnlyMvp = false;
        _filters.page = 1;
        
        // 🔥 También limpiar el input visualmente
        const dateInput = document.getElementById('mp-filter-date');
        if (dateInput) dateInput.value = '';
        
        const mvpCheck = document.getElementById('mp-filter-mvp');
        if (mvpCheck) mvpCheck.checked = false;
        
        renderPlayerDetail(container, data, { photo: photo });
        attachFilterListeners(container, playerId, data, photo);
      });
    }

    paginationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page) && page > 0) {
          _filters.page = page;
          renderPlayerDetail(container, data, { photo: photo });
          attachFilterListeners(container, playerId, data, photo);
          const breakdown = document.getElementById('mp-breakdown-container');
          if (breakdown) breakdown.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ============================================================
  // 3. MODAL
  // ============================================================
  function openPlayerModal(playerId, opts = {}) {
    const existing = document.getElementById('mp-player-overlay');
    if (existing) existing.remove();
  
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show mp-modal-overlay';
    overlay.id = 'mp-player-overlay';
    overlay.innerHTML = `
      <div class="modal modal-xl">
        <div class="modal-header">
          <span class="modal-title" id="mp-modal-title">Rendimiento por Mapa</span>
          <button class="modal-close" id="mp-modal-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" id="mp-modal-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  
    function close() {
      overlay.remove();
      document.body.style.overflow = '';
    }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#mp-modal-close').addEventListener('click', close);
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });
  
    // 🔥 PASAR LA FOTO CORRECTAMENTE
    const photo = opts.photo || null;
    mountPlayerDetail(document.getElementById('mp-modal-body'), playerId, { photo: photo });
  }
  

  function invalidateCache() {
    _overviewCache.clear();
    _playerCache.clear();
  }

  return {
    mountOverview,
    mountPlayerDetail,
    openPlayerModal,
    invalidateCache,
    MAPS,
    MAP_META,
  };
})(); 

export default MapPerformance;