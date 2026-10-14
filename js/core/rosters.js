// js/core/rosters.js
import API from './api.js';
import State from './state.js';

const PublicRosters = {
  _cache: null,
  _lastFetch: 0,
  _ttl: 60_000, // 1 minuto

  async fetchActive() {
    const now = Date.now();
    if (this._cache && now - this._lastFetch < this._ttl) return this._cache;
    try {
      const res = await API.get('/rosters');
      // El backend público devuelve: [{ id: 'oficial', name, active: true }, ...]
      this._cache = (res.data || []).filter(r => r.active !== false);
      this._lastFetch = now;
      return this._cache;
    } catch (e) {
      console.warn('No se pudieron cargar los rosters activos:', e);
      // Fallback: si falla, devolver los 4 conocidos para no bloquear la UI
      this._cache = [
        { id: 'oficial', name: 'Oficial' },
        { id: 'tier', name: 'Tier' },
        { id: 'girls', name: 'Girls' },
        { id: 'gold', name: 'Gold' },
      ];
      this._lastFetch = now;
      return this._cache;
    }
  },

  async isActive(squad) {
    const list = await this.fetchActive();
    return list.some(r => String(r.id).toUpperCase() === String(squad).toUpperCase());
  },

  /** Devuelve el squad que debe estar activo ahora mismo (el guardado o el primero disponible). */
  async resolveValidSquad() {
    const list = await this.fetchActive();
    if (!list.length) return null;
    const saved = String(State.squad || '').toUpperCase();
    const stillActive = list.some(r => String(r.id).toUpperCase() === saved);
    if (stillActive) return saved;
    return String(list[0].id).toUpperCase();
  },

  invalidate() {
    this._cache = null;
    this._lastFetch = 0;
  },
};

export default PublicRosters;