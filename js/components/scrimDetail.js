// scrimDetail.js
import API from '../core/api.js';
import State from '../core/state.js';
import { getDefaultAvatar, loadDefaultAvatar } from '../core/avatar.js';

// Mismas imágenes de mapa que ya usa mapPerformance.js — no se inventan assets nuevos
const MAP_META = {
  BERMUDA:    { color: '#10b981', image: '../assets/bm.png' },
  PURGATORIO: { color: '#ef4444', image: '../assets/pg.png' },
  KALAHARI:   { color: '#f59e0b', image: '../assets/kh.png' },
  NEXTERRA:   { color: '#3b82f6', image: '../assets/nt.png' },
};

const ScrimDetail = {
  async open(scrimId) {
    await loadDefaultAvatar();
    // Cerrar modal de rendimiento del jugador si está abierto
    const mpOverlay = document.getElementById('mp-player-overlay');
    if (mpOverlay) {
      mpOverlay.remove();
    }

    const overlay = document.getElementById('scrim-detail-overlay');
    const body = document.getElementById('scrim-detail-body');
    const title = document.getElementById('scrim-detail-title');
    const meta = document.getElementById('scrim-detail-meta');

    if (!overlay || !body) {
      console.error('No se encontró el overlay scrim-detail-overlay en el DOM');
      return;
    }

    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="loading-pulse">Cargando detalle...</div>';

    try {
      const response = await API.get(`/scrims/${scrimId}`);
      const scrim = response.data;
      const squad = scrim.squad || State.squad;
      const defaultAvatar = getDefaultAvatar();

      const detailBox = document.querySelector('.scrim-detail-box');
      if (detailBox) {
        detailBox.classList.add('custom-scrollbar');
        // No tocamos padding ni margin, el CSS lo resolverá
      }
      
      overlay.dataset.squad = squad;
      // Foto y stats del MVP
      
      let mvpPhoto = null;
      let mvpTotalKills = 0;
      let mvpTotalAssists = 0;
      let mvpTotalDamage = 0;

      // Mapa playerId -> foto, se usa en la tabla por sala Y en el gráfico
      const photoByPlayerId = new Map();

      try {
        // 🔥 Cargar TODOS los jugadores (sin filtrar por squad) para obtener fotos de TODOS los squads
        const playersRes = await API.get(`/players`);
        for (const player of (playersRes.data || [])) {
          if (player.id && player.photo) photoByPlayerId.set(player.id, player.photo);
        }
        if (scrim.summary?.mvpPlayerId) {
          const mvpPlayer = (playersRes.data || []).find(p => p.id === scrim.summary.mvpPlayerId);
          if (mvpPlayer) mvpPhoto = mvpPlayer.photo;
        }
      } catch (e) {
        console.warn('No se pudo obtener el roster de jugadores:', e);
      }

      if (scrim.summary?.mvpPlayerId) {
        for (const room of scrim.rooms || []) {
          const mvpRoomPlayer = room.players?.find(p => p.playerId === scrim.summary.mvpPlayerId);
          if (mvpRoomPlayer) {
            mvpTotalKills += mvpRoomPlayer.kills || 0;
            mvpTotalAssists += mvpRoomPlayer.assists || 0;
            mvpTotalDamage += mvpRoomPlayer.damage || 0;
          }
        }
      }

      if (!mvpPhoto) mvpPhoto = defaultAvatar;

      const d = new Date(scrim.dateUtc);
      const mxDt = d.toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const coDt = d.toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit', minute: '2-digit'
      });

      title.textContent = scrim.opponent || 'Sesión de práctica';
      meta.textContent = `${mxDt} MX · ${coDt} CO`;

      body.innerHTML = renderContent(scrim, {
        mvpPhoto, mvpTotalKills, mvpTotalAssists, mvpTotalDamage,
        photoByPlayerId, defaultAvatar
      });

    } catch (e) {
      body.innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem">${e.message}</p>`;
    }
  },

  close() {
    const overlay = document.getElementById('scrim-detail-overlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
    document.body.style.overflow = '';
  }
};

// ══════════════════════════════════════════
// RENDER CONTENT
// ══════════════════════════════════════════
function renderContent(scrim, ctx) {
  const s = scrim;
  const summary = s.summary || {};
  const squad = s.squad || 'OFICIAL';

  const positions = (s.rooms || [])
    .map(r => r.position)
    .filter(p => typeof p === 'number' && !isNaN(p));
  const bestPosition = positions.length ? Math.min(...positions) : null;

  const designImages = {
    OFICIAL: '../assets/designmvp.png',
    TIER: '../assets/designmvptier.png',
    GIRLS: '../assets/designmvpgirls.png',
    GOLD: '../assets/designmvpgold.png'
  };
  const tfImages = {
    OFICIAL: '../assets/tf.png',
    TIER: '../assets/tftier.png',
    GIRLS: '../assets/tfgirls.png',
    GOLD: '../assets/tfgold.png'
  };

  const designImage = designImages[squad] || designImages.OFICIAL;
  const tfImage = tfImages[squad] || tfImages.OFICIAL;

  return `
    ${s.note ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:1rem;font-style:italic;text-align:center">${esc(s.note)}</div>` : ''}
    
    <!-- MVP Section -->
    <div class="mvp-section-grid">
      <div>
        <div class="mvp-squad-label-top">UZX ${esc(s.squad || '')}</div>
<div class="mvp-card-pro" style="background-image: url('${designImage}')">
          <div class="mvp-card-pro-overlay" style="background-image: url('${tfImage}')"></div>
          <div class="mvp-photo-overlay">
            ${ctx.mvpPhoto
              ? `<img src="${ctx.mvpPhoto}" alt="${esc(summary.mvpPlayerName || '')}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                 <div class="mvp-photo-placeholder" style="display:none">${(summary.mvpPlayerName || '?').charAt(0)}</div>`
              : `<div class="mvp-photo-placeholder">${(summary.mvpPlayerName || '?').charAt(0)}</div>`
            }
          </div>
          <div class="mvp-name-overlay-onphoto">${esc(summary.mvpPlayerName || 'Desconocido')}</div>
          <div class="mvp-stats-overlay">
            <div class="mvp-stat-num-overlay mvp-stat-elims">${ctx.mvpTotalKills}</div>
            <div class="mvp-stat-num-overlay mvp-stat-asist">${ctx.mvpTotalAssists}</div>
            <div class="mvp-stat-num-overlay mvp-stat-dano">${ctx.mvpTotalDamage.toLocaleString()}</div>
          </div>
        </div>
</div>
      <div class="sd-summary-panel">
        <div class="sd-summary-stats">
          <div class="mvp-gstat-card" style="background-image:url('../assets/dash-stat-scrims.png')">
            <div class="mvp-gstat-label">Mapas</div>
            <div class="mvp-gstat-val gstat-orange">${s.rooms?.length || 0}</div>
          </div>
            <div class="mvp-gstat-card" style="background-image:url('../assets/dash-stat-players.png')">
            <div class="mvp-gstat-label">Posición</div>
            <div class="mvp-gstat-val gstat-green">#${bestPosition ?? '-'}</div>
          </div>
          <div class="mvp-gstat-card" style="background-image:url('../assets/dash-stat-kills.png')">
            <div class="mvp-gstat-label">Total Kills</div>
            <div class="mvp-gstat-val gstat-red">${summary.totalKills || 0}</div>
          </div>
          <div class="mvp-gstat-card" style="background-image:url('../assets/dash-stat-perf.png')">
            <div class="mvp-gstat-label">Rendimiento</div>
            <div class="mvp-gstat-val gstat-blue">${summary.avgTeamPerformance || 0}%</div>
          </div>
        </div>
        <div class="sd-chart-card">
          ${renderPerformanceChart(s.rooms || [], ctx.photoByPlayerId, ctx.defaultAvatar)}
        </div>
      </div>
    </div>

    <!-- Rooms -->
    <div class="sd-rooms-wrap">
      ${(s.rooms || []).map(room => renderRoom(room, ctx.photoByPlayerId, ctx.defaultAvatar)).join('')}
    </div>
  `;
}

// ══════════════════════════════════════════
// GRÁFICO — UNA línea de Rendimiento (promedio de equipo) y UNA
// línea de Kills (promedio de equipo) por mapa. En cada punto se
// muestra la foto del jugador destacado de ESE mapa en ESA métrica:
//   - Punto de Rendimiento -> foto de quien tuvo MEJOR rendimiento
//   - Punto de Kills       -> foto de quien tuvo MÁS kills
// Si el jugador destacado no tiene foto cargada, se usa el avatar
// default (la BD trae photo solo cuando el jugador la subió).

// ══════════════════════════════════════════════
// GRÁFICO — con tooltips y stats del jugador destacado
// ══════════════════════════════════════════════
function renderPerformanceChart(rooms, photoByPlayerId, defaultAvatar) {
  if (!rooms || rooms.length === 0) {
    return `<div class="sd-chart-empty">Sin datos suficientes para graficar</div>`;
  }

  // Un punto por mapa: jugador destacado de esa métrica
  const points = rooms.map(r => {
    const players = r.players || [];
    const count = players.length || 1;

    let topPerfPlayer = null;
    let topKillsPlayer = null;
    for (const p of players) {
      if (!topPerfPlayer || (p.performanceScore || 0) > (topPerfPlayer.performanceScore || 0)) topPerfPlayer = p;
      if (!topKillsPlayer || (p.kills || 0) > (topKillsPlayer.kills || 0)) topKillsPlayer = p;
    }

    return {
      mapName: r.mapName || '',
      // 🔥 perf = rendimiento PERSONAL del mejor jugador en rendimiento
      perf: topPerfPlayer ? Math.round(topPerfPlayer.performanceScore) : 0,
      // 🔥 kills = kills PERSONALES del mejor jugador en kills
      kills: topKillsPlayer ? topKillsPlayer.kills : 0,
      topPerfPlayer,
      topKillsPlayer
    };
  });

  const W = 560, H = 300;
  const padL = 28, padR = 20, padT = 20, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = points.length;
  const stepX = n > 1 ? plotW / (n - 1) : 0;
  const x = i => padL + stepX * i;

  const maxKills = Math.max(1, ...points.map(p => p.kills));

  const yPerf = v => padT + plotH - (v / 100) * plotH;
  const yKills = v => padT + plotH - (v / maxKills) * plotH;

  const gridLines = [0, 25, 50, 75, 100].map(pct => {
    const y = padT + plotH - (pct / 100) * plotH;
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,3"/>
            <text x="${padL - 6}" y="${y + 3}" text-anchor="end" class="sd-chart-axis-lbl">${pct}</text>`;
  }).join('');

  const xLabels = points.map((p, i) =>
    `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="sd-chart-axis-lbl">${esc((p.mapName || '').slice(0, 4))}</text>`
  ).join('');

  const perfLine = points.map((p, i) => `${x(i)},${yPerf(p.perf)}`).join(' ');
  const killLine = points.map((p, i) => `${x(i)},${yKills(p.kills)}`).join(' ');

  const playerName = p => p ? (p.matchedName || p.gameName || 'Desconocido') : 'Desconocido';
  const playerPhoto = p => {
    const id = p ? (p.playerId || p.matchedName || p.gameName) : null;
    return (id && photoByPlayerId.get(id)) || defaultAvatar;
  };

  let avatarDefs = '';
  let avatarMarkers = '';
  let clipId = 0;

  // 🔥 PUNTOS DE RENDIMIENTO (verdes) - rendimiento PERSONAL del mejor jugador
  points.forEach((p, i) => {
    const cx = x(i), cy = yPerf(p.perf);
    clipId++;
    const name = playerName(p.topPerfPlayer);
    // 🔥 AHORA: rendimiento personal del jugador, no promedio del equipo
    const perfText = `${p.perf}% rendimiento personal en ${esc(p.mapName)}`;
    avatarDefs += `<clipPath id="sdclip${clipId}"><circle cx="${cx}" cy="${cy}" r="20"/></clipPath>`;
    avatarMarkers += `
      <circle cx="${cx}" cy="${cy}" r="21" class="sd-chart-avatar-ring perf">
        <title>${esc(name)} · ${perfText}</title>
      </circle>
      <image href="${playerPhoto(p.topPerfPlayer)}" x="${cx - 20}" y="${cy - 20}" width="40" height="40" clip-path="url(#sdclip${clipId})" preserveAspectRatio="xMidYMid slice">
        <title>${esc(name)} · ${perfText}</title>
      </image>
    `;
  });

  // 🔥 PUNTOS DE KILLS (amarillos) - kills PERSONALES del mejor jugador
  points.forEach((p, i) => {
    const cx = x(i), cy = yKills(p.kills);
    clipId++;
    const name = playerName(p.topKillsPlayer);
    // 🔥 AHORA: kills personales del jugador
    const killsText = `${p.kills} kills personales en ${esc(p.mapName)}`;
    avatarDefs += `<clipPath id="sdclip${clipId}"><circle cx="${cx}" cy="${cy}" r="18"/></clipPath>`;
    avatarMarkers += `
      <circle cx="${cx}" cy="${cy}" r="19" class="sd-chart-avatar-ring kills">
        <title>${esc(name)} · ${killsText}</title>
      </circle>
      <image href="${playerPhoto(p.topKillsPlayer)}" x="${cx - 18}" y="${cy - 18}" width="36" height="36" clip-path="url(#sdclip${clipId})" preserveAspectRatio="xMidYMid slice">
        <title>${esc(name)} · ${killsText}</title>
      </image>
    `;
  });

  return `
    <div class="sd-chart-legend">
      <span class="sd-chart-legend-item"><span class="sd-chart-swatch perf"></span>Rendimiento</span>
      <span class="sd-chart-legend-item"><span class="sd-chart-swatch kills"></span>Kills</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" class="sd-chart-svg" preserveAspectRatio="xMidYMid meet">
      <defs>${avatarDefs}</defs>
      ${gridLines}
      <polyline points="${perfLine}" fill="none" class="sd-chart-line-perf"/>
      <polyline points="${killLine}" fill="none" class="sd-chart-line-kills"/>
      ${avatarMarkers}
      ${xLabels}
    </svg>
  `;
}

// ══════════════════════════════════════════
// RENDER ROOM — banner con imagen del mapa + tabla con avatar real
// ══════════════════════════════════════════
function renderRoom(room, photoByPlayerId, defaultAvatar) {
  const meta = MAP_META[room.mapName] || { color: 'var(--text-muted)', image: '' };
  const players = room.players || [];

  return `
    <div class="sd-room-block" style="--sd-accent:${meta.color}">
      <div class="sd-room-banner" style="background-image:linear-gradient(90deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.5) 60%, rgba(15,23,42,0.2) 100%), url('${meta.image}')">
        <span class="sd-room-name">${esc(room.mapName)}</span>
        <div class="sd-room-banner-right">
        <div class="sd-room-chip">
          <span class="sd-room-chip-pos">#${room.position}</span>
          <span class="sd-room-chip-total">de ${room.totalTeams}</span>
          <span class="sd-room-chip-lbl">Posición</span>
        </div>
        <div class="sd-room-chip">
          <span class="sd-room-chip-val">${room.roomKills || 0}</span>
          <span class="sd-room-chip-lbl">Kills</span>
        </div>
        </div>
      </div>

      <div class="sd-player-rows">
        <div class="sd-player-rows-head">
          <span class="col-name">Jugador</span>
          <span class="col-num">Kills</span>
          <span class="col-num">Asist.</span>
          <span class="col-num">Daño</span>
          <span class="col-num">Revives</span>
          <span class="col-num">Tiempo</span>
          <span class="col-num">Rend.</span>
        </div>
        ${players.map(p => {
          const perf = p.performanceScore || 0;
          const pc = perf >= 65 ? 'hi' : perf >= 40 ? 'md' : 'lo';
          const name = p.matchedName || p.gameName || 'Desconocido';
          const id = p.playerId || p.matchedName || p.gameName;
          const photo = photoByPlayerId.get(id) || defaultAvatar;
          return `
            <div class="sd-player-row">
              <span class="col-name">
                <img class="sd-player-avatar-img" src="${photo}" alt="${esc(name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                <span class="sd-player-avatar-fallback" style="display:none">${esc(name.charAt(0).toUpperCase())}</span>
                <span class="sd-player-name">${esc(name)}</span>
              </span>
              <span class="col-num sd-kills">${p.kills || 0}</span>
              <span class="col-num">${p.assists || 0}</span>
              <span class="col-num">${(p.damage || 0).toLocaleString()}</span>
              <span class="col-num">${p.revives || 0}</span>
              <span class="col-num sd-time">${p.survivalTime || '00:00'}</span>
              <span class="col-num"><span class="perf-pill ${pc}">${perf}%</span></span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export default ScrimDetail;