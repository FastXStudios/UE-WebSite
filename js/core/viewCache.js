class ViewCacheManager {
    constructor() {
      this._cache = new Map();
      this._maxViews = 3; // Mantener máximo 3 vistas en memoria
      this._order = [];
    }
  
    get(key) {
      return this._cache.get(key);
    }
  
    set(key, data) {
      // Si ya existe, actualizar orden
      if (this._cache.has(key)) {
        this._order = this._order.filter(k => k !== key);
      }
      
      this._order.push(key);
      this._cache.set(key, data);
  
      // Limpiar vistas antiguas si excede el límite
      while (this._order.length > this._maxViews) {
        const oldest = this._order.shift();
        this._cache.delete(oldest);
      }
    }
  
    has(key) {
      return this._cache.has(key);
    }
  
    clear() {
      this._cache.clear();
      this._order = [];
    }
  
    // Invalidar vista específica
    invalidate(key) {
      this._cache.delete(key);
      this._order = this._order.filter(k => k !== key);
    }
  }
  
  export const viewCache = new ViewCacheManager();