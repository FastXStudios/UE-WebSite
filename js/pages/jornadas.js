// jornadas.js
import Cache from '../core/cache.js';
import State from '../core/state.js';
import ScrimCard from '../components/scrimCard.js';
import MapPerformance from '../components/mapPerformance.js';
import Icons from '../core/icons.js';
import { loadDefaultAvatar } from '../core/avatar.js';

let allScrims = [];
let filteredScrims = [];
let currentPage = 1;
const PAGE_SIZE = 5;
let filterDate = '';
let sortBy = 'date'; // 'date', 'performance', 'kills'

const ScrimsPage = {
  invalidateCache() {
    if (typeof MapPerformance !== 'undefined' && MapPerformance.invalidateCache) {
      MapPerformance.invalidateCache();
    }
    if (typeof Cache !== 'undefined' && Cache.invalidate) {
      Cache.invalidate('/scrims');
    }
    allScrims = [];
    filteredScrims = [];
    currentPage = 1;
  },
  
  async render() {
    const squad = State.squad;
    
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            Rendimiento por Mapa
          </div>
          <div class="section-sub">Top jugadores por mapa en UZX ${squad}</div>
        </div>
        <div class="mp-overview-grid" id="scrims-map-performance">
          <div class="loading-pulse" style="grid-column:1/-1">Cargando estadísticas...</div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            ${Icons.scrims} Jornadas — UZX ${squad}
          </div>
          <div class="section-sub">Historial completo de sesiones de práctica</div>
        </div>
        
        <!-- Filtros -->
        <div class="scrims-filter-bar">
          <div class="filter-group">
            <span class="filter-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <rect x="3" y="4" width="18" height="2" rx="1" />
                <rect x="7" y="10" width="10" height="2" rx="1" />
                <rect x="10" y="16" width="4" height="2" rx="1" />
              </svg>
            </span>
            <label>Filtrar por fecha</label>
            <input type="date" id="filter-date" class="filter-input" />
          </div>
          
          <div class="filter-group">
            <label>Ordenar por</label>
            <select id="filter-sort" class="filter-select">
              <option value="date">Fecha (más reciente)</option>
              <option value="performance">Mayor rendimiento</option>
              <option value="kills">Mayor kills</option>
            </select>
          </div>
          
          <button class="filter-clear-btn" onclick="ScrimsPage.clearFilters()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Limpiar
          </button>
        </div>
        
        <div class="scrims-list" id="all-scrims">
          <div class="loading-pulse">Cargando scrims...</div>
        </div>
        
        <!-- Paginación -->
        <div class="scrims-pagination" id="scrims-pagination"></div>
      </div>
    `;
  },
  
  async afterRender(abortController) {
    await loadDefaultAvatar();
    const squad = State.squad;
    const signal = abortController?.signal;
    
    const mpContainer = document.getElementById('scrims-map-performance');
    if (mpContainer && !signal?.aborted) {
      await MapPerformance.mountOverview(mpContainer, squad);
    }
    
    // 🔥 FIX: Pedir TODAS las scrims con limit=all
    await Cache.fetchSmart(`/scrims?squad=${squad}&limit=all`, (data, isFresh) => {
      if (signal?.aborted) return;
      allScrims = data;
      this.filterScrims();
      
      // Setup event listeners
      const dateInput = document.getElementById('filter-date');
      const sortSelect = document.getElementById('filter-sort');
      
      if (dateInput) {
        dateInput.addEventListener('change', (e) => {
          filterDate = e.target.value;
          currentPage = 1;
          this.filterScrims();
        });
      }
      
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          sortBy = e.target.value;
          currentPage = 1;
          this.filterScrims();
        });
      }
    });
  },
  
  filterScrims() {
    let result = [...allScrims];
    
    // Filtrar por fecha
    if (filterDate) {
      const filterDateStart = new Date(filterDate + 'T00:00:00-06:00');
      const filterDateEnd = new Date(filterDate + 'T23:59:59-06:00');
      
      result = result.filter(s => {
        const d = new Date(s.dateUtc);
        return d >= filterDateStart && d <= filterDateEnd;
      });
    }
    
    // Ordenar
    if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.dateUtc) - new Date(a.dateUtc));
    } else if (sortBy === 'performance') {
      result.sort((a, b) => (b.summary?.avgTeamPerformance || 0) - (a.summary?.avgTeamPerformance || 0));
    } else if (sortBy === 'kills') {
      result.sort((a, b) => (b.summary?.totalKills || 0) - (a.summary?.totalKills || 0));
    }
    
    filteredScrims = result;
    this.renderPaginatedScrims();
  },
  
  renderPaginatedScrims() {
    const totalPages = Math.ceil(filteredScrims.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageScrims = filteredScrims.slice(start, end);
    
    const container = document.getElementById('all-scrims');
    if (container) {
      container.innerHTML = ScrimCard.renderList(pageScrims);
    }
    
    this.renderPagination(totalPages);
    this.updateCounter();
  },
  
  renderPagination(totalPages) {
    const container = document.getElementById('scrims-pagination');
    if (!container) return;
    
    if (filteredScrims.length <= PAGE_SIZE) {
      container.innerHTML = '';
      return;
    }
    
    let html = `
      <button class="pagination-btn" onclick="ScrimsPage.goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Anterior
      </button>
      <span class="pagination-info">
        <span>${currentPage}</span> / ${totalPages}
      </span>
      <button class="pagination-btn" onclick="ScrimsPage.goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
        Siguiente
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    `;
    
    container.innerHTML = html;
  },
  
  goToPage(page) {
    const totalPages = Math.ceil(filteredScrims.length / PAGE_SIZE) || 1;
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    this.renderPaginatedScrims();
    window.scrollTo({ top: document.getElementById('all-scrims').offsetTop - 100, behavior: 'smooth' });
  },
  
  updateCounter() {
    const counter = document.getElementById('scrims-counter');
    if (counter) {
      const total = filteredScrims.length;
      counter.innerHTML = `<strong>${total}</strong> scrim${total !== 1 ? 's' : ''}`;
    }
  },
  
  clearFilters() {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-sort').value = 'date';
    filterDate = '';
    sortBy = 'date';
    currentPage = 1;
    this.filterScrims();
  }
};

// Exponer para onclick
window.ScrimsPage = ScrimsPage;

export default ScrimsPage;