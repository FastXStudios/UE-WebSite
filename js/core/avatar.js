import CONFIG from './config.js';
// core/avatar.js
let defaultAvatarUrl = null;
let isLoading = false;
let loadPromise = null;

export async function loadDefaultAvatar() {
  // Si ya está cargado, devolverlo
  if (defaultAvatarUrl !== null) {
    return defaultAvatarUrl;
  }
  
  // Si ya está cargando, esperar
  if (isLoading && loadPromise) {
    return loadPromise;
  }
  
  isLoading = true;
  loadPromise = (async () => {
    try {
        const res = await fetch(CONFIG.API_BASE + '/settings/default-avatar');
      const data = await res.json();
      if (data.success && data.data?.url) {
        defaultAvatarUrl = data.data.url;
        // También guardar en window para acceso global
        window.defaultAvatarUrl = data.data.url;
      } else {
        defaultAvatarUrl = null;
        window.defaultAvatarUrl = null;
      }
    } catch (e) {
      console.log('No hay avatar default configurado');
      defaultAvatarUrl = null;
      window.defaultAvatarUrl = null;
    } finally {
      isLoading = false;
    }
    return defaultAvatarUrl;
  })();
  
  return loadPromise;
}

export function getDefaultAvatar() {
  // Intentar obtener de window si la variable local está vacía
  if (!defaultAvatarUrl && window.defaultAvatarUrl) {
    defaultAvatarUrl = window.defaultAvatarUrl;
  }
  return defaultAvatarUrl;
}

export function setDefaultAvatar(url) {
  defaultAvatarUrl = url;
  window.defaultAvatarUrl = url;
}