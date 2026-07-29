// cache.js
import CONFIG from './config.js';
import API from './api.js';

const Cache = {
  _key(path) {
    return `uzx_cache_${path.replace(/[^a-z0-9]/gi, '_')}`;
  },

  set(path, data) {
    try {
      localStorage.setItem(
        this._key(path),
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch (e) {
      // Storage full, ignore
    }
  },

  get(path) {
    try {
      const raw = localStorage.getItem(this._key(path));
      if (!raw) return null;
      
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > CONFIG.CACHE_TTL) {
        localStorage.removeItem(this._key(path));
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  async fetchSmart(path, callback) {
    const cached = this.get(path);
    
    if (cached) {
      // Mostrar datos en caché inmediatamente
      callback(cached, false);
      
      // Refrescar en segundo plano (silencioso)
      try {
        const response = await API.get(path);
        this.set(path, response.data);
        callback(response.data, true);
      } catch (e) {
        // Error silencioso - los datos en caché siguen mostrándose
        console.warn('Background refresh failed:', e.message);
      }
      return;
    }

    // No hay caché - debe obtener los datos
    try {
      const response = await API.get(path);
      this.set(path, response.data);
      callback(response.data, true);
    } catch (e) {
      // Mostrar error en la UI
      callback(null, false, e.message);
      throw e;
    }
  },

  invalidate(prefix = '') {
    const keys = Object.keys(localStorage).filter(k => 
      k.startsWith('uzx_cache_') && k.includes(prefix)
    );
    keys.forEach(k => localStorage.removeItem(k));
  }
};

export default Cache;