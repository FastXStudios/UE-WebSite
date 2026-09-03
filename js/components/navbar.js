// js/components/navbar.js
import State from '../core/state.js';
import Icons from '../core/icons.js';

let _navbarInstance = null;
let _navbarElement = null;

const Navbar = {
  render() {
    const squad = State.squad;
    
    if (_navbarInstance) {
      this._updateActiveStates();
      this._updateSquadInfo(squad);
      return _navbarInstance;
    }
    
    const html = `
      <div class="navbar-left" onclick="App.navigate('home')">
        <img src="assets/logo-${squad.toLowerCase()}.png" alt="UZX Logo" />
        <div class="navbar-brand-text">
          UZX <span class="navbar-squad-name">${squad}</span>
        </div>
      </div>

      <div class="navbar-center">
        <button class="nav-link ${State.page === 'home' ? 'active' : ''}" data-nav-page="home" onclick="App.navigate('home')">
          ${Icons.home}
          <span>Inicio</span>
        </button>

        <button class="nav-link ${State.page === 'players' ? 'active' : ''}" data-nav-page="players" onclick="App.navigate('players')">
          ${Icons.players}
          <span>Jugadores</span>
        </button>

        <button class="nav-link ${State.page === 'scrims' ? 'active' : ''}" data-nav-page="scrims" onclick="App.navigate('scrims')">
          ${Icons.scrims}
          <span>Jornadas</span>
        </button>

        <!-- NUEVO BOTÓN DE RECLUTAMIENTO (CORREGIDO) -->
        <button class="nav-link ${State.page === 'recruitment' ? 'active' : ''}" data-nav-page="recruitment" onclick="App.navigate('recruitment')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>Reclutamiento</span>
        </button>

        <button class="nav-link ${State.page === 'announcements' ? 'active' : ''}" data-nav-page="announcements" onclick="App.navigate('announcements')">
          ${Icons.announcements}
          <span>Comunicados</span>
        </button>
      </div>

      <div class="navbar-right">
        <div class="squad-dropdown">
          <button class="squad-current" id="squad-current-btn">
            <img src="assets/logo-${squad.toLowerCase()}.png" alt="${squad}" />
            <span class="squad-current-name">${squad}</span>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <div class="squad-menu">
            <button onclick="App.switchSquad('OFICIAL')" data-squad="OFICIAL">
              <img src="assets/logo-oficial.png" alt="OFICIAL">
              OFICIAL
            </button>
            <button onclick="App.switchSquad('TIER')" data-squad="TIER">
              <img src="assets/logo-tier.png" alt="TIER">
              TIER
            </button>
            <button onclick="App.switchSquad('GOLD')" data-squad="GOLD">
              <img src="assets/logo-gold.png" alt="GOLD">
              GOLD
            </button>
            <button onclick="App.switchSquad('GIRLS')" data-squad="GIRLS">
              <img src="assets/logo-girls.png" alt="GIRLS">
              GIRLS
            </button>

          </div>
        </div>
      </div>
    `;
    
    _navbarInstance = html;
    return html;
  },

  update() {
    const navbarElement = document.getElementById('navbar');
    if (!navbarElement) return;
    
    if (!_navbarInstance || !_navbarElement) {
      _navbarElement = navbarElement;
      navbarElement.innerHTML = this.render();
      
      // Lógica para abrir/cerrar el dropdown
      setTimeout(() => {
        const dropdown = document.querySelector('.squad-dropdown');
        const btn = document.getElementById('squad-current-btn');
        if (dropdown && btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
          });
          document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
              dropdown.classList.remove('open');
            }
          });
        }
      }, 0);
      
      return;
    }
    
    this._updateActiveStates();
    this._updateSquadInfo(State.squad);
  },
  
  _updateActiveStates() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const page = link.dataset.navPage;
      if (page) {
        link.classList.toggle('active', page === State.page);
      }
    });
  },
  
  _updateSquadInfo(squad) {
    const squadNameSpan = document.querySelector('.navbar-squad-name');
    if (squadNameSpan) squadNameSpan.textContent = squad;
    
    const brandLogo = document.querySelector('.navbar-left img');
    if (brandLogo) {
      brandLogo.src = `assets/logo-${squad.toLowerCase()}.png`;
      brandLogo.alt = `UZX Logo ${squad}`;
    }
    
    const squadCurrentBtn = document.getElementById('squad-current-btn');
    if (squadCurrentBtn) {
      const img = squadCurrentBtn.querySelector('img');
      const span = squadCurrentBtn.querySelector('.squad-current-name');
      if (img) {
        img.src = `assets/logo-${squad.toLowerCase()}.png`;
        img.alt = squad;
      }
      if (span) span.textContent = squad;
    }
    
    const squadMenuButtons = document.querySelectorAll('.squad-menu button');
    squadMenuButtons.forEach(btn => {
      const squadName = btn.dataset.squad;
      if (squadName) {
        btn.classList.toggle('active', squadName === squad);
      }
    });
  },
  
  forceFullUpdate() {
    _navbarInstance = null;
    _navbarElement = null;
    const navbarElement = document.getElementById('navbar');
    if (navbarElement) {
      navbarElement.innerHTML = this.render();
      _navbarElement = navbarElement;
    }
  }
};

export default Navbar;