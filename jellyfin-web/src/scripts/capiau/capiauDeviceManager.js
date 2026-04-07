/**
 * CapIAu Device Manager
 * 
 * Camada unificada de detecção de plataforma para componentes CapIAu.
 * Reutiliza as detecções existentes do Jellyfin (browser.js + layoutManager)
 * e expõe flags específicas para os módulos CapIAu (Sidebar, DragDrop, HomeInjector).
 * 
 * Uso:
 *   import { capiauDevice } from './capiauDeviceManager';
 *   if (capiauDevice.isTV) { ... }
 *   if (capiauDevice.inputMethod === 'remote') { ... }
 */

import browser from '../../scripts/browser';
import layoutManager from '../../components/layoutManager';

// --- Screen categories ---
function getScreenCategory() {
    const w = window.innerWidth;
    if (w < 768) return 'small';       // Celular
    if (w < 1024) return 'medium';     // Tablet
    if (w < 1920) return 'large';      // Desktop / Laptop
    return 'xlarge';                   // TV / Monitor ultrawide
}

// --- Input method detection ---
function detectInputMethod() {
    if (browser.tv || layoutManager.tv) return 'remote';
    if (browser.touch || browser.mobile) return 'touch';
    return 'mouse';
}

// --- Platform detection ---
function detectPlatform() {
    if (browser.tizen) return 'tizen';
    if (browser.web0s) return 'webos';
    if (browser.tv && browser.android) return 'androidtv';
    if (browser.tv) return 'tv-other';
    if (browser.mobile || browser.iOS) return 'mobile';
    return 'browser';
}

// --- Build device info ---
function buildDeviceInfo() {
    const isTV = !!(browser.tv || layoutManager.tv);
    const isMobile = !!(browser.mobile && !isTV);
    const isTablet = !!(browser.ipad || (browser.touch && !isMobile && !isTV && window.innerWidth >= 768 && window.innerWidth < 1200));
    const isDesktop = !isTV && !isMobile && !isTablet;

    return {
        isTV,
        isMobile,
        isTablet,
        isDesktop,
        platform: detectPlatform(),
        inputMethod: detectInputMethod(),
        hasTouchScreen: !!browser.touch,
        screenCategory: getScreenCategory(),

        // Specific platform flags (convenience)
        isTizen: !!browser.tizen,
        isWebOS: !!browser.web0s,
        isAndroidTV: !!(browser.tv && browser.android),
        isIOS: !!browser.iOS,

        // Feature flags for CapIAu components
        supportsDragDrop: !isTV && !isMobile,               // HTML5 D&D only on desktop
        supportsTouchReorder: !!(browser.touch && !isTV),   // Touch reorder for mobile/tablet
        supportsArrowReorder: isTV,                          // Arrow key reorder for TV
        supportsHover: !isTV && !isMobile,                  // Hover-based UI
        supportsMiniplayer: !isTV,                           // Miniplayer preview
        needsSafeZone: isTV,                                 // TV overscan safe zone
        needsLargerUI: isTV,                                 // Enlarged fonts/targets
        needsBottomSheet: isMobile,                          // Sidebar as bottom sheet
        needsFocusIndicator: isTV,                           // Visible focus ring
        reducedAnimations: !!(browser.slow),                 // Limit animations on slow devices
        
        // Versioning
        tizenVersion: browser.tizenVersion || null,
        webOSVersion: browser.web0sVersion || null,
    };
}

// Singleton — computed once, refreshed on resize
let _device = buildDeviceInfo();

// Update screen-dependent values on resize (debounced)
let _resizeTimer = null;
if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => {
            const newCategory = getScreenCategory();
            if (newCategory !== _device.screenCategory) {
                _device = buildDeviceInfo();
                console.debug('[CapIAu DeviceManager] Screen category changed:', _device.screenCategory);
            }
        }, 300);
    });
}

/**
 * Objeto global de informações do dispositivo CapIAu.
 * Atualizado automaticamente em redimensionamento de janela.
 */
export const capiauDevice = new Proxy({}, {
    get(_, prop) {
        return _device[prop];
    }
});

/**
 * Força recálculo das informações do dispositivo.
 * Útil após troca de layout mode pelo usuário.
 */
export function refreshDeviceInfo() {
    _device = buildDeviceInfo();
    return _device;
}

/**
 * Retorna CSS class string baseada no dispositivo para aplicar em containers.
 * Ex: 'capiau-device-tv capiau-input-remote capiau-screen-xlarge'
 */
export function getDeviceClasses() {
    const classes = [];
    if (_device.isTV) classes.push('capiau-device-tv');
    if (_device.isMobile) classes.push('capiau-device-mobile');
    if (_device.isTablet) classes.push('capiau-device-tablet');
    if (_device.isDesktop) classes.push('capiau-device-desktop');
    classes.push(`capiau-input-${_device.inputMethod}`);
    classes.push(`capiau-screen-${_device.screenCategory}`);
    return classes.join(' ');
}

export default capiauDevice;
