// playerCard.js
import Icons from '../core/icons.js';
import State from '../core/state.js';
import MapPerformance from './mapPerformance.js';
import { getDefaultAvatar } from '../core/avatar.js';
import FLAGS from '../core/flags.js';

const ICON_KILLS = `<img width="20" height="20" src="https://img.icons8.com/glyph-neue/64/down.png" alt="down"/>`;
const ICON_ASSISTS = `<img width="30" height="30" src="https://img.icons8.com/sf-regular-filled/48/define-location.png" alt="down"/>`;
const ICON_DAMAGE = `<svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="23" height="23"><path d="M12 2 5 5v6c0 5 3.5 8.5 7 11 3.5-2.5 7-6 7-11V5l-7-3z"/><path d="M13 5 10 10l3 1-2 4 3 1-2 4"/></svg>`;

const PlayerCard = {
  render(player) {
    const perf = player.stats?.avgPerformance || 0;
    const perfClass = perf >= 65 ? 'perf-good' : perf >= 40 ? 'perf-mid' : 'perf-low';
    const totalKills = player.stats?.totalKills || 0;
    const totalAssists = player.stats?.totalAssists || 0;
    const totalDamage = player.stats?.totalDamage || 0;
    const totalScrims = player.stats?.totalScrims || 0;
    const totalMaps = player.stats?.totalMapsPlayed || 0;
    
    const squad = State.squad;
    const squadColors = {
      OFICIAL: { primary: '#10b981' },
      TIER: { primary: '#3b82f6' },
      GIRLS: { primary: '#ec4899' },
      GOLD: { primary: '#f59e0b' }
    };
    const colors = squadColors[squad] || { primary: '#10b981' };
    
    const squadBgMap = {
      OFICIAL: 'player-bg.png',
      TIER: 'player-bg-tier.png',
      GIRLS: 'player-bg-girls.png',
      GOLD: 'player-bg-gold.png'  // ← AGREGAR
    };
    const bgImage = squadBgMap[squad] || 'player-bg.png';
    
    const photoEscaped = player.photo ? player.photo.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
    
    // Obtener el avatar default desde core/avatar.js
    const defaultAvatar = getDefaultAvatar();
    
    // Determinar qué mostrar - PRIORIDAD: photo > defaultAvatar > iniciales
    let photoHtml = '';
    if (player.photo) {
      photoHtml = `<img src="${player.photo}" alt="${player.gameName}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                   <div class="default-avatar" style="display:none">${(player.gameName || '?').charAt(0).toUpperCase()}</div>`;
    } else if (defaultAvatar) {
      photoHtml = `<img src="${defaultAvatar}" alt="${player.gameName}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                   <div class="default-avatar" style="display:none">${(player.gameName || '?').charAt(0).toUpperCase()}</div>`;
    } else {
      photoHtml = `<div class="default-avatar">${(player.gameName || '?').charAt(0).toUpperCase()}</div>`;
    }
    
    return `
      <div class="player-card ${!player.isVisible ? 'player-card-hidden' : ''}" 
           onclick="MapPerformance.openPlayerModal('${player.id}', { photo: ${player.photo ? `'${photoEscaped}'` : 'null'} })"
           style="cursor:pointer">
        <div class="player-card-inner">
          <div class="player-photo-wrap" style="background-image: url('assets/${bgImage}'); background-size: cover; background-position: center;">
            ${photoHtml}
            ${player.country && FLAGS[player.country]
              ? `<div class="player-flag-badge"><img src="${FLAGS[player.country]}" alt="${player.country}" /></div>`
              : ''
            }
          </div>
          
          <div class="player-info-wrap">
            ${!player.isActive ? '<div class="player-status-badge">Inactivo</div>' : ''}
            <div class="player-maps-badge">${totalMaps} mapas</div>
            <div class="player-game-name" style="color:${colors.primary}">${player.gameName || 'Desconocido'}</div>
            ${player.realName ? `<div class="player-real-name">${player.realName}</div>` : ''}
            ${player.role ? `<div class="player-role-text">${player.role}</div>` : ''}
            <div class="player-divider"></div>
            <div class="player-maps-played">Jornadas jugadas: <strong>${totalScrims}</strong></div>
          </div>
        </div>
        
        <div class="perf-bar-section">
          <div class="perf-bar-header">
            <span class="perf-bar-label">Rendimiento</span>
            <span class="perf-bar-value">${perf}%</span>
          </div>
          <div class="perf-bar-track">
            <div class="perf-bar-fill ${perfClass}" style="width:${Math.min(perf, 100)}%"></div>
          </div>
        </div>
        
        <div class="player-stats-bar">
          <div class="stat-box">
            <div class="stat-icon">${ICON_KILLS}</div>
            <div class="stat-box-value">${totalKills.toLocaleString()}</div>
            <div class="stat-box-label">Bajas</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">${ICON_ASSISTS}</div>
            <div class="stat-box-value">${totalAssists.toLocaleString()}</div>
            <div class="stat-box-label">Asist.</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon stat-icon-damage">${ICON_DAMAGE}</div>
            <div class="stat-box-value">${totalDamage.toLocaleString()}</div>
            <div class="stat-box-label">Daño</div>
          </div>
        </div>
      </div>
    `;
  },
  
  renderGrid(players) {
    if (!players.length) {
      return `
        <div class="empty-state" style="grid-column:1/-1; width:100%;">
          <div class="empty-state-icon">${Icons.players}</div>
          <h3>Sin jugadores disponibles</h3>
          <p>No hay jugadores registrados en este squad</p>
        </div>
      `;
    }
    
    return players.map(player => this.render(player)).join('');
  }
};

window.MapPerformance = MapPerformance;

export default PlayerCard;