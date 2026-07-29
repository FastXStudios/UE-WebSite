// js/pages/recruitment.js
import State from '../core/state.js';
import API from '../core/api.js';
import CONFIG from '../core/config.js';
import Icons from '../core/icons.js';
import FLAGS from '../core/flags.js';

// ─── CONSTANTES ───────────────────────────────────────────────
const STEPS = [
  { id: 'personal', label: 'Datos personales' },
  { id: 'game', label: 'Información de juego' },
  { id: 'experience', label: 'Experiencia competitiva' },
  { id: 'availability', label: 'Disponibilidad y equipo' },
  { id: 'motivation', label: 'Motivación' }
];

const COUNTRY_CODES = {
  MX: '+52', CO: '+57', AR: '+54', PE: '+51', CL: '+56',
  BR: '+55', VE: '+58', EC: '+593', BO: '+591', DO: '+1',
  US: '+1', ES: '+34', UY: '+598', PY: '+595', GT: '+502'
};

const ROLE_OPTIONS = [
  { value: 'L1', label: 'L1 (Entry)' },
  { value: 'L2', label: 'L2 (Support)' },
  { value: 'L3', label: 'L3 (Flex)' },
  { value: 'GRANADERO', label: 'Granadero' },
  { value: 'FLEX', label: 'Flex' },
  { value: 'SOPORTE', label: 'Soporte' }
];

const YEARS_PLAYING = [
  { value: 'MENOS_1_ANIO', label: 'Menos de 1 año' },
  { value: '1_ANIO', label: '1 año' },
  { value: '2_ANIOS', label: '2 años' },
  { value: '3_ANIOS', label: '3 años' },
  { value: '4_ANIOS', label: '4 años' },
  { value: '5_ANIOS', label: '5 años' },
  { value: 'MAS_5_ANIOS', label: 'Más de 5 años' }
];

const SITUATION_OPTIONS = [
  { value: 'NUEVO_APRENDER', label: 'Soy nuevo y quiero aprender' },
  { value: 'EXPERIENCIA_MEJORAR', label: 'Tengo experiencia y quiero mejorar' },
  { value: 'OPORTUNIDAD_COMPETIR', label: 'Busco una oportunidad para competir' },
  { value: 'EQUIPO_SERIO', label: 'Busco un equipo serio' }
];

const COMPETITIVE_LEVELS = [
  'NUNCA', 'LIGAS_LOCALES', 'TORNEOS_COMUNITARIOS',
  'ASCENSOS', 'CUADRILATEROS', 'FFWS', 'EWC', 'OTROS'
];

// ─── FINGERPRINT (sin librerías externas) ────────────────────
function generateFingerprint() {
  // 1. Revisar si ya está guardado en localStorage
  const stored = localStorage.getItem('uzx_fp');
  if (stored) return stored;

  // 2. Recopilar características
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('UZX Fingerprint', 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText('FP', 4, 17);
  const canvasData = canvas.toDataURL();

  const components = [
    canvasData,
    navigator.userAgent || '',
    navigator.language || '',
    navigator.hardwareConcurrency || '',
    navigator.deviceMemory || '',
    screen.width || '',
    screen.height || '',
    screen.colorDepth || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    new Date().getTimezoneOffset() || ''
  ];

  const raw = components.join('|||');

  // 3. Hash simple (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash = hash & hash;
  }

  const fingerprint = 'uzx_' + Math.abs(hash).toString(36);

  // 4. Guardar en localStorage
  try {
    localStorage.setItem('uzx_fp', fingerprint);
  } catch (e) {}

  return fingerprint;
}

// ─── ESTADO INTERNO ───────────────────────────────────────────
let _currentStep = 0;
let _formData = {};
let _isSubmitting = false;
let _hasSubmitted = false; // Local cache (UX adicional)

// ─── HELPERS ──────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function getFlagHtml(country) {
  return FLAGS[country] ? `<img src="${FLAGS[country]}" alt="${esc(country)}" style="width:22px;height:16px;object-fit:cover;border-radius:2px;vertical-align:middle;margin-right:6px;">` : '';
}

function getCountryCode(country) {
  return COUNTRY_CODES[country] || '+1';
}

// ─── VALIDACIONES ─────────────────────────────────────────────
function validateStep(stepId, data) {
    const errors = {};
  
    if (stepId === 'personal') {
      if (!data.realName || data.realName.trim().length === 0) errors.realName = 'El nombre real es obligatorio.';
      else if (data.realName.length > 40) errors.realName = 'Máximo 40 caracteres.';
      
      if (!data.age || Number.isNaN(data.age) || data.age < 13 || data.age > 40) errors.age = 'Debes tener entre 13 y 40 años.';
      
      if (!data.country) errors.country = 'Selecciona tu país.';
      
      if (data.serverRegion && data.serverRegion.length > 15) errors.serverRegion = 'Máximo 15 caracteres.';
      
      if (!data.phoneCountryCode) errors.phoneCountryCode = 'Selecciona el código de país.';
      if (!data.phoneNumber || data.phoneNumber.length === 0) errors.phoneNumber = 'El número de teléfono es obligatorio.';
      else if (!/^\d+$/.test(data.phoneNumber)) errors.phoneNumber = 'Solo dígitos.';
      else if (data.phoneNumber.length > 15) errors.phoneNumber = 'Máximo 15 dígitos.';
    }
  
    if (stepId === 'game') {
      if (!data.gameName || data.gameName.trim().length === 0) errors.gameName = 'El nombre en juego es obligatorio.';
      else if (data.gameName.length > 20) errors.gameName = 'Máximo 20 caracteres.';
      
      if (!data.freeFireId || data.freeFireId.length === 0) errors.freeFireId = 'El ID de Free Fire es obligatorio.';
      else if (!/^\d+$/.test(data.freeFireId)) errors.freeFireId = 'Solo dígitos.';
      else if (data.freeFireId.length > 12) errors.freeFireId = 'Máximo 12 dígitos.';
      
      if (!data.accountLevel || Number.isNaN(data.accountLevel) || data.accountLevel < 1) errors.accountLevel = 'El nivel de cuenta es obligatorio.';
      else if (data.accountLevel > 100) errors.accountLevel = 'Máximo 100.';
      
      if (!data.yearsPlaying) errors.yearsPlaying = 'Selecciona cuánto tiempo llevas jugando.';
      
      if (!data.mainRole) errors.mainRole = 'Selecciona tu rol principal.';
      
      if (!data.skillLevel || Number.isNaN(data.skillLevel) || data.skillLevel < 1 || data.skillLevel > 10) errors.skillLevel = 'Nivel de Jugabilidad debe ser entre 1 y 10.';
      
      if (!data.situation) errors.situation = 'Selecciona tu situación actual.';
    }
  
    if (stepId === 'experience') {
      // 🔥 VALIDACIÓN ROBUSTA DE COMPETITIVE LEVELS
      if (!data.competitiveLevels || !Array.isArray(data.competitiveLevels) || data.competitiveLevels.length === 0) {
        errors.competitiveLevels = 'Selecciona al menos un nivel competitivo.';
      }
      
      if (data.competitiveLevels?.includes('OTROS') && (!data.otherTournamentName || data.otherTournamentName.trim().length === 0)) {
        errors.otherTournamentName = 'Especifica el nombre del torneo.';
      }
      
      // 🔥 VALIDACIÓN DE COMPETED IN TOURNAMENTS (debe ser true o false, no '')
      if (data.competedInTournaments === undefined || data.competedInTournaments === null || data.competedInTournaments === '') {
        errors.competedInTournaments = 'Selecciona si has competido en torneos.';
      } else if (data.competedInTournaments === true && (!data.tournamentExperience || data.tournamentExperience.trim().length === 0)) {
        errors.tournamentExperience = 'Describe tu experiencia en torneos.';
      } else if (data.tournamentExperience && data.tournamentExperience.length > 250) {
        errors.tournamentExperience = 'Máximo 250 caracteres.';
      }
      
      // 🔥 VALIDACIÓN DE WAS IN CLAN
      if (data.wasInClan === undefined || data.wasInClan === null || data.wasInClan === '') {
        errors.wasInClan = 'Selecciona si has estado en clanes.';
      } else if (data.wasInClan === true && (!data.clanNames || data.clanNames.trim().length === 0)) {
        errors.clanNames = 'Escribe los nombres de los clanes.';
      }
      
      // 🔥 VALIDACIÓN DE PLAYED IN COMPETITIVE TEAMS
      if (data.playedInCompetitiveTeams === undefined || data.playedInCompetitiveTeams === null || data.playedInCompetitiveTeams === '') {
        errors.playedInCompetitiveTeams = 'Selecciona si has jugado en equipos competitivos.';
      } else if (data.playedInCompetitiveTeams === true && (!data.competitiveTeamNames || data.competitiveTeamNames.trim().length === 0)) {
        errors.competitiveTeamNames = 'Escribe los nombres de los equipos.';
      }
  
      if (data.highlightsUrl && data.highlightsUrl.length > 250) {
          errors.highlightsUrl = 'Máximo 250 caracteres.';
      }
      
      // 🔥 VALIDACIÓN DE BEST RESULT
      if (!data.bestResult || data.bestResult === '') {
        errors.bestResult = 'Selecciona tu mejor resultado.';
      }
      
      // 🔥 VALIDACIÓN DE COMPETITIVE TIME
      if (!data.competitiveTime || data.competitiveTime === '') {
        errors.competitiveTime = 'Selecciona tu tiempo en equipos competitivos.';
      }
    }
  
    if (stepId === 'availability') {
      if (!data.daysPerWeek || Number.isNaN(data.daysPerWeek) || data.daysPerWeek < 2 || data.daysPerWeek > 5) {
        errors.daysPerWeek = 'Debes jugar entre 2 y 5 días por semana.';
    }
      if (!data.availableSchedule || data.availableSchedule.trim().length === 0) {
        errors.availableSchedule = 'Indica tu horario disponible.';
      }
      if (!data.deviceType) errors.deviceType = 'Selecciona tu tipo de dispositivo.';
      if (!data.deviceTier) errors.deviceTier = 'Selecciona el nivel de tu dispositivo.';
      if (!data.fpsStability) errors.fpsStability = 'Selecciona la estabilidad de FPS.';
      if (!data.connectionQuality) errors.connectionQuality = 'Selecciona la calidad de conexión.';
      if (data.hasDiscord && (!data.discordUsername || data.discordUsername.trim().length === 0)) {
        errors.discordUsername = 'Escribe tu usuario de Discord.';
      }
      if (data.hasDiscord && data.discordUsername && data.discordUsername.length > 40) {
        errors.discordUsername = 'Máximo 40 caracteres.';
      }
      if (!data.micUsage) errors.micUsage = 'Selecciona tu uso de micrófono.';
      if (!data.noiseLevel) errors.noiseLevel = 'Selecciona el nivel de ruido.';
      if (data.currentlyInOtherTeam && data.willingToLeaveTeam === null) {
        errors.willingToLeaveTeam = 'Indica si estás dispuesto a dejar tu equipo actual.';
      }
    }
  
    if (stepId === 'motivation') {
      if (!data.whyJoin || data.whyJoin.trim().length === 0) errors.whyJoin = 'Cuéntanos por qué quieres unirte.';
      else if (data.whyJoin.length > 500) errors.whyJoin = 'Máximo 500 caracteres.';
      
      if (!data.whatCanContribute || data.whatCanContribute.trim().length === 0) errors.whatCanContribute = 'Cuéntanos qué puedes aportar.';
      else if (data.whatCanContribute.length > 500) errors.whatCanContribute = 'Máximo 500 caracteres.';
      
      if (!data.biggestStrength || data.biggestStrength.trim().length === 0) errors.biggestStrength = 'Cuéntanos tu mayor fortaleza.';
      else if (data.biggestStrength.length > 300) errors.biggestStrength = 'Máximo 300 caracteres.';
      
      if (!data.biggestWeakness || data.biggestWeakness.trim().length === 0) errors.biggestWeakness = 'Cuéntanos tu mayor debilidad.';
      else if (data.biggestWeakness.length > 300) errors.biggestWeakness = 'Máximo 300 caracteres.';
      
      if (data.additionalNotes && data.additionalNotes.length > 400) errors.additionalNotes = 'Máximo 400 caracteres.';
    }
  
    return errors;
  }
// ─── OVERLAY DE CARGA ─────────────────────────────────────────
function showLoadingOverlay() {
    // Eliminar overlay existente si lo hay
    const existing = document.getElementById('uzx-loading-overlay');
    if (existing) existing.remove();
  
    const overlay = document.createElement('div');
    overlay.id = 'uzx-loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      pointer-events: auto;
    `;
    overlay.innerHTML = `
      <div style="width:60px;height:60px;border:4px solid rgba(255,255,255,0.2);border-top-color:var(--active-primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        #uzx-loading-overlay + * { pointer-events: none; }
      </style>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }
  
  function hideLoadingOverlay() {
    const overlay = document.getElementById('uzx-loading-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
  }
// ─── RENDER DEL FORMULARIO ────────────────────────────────────
function renderRecruitmentForm() {
  // Verificar si ya envió desde este navegador (capa UX adicional)
  if (localStorage.getItem('uzx_application_sent') === 'true') {
    return renderAlreadySent();
  }

  const step = STEPS[_currentStep];
  const progress = ((_currentStep + 1) / STEPS.length) * 100;

  return `
    <div class="section" id="recruitment-section" style="max-width:900px;margin:0 auto;">
      <div class="section-header">
        <div class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Reclutamiento — UZX ${State.squad}
        </div>
        <div class="section-sub">Únete al equipo. Completa todos los pasos.</div>
      </div>

      <!-- Barra de progreso -->
      <div style="margin-bottom:2rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${progress}%;background:var(--active-primary);border-radius:2px;transition:width 0.4s ease;"></div>
        </div>
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);white-space:nowrap;">
          Paso ${_currentStep + 1} de ${STEPS.length}
        </span>
      </div>

      <!-- Pasos (indicadores) -->
      <div style="display:flex;gap:0.5rem;margin-bottom:2rem;flex-wrap:wrap;">
        ${STEPS.map((s, i) => `
          <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;font-weight:600;color:${i === _currentStep ? 'var(--active-primary)' : i < _currentStep ? 'var(--text-muted)' : 'var(--text-muted)'};">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${i === _currentStep ? 'var(--active-primary)' : i < _currentStep ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)'};color:${i === _currentStep ? '#fff' : 'var(--text-muted)'};font-size:0.7rem;">
              ${i < _currentStep ? '✓' : i + 1}
            </span>
            <span style="display:${i === _currentStep ? 'inline' : 'none'};font-weight:700;">${s.label}</span>
          </div>
          ${i < STEPS.length - 1 ? `<span style="color:var(--border);">—</span>` : ''}
        `).join('')}
      </div>

      <!-- Formulario del paso actual -->
      <div id="recruitment-form-container" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow-sm);">
        <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px;">
          ${step.label}
        </h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1.5rem;">
          ${getStepDescription(step.id)}
        </p>

        <div id="step-content">
          ${renderStep(step.id)}
        </div>

        <!-- Botones de navegación -->
        <div style="display:flex;justify-content:space-between;gap:1rem;margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);">
          <button class="btn btn-secondary" id="btn-prev-step" ${_currentStep === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
            Anterior
          </button>
          <div style="display:flex;gap:0.75rem;">
            ${_currentStep < STEPS.length - 1 ? `
              <button class="btn btn-primary" id="btn-next-step">
                Siguiente
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-submit-application" ${_isSubmitting ? 'disabled' : ''}>
                ${_isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

function getStepDescription(stepId) {
  const descs = {
    personal: 'Cuéntanos quién eres y cómo contactarte.',
    game: 'Tu perfil como jugador de Free Fire.',
    experience: '¿Qué tanto has competido? Cuéntanos tu trayectoria.',
    availability: 'Tu disponibilidad, equipo y condiciones para jugar.',
    motivation: '¿Por qué quieres estar en UZX?'
  };
  return descs[stepId] || '';
}

// ─── RENDER DE CADA PASO ──────────────────────────────────────
function renderStep(stepId) {
  const data = _formData;
  
  if (stepId === 'personal') {
    return `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre real <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-realName" value="${esc(data.realName || '')}" placeholder="Ej: Juan Pérez" maxlength="40" />
          <div class="form-error" id="err-realName"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Edad <span class="required">*</span></label>
          <input type="number" class="form-control" id="f-age" value="${data.age || ''}" placeholder="13-40" min="13" max="40" />
          <div class="form-error" id="err-age"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">País <span class="required">*</span></label>
            <select class="form-control" id="f-country">
            <option value="">Selecciona tu país</option>
            ${Object.entries({
                MX: 'México',
                CO: 'Colombia',
                AR: 'Argentina',
                PE: 'Perú',
                CL: 'Chile',
                BR: 'Brasil',
                VE: 'Venezuela',
                EC: 'Ecuador',
                BO: 'Bolivia',
                DO: 'República Dominicana',
                US: 'Estados Unidos',
                ES: 'España',
                UY: 'Uruguay',
                PY: 'Paraguay',
                GT: 'Guatemala'
            }).map(([code, name]) => `
                <option value="${code}" ${data.country === code ? 'selected' : ''}>
                ${getFlagHtml(code)} ${name}
                </option>
            `).join('')}
            </select>
          <div class="form-error" id="err-country"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Servidor <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-serverRegion" value="${esc(data.serverRegion || '')}" placeholder="Ej: LATAM, BR, NA" maxlength="15" />
          <div class="form-error" id="err-serverRegion"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Código de país <span class="required">*</span></label>
          <select class="form-control" id="f-phoneCountryCode">
            <option value="">Selecciona</option>
            ${Object.entries(COUNTRY_CODES).map(([code, prefix]) => `
              <option value="${prefix}" ${data.phoneCountryCode === prefix ? 'selected' : ''}>
                ${getFlagHtml(code)} ${prefix} (${code})
              </option>
            `).join('')}
          </select>
          <div class="form-error" id="err-phoneCountryCode"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Número de teléfono <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-phoneNumber" value="${esc(data.phoneNumber || '')}" placeholder="Solo dígitos" maxlength="15" />
          <div class="form-error" id="err-phoneNumber"></div>
        </div>
      </div>
    `;
  }

  if (stepId === 'game') {
    return `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre en juego <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-gameName" value="${esc(data.gameName || '')}" placeholder="Ej: Zayko" maxlength="20" />
          <div class="form-error" id="err-gameName"></div>
        </div>
        <div class="form-group">
          <label class="form-label">ID de Free Fire <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-freeFireId" value="${esc(data.freeFireId || '')}" placeholder="Solo dígitos" maxlength="12" />
          <div class="form-error" id="err-freeFireId"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nivel de cuenta <span class="required">*</span></label>
          <input type="number" class="form-control" id="f-accountLevel" value="${data.accountLevel || ''}" placeholder="Ej: 75" min="1" max="999" />
          <div class="form-error" id="err-accountLevel"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Años jugando <span class="required">*</span></label>
          <select class="form-control" id="f-yearsPlaying">
            <option value="">Selecciona</option>
            ${YEARS_PLAYING.map(y => `
              <option value="${y.value}" ${data.yearsPlaying === y.value ? 'selected' : ''}>${y.label}</option>
            `).join('')}
          </select>
          <div class="form-error" id="err-yearsPlaying"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Rol principal <span class="required">*</span></label>
          <select class="form-control" id="f-mainRole">
            <option value="">Selecciona tu rol</option>
            ${ROLE_OPTIONS.map(r => `
              <option value="${r.value}" ${data.mainRole === r.value ? 'selected' : ''}>${r.label}</option>
            `).join('')}
          </select>
          <div class="form-error" id="err-mainRole"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Nivel de Jugabilidad (1-10) <span class="required">*</span></label>
          <input type="number" class="form-control" id="f-skillLevel" value="${data.skillLevel || ''}" placeholder="1-10" min="1" max="10" />
          <div class="form-error" id="err-skillLevel"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Situación actual <span class="required">*</span></label>
        <select class="form-control" id="f-situation">
          <option value="">Selecciona</option>
          ${SITUATION_OPTIONS.map(s => `
            <option value="${s.value}" ${data.situation === s.value ? 'selected' : ''}>${s.label}</option>
          `).join('')}
        </select>
        <div class="form-error" id="err-situation"></div>
      </div>
    `;
  }

  if (stepId === 'experience') {
    const levels = data.competitiveLevels || [];
    return `
      <div class="form-group">
        <label class="form-label">Niveles competitivos en los que has participado <span class="required">*</span></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.5rem;">
          ${COMPETITIVE_LEVELS.map(level => `
            <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer;">
              <input type="checkbox" value="${level}" ${levels.includes(level) ? 'checked' : ''} />
              ${level.replace(/_/g, ' ')}
            </label>
          `).join('')}
        </div>
        <div class="form-error" id="err-competitiveLevels"></div>
      </div>

      <div id="other-tournament-container" style="display:${levels.includes('OTROS') ? 'block' : 'none'};margin-top:0.5rem;">
        <div class="form-group">
          <label class="form-label">Nombre del torneo <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-otherTournamentName" value="${esc(data.otherTournamentName || '')}" placeholder="Ej: Torneo regional X" />
          <div class="form-error" id="err-otherTournamentName"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">¿Has competido en torneos? <span class="required">*</span></label>
          <select class="form-control" id="f-competedInTournaments" onchange="toggleTournamentExperience()">
            <option value="">Selecciona</option>
            <option value="true" ${data.competedInTournaments === true ? 'selected' : ''}>Sí</option>
            <option value="false" ${data.competedInTournaments === false ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Mejor resultado <span class="required">*</span></label>
          <select class="form-control" id="f-bestResult">
                <option value="NINGUNO" ${data.bestResult === 'NINGUNO' ? 'selected' : ''}>Ninguno</option>
                <option value="PUESTO_12" ${data.bestResult === 'PUESTO_12' ? 'selected' : ''}>Puesto 12</option>
                <option value="PUESTO_11" ${data.bestResult === 'PUESTO_11' ? 'selected' : ''}>Puesto 11</option>
                <option value="PUESTO_10" ${data.bestResult === 'PUESTO_10' ? 'selected' : ''}>Puesto 10</option>
                <option value="PUESTO_9" ${data.bestResult === 'PUESTO_9' ? 'selected' : ''}>Puesto 9</option>
                <option value="PUESTO_8" ${data.bestResult === 'PUESTO_8' ? 'selected' : ''}>Puesto 8</option>
                <option value="PUESTO_7" ${data.bestResult === 'PUESTO_7' ? 'selected' : ''}>Puesto 7</option>
                <option value="PUESTO_6" ${data.bestResult === 'PUESTO_6' ? 'selected' : ''}>Puesto 6</option>
                <option value="PUESTO_5" ${data.bestResult === 'PUESTO_5' ? 'selected' : ''}>Puesto 5</option>
                <option value="PUESTO_4" ${data.bestResult === 'PUESTO_4' ? 'selected' : ''}>Puesto 4</option>
                <option value="PUESTO_3" ${data.bestResult === 'PUESTO_3' ? 'selected' : ''}>Puesto 3</option>
                <option value="PUESTO_2" ${data.bestResult === 'PUESTO_2' ? 'selected' : ''}>Puesto 2</option>
                <option value="FINALISTA" ${data.bestResult === 'FINALISTA' ? 'selected' : ''}>Finalista</option>
                <option value="CAMPEON" ${data.bestResult === 'CAMPEON' ? 'selected' : ''}>Campeón</option>
          </select>
        </div>
      </div>

      <div id="tournament-experience-container" style="display:${data.competedInTournaments ? 'block' : 'none'};margin-top:0.5rem;">
        <div class="form-group">
          <label class="form-label">Experiencia en torneos <span class="required">*</span></label>
          <textarea class="form-control" id="f-tournamentExperience" rows="2" maxlength="250" placeholder="Describe tu experiencia...">${esc(data.tournamentExperience || '')}</textarea>
          <div class="form-error" id="err-tournamentExperience"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">¿Has estado en clanes? <span class="required">*</span></label>
          <select class="form-control" id="f-wasInClan" onchange="toggleClanNames()">
            <option value="">Selecciona</option>
            <option value="true" ${data.wasInClan === true ? 'selected' : ''}>Sí</option>
            <option value="false" ${data.wasInClan === false ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tiempo en equipos competitivos <span class="required">*</span></label>
          <select class="form-control" id="f-competitiveTime">
            <option value="">Selecciona</option>
            <option value="MENOS_6_MESES" ${data.competitiveTime === 'MENOS_6_MESES' ? 'selected' : ''}>Menos de 6 meses</option>
            <option value="6_MESES" ${data.competitiveTime === '6_MESES' ? 'selected' : ''}>6 meses</option>
            <option value="1_ANIO" ${data.competitiveTime === '1_ANIO' ? 'selected' : ''}>1 año</option>
            <option value="2_ANIOS" ${data.competitiveTime === '2_ANIOS' ? 'selected' : ''}>2 años</option>
            <option value="3_ANIOS" ${data.competitiveTime === '3_ANIOS' ? 'selected' : ''}>3 años</option>
            <option value="4_ANIOS" ${data.competitiveTime === '4_ANIOS' ? 'selected' : ''}>4 años</option>
            <option value="MAS_5_ANIOS" ${data.competitiveTime === 'MAS_5_ANIOS' ? 'selected' : ''}>Más de 5 años</option>
          </select>
        </div>
      </div>

      <div id="clan-names-container" style="display:${data.wasInClan ? 'block' : 'none'};margin-top:0.5rem;">
        <div class="form-group">
          <label class="form-label">Nombres de los clanes <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-clanNames" value="${esc(data.clanNames || '')}" placeholder="Ej: Clan1, Clan2" />
          <div class="form-error" id="err-clanNames"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">¿Has jugado en equipos competitivos? <span class="required">*</span></label>
          <select class="form-control" id="f-playedInCompetitiveTeams" onchange="toggleCompetitiveTeams()">
            <option value="">Selecciona</option>
            <option value="true" ${data.playedInCompetitiveTeams === true ? 'selected' : ''}>Sí</option>
            <option value="false" ${data.playedInCompetitiveTeams === false ? 'selected' : ''}>No</option>
          </select>
        </div>
            <div class="form-group">
            <label class="form-label">URL de highlights (opcional)</label>
            <input type="text" class="form-control" id="f-highlightsUrl" value="${esc(data.highlightsUrl || '')}" placeholder="https://..." maxlength="250" />
            <div class="form-error" id="err-highlightsUrl"></div>
            </div>
      </div>

      <div id="competitive-teams-container" style="display:${data.playedInCompetitiveTeams ? 'block' : 'none'};margin-top:0.5rem;">
        <div class="form-group">
          <label class="form-label">Nombres de los equipos <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-competitiveTeamNames" value="${esc(data.competitiveTeamNames || '')}" placeholder="Ej: Team1, Team2" />
          <div class="form-error" id="err-competitiveTeamNames"></div>
        </div>
      </div>
    `;
  }

  if (stepId === 'availability') {
    return `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Días por semana <span class="required">*</span></label>
          <input type="number" class="form-control" id="f-daysPerWeek" value="${data.daysPerWeek || ''}" placeholder="2-5" min="2" max="5" />
          <div class="form-error" id="err-daysPerWeek"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Horario disponible <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-availableSchedule" value="${esc(data.availableSchedule || '')}" placeholder="Ej: 8 PM MX, 9 PM CO" />
          <div class="form-error" id="err-availableSchedule"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;">
          <span>¿Puedes mantener un horario constante?</span>
          <label class="switch">
            <input type="checkbox" id="f-constantSchedule" ${data.constantSchedule ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </label>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo de dispositivo <span class="required">*</span></label>
          <select class="form-control" id="f-deviceType">
            <option value="">Selecciona</option>
            <option value="ANDROID" ${data.deviceType === 'ANDROID' ? 'selected' : ''}>Android</option>
            <option value="IPHONE" ${data.deviceType === 'IPHONE' ? 'selected' : ''}>iPhone</option>
            <option value="IPAD" ${data.deviceType === 'IPAD' ? 'selected' : ''}>iPad</option>
            <option value="TABLET_ANDROID" ${data.deviceType === 'TABLET_ANDROID' ? 'selected' : ''}>Tablet Android</option>
          </select>
          <div class="form-error" id="err-deviceType"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Nivel de dispositivo <span class="required">*</span></label>
          <select class="form-control" id="f-deviceTier">
            <option value="">Selecciona</option>
            <option value="MUY_BAJA" ${data.deviceTier === 'MUY_BAJA' ? 'selected' : ''}>Muy baja</option>
            <option value="BAJA" ${data.deviceTier === 'BAJA' ? 'selected' : ''}>Baja</option>
            <option value="MEDIA" ${data.deviceTier === 'MEDIA' ? 'selected' : ''}>Media</option>
            <option value="BUENA" ${data.deviceTier === 'BUENA' ? 'selected' : ''}>Buena</option>
            <option value="EXCELENTE" ${data.deviceTier === 'EXCELENTE' ? 'selected' : ''}>Excelente</option>
          </select>
          <div class="form-error" id="err-deviceTier"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Estabilidad de FPS <span class="required">*</span></label>
          <select class="form-control" id="f-fpsStability">
            <option value="">Selecciona</option>
            <option value="SI" ${data.fpsStability === 'SI' ? 'selected' : ''}>Sí, estables</option>
            <option value="NO" ${data.fpsStability === 'NO' ? 'selected' : ''}>No, inestables</option>
            <option value="A_VECES" ${data.fpsStability === 'A_VECES' ? 'selected' : ''}>A veces</option>
          </select>
          <div class="form-error" id="err-fpsStability"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Calidad de conexión <span class="required">*</span></label>
          <select class="form-control" id="f-connectionQuality">
            <option value="">Selecciona</option>
            <option value="EXCELENTE" ${data.connectionQuality === 'EXCELENTE' ? 'selected' : ''}>Excelente</option>
            <option value="BUENA" ${data.connectionQuality === 'BUENA' ? 'selected' : ''}>Buena</option>
            <option value="REGULAR" ${data.connectionQuality === 'REGULAR' ? 'selected' : ''}>Regular</option>
            <option value="MALA" ${data.connectionQuality === 'MALA' ? 'selected' : ''}>Mala</option>
          </select>
          <div class="form-error" id="err-connectionQuality"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;">
          <span>¿Tienes Discord?</span>
          <label class="switch">
            <input type="checkbox" id="f-hasDiscord" ${data.hasDiscord ? 'checked' : ''} onchange="toggleDiscord()" />
            <span class="slider"></span>
          </label>
        </label>
      </div>

      <div id="discord-container" style="display:${data.hasDiscord ? 'block' : 'none'};margin-top:0.5rem;">
        <div class="form-group">
          <label class="form-label">Usuario de Discord <span class="required">*</span></label>
          <input type="text" class="form-control" id="f-discordUsername" value="${esc(data.discordUsername || '')}" placeholder="Ej: usuario#1234" maxlength="40" />
          <div class="form-error" id="err-discordUsername"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Uso de micrófono <span class="required">*</span></label>
          <select class="form-control" id="f-micUsage">
            <option value="">Selecciona</option>
            <option value="SIEMPRE" ${data.micUsage === 'SIEMPRE' ? 'selected' : ''}>Siempre</option>
            <option value="A_VECES" ${data.micUsage === 'A_VECES' ? 'selected' : ''}>A veces</option>
            <option value="NO" ${data.micUsage === 'NO' ? 'selected' : ''}>No</option>
          </select>
          <div class="form-error" id="err-micUsage"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Nivel de ruido ambiental <span class="required">*</span></label>
          <select class="form-control" id="f-noiseLevel">
            <option value="">Selecciona</option>
            <option value="SIN_RUIDO" ${data.noiseLevel === 'SIN_RUIDO' ? 'selected' : ''}>Sin ruido</option>
            <option value="POCO_RUIDO" ${data.noiseLevel === 'POCO_RUIDO' ? 'selected' : ''}>Poco ruido</option>
            <option value="RUIDO_MODERADO" ${data.noiseLevel === 'RUIDO_MODERADO' ? 'selected' : ''}>Ruido moderado</option>
            <option value="MUCHO_RUIDO" ${data.noiseLevel === 'MUCHO_RUIDO' ? 'selected' : ''}>Mucho ruido</option>
          </select>
          <div class="form-error" id="err-noiseLevel"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;">
          <span>¿Usas audífonos?</span>
          <label class="switch">
            <input type="checkbox" id="f-usesHeadset" ${data.usesHeadset ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </label>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">¿Actualmente en otro equipo? <span class="required">*</span></label>
          <select class="form-control" id="f-currentlyInOtherTeam" onchange="toggleWillingToLeave()">
            <option value="">Selecciona</option>
            <option value="true" ${data.currentlyInOtherTeam === true ? 'selected' : ''}>Sí</option>
            <option value="false" ${data.currentlyInOtherTeam === false ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-group" id="willing-to-leave-container" style="display:${data.currentlyInOtherTeam ? 'block' : 'none'};">
          <label class="form-label">¿Dispuesto a dejar tu equipo actual? <span class="required">*</span></label>
          <select class="form-control" id="f-willingToLeaveTeam">
            <option value="">Selecciona</option>
            <option value="true" ${data.willingToLeaveTeam === true ? 'selected' : ''}>Sí</option>
            <option value="false" ${data.willingToLeaveTeam === false ? 'selected' : ''}>No</option>
          </select>
          <div class="form-error" id="err-willingToLeaveTeam"></div>
        </div>
      </div>
    `;
  }

  if (stepId === 'motivation') {
    return `
      <div class="form-group">
        <label class="form-label">¿Por qué quieres unirte a UZX? <span class="required">*</span></label>
        <textarea class="form-control" id="f-whyJoin" rows="3" maxlength="500" placeholder="Máximo 500 caracteres...">${esc(data.whyJoin || '')}</textarea>
        <div class="form-error" id="err-whyJoin"></div>
      </div>

      <div class="form-group">
        <label class="form-label">¿Qué puedes aportar al equipo? <span class="required">*</span></label>
        <textarea class="form-control" id="f-whatCanContribute" rows="3" maxlength="500" placeholder="Máximo 500 caracteres...">${esc(data.whatCanContribute || '')}</textarea>
        <div class="form-error" id="err-whatCanContribute"></div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tu mayor fortaleza <span class="required">*</span></label>
          <textarea class="form-control" id="f-biggestStrength" rows="2" maxlength="300" placeholder="Máximo 300 caracteres...">${esc(data.biggestStrength || '')}</textarea>
          <div class="form-error" id="err-biggestStrength"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Tu mayor debilidad <span class="required">*</span></label>
          <textarea class="form-control" id="f-biggestWeakness" rows="2" maxlength="300" placeholder="Máximo 300 caracteres...">${esc(data.biggestWeakness || '')}</textarea>
          <div class="form-error" id="err-biggestWeakness"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Notas adicionales (opcional)</label>
        <textarea class="form-control" id="f-additionalNotes" rows="2" maxlength="400" placeholder="Máximo 400 caracteres...">${esc(data.additionalNotes || '')}</textarea>
        <div class="form-error" id="err-additionalNotes"></div>
      </div>
    `;
  }

  return '<p>Paso no implementado.</p>';
}

// ─── PANTALLA DE "YA ENVIADO" ────────────────────────────────
function renderAlreadySent() {
    return `
      <div class="section" style="max-width:900px;margin:0 auto;text-align:center;padding:4rem 2rem;">
        <div style="font-size:4rem;margin-bottom:1.5rem;color:var(--active-primary);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="64" height="64">
            <path d="M22 2L11 13"/>
            <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </div>
        <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;">
          ¡Ya enviaste tu solicitud!
        </h2>
        <p style="color:var(--text-secondary);font-size:1.1rem;max-width:600px;margin:0 auto 1.5rem;">
          Nuestro equipo revisará tu información y, si cumples con el perfil que buscamos, nos pondremos en contacto contigo.
        </p>
        <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="App.navigate('home')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Volver al inicio
          </button>
        </div>
      </div>
    `;
  }
  
  // ─── PANTALLA DE ÉXITO ────────────────────────────────────────
  function renderSuccess() {
    return `
      <div class="section" style="max-width:900px;margin:0 auto;text-align:center;padding:4rem 2rem;">
        <div style="font-size:4rem;margin-bottom:1.5rem;color:var(--success);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="64" height="64">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;">
          ¡Solicitud enviada correctamente!
        </h2>
        <p style="color:var(--text-secondary);font-size:1.1rem;max-width:600px;margin:0 auto 1.5rem;">
          Nuestro equipo revisará tu información y, si cumples con el perfil que buscamos, nos pondremos en contacto contigo.
        </p>
        <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="App.navigate('home')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Volver al inicio
          </button>
        </div>
      </div>
    `;
  }

// ─── PANTALLA DE ERROR 409 (ya enviado desde el backend) ────
function renderAlreadySentBackend(message) {
  return `
    <div class="section" style="max-width:900px;margin:0 auto;text-align:center;padding:4rem 2rem;">
      <div style="font-size:4rem;margin-bottom:1.5rem;color:var(--amber);">⚠️</div>
      <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;">
        Ya enviaste una solicitud
      </h2>
      <p style="color:var(--text-secondary);font-size:1.1rem;max-width:600px;margin:0 auto 1.5rem;">
        ${esc(message || 'Ya se recibió una solicitud desde este dispositivo.')}
      </p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="App.navigate('home')">Volver al inicio</button>
      </div>
    </div>
  `;
}

// ─── FUNCIONES DE TOGGLE (expuestas globalmente) ─────────────
window.toggleTournamentExperience = function() {
  const val = document.getElementById('f-competedInTournaments').value;
  document.getElementById('tournament-experience-container').style.display = val === 'true' ? 'block' : 'none';
};

window.toggleClanNames = function() {
  const val = document.getElementById('f-wasInClan').value;
  document.getElementById('clan-names-container').style.display = val === 'true' ? 'block' : 'none';
};

window.toggleCompetitiveTeams = function() {
  const val = document.getElementById('f-playedInCompetitiveTeams').value;
  document.getElementById('competitive-teams-container').style.display = val === 'true' ? 'block' : 'none';
};

window.toggleDiscord = function() {
  const val = document.getElementById('f-hasDiscord').checked;
  document.getElementById('discord-container').style.display = val ? 'block' : 'none';
};

window.toggleWillingToLeave = function() {
  const val = document.getElementById('f-currentlyInOtherTeam').value;
  document.getElementById('willing-to-leave-container').style.display = val === 'true' ? 'block' : 'none';
};

// ─── RECOLECCIÓN DE DATOS ────────────────────────────────────
function collectStepData(stepId) {
  const data = { ..._formData };

  if (stepId === 'personal') {
    data.realName = document.getElementById('f-realName').value.trim();
    data.age = parseInt(document.getElementById('f-age').value);
    data.country = document.getElementById('f-country').value;
    data.serverRegion = document.getElementById('f-serverRegion').value.trim();
    data.phoneCountryCode = document.getElementById('f-phoneCountryCode').value;
    data.phoneNumber = document.getElementById('f-phoneNumber').value.trim();
  }

  if (stepId === 'game') {
    data.gameName = document.getElementById('f-gameName').value.trim();
    data.freeFireId = document.getElementById('f-freeFireId').value.trim();
    data.accountLevel = parseInt(document.getElementById('f-accountLevel').value);
    data.yearsPlaying = document.getElementById('f-yearsPlaying').value;
    data.mainRole = document.getElementById('f-mainRole').value;
    data.skillLevel = parseInt(document.getElementById('f-skillLevel').value);
    data.situation = document.getElementById('f-situation').value;
  }

  if (stepId === 'experience') {
    const checkboxes = document.querySelectorAll('#step-content input[type="checkbox"]');
    data.competitiveLevels = [];
    checkboxes.forEach(cb => {
      if (cb.checked) data.competitiveLevels.push(cb.value);
    });
    data.otherTournamentName = document.getElementById('f-otherTournamentName').value.trim();
    data.competedInTournaments = document.getElementById('f-competedInTournaments').value === 'true';
    data.tournamentExperience = document.getElementById('f-tournamentExperience').value.trim();
    data.bestResult = document.getElementById('f-bestResult').value;
    data.wasInClan = document.getElementById('f-wasInClan').value === 'true';
    data.clanNames = document.getElementById('f-clanNames').value.trim();
    data.playedInCompetitiveTeams = document.getElementById('f-playedInCompetitiveTeams').value === 'true';
    data.competitiveTeamNames = document.getElementById('f-competitiveTeamNames').value.trim();
    data.competitiveTime = document.getElementById('f-competitiveTime').value;
    data.highlightsUrl = document.getElementById('f-highlightsUrl').value.trim();
  }

  if (stepId === 'availability') {
    data.daysPerWeek = parseInt(document.getElementById('f-daysPerWeek').value);
    data.availableSchedule = document.getElementById('f-availableSchedule').value.trim();
    data.constantSchedule = document.getElementById('f-constantSchedule').checked;
    data.deviceType = document.getElementById('f-deviceType').value;
    data.deviceTier = document.getElementById('f-deviceTier').value;
    data.fpsStability = document.getElementById('f-fpsStability').value;
    data.connectionQuality = document.getElementById('f-connectionQuality').value;
    data.hasDiscord = document.getElementById('f-hasDiscord').checked;
    data.discordUsername = document.getElementById('f-discordUsername').value.trim();
    data.micUsage = document.getElementById('f-micUsage').value;
    data.noiseLevel = document.getElementById('f-noiseLevel').value;
    data.usesHeadset = document.getElementById('f-usesHeadset').checked;
    data.currentlyInOtherTeam = document.getElementById('f-currentlyInOtherTeam').value === 'true';
    data.willingToLeaveTeam = document.getElementById('f-willingToLeaveTeam').value === 'true';
  }

  if (stepId === 'motivation') {
    data.whyJoin = document.getElementById('f-whyJoin').value.trim();
    data.whatCanContribute = document.getElementById('f-whatCanContribute').value.trim();
    data.biggestStrength = document.getElementById('f-biggestStrength').value.trim();
    data.biggestWeakness = document.getElementById('f-biggestWeakness').value.trim();
    data.additionalNotes = document.getElementById('f-additionalNotes').value.trim();
  }

  return data;
}

// ─── NAVEGACIÓN DE PASOS ──────────────────────────────────────
function goToStep(index) {
  _currentStep = index;
  const content = document.getElementById('content');
  if (content) {
    content.innerHTML = renderRecruitmentForm();
    attachStepListeners();
  }
}

function attachStepListeners() {
    // 🔥 CRUCIAL: Si el DOM no está listo, salir para evitar errores
    if (!document.getElementById('btn-prev-step')) {
      console.warn('attachStepListeners: DOM no listo aún, cancelando ejecución.');
      return;
    }
  
    const prevBtn = document.getElementById('btn-prev-step');
    const nextBtn = document.getElementById('btn-next-step');
    const submitBtn = document.getElementById('btn-submit-application');
  
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        _formData = collectStepData(STEPS[_currentStep].id);
        goToStep(_currentStep - 1);
      });
    }
  
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const stepId = STEPS[_currentStep].id;
        const data = collectStepData(stepId);
        const errors = validateStep(stepId, data);
  
        // Mostrar errores
        let hasError = false;
        for (const [field, msg] of Object.entries(errors)) {
          const errEl = document.getElementById(`err-${field}`);
          if (errEl) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
            hasError = true;
          }
        }
  
        // Limpiar errores de campos sin error
        document.querySelectorAll('.form-error').forEach(el => {
          const field = el.id.replace('err-', '');
          if (!errors[field]) {
            el.textContent = '';
            el.style.display = 'none';
          }
        });
  
        if (hasError) {
          // Scroll al primer error
          const firstErr = document.querySelector('.form-error:not(:empty)');
          if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
  
        _formData = { ..._formData, ...data };
        goToStep(_currentStep + 1);
      });
    }
  
    if (submitBtn) {
      submitBtn.addEventListener('click', submitApplication);
    }
  
    // 🔥 Verificar que los elementos existan antes de llamar a los toggles
    if (document.getElementById('f-competedInTournaments')) {
      window.toggleTournamentExperience();
    }
    if (document.getElementById('f-wasInClan')) {
      window.toggleClanNames();
    }
    if (document.getElementById('f-playedInCompetitiveTeams')) {
      window.toggleCompetitiveTeams();
    }
    if (document.getElementById('f-hasDiscord')) {
      window.toggleDiscord();
    }
    if (document.getElementById('f-currentlyInOtherTeam')) {
      window.toggleWillingToLeave();
    }
  
    // Checkbox de niveles competitivos -> mostrar campo "Otros"
    const competitiveCheckboxes = document.querySelectorAll('#f-competitiveLevels input[type="checkbox"]');
    if (competitiveCheckboxes.length > 0) {
      competitiveCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          const hasOther = document.querySelector('#f-competitiveLevels input[value="OTROS"]:checked');
          document.getElementById('other-tournament-container').style.display = hasOther ? 'block' : 'none';
        });
      });
    }
  }

// ─── ENVÍO DE LA SOLICITUD ────────────────────────────────────
async function submitApplication() {
    if (_isSubmitting) return;
  
    // Recolectar y validar último paso
    const stepId = STEPS[_currentStep].id;
    const data = collectStepData(stepId);
    const errors = validateStep(stepId, data);
  
    let hasError = false;
    for (const [field, msg] of Object.entries(errors)) {
      const errEl = document.getElementById(`err-${field}`);
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
        hasError = true;
      }
    }
  
    document.querySelectorAll('.form-error').forEach(el => {
      const field = el.id.replace('err-', '');
      if (!errors[field]) {
        el.textContent = '';
        el.style.display = 'none';
      }
    });
  
    if (hasError) {
      const firstErr = document.querySelector('.form-error:not(:empty)');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  
    _formData = { ..._formData, ...data };
  
    // Generar fingerprint
    const fingerprint = generateFingerprint();
  
    // Construir payload final
    const payload = {
      fingerprint,
      ..._formData,
      competitiveLevels: _formData.competitiveLevels || []
    };
  
    // Limpiar campos condicionales si no aplican
    if (!payload.competedInTournaments) delete payload.tournamentExperience;
    if (!payload.wasInClan) delete payload.clanNames;
    if (!payload.playedInCompetitiveTeams) delete payload.competitiveTeamNames;
    if (!payload.hasDiscord) delete payload.discordUsername;
    if (!payload.currentlyInOtherTeam) delete payload.willingToLeaveTeam;
    if (!payload.competitiveLevels?.includes('OTROS')) delete payload.otherTournamentName;
  
    // Mostrar overlay de carga y bloquear UI
    _isSubmitting = true;
    showLoadingOverlay();
  
    const btn = document.getElementById('btn-submit-application');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Enviando...';
    }
  
    try {
      const response = await fetch(CONFIG.API_BASE + '/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  
      const data = await response.json();
  
      // Ocultar overlay
      hideLoadingOverlay();
  
      if (response.ok && data.success) {
        // Guardar en localStorage para no mostrar el formulario de nuevo
        try {
          localStorage.setItem('uzx_application_sent', 'true');
        } catch (e) {}
  
        // Mostrar pantalla de éxito
        const content = document.getElementById('content');
        if (content) {
          content.innerHTML = renderSuccess();
        }
      } else {
        throw new Error(data.message || 'Error al enviar la solicitud');
      }
    } catch (error) {
      // Ocultar overlay siempre, incluso en error
      hideLoadingOverlay();
  
      // Si es 409 (ya enviado)
      if (error.message && error.message.includes('ya enviaste')) {
        try {
          localStorage.setItem('uzx_application_sent', 'true');
        } catch (e) {}
        const content = document.getElementById('content');
        if (content) {
          content.innerHTML = renderAlreadySentBackend(error.message);
        }
      } else {
        // Error de validación u otro
        alert('❌ ' + (error.message || 'Error al enviar la solicitud. Inténtalo de nuevo.'));
        
        // Rehabilitar botón
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Enviar solicitud';
        }
        _isSubmitting = false;
      }
    }
  }

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────
const RecruitmentPage = {
  invalidateCache() {
    // No usamos caché, pero lo mantenemos por compatibilidad
  },

  async render() {
    return renderRecruitmentForm();
  },

  async afterRender(abortController) {
    // Verificar si ya envió en el localStorage
    if (localStorage.getItem('uzx_application_sent') === 'true') {
      const content = document.getElementById('content');
      if (content) {
        content.innerHTML = renderAlreadySent();
      }
      return;
    }

    attachStepListeners();
  }
};

// ─── EXPOSICIÓN GLOBAL ───────────────────────────────────────
window.RecruitmentPage = RecruitmentPage;

export default RecruitmentPage;