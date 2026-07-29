// api.js
import CONFIG from './config.js';

const API = {
  _baseUrl: CONFIG.API_BASE,

  async get(path) {
    let response;
    try {
      response = await fetch(CONFIG.API_BASE + path);
    } catch (networkError) {
      throw new Error('No se pudo conectar al servidor. Verifica tu conexión.');
    }
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(`Error ${response.status}: Respuesta inválida del servidor`);
    }
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || `Error ${response.status}`);
    }
    
    return data;
  }
};

export default API;