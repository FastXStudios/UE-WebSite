// js/app.js
import State from './core/state.js';
import Navbar from './components/navbar.js';
import Wakeup from './components/wakeup.js';
import Footer from './components/footer.js';
import ScrimDetail from './components/scrimDetail.js';
import HomePage from './pages/home.js';
import PlayersPage from './pages/players.js';
import ScrimsPage from './pages/jornadas.js';
import AnnouncementsPage from './pages/announcements.js';
import { viewCache } from './core/viewCache.js';
import RecruitmentPage from './pages/recruitment.js';

const App = {
  pages: {
    home: HomePage,
    players: PlayersPage,
    scrims: ScrimsPage,
    announcements: AnnouncementsPage,
    recruitment: RecruitmentPage
  },
  
  _abortController: null,
  _currentPage: 'home',
  _isInitialized: false,
  
  async init() {
    // 🔥 CRUCIAL: Aplicar el color del tema guardado en localStorage ANTES de renderizar
    const savedSquad = localStorage.getItem('uzx_squad') || 'OFICIAL';
    document.body.className = `squad-${savedSquad.toLowerCase()}`;

    Wakeup.show();
    
    document.getElementById('app').style.display = 'block';
    document.getElementById('app').style.opacity = '0';
    
    const navbarContainer = document.getElementById('navbar');
    if (navbarContainer) {
      navbarContainer.innerHTML = Navbar.render();
    }
    
    // 🔥 CRUCIAL: Actualizar el navbar con el squad guardado
    Navbar.update();
    
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
      footerContainer.innerHTML = Footer.render();
    }
    
    await Wakeup.waitForServer();
    Wakeup.hide();
    
    await this.navigate('home');
    this.setupEventListeners();
    
    document.getElementById('app').style.opacity = '1';
    document.getElementById('app').style.transition = 'opacity 0.3s ease';
    
    this._isInitialized = true;
  },
  
  async navigate(page) {
    if (this._currentPage === page && this._isInitialized) return;
    
    if (this._abortController) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();
    
    State.page = page;
    document.body.dataset.page = page;
    Navbar.update();
    
    const content = document.getElementById('content');
    const pageModule = this.pages[page];
    
    if (!pageModule) {
      content.innerHTML = '<p>Página no encontrada</p>';
      return;
    }
    
    const cacheKey = `${page}_${State.squad}`;
    const cachedView = viewCache.get(cacheKey);
    
    if (cachedView) {
      content.innerHTML = cachedView.html;
      if (cachedView.afterRender) {
        await cachedView.afterRender(this._abortController);
      }
      this._currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    content.innerHTML = await pageModule.render();
    
    const html = content.innerHTML;
    
    if (pageModule.afterRender) {
      await pageModule.afterRender(this._abortController);
    }
    
    viewCache.set(cacheKey, {
      html,
      afterRender: pageModule.afterRender?.bind(pageModule)
    });
    
    this._currentPage = page;
  },
  
  async switchSquad(squad) {
    const currentPageName = this._currentPage || State.page || 'home';
    const pageModule = this.pages[currentPageName];
    
    // 1. Mostrar overlay de carga sobre el contenido ACTUAL
    if (pageModule && typeof pageModule._showLoadingOverlay === 'function') {
      pageModule._showLoadingOverlay();
    }
    
    // 2. Cancelar cargas previas
    if (this._abortController) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();
    const signal = this._abortController.signal;
    
    // 3. Invalidar caché antigua
    if (pageModule && typeof pageModule.invalidateCache === 'function') {
      pageModule.invalidateCache();
    }
    const cacheKey = `${currentPageName}_${squad}`;
    viewCache.invalidate(cacheKey);
    
    // 4. Cargar datos del nuevo squad (solo si la página lo soporta)
    let data = { players: [], scrims: [] };
    if (pageModule && typeof pageModule._loadData === 'function') {
      data = await pageModule._loadData(squad, signal);
    }
    
    if (signal.aborted) return;
    
    // 5. Guardar en caché interna (solo si la página lo soporta)
    if (pageModule && typeof pageModule._setCachedData === 'function') {
      pageModule._setCachedData(data.players, data.scrims, squad);
    }
    
    // 6. Actualizar estado GLOBAL solo del SQUAD (NO de la página)
    State.squad = squad;
    document.body.className = `squad-${squad.toLowerCase()}`;
    
    // 7. Actualizar el contenido
    if (pageModule && typeof pageModule.updateSquadContent === 'function' && currentPageName !== 'recruitment') {
      // Hot-swap para páginas que lo soportan (Home, Players, Scrims, Announcements)
      pageModule.updateSquadContent(squad, data.players, data.scrims);
    } else {
      // 🔥 CORRECCIÓN DEFINITIVA: Resetear y forzar la navegación
      if (currentPageName === 'recruitment') {
        // Invalidar el cache específico de reclutamiento para el nuevo squad
        viewCache.invalidate(`recruitment_${squad}`);
        // Resetear la página actual para evitar la validación de navigate()
        this._currentPage = null;
        // Forzar la navegación completa
        await this.navigate('recruitment');
      } else {
        // Fallback para páginas que no tienen updateSquadContent (pero que no son reclutamiento)
        const content = document.getElementById('content');
        content.innerHTML = await pageModule.render();
        if (pageModule && typeof pageModule.afterRender === 'function') {
          pageModule._squadChanging = true;
          await pageModule.afterRender(this._abortController);
          pageModule._squadChanging = false;
        }
      }
    }
    
    // 8. Actualizar Navbar y guardar la página actual
    Navbar.update();
    this._currentPage = currentPageName;
    
    // 9. Ocultar overlay
    if (pageModule && typeof pageModule._hideLoadingOverlay === 'function') {
      pageModule._hideLoadingOverlay();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  
  async openScrimDetail(id) {
    await ScrimDetail.open(id);
  },
  
  closeScrimDetail() {
    ScrimDetail.close();
  },
  
  setupEventListeners() {
    document.getElementById('scrim-detail-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeScrimDetail();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeScrimDetail();
      }
    });
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});