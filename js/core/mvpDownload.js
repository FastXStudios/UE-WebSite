// js/core/mvpDownload.js
// Exportación PNG de las tarjetas MVP que ya renderiza la plataforma.
// No reconstruye la tarjeta: rasteriza el mismo nodo .mvp-card-pro que está
// pintado en el DOM, por lo que conserva diseño, foto, textos y estadísticas.
// La librería (html-to-image, MIT) está vendorizada en js/vendor.

let htmlToImagePromise = null;
let delegationReady = false;
let loadingOverlay = null;
let loadingSub = null;
let loadingDepth = 0;
let lockedBodyScroll = false;
let overflowBeforeLoading = '';

// Carga diferida: la librería solo se descarga la primera vez que se pulsa
// "Descargar PNG", sin afectar la carga normal de la plataforma.
function loadHtmlToImage() {
  if (globalThis.htmlToImage?.toBlob) {
    return Promise.resolve(globalThis.htmlToImage);
  }

  if (!htmlToImagePromise) {
    htmlToImagePromise = import('../vendor/html-to-image.js')
      .then(() => {
        const lib = globalThis.htmlToImage;
        if (!lib || typeof lib.toBlob !== 'function') {
          throw new Error('No se pudo cargar el exportador PNG.');
        }
        return lib;
      })
      .catch((error) => {
        htmlToImagePromise = null;
        throw error;
      });
  }

  return htmlToImagePromise;
}

async function waitForFonts() {
  if (!document.fonts) return;

  const samples = [
    '800 1.35rem "Barlow Condensed"',
    '900 1.4rem "Barlow Condensed"',
    '900 1.3rem "Barlow Condensed"',
    '700 1rem "Barlow Condensed"',
    '700 0.72rem "Inter"'
  ];

  await Promise.all(samples.map((font) => document.fonts.load(font).catch(() => {})));
  await document.fonts.ready.catch(() => {});
}

function waitForImage(image) {
  const settled = image.complete
    ? Promise.resolve()
    : new Promise((resolve) => {
        const done = () => {
          image.removeEventListener('load', done);
          image.removeEventListener('error', done);
          resolve();
        };
        image.addEventListener('load', done);
        image.addEventListener('error', done);
      });

  return settled.then(() => (image.decode ? image.decode().catch(() => {}) : undefined));
}

function waitForBackgroundImage(value) {
  const match = /url\((['"]?)(.*?)\1\)/.exec(value || '');
  const url = match && match[2];
  if (!url || url.startsWith('data:')) return Promise.resolve();

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

// Espera a que fuentes, foto y fondos de la tarjeta estén completamente listos.
async function waitForCardAssets(card) {
  await waitForFonts();

  const images = Array.from(card.querySelectorAll('img'));
  const backgroundElements = [card, ...card.querySelectorAll('.mvp-card-pro-overlay')];

  await Promise.all([
    ...images.map(waitForImage),
    ...backgroundElements.map((element) =>
      waitForBackgroundImage(getComputedStyle(element).backgroundImage)
    )
  ]);
}

// Double RAF: garantiza que el navegador pinte el frame actual ANTES de
// bloquearse con la rasterización síncrona de html-to-image.
function nextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function sanitizeSegment(value, fallback) {
  const clean = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return clean || fallback;
}

// MVP_UZX_OFICIAL_GABO.png
export function buildMvpFileName(squad, playerName) {
  return `MVP_UZX_${sanitizeSegment(squad, 'OFICIAL')}_${sanitizeSegment(playerName, 'JUGADOR')}.png`;
}

function getCardMeta(card) {
  const container = card.closest('.operation-record__mvp');
  const squadLabel =
    card.closest('.mvp-section-grid')?.querySelector('.mvp-squad-label-top')?.textContent ||
    container?.querySelector('.operation-record__mvp-squad')?.textContent ||
    '';
  const playerName =
    card.querySelector('.mvp-name-overlay-onphoto')?.textContent ||
    card.querySelector('.operation-record__mvp-identity strong')?.textContent ||
    '';

  return {
    squad: squadLabel.replace(/^\s*UZX\s*/i, '').trim(),
    playerName: playerName.trim()
  };
}

/**
 * Genera el PNG de la tarjeta MVP indicada sin descargarlo.
 * @param {HTMLElement} card Elemento .mvp-card-pro a exportar.
 * @param {{squad?: string, playerName?: string}} [meta] Datos para el nombre del archivo.
 * @returns {Promise<{blob: Blob, fileName: string, width: number, height: number}>}
 */
export async function createMvpCardImage(card, meta = {}) {
  if (!card || !card.classList?.contains('mvp-card-pro')) {
    throw new Error('No se encontró la tarjeta MVP para exportar.');
  }

  updateMvpLoadingText('Cargando recursos de la tarjeta…');
  await waitForCardAssets(card);

  updateMvpLoadingText('Preparando rasterizado en alta calidad…');
  await nextPaint(); // pinta el texto ANTES de bloquear el hilo

  const lib = await loadHtmlToImage();
  const fallbackMeta = getCardMeta(card);
  const squad = meta.squad || fallbackMeta.squad || 'OFICIAL';
  const playerName = meta.playerName || fallbackMeta.playerName || 'JUGADOR';

  // Nitidez: apuntamos al ancho nativo del diseño (1122 px) sin bajar de 2x
  // ni disparar el peso del archivo por encima de 4.5x. Usamos el rect real
  // (con decimales) para no alterar la proporción original 1122:1402.
  const rect = card.getBoundingClientRect();
  const displayWidth = rect.width || card.clientWidth || 300;
  const displayHeight = rect.height || card.clientHeight || 400;
  const pixelRatio = Math.min(4.5, Math.max(2, 1122 / displayWidth));

  const blob = await lib.toBlob(card, {
    pixelRatio,
    width: displayWidth,
    height: displayHeight,
    cacheBust: false,
    // La sombra de la tarjeta pertenece a la página, no a la tarjeta:
    // evitamos que se recorte en el borde del PNG.
    style: { boxShadow: 'none' }
  });

  updateMvpLoadingText('Finalizando imagen PNG…');

  if (!blob) {
    throw new Error('No se pudo generar la imagen PNG.');
  }

  return {
    blob,
    fileName: buildMvpFileName(squad, playerName),
    width: Math.round(displayWidth * pixelRatio),
    height: Math.round(displayHeight * pixelRatio)
  };
}

/**
 * Captura únicamente la tarjeta MVP indicada y descarga el PNG.
 * @param {HTMLElement} card Elemento .mvp-card-pro a exportar.
 * @param {{squad?: string, playerName?: string}} [meta] Datos para el nombre del archivo.
 */
export async function downloadMvpCard(card, meta = {}) {
  const { blob, fileName, width, height } = await createMvpCardImage(card, meta);
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Dar tiempo al navegador a iniciar la descarga antes de liberar la URL.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  }

  return { fileName, width, height };
}

async function handleDownloadClick(event) {
  const button = event.target.closest?.('[data-mvp-download]');
  if (!button) return;

  event.preventDefault();
  if (button.dataset.mvpBusy === '1') return;

  const target = button.dataset.mvpTarget;
  const card = target ? document.querySelector(target) : null;

  button.dataset.mvpBusy = '1';
  button.classList.add('is-loading');
  button.setAttribute('aria-busy', 'true');
  if ('disabled' in button) button.disabled = true;

  const squadLabel = button.dataset.mvpSquad ? `UZX ${button.dataset.mvpSquad}` : '';

  showMvpLoading(
    [button.dataset.mvpPlayer, squadLabel].filter(Boolean).join(' · ') ||
      'Preparando la imagen en alta calidad…'
  );

  try {
    const result = await downloadMvpCard(card, {
      squad: button.dataset.mvpSquad,
      playerName: button.dataset.mvpPlayer
    });

    button.title = `Descargado: ${result.fileName}`;
  } catch (error) {
    console.error('No se pudo descargar la tarjeta MVP:', error);
    window.alert('No se pudo generar la imagen PNG. Inténtalo de nuevo.');
  } finally {
    hideMvpLoading();
    delete button.dataset.mvpBusy;
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
    if ('disabled' in button) button.disabled = false;
  }
}

// Crea una sola vez el modal de espera y lo reutiliza en INICIO y JORNADAS.
function ensureLoadingOverlay() {
  if (loadingOverlay?.isConnected) return;

  loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'mvp-loading-overlay';
  loadingOverlay.hidden = true;
  loadingOverlay.setAttribute('role', 'dialog');
  loadingOverlay.setAttribute('aria-modal', 'true');
  loadingOverlay.setAttribute('aria-label', 'Generando tarjeta MVP');
  loadingOverlay.innerHTML = `
    <div class="mvp-loading-box">
      <p class="mvp-loading-title">Generando tu tarjeta MVP</p>
      <p class="mvp-loading-sub" aria-live="polite">Preparando la imagen en alta calidad…</p>
      <div class="mvp-loading-bar" aria-hidden="true"><span></span></div>
    </div>`;

  document.body.appendChild(loadingOverlay);
  loadingSub = loadingOverlay.querySelector('.mvp-loading-sub');
}

function updateMvpLoadingText(text) {
  if (loadingSub && text) {
    loadingSub.textContent = text;
  }
}

function showMvpLoading(detail) {
  ensureLoadingOverlay();

  if (loadingDepth === 0) {
    // Si otro modal ya bloqueó el scroll (p. ej. el detalle de la jornada),
    // no lo tocamos para no dejarlo bloqueado al terminar la descarga.
    lockedBodyScroll = document.body.style.overflow !== 'hidden';
    if (lockedBodyScroll) {
      overflowBeforeLoading = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  }
  loadingDepth += 1;

  if (loadingSub) {
    loadingSub.textContent = detail || 'Preparando la imagen en alta calidad…';
  }

  loadingOverlay.hidden = false;
  void loadingOverlay.offsetWidth;
  loadingOverlay.classList.add('is-visible');
}

function hideMvpLoading() {
  loadingDepth = Math.max(0, loadingDepth - 1);
  if (loadingDepth > 0 || !loadingOverlay) return;

  if (lockedBodyScroll) {
    document.body.style.overflow = overflowBeforeLoading;
    lockedBodyScroll = false;
  }
  loadingOverlay.classList.remove('is-visible');

  window.setTimeout(() => {
    if (loadingOverlay && !loadingOverlay.classList.contains('is-visible')) {
      loadingOverlay.hidden = true;
    }
  }, 210);
}

// Una sola delegación para todos los botones (INICIO y JORNADAS) evita
// duplicar lógica al re-renderizar las vistas.
export function initMvpDownload() {
  if (delegationReady) return;
  delegationReady = true;
  document.addEventListener('click', handleDownloadClick);
}