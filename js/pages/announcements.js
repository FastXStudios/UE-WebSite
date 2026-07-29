// announcements.js
import Cache from '../core/cache.js';
import State from '../core/state.js';
import AnnouncementCard from '../components/announcementCard.js';
import Icons from '../core/icons.js';

// Inyectamos el CSS dinámicamente para que el modal funcione en caliente.
// Si ya tienes el CSS en tu hoja principal, puedes borrar esta función.
function injectAnnouncementStyles() {
  if (document.getElementById('announcement-modal-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'announcement-modal-styles';
  style.textContent = `
    .announcement-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; opacity: 0; visibility: hidden; transition: all 0.25s ease; }
    .announcement-modal-overlay.open { opacity: 1; visibility: visible; }
    .announcement-modal-box { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius-xl); width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); transform: scale(0.95) translateY(20px); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .announcement-modal-overlay.open .announcement-modal-box { transform: scale(1) translateY(0); }
    .announcement-modal-header { padding: 1.25rem 1.5rem; border-bottom: 1.5px solid var(--border); display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: var(--bg-card); z-index: 10; }
    .announcement-modal-title { font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; }
    .announcement-modal-close { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border: 1.5px solid var(--border); border-radius: var(--radius); color: var(--text-muted); cursor: pointer; transition: var(--transition); }
    .announcement-modal-close:hover { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); }
    .announcement-modal-body { padding: 1.5rem; }
    .announcement-modal-body .modal-image { width: 100%; max-height: 350px; object-fit: contain; background: var(--bg-secondary); border-radius: var(--radius); margin-bottom: 1.25rem; display: block; }
    .announcement-modal-body .modal-content { font-size: 0.95rem; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap; }
    .announcement-modal-body .modal-meta { display: flex; align-items: center; gap: 1rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--text-muted); }
    .announcement-read-more { background: none; border: none; color: var(--active-primary); font-weight: 700; font-size: 0.8rem; cursor: pointer; padding: 0.25rem 0; transition: var(--transition); display: inline-flex; align-items: center; gap: 0.3rem; margin-left: auto;}
    .announcement-read-more:hover { opacity: 0.8; text-decoration: underline; }
    .announcement-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  `;
  document.head.appendChild(style);
}

const AnnouncementsPage = {
  invalidateCache() {
    if (typeof Cache !== 'undefined' && Cache.invalidate) {
      Cache.invalidate('/announcements');
    }
  },
  
  async render() {
    const squad = State.squad;
    // Inyectamos estilos para que el modal funcione ni bien se renderice
    injectAnnouncementStyles();
    
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            ${Icons.announcements} Comunicados — UZX ${squad}
          </div>
          <div class="section-sub">Noticias y anuncios oficiales</div>
        </div>
        <div class="announcements-grid" id="all-announcements">
          <div class="loading-pulse" style="grid-column:1/-1">Cargando comunicados...</div>
        </div>
      </div>
    `;
  },
  
  async afterRender(abortController) {
    const squad = State.squad;
    const signal = abortController?.signal;
    
    await Cache.fetchSmart(`/announcements?squad=${squad}`, (data, isFresh) => {
      if (signal?.aborted) return;
      const container = document.getElementById('all-announcements');
      if (!container) return;
      
      // Renderizamos las cards
      container.innerHTML = AnnouncementCard.renderGrid(data);
      
      // Vinculamos los eventos de los modales
      this.bindModalEvents();
    });
  },

  bindModalEvents() {
    // 1. Abrir modal al hacer clic en "Ver más"
    document.querySelectorAll('.announcement-read-more').forEach(btn => {
      btn.removeEventListener('click', this._handleOpen);
      btn.addEventListener('click', this._handleOpen);
    });

    // 2. Cerrar modal al hacer clic en la "X"
    document.querySelectorAll('.announcement-modal-close').forEach(btn => {
      btn.removeEventListener('click', this._handleClose);
      btn.addEventListener('click', this._handleClose);
    });

    // 3. Cerrar modal al hacer clic en el fondo (overlay)
    document.querySelectorAll('.announcement-modal-overlay').forEach(overlay => {
      overlay.removeEventListener('click', this._handleOverlayClose);
      overlay.addEventListener('click', this._handleOverlayClose);
    });

    // 4. Cerrar modal con la tecla ESC
    document.removeEventListener('keydown', this._handleEsc);
    document.addEventListener('keydown', this._handleEsc);
  },

  _handleOpen(e) {
    const modalId = e.currentTarget.getAttribute('data-modal-id');
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      // Prevenir scroll del body mientras el modal esté abierto
      document.body.style.overflow = 'hidden';
    }
  },

  _handleClose(e) {
    const modalId = e.currentTarget.getAttribute('data-modal-id');
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  _handleOverlayClose(e) {
    // Solo cerramos si hicieron clic en el overlay (fondo) y no en el contenido
    if (e.target === e.currentTarget) {
      e.target.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  _handleEsc(e) {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.announcement-modal-overlay.open');
      if (openModal) {
        openModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  }
};

export default AnnouncementsPage;