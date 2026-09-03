// announcementCard.js
import Icons from '../core/icons.js';

const AnnouncementCard = {
  render(announcement) {
    const targetLabels = {
      ALL: 'Todos',
      OFICIAL: 'UZX OFICIAL',
      TIER: 'UZX TIER',
      GIRLS: 'UZX GIRLS',
      GOLD: 'UZX GOLD'
    };
    
    const date = new Date(announcement.createdAt).toLocaleDateString('es', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Generamos un extracto de 150 caracteres máximo
    const extract = announcement.content.length > 150 
      ? announcement.content.substring(0, 150).trim() + '...' 
      : announcement.content;

    const modalId = `modal-${announcement.id || Date.now()}`;
    
    return `
      <div class="announcement-card">
        ${announcement.imageBase64 
          ? `<img class="announcement-image" src="${announcement.imageBase64}" alt="${announcement.title}" loading="lazy" />` 
          : ''}
        <div class="announcement-body">
          
          <!-- Metadatos arriba: Etiqueta + Fecha -->
          <div class="announcement-meta-top">
            <!--<span class="announcement-target">${targetLabels[announcement.target] || announcement.target}</span>-->
            <div class="announcement-date-top">
              ${Icons.calendar} ${date}
            </div>
          </div>
          
          <!-- Título principal -->
          <div class="announcement-title">${announcement.title}</div>
          
          <!-- Extracto del contenido (no completo) -->
          <div class="announcement-content">${extract}</div>
          
          <div class="announcement-footer">
            <button class="announcement-read-more" data-modal-id="${modalId}">
              Ver más ${Icons.chevronRight || '→'}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal limpio -->
      <div class="announcement-modal-overlay" id="${modalId}">
        <div class="announcement-modal-box">
          <div class="announcement-modal-header">
            <div class="announcement-modal-title">${announcement.title}</div>
            <button class="announcement-modal-close" data-modal-id="${modalId}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="announcement-modal-body">
            ${announcement.imageBase64 
              ? `<img class="modal-image" src="${announcement.imageBase64}" alt="${announcement.title}" />` 
              : ''}
            <div class="modal-content">${announcement.content}</div>
            <div class="modal-meta-bottom">
              <div class="modal-date">${Icons.calendar} ${date}</div>
              <span class="announcement-target">${targetLabels[announcement.target] || announcement.target}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  renderGrid(announcements) {
    if (!announcements.length) {
      return `
        <div class="empty-state" style="grid-column:1/-1; width:100%;">
          <div class="empty-state-icon">${Icons.announcements}</div>
          <h3>Sin comunicados</h3>
          <p>No hay anuncios disponibles por el momento</p>
        </div>
      `;
    }
    
    return announcements.map(ann => this.render(ann)).join('');
  }
};

export default AnnouncementCard;
