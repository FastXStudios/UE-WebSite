// scrimCard.js
import Icons from '../core/icons.js';
import CONFIG from '../core/config.js';
import State from '../core/state.js';

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

const ScrimCard = {
  render(scrim) {
    const d = new Date(scrim.dateUtc);
    const mxTime = d.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'America/Mexico_City' 
    });
    const coTime = d.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'America/Bogota' 
    });
    
    const squad = scrim.squad || State.squad;
    const dateBgClass = squad === 'GIRLS' ? 'scrim-date-bg-girls' : 
        squad === 'TIER' ? 'scrim-date-bg-tier' : 
        squad === 'GOLD' ? 'scrim-date-bg-gold' :
        'scrim-date-bg-oficial';

    const textColorClass = squad === 'GIRLS' ? 'text-girls' : 
          squad === 'TIER' ? 'text-tier' : 
          squad === 'GOLD' ? 'text-gold' :
          'text-oficial';
    
    // Map slices SIN badges (solo imágenes)
    const mapSlicesHTML = CONFIG.MAPS.map(m => {
      const room = scrim.rooms?.find(r => r.mapName === m);
      const artClass = room ? `mp-art-${m}` : '';
      
      return `
        <div class="scrim-map-slice ${room ? '' : 'not-played'} ${artClass}" title="${m}">
          <div class="slice-label">
            <span>${m.slice(0, 4)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="scrim-card" onclick="App.openScrimDetail('${scrim.id}')">
        <div class="scrim-card-left">
          <div class="scrim-date-box ${dateBgClass}">
            <div class="scrim-date-day ${textColorClass}">${d.getDate()}</div>
            <div class="scrim-date-mon ${textColorClass}">${d.toLocaleDateString('es', { month: 'short' })}</div>
            <div class="scrim-date-yr ${textColorClass}">${d.getFullYear()}</div>
          </div>
          
          <div class="scrim-info">
            <div class="scrim-title">${esc(scrim.opponent) || 'Sesión de práctica'}</div>
            <div class="scrim-meta-row">
              <span class="scrim-meta-item">
                ${Icons.clock} ${mxTime} MX · ${coTime} CO
              </span>
              <span class="scrim-meta-item">
                ${Icons.map} ${scrim.rooms?.length || 0} mapas
              </span>
            </div>
            ${scrim.summary?.mvpPlayerName ? `
              <div class="scrim-mvp-row">
                ${Icons.mvp} MVP: <strong>${esc(scrim.summary.mvpPlayerName)}</strong> (${Number(scrim.summary.mvpKills) || 0} kills)
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="scrim-card-right">
          <div class="scrim-quick-stats">
            <div class="scrim-quick-item">
              <div class="scrim-quick-val ${textColorClass}">${scrim.summary?.totalKills || 0}</div>
              <div class="scrim-quick-lbl">KILLS</div>
            </div>
            <div class="scrim-quick-sep"></div>
            <div class="scrim-quick-item">
              <div class="scrim-quick-val">${scrim.summary?.avgTeamPerformance || 0}%</div>
              <div class="scrim-quick-lbl">REND.</div>
            </div>
          </div>
          
          <div class="scrim-quick-sep"></div>
          
          <div class="scrim-collage-wrap">
            <div class="scrim-map-collage">
              ${mapSlicesHTML}
            </div>
            <!-- Rendimientos debajo -->
            <div class="scrim-map-perf-row">
              ${CONFIG.MAPS.map(m => {
                const room = scrim.rooms?.find(r => r.mapName === m);
                let avgPerf = null;
                if (room && room.players && room.players.length > 0) {
                  const totalPerf = room.players.reduce((sum, p) => sum + (p.performanceScore || 0), 0);
                  avgPerf = Math.round(totalPerf / room.players.length);
                }
                const perfClass = avgPerf !== null ? (avgPerf >= 65 ? 'hi' : avgPerf >= 40 ? 'md' : 'lo') : 'none';
                return `
                  <div class="scrim-map-perf-item">
                    <span class="scrim-map-perf-val ${perfClass}">
                      ${avgPerf !== null ? `${avgPerf}%` : '—'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  renderList(scrims) {
    if (!scrims.length) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">${Icons.scrims}</div>
          <h3>Sin Jornadas registradas</h3>
          <p>No hay sesiones que coincidan con los filtros</p>
        </div>
      `;
    }
    
    return scrims.map(scrim => this.render(scrim)).join('');
  }
};

export default ScrimCard;