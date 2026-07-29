// players.js
import Cache from '../core/cache.js';
import State from '../core/state.js';
import PlayerCard from '../components/playerCard.js';
import Icons from '../core/icons.js';
import { loadDefaultAvatar } from '../core/avatar.js';

let allPlayers = [];
let currentPage = 1;
const PAGE_SIZE = 6;
let filteredPlayers = [];

const PlayersPage = {
  
  invalidateCache() {
    allPlayers = [];
    filteredPlayers = [];
    currentPage = 1;
    // Invalidar cache de API
    if (typeof Cache !== 'undefined' && Cache.invalidate) {
      Cache.invalidate('/players');
    }
  },

  async render() {
    const squad = State.squad;
    
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            ${Icons.players} Jugadores — UZX ${squad}
          </div>
          <div class="section-sub">Estadísticas completas del roster activo</div>
        </div>
        
        <!-- Buscador premium -->
        <div class="search-bar-premium">
          <div class="search-input-wrapper">
            <span class="search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input 
              type="text" 
              class="search-input-premium" 
              id="player-search" 
              placeholder="Buscar por nombre o nickname..."
            />
            <button class="search-clear-btn" id="search-clear-btn" onclick="clearSearch()" style="display:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="search-results-count" id="search-results-count"></div>
        </div>
        
        <div class="players-grid" id="all-players">
          <div class="loading-pulse">Cargando jugadores...</div>
        </div>
        
        <!-- Paginación -->
        <div class="players-pagination" id="players-pagination"></div>
      </div>
    `;
  },
  
  async afterRender(abortController) {
    await loadDefaultAvatar();
    const squad = State.squad;
    const signal = abortController?.signal;
    
    await Cache.fetchSmart(`/players?squad=${squad}`, (data, isFresh) => {
      if (signal?.aborted) return;
      allPlayers = data;
      this.filterPlayers();
    });
    
    const searchInput = document.getElementById('player-search');
    if (searchInput && !signal?.aborted) {
      searchInput.addEventListener('input', () => {
        currentPage = 1;
        this.filterPlayers();
      });
    }
  },
  
  filterPlayers() {
    const searchInput = document.getElementById('player-search');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const clearBtn = document.getElementById('search-clear-btn');
    const resultsCount = document.getElementById('search-results-count');
    
    if (clearBtn) {
      clearBtn.style.display = search ? 'flex' : 'none';
    }
    
    filteredPlayers = allPlayers.filter(p => {
      const matchSearch = !search || 
        (p.gameName || '').toLowerCase().includes(search) || 
        (p.realName || '').toLowerCase().includes(search);
      return matchSearch;
    });
    
    filteredPlayers.sort((a, b) => (b.stats?.avgPerformance || 0) - (a.stats?.avgPerformance || 0));
    
    if (resultsCount && search) {
      resultsCount.textContent = `${filteredPlayers.length} jugador${filteredPlayers.length !== 1 ? 'es' : ''} encontrado${filteredPlayers.length !== 1 ? 's' : ''}`;
      resultsCount.style.display = 'block';
    } else if (resultsCount) {
      resultsCount.style.display = 'none';
    }
    
    this.renderPaginatedPlayers();
  },
  
  renderPaginatedPlayers() {
    const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pagePlayers = filteredPlayers.slice(start, end);
    
    const container = document.getElementById('all-players');
    if (container) {
      container.innerHTML = PlayerCard.renderGrid(pagePlayers);
    }
    
    this.renderPagination(totalPages);
  },
  
  renderPagination(totalPages) {
    const container = document.getElementById('players-pagination');
    if (!container) return;
    
    if (filteredPlayers.length <= PAGE_SIZE) {
      container.innerHTML = '';
      return;
    }
    
    let html = `
      <button class="pagination-btn" onclick="PlayersPage.goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Anterior
      </button>
      <span class="pagination-info">
        <span>${currentPage}</span> / ${totalPages}
      </span>
      <button class="pagination-btn" onclick="PlayersPage.goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
        Siguiente
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    `;
    
    container.innerHTML = html;
  },
  
  goToPage(page) {
    const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE) || 1;
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    this.renderPaginatedPlayers();
    window.scrollTo({ top: document.getElementById('all-players').offsetTop - 100, behavior: 'smooth' });
  }
};

window.clearSearch = function() {
  const input = document.getElementById('player-search');
  if (input) {
    input.value = '';
    input.focus();
    input.dispatchEvent(new Event('input'));
  }
};

// Exponer para onclick
window.PlayersPage = PlayersPage;

export default PlayersPage;