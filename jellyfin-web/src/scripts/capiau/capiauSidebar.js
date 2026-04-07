/**
 * CapIAu Sidebar — Painel Retráctil da Produtora
 * Injeta um botão fixo e um painel lateral deslizante em todas as páginas.
 * 
 * v2.0 — Responsivo: Mobile (bottom-sheet) + TV (D-pad, fontes grandes) + Desktop (sidebar lateral)
 */

import { capiauDevice } from './capiauDeviceManager';

let sidebarInjected = false;
let sidebarOpen = false;
let unsubscribeFirebase = null;

export function initCapIAuSidebar() {
    if (sidebarInjected) return;
    sidebarInjected = true;
    injectStyles();
    injectSidebarDOM();
    bindToggle();
    bindTouchGestures();
}

function injectStyles() {
    if (document.getElementById('capiau-sidebar-styles')) return;
    const style = document.createElement('style');
    style.id = 'capiau-sidebar-styles';
    style.textContent = `
        /* ===== FAB BUTTON ===== */
        #capiau-fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            background: linear-gradient(135deg, #e50914, #b00710);
            color: #fff;
            border: none;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            font-size: 18px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(229,9,20,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        #capiau-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(229,9,20,0.7);
        }
        #capiau-fab.is-open {
            background: linear-gradient(135deg, #444, #222);
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        /* Focus indicator for TV */
        #capiau-fab:focus-visible {
            outline: 3px solid #e50914;
            outline-offset: 3px;
            box-shadow: 0 0 20px rgba(229,9,20,0.6);
        }

        /* ===== SIDEBAR PANEL ===== */
        #capiau-sidebar {
            position: fixed;
            top: 0;
            right: -360px;
            width: 340px;
            max-width: 90vw;
            height: 100vh;
            z-index: 9999;
            background: #111;
            border-left: 1px solid #333;
            box-shadow: -4px 0 20px rgba(0,0,0,0.6);
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            font-family: 'Inter', sans-serif;
        }
        #capiau-sidebar.is-open {
            right: 0;
        }

        /* ===== OVERLAY (Mobile) ===== */
        #capiau-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9998;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
        }
        #capiau-overlay.is-visible {
            opacity: 1;
            pointer-events: auto;
        }

        /* ===== HEADER ===== */
        #capiau-sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px 10px;
            background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
            border-bottom: 1px solid #2a2a2a;
            flex-shrink: 0;
        }
        #capiau-sidebar-header h2 {
            margin: 0;
            font-size: 13px;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.5px;
        }
        #capiau-sidebar-header span {
            font-size: 10px;
            color: #e50914;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* ===== TABS ===== */
        #capiau-sidebar-tabs {
            display: flex;
            border-bottom: 1px solid #2a2a2a;
            flex-shrink: 0;
        }
        .capiau-stab {
            flex: 1;
            padding: 8px 6px;
            background: transparent;
            border: none;
            color: #888;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
        }
        .capiau-stab.active {
            color: #e50914;
            border-bottom-color: #e50914;
        }
        .capiau-stab:hover {
            color: #fff;
            background: rgba(255,255,255,0.04);
        }
        .capiau-stab:focus-visible {
            outline: 2px solid #e50914;
            outline-offset: -2px;
            color: #fff;
        }

        /* ===== BODY ===== */
        #capiau-sidebar-body {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        #capiau-sidebar-body::-webkit-scrollbar { width: 4px; }
        #capiau-sidebar-body::-webkit-scrollbar-track { background: #111; }
        #capiau-sidebar-body::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

        /* ===== MOVIE GROUP ===== */
        .capiau-movie-group {
            margin-bottom: 16px;
        }
        .capiau-movie-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        .capiau-movie-thumb {
            width: 24px;
            height: 36px;
            border-radius: 3px;
            object-fit: cover;
            background: #222;
            flex-shrink: 0;
        }
        .capiau-movie-name {
            font-size: 12px;
            font-weight: 700;
            color: #fff;
        }
        .capiau-movie-year {
            font-size: 10px;
            color: #666;
        }

        /* ===== NOTE CARDS ===== */
        .capiau-note-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }
        .capiau-note-card:hover {
            background: rgba(229,9,20,0.08);
            border-color: rgba(229,9,20,0.3);
            transform: translateX(-2px);
        }
        .capiau-note-card:focus-visible {
            outline: 2px solid #e50914;
            outline-offset: 2px;
            background: rgba(229,9,20,0.12);
            border-color: #e50914;
            transform: scale(1.01);
        }
        .capiau-note-badge {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #e50914;
            margin-top: 5px;
            flex-shrink: 0;
        }
        .capiau-note-badge.replied { background: #3b82f6; }
        .capiau-note-text {
            font-size: 11px;
            color: #ddd;
            line-height: 1.4;
            flex: 1;
            word-break: break-word;
        }
        .capiau-note-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 4px;
        }
        .capiau-note-author {
            font-size: 10px;
            color: #666;
        }
        .capiau-note-time {
            font-size: 10px;
            font-family: monospace;
            background: rgba(229,9,20,0.2);
            color: #e50914;
            padding: 2px 4px;
            border-radius: 3px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .capiau-note-time:hover {
            background: rgba(229,9,20,0.4);
        }
        .capiau-note-time:focus-visible {
            outline: 2px solid #e50914;
            background: rgba(229,9,20,0.5);
        }

        .capiau-empty {
            text-align: center;
            color: #555;
            padding: 30px 10px;
            font-size: 12px;
        }
        .capiau-loading {
            text-align: center;
            color: #666;
            padding: 30px 10px;
            font-size: 12px;
        }
        .capiau-view-toggle-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 10px;
        }
        .capiau-toggle-btn {
            background: #222;
            border: 1px solid #333;
            color: #888;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .capiau-toggle-btn.active {
            background: #e50914;
            border-color: #e50914;
            color: #fff;
        }

        /* ===== MINIPLAYER ===== */
        .capiau-miniplayer {
            position: fixed;
            width: 240px;
            height: 135px;
            background: #000;
            border-radius: 6px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.7);
            z-index: 999999;
            border: 2px solid #333;
            pointer-events: none;
            overflow: hidden;
            display: none;
        }

        .capiau-reply-list { margin-top: 4px; padding-left: 6px; border-left: 1px dashed rgba(255,255,255,0.1); }
        .capiau-reply-box { margin-top: 4px; }
        .capiau-reply-box textarea {
            width: 100%; height: 30px; background: #222; color: #fff; 
            border: 1px solid #444; border-radius: 3px; padding: 4px; resize: none; font-size: 10px;
        }

        /* ===== DRAG HANDLE (mobile bottom-sheet) ===== */
        .capiau-drag-handle {
            display: none;
            width: 36px;
            height: 4px;
            background: #555;
            border-radius: 2px;
            margin: 8px auto 4px;
        }

        /* ================================================================
           RESPONSIVE: MOBILE (< 768px) — Bottom Sheet
           ================================================================ */
        @media (max-width: 767px) {
            #capiau-fab {
                width: 56px;
                height: 56px;
                font-size: 22px;
                bottom: calc(24px + env(safe-area-inset-bottom, 0px));
                right: 16px;
            }

            #capiau-sidebar {
                top: auto;
                bottom: 0;
                right: 0;
                left: 0;
                width: 100%;
                max-width: 100%;
                height: 80vh;
                max-height: 80vh;
                border-radius: 16px 16px 0 0;
                border-left: none;
                border-top: 1px solid #333;
                transform: translateY(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #capiau-sidebar.is-open {
                right: 0;
                transform: translateY(0);
            }

            .capiau-drag-handle {
                display: block;
            }

            #capiau-sidebar-header h2 {
                font-size: 15px;
            }

            .capiau-stab {
                font-size: 11px;
                padding: 10px 6px;
            }

            .capiau-note-card {
                padding: 12px;
            }
            .capiau-note-text {
                font-size: 13px;
            }
            .capiau-note-author,
            .capiau-note-time {
                font-size: 12px;
            }
            .capiau-movie-name {
                font-size: 14px;
            }

            /* Miniplayer inline no mobile */
            .capiau-miniplayer {
                position: relative !important;
                width: 100% !important;
                height: 180px !important;
                top: auto !important;
                left: auto !important;
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .capiau-reply-box textarea {
                height: 40px;
                font-size: 14px;
            }

            #capiau-sidebar-body {
                padding: 12px 16px;
                padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            }
        }

        /* ================================================================
           RESPONSIVE: TV / 10-Foot (>= 1920px)
           ================================================================ */
        @media (min-width: 1920px) {
            #capiau-sidebar {
                width: 480px;
                right: -500px;
            }
            #capiau-sidebar.is-open {
                right: 0;
            }

            #capiau-sidebar-header {
                padding: 18px 24px 14px;
            }
            #capiau-sidebar-header h2 {
                font-size: 18px;
            }
            #capiau-sidebar-header span {
                font-size: 12px;
            }

            .capiau-stab {
                font-size: 14px;
                padding: 14px 10px;
            }

            #capiau-sidebar-body {
                padding: 16px 20px;
            }

            .capiau-note-card {
                padding: 16px 20px;
                margin-bottom: 10px;
                border-radius: 8px;
            }
            .capiau-note-text {
                font-size: 16px;
                line-height: 1.5;
            }
            .capiau-note-author {
                font-size: 13px;
            }
            .capiau-note-time {
                font-size: 14px;
                padding: 4px 8px;
            }

            .capiau-movie-name {
                font-size: 16px;
            }
            .capiau-movie-year {
                font-size: 13px;
            }
            .capiau-movie-thumb {
                width: 36px;
                height: 54px;
            }

            .capiau-empty,
            .capiau-loading {
                font-size: 16px;
                padding: 40px 20px;
            }

            .capiau-toggle-btn {
                font-size: 13px;
                padding: 6px 14px;
            }

            .capiau-reply-box textarea {
                height: 50px;
                font-size: 14px;
            }

            /* TV safe zone padding */
            #capiau-fab {
                bottom: 48px;
                right: 48px;
                width: 56px;
                height: 56px;
                font-size: 24px;
            }

            /* Miniplayer desabilitado na TV (sem hover) */
            .capiau-miniplayer {
                display: none !important;
            }
        }

        /* ================================================================
           TV-SPECIFIC: Focus indicators and D-pad support
           ================================================================ */
        .capiau-device-tv .capiau-note-card {
            /* Remover hover transform na TV */
            transform: none !important;
        }
        .capiau-device-tv .capiau-note-card:focus-visible {
            outline: 3px solid #e50914;
            outline-offset: 2px;
            background: rgba(229,9,20,0.15);
            border-color: #e50914;
            box-shadow: 0 0 20px rgba(229,9,20,0.3);
            transform: scale(1.02) !important;
        }
        .capiau-device-tv .capiau-stab:focus-visible {
            outline: 3px solid #e50914;
            outline-offset: -3px;
            background: rgba(229,9,20,0.15);
            color: #fff;
        }
        .capiau-device-tv #capiau-fab:focus-visible {
            outline: 4px solid #e50914;
            outline-offset: 4px;
            transform: scale(1.15);
        }

        /* ================================================================
           TOUCH-SPECIFIC: Larger touch targets
           ================================================================ */
        .capiau-device-mobile .capiau-note-card,
        .capiau-device-tablet .capiau-note-card {
            min-height: 48px;
        }
        .capiau-device-mobile .capiau-stab,
        .capiau-device-tablet .capiau-stab {
            min-height: 44px;
        }
        .capiau-device-mobile .capiau-toggle-btn,
        .capiau-device-tablet .capiau-toggle-btn {
            min-height: 36px;
            padding: 6px 12px;
        }
    `;
    document.head.appendChild(style);
}

function injectSidebarDOM() {
    // Overlay (for mobile dimming)
    const overlay = document.createElement('div');
    overlay.id = 'capiau-overlay';
    document.body.appendChild(overlay);

    // FAB button
    const fab = document.createElement('button');
    fab.id = 'capiau-fab';
    fab.title = 'Painel da Produtora';
    fab.innerHTML = '🎬';
    fab.tabIndex = 0; // Focusable for TV D-pad
    document.body.appendChild(fab);

    // Sidebar panel
    const sidebar = document.createElement('div');
    sidebar.id = 'capiau-sidebar';
    sidebar.innerHTML = `
        <div class="capiau-drag-handle"></div>
        <div id="capiau-sidebar-header">
            <div>
                <span>CapIAu</span>
                <h2>Painel da Produtora</h2>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
                <button id="capiau-btn-collections" style="background:rgba(229,9,20,0.2);border:1px solid #e50914;color:#e50914;font-size:10px;padding:2px 6px;border-radius:3px;cursor:pointer;" title="Organizar Coleções por Metadados" tabindex="0">🤖 Sync IA</button>
                <button id="capiau-sidebar-close" style="background:none;border:none;color:#888;font-size:20px;cursor:pointer;padding:4px 8px;" title="Fechar" tabindex="0">✕</button>
            </div>
        </div>
        <div id="capiau-sidebar-tabs">
            <button class="capiau-stab active" data-tab="notes" tabindex="0">📝 Anotações</button>
            <button class="capiau-stab" data-tab="dragdrop" tabindex="0">🗂️ Ordem</button>
            <button class="capiau-stab" data-tab="linear" tabindex="0">📋 Linear</button>
            <button class="capiau-stab" data-tab="master" tabindex="0">📊 Status</button>
        </div>
        <div id="capiau-sidebar-body">
            <div class="capiau-loading">Carregando...</div>
        </div>
    `;
    document.body.appendChild(sidebar);

    // Add device classes to body for CSS targeting
    applyDeviceClasses();
}

function applyDeviceClasses() {
    // Import dynamically to avoid circular deps at init time
    document.body.classList.toggle('capiau-device-tv', capiauDevice.isTV);
    document.body.classList.toggle('capiau-device-mobile', capiauDevice.isMobile);
    document.body.classList.toggle('capiau-device-tablet', capiauDevice.isTablet);
    document.body.classList.toggle('capiau-device-desktop', capiauDevice.isDesktop);
    document.body.classList.toggle('capiau-input-touch', capiauDevice.inputMethod === 'touch');
    document.body.classList.toggle('capiau-input-remote', capiauDevice.inputMethod === 'remote');
}

function closeSidebar() {
    sidebarOpen = false;
    const fab = document.getElementById('capiau-fab');
    const sidebar = document.getElementById('capiau-sidebar');
    const overlay = document.getElementById('capiau-overlay');
    if (fab) fab.classList.remove('is-open');
    if (sidebar) sidebar.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-visible');
    stopListening();
}

function openSidebar() {
    sidebarOpen = true;
    const fab = document.getElementById('capiau-fab');
    const sidebar = document.getElementById('capiau-sidebar');
    const overlay = document.getElementById('capiau-overlay');
    if (fab) fab.classList.add('is-open');
    if (sidebar) sidebar.classList.add('is-open');
    if (overlay && (capiauDevice.isMobile || capiauDevice.isTablet)) {
        overlay.classList.add('is-visible');
    }
    loadSidebarData();
    
    // TV: Auto-focus first tab
    if (capiauDevice.isTV) {
        setTimeout(() => {
            const firstTab = document.querySelector('.capiau-stab.active');
            if (firstTab) firstTab.focus();
        }, 350);
    }
}

function bindToggle() {
    const fab = document.getElementById('capiau-fab');
    const closeBtn = document.getElementById('capiau-sidebar-close');
    const overlay = document.getElementById('capiau-overlay');

    fab.addEventListener('click', () => {
        if (sidebarOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    closeBtn.addEventListener('click', () => closeSidebar());
    
    // Overlay click closes sidebar (mobile)
    if (overlay) {
        overlay.addEventListener('click', () => closeSidebar());
    }

    // ESC / Back key closes sidebar
    document.addEventListener('keydown', (e) => {
        if (!sidebarOpen) return;
        if (e.key === 'Escape' || e.key === 'GoBack' || e.keyCode === 10009 /* Tizen Back */ || e.keyCode === 461 /* WebOS Back */) {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        }
    });

    const syncBtn = document.getElementById('capiau-btn-collections');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            try {
                const initText = syncBtn.innerText;
                syncBtn.innerText = '⚙️...';
                syncBtn.disabled = true;
                
                const { collectionManager } = await import('./CapiauCollectionManager.js');
                const apiClient = await getApiClient();
                if(!apiClient) throw new Error('No API Client');
                
                const count = await collectionManager.runAutoCollectionProcess(apiClient.serverId(), true);
                
                import('../../components/toast/toast').then(({ default: toast }) => {
                    toast(`CapIAu: ${count} Novas coleções criadas!`);
                });
                
            } catch (err) {
                console.error('Failed to sync collection', err);
                import('../../components/toast/toast').then(({ default: toast }) => {
                    toast(`CapIAu: Falha ao gerar coleções.`);
                });
            } finally {
                syncBtn.innerText = '🤖 Sync IA';
                syncBtn.disabled = false;
            }
        });
    }

 
    // Tab switching
    document.querySelectorAll('.capiau-stab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.capiau-stab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (window.__capiauSidebarData) {
                renderSidebar(window.__capiauSidebarData, btn.dataset.tab);
            }
        });
    });
}

/**
 * Touch gestures for mobile bottom-sheet (swipe down to close)
 */
function bindTouchGestures() {
    if (!capiauDevice.hasTouchScreen) return;

    const sidebar = document.getElementById('capiau-sidebar');
    if (!sidebar) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handle = sidebar.querySelector('.capiau-drag-handle');
    const header = document.getElementById('capiau-sidebar-header');
    const dragTargets = [handle, header].filter(Boolean);

    dragTargets.forEach(target => {
        target.addEventListener('touchstart', (e) => {
            if (!sidebarOpen || !capiauDevice.needsBottomSheet) return;
            startY = e.touches[0].clientY;
            isDragging = true;
            sidebar.style.transition = 'none';
        }, { passive: true });

        target.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            if (deltaY > 0) {
                sidebar.style.transform = `translateY(${deltaY}px)`;
            }
        }, { passive: true });

        target.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            sidebar.style.transition = '';
            const deltaY = currentY - startY;
            if (deltaY > 100) {
                closeSidebar();
                sidebar.style.transform = '';
            } else {
                sidebar.style.transform = '';
            }
            startY = 0;
            currentY = 0;
        }, { passive: true });
    });
}

function getApiClient() {
    return import('../../lib/jellyfin-apiclient/index').then(({ ServerConnections }) => {
        return ServerConnections.currentApiClient();
    }).catch(() => null);
}

async function loadSidebarData() {
    const body = document.getElementById('capiau-sidebar-body');
    body.innerHTML = '<div class="capiau-loading">🔄 Carregando anotações...</div>';

    try {
        const capIauFb = await import('./firebaseConfig.js');
        const { db, collection, orderBy, query, onSnapshot } = capIauFb;
        
        let apiClient = await getApiClient();
        const fallbackApiUrl = apiClient ? apiClient.getUrl('/') : '/';
        const apiKey = apiClient ? apiClient.accessToken() : getApiKey();

        stopListening();

        const qComments = query(collection(db, 'capiau_comments'), orderBy('timestamp', 'desc'));
        const qStatus = query(collection(db, 'capiau_status'), orderBy('timestamp', 'desc'));

        let dataComments = [];
        let dataStatuses = {};

        const renderThrottle = () => {
            const activeTab = document.querySelector('.capiau-stab.active')?.dataset?.tab || 'notes';
            renderSidebar({ comments: dataComments, statuses: dataStatuses }, activeTab);
        };

        const getBaseUrl = () => {
            try {
                const creds = JSON.parse(localStorage.getItem('jellyfin_credentials') || '{}');
                const server = (creds.Servers || [])[0];
                return server?.ManualAddress || server?.LocalAddress || '';
            } catch { return ''; }
        };

        const checkAndFetchMedia = async () => {
            const uniqueIds = [...new Set([
                ...dataComments.map(c => c.mediaId),
                ...Object.keys(dataStatuses)
            ].filter(Boolean))];
            
            if (!window.__capiauSidebarMedia) window.__capiauSidebarMedia = {};
            await Promise.all(uniqueIds.map(async (mediaId) => {
                if(window.__capiauSidebarMedia[mediaId]) return;
                try {
                    let item;
                    if (apiClient) {
                        try {
                            item = await apiClient.getItem(apiClient.getCurrentUserId(), mediaId);
                        } catch {
                            const resp = await fetch(apiClient.getUrl(`/Items/${mediaId}`));
                            if (resp.ok) item = await resp.json();
                        }
                    } else {
                        const userId = JSON.parse(localStorage.getItem('jellyfin_credentials') || '{}').Servers[0].UserId;
                        const resp = await fetch(`${getBaseUrl()}/Users/${userId}/Items/${mediaId}?api_key=${apiKey}`);
                        if (resp.ok) item = await resp.json();
                    }
                    if (item) window.__capiauSidebarMedia[mediaId] = item;
                } catch (e) {
                    console.error('Failed fetching media:', e);
                }
            }));
        };

        const unsubC = onSnapshot(qComments, async (snapshot) => {
            dataComments = [];
            snapshot.forEach(doc => dataComments.push({ id: doc.id, ...doc.data() }));
            
            await checkAndFetchMedia();
            
            window.__capiauSidebarData = { comments: dataComments, statuses: dataStatuses, mediaInfos: window.__capiauSidebarMedia };
            renderThrottle();
        });

        const unsubS = onSnapshot(qStatus, async (snapshot) => {
            dataStatuses = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!dataStatuses[data.mediaId]) dataStatuses[data.mediaId] = { id: doc.id, ...data };
            });
            
            await checkAndFetchMedia();
            
            window.__capiauSidebarData = { comments: dataComments, statuses: dataStatuses, mediaInfos: window.__capiauSidebarMedia };
            renderThrottle();
        });

        unsubscribeFirebase = () => { unsubC(); unsubS(); };

    } catch (e) {
        console.error('[CapIAu Sidebar] Error:', e);
        const body = document.getElementById('capiau-sidebar-body');
        if (body) body.innerHTML = `<div class="capiau-empty">❌ Erro ao conectar com Firebase.</div>`;
    }
}

function getApiKey() {
    try {
        const creds = JSON.parse(localStorage.getItem('jellyfin_credentials') || '{}');
        const server = (creds.Servers || [])[0];
        return server?.AccessToken || '';
    } catch { return ''; }
}

function getBaseUrlFallback() {
    try {
        const creds = JSON.parse(localStorage.getItem('jellyfin_credentials') || '{}');
        const server = (creds.Servers || [])[0];
        return server?.ManualAddress || server?.LocalAddress || '';
    } catch { return ''; }
}

function stopListening() {
    if (unsubscribeFirebase) {
        unsubscribeFirebase();
        unsubscribeFirebase = null;
    }
}

function renderSidebar(data, mode = 'notes') {
    const body = document.getElementById('capiau-sidebar-body');
    if (!body) return;

    if (mode === 'dragdrop') {
        getApiClient().then(ac => {
            if(!ac) { body.innerHTML = '<div class="capiau-empty">Sem Conexão API</div>'; return; }
            import('./capiauDragDrop.js').then(({ renderDragDropTools }) => {
                renderDragDropTools(body, ac, ac.getCurrentUserId());
            });
        });
        return;
    }

    // Create global miniplayer only on non-TV, non-mobile
    if (capiauDevice.supportsHover && !document.getElementById('capiau-miniplayer-global')) {
        let globalMiniplayer = document.createElement('div');
        globalMiniplayer.id = 'capiau-miniplayer-global';
        globalMiniplayer.className = 'capiau-miniplayer';
        document.body.appendChild(globalMiniplayer);
    }

    if (!data.comments && !data.statuses) return;
    const comments = data.comments || [];
    const mediaInfos = window.__capiauSidebarMedia || {};
    const statuses = data.statuses || {};

    let html = '';

    if (mode === 'master') {
        if (Object.keys(statuses).length === 0) {
            body.innerHTML = '<div class="capiau-empty">Nenhum status mestre gravado.</div>';
            return;
        }
        
        const colorMap = { 'v1': 'yellow', 'v2': 'orange', 'approved': 'lightgreen', 'rejected': 'lightcoral', 'none': '#ccc' };
        const titleMap = { 'v1': 'V1 (Rough Cut)', 'v2': 'V2 (Ajustes Finais)', 'approved': 'Aprovado (Picture Lock)', 'rejected': 'Reprovado', 'none': 'Pendente' };

        for (const [mediaId, statusData] of Object.entries(statuses)) {
            const item = mediaInfos[mediaId];
            const name = item?.Name || 'Desconhecido';
            const cColor = colorMap[statusData.status] || '#ccc';
            const cTitle = titleMap[statusData.status] || 'Desconhecido';
            
            html += `<div data-mediaid="${mediaId}" class="capiau-note-card" tabindex="0" style="border-left: 4px solid ${cColor}; cursor: pointer; display: flex; flex-direction: column;">
                <div style="font-size: 13px; font-weight: bold; color: #fff; margin-bottom: 8px;">${name}</div>
                <div style="font-size: 12px; color: ${cColor}; font-weight: bold; margin-bottom: 10px;">${cTitle}</div>
                <div style="font-size: 10px; color: #888;">Atualizado por: ${statusData.user || 'Produtor'}</div>
            </div>`;
        }
    } else {
        if (comments.length === 0) {
            body.innerHTML = '<div class="capiau-empty">📭 Nenhuma anotação encontrada.<br><small>Adicione comentários durante a reprodução de um filme.</small></div>';
            return;
        }

        const parentComments = comments.filter(c => !c.parentId);
        const childComments = comments.filter(c => c.parentId);
        const parentCommentsWithReplies = parentComments.map(c => {
            return { ...c, repliesData: childComments.filter(child => child.parentId === c.id).sort((a,b)=>a.timestamp-b.timestamp) };
        });

        if (mode === 'notes') {
            // Agrupado por filme
            const grouped = {};
            parentCommentsWithReplies.forEach(c => {
                const key = c.mediaId || 'unknown';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(c);
            });

            for (const mediaId of Object.keys(grouped)) {
                const item = mediaInfos[mediaId];
                const name = item?.Name || 'Filme Desconhecido';
                const year = item?.ProductionYear || '';
                const imgUrl = item ? `/Items/${mediaId}/Images/Primary?height=108&fillHeight=108&fillWidth=72&quality=96` : '';

                html += `<div class="capiau-movie-group">
                    <div class="capiau-movie-title">
                        ${imgUrl ? `<img class="capiau-movie-thumb" src="${imgUrl}" onerror="this.style.display='none'">` : '<div class="capiau-movie-thumb"></div>'}
                        <div>
                            <div class="capiau-movie-name">${name}</div>
                            ${year ? `<div class="capiau-movie-year">${year}</div>` : ''}
                        </div>
                    </div>
                    <div class="capiau-notes-list">
                        ${grouped[mediaId].map(c => noteCardHtml(c, mediaId)).join('')}
                    </div>
                </div>`;
            }
        } else {
            // Linear — mais recentes primeiro
            html = parentCommentsWithReplies.map(c => noteCardHtml(c, c.mediaId)).join('');
        }
    }

    body.innerHTML = html;

    // Hover Miniplayer — ONLY on desktop (not TV, not mobile)
    if (capiauDevice.supportsHover && capiauDevice.supportsMiniplayer) {
        const globalMiniplayer = document.getElementById('capiau-miniplayer-global');
        body.querySelectorAll('.capiau-note-card[data-timems]').forEach(card => {
            let hoverTimeout;
            
            card.addEventListener('mouseenter', () => {
                if (!globalMiniplayer) return;
                hoverTimeout = setTimeout(() => {
                    const rect = card.getBoundingClientRect();
                    
                    globalMiniplayer.style.top = Math.max(20, rect.top) + 'px';
                    globalMiniplayer.style.left = (rect.left - 250) + 'px'; 
                    globalMiniplayer.style.display = 'block';
                    
                    const timeMs = parseFloat(card.dataset.timems);
                    const startSec = Math.max(0, (timeMs / 1000) - 3);
                    const base = getBaseUrlFallback();
                    
                    globalMiniplayer.innerHTML = '';
                    const video = document.createElement('video');
                    video.src = `${base}/Videos/${card.dataset.mediaid}/stream.mp4?Static=true&api_key=${getApiKey()}&c=${card.dataset.id}`;
                    video.autoplay = true;
                    video.muted = true;
                    video.loop = true;
                    video.playsInline = true;
                    video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
                    
                    video.addEventListener('loadedmetadata', () => {
                        if (video.duration >= startSec) {
                            video.currentTime = startSec;
                        }
                    });
                    
                    globalMiniplayer.appendChild(video);
                }, 300);
            });
            
            card.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
                if (globalMiniplayer) {
                    globalMiniplayer.style.display = 'none';
                    globalMiniplayer.innerHTML = '';
                }
            });
        });
    }

    // Submits Replies
    body.querySelectorAll('.capiau-reply-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.nextElementSibling.classList.toggle('hide');
            btn.nextElementSibling.querySelector('textarea').focus();
        });
    });

    body.querySelectorAll('.capiau-reply-submit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = btn.closest('.capiau-note-card');
            const box = btn.parentElement;
            const ta = box.querySelector('textarea');
            if (!ta.value.trim()) return;

            btn.innerText = '...';
            try {
                const capIauFb = await import('./firebaseConfig.js');
                await capIauFb.addDoc(capIauFb.collection(capIauFb.db, 'capiau_comments'), {
                    mediaId: card.dataset.mediaid,
                    timeMs: parseFloat(card.dataset.timems),
                    comment: ta.value,
                    user: 'Painel Produtor', 
                    timestamp: new Date().getTime(),
                    parentId: card.dataset.id
                });
                ta.value = '';
                box.classList.add('hide');
                btn.innerText = 'Enviar';
            } catch (err) {
                console.error('Reply failed', err);
                btn.innerText = 'Erro';
            }
        });
    });

    // Playback Click Events
    body.querySelectorAll('.capiau-note-time').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            let parentData = btn;
            while(parentData && !parentData.dataset.mediaid) parentData = parentData.parentElement;
            playAt(parentData.dataset.mediaid, parseFloat(parentData.dataset.timems));
        });
    });

    body.querySelectorAll('.capiau-note-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Ignore if clicking on textarea or buttons
            if (['TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;
            if (card.dataset.timems) {
                playAt(card.dataset.mediaid, parseFloat(card.dataset.timems));
            } else if (card.dataset.mediaid && mode === 'master') {
                window.location.hash = `/details?id=${card.dataset.mediaid}`;
            }
        });

        // TV: Enter key acts as click
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
}

function noteCardHtml(comment, mediaId) {
    const timeMs = comment.timeMs || 0;
    const totalSec = Math.floor(timeMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    const ms = Math.floor(timeMs % 1000).toString().padStart(3, '0').substring(0, 2);
    const timeStr = (h > 0 ? h.toString().padStart(2,'0') + ':' : '') + m + ':' + s + '.' + ms;

    const isReplied = comment.repliesData && comment.repliesData.length > 0;
    const badgeClass = isReplied ? 'replied' : '';

    let repliesHtml = '';
    if (isReplied) {
        repliesHtml = `<div style="margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 5px;">`;
        comment.repliesData.forEach(rep => {
            repliesHtml += `
            <div style="margin-bottom: 6px; padding-left: 6px; border-left: 2px solid rgba(255,255,255,0.4);">
                <div style="font-size: 11px; color: #ddd; word-wrap: break-word;">${rep.comment || ''}</div>
                <div style="font-size: 9px; color: #888;">— ${rep.user || 'Anônimo'}</div>
            </div>`;
        });
        repliesHtml += `</div>`;
    }

    return `
        <div class="capiau-note-card" data-id="${comment.id}" data-mediaid="${mediaId}" data-timems="${timeMs}" style="position:relative;" tabindex="0" role="button" aria-label="Nota em ${timeStr}">
            <div class="capiau-miniplayer hide"></div>
            <div class="capiau-note-badge ${badgeClass}"></div>
            <div style="flex:1;min-width:0;">
                <div class="capiau-note-text">${comment.comment || '—'}</div>
                <div class="capiau-note-footer" style="margin-top: 6px;">
                    <span class="capiau-note-author">👤 ${comment.user || 'Anônimo'}</span>
                    <span class="capiau-note-time" tabindex="0" role="button">${timeStr}</span>
                </div>
                ${repliesHtml}
                <div style="text-align: right; margin-top: 5px;">
                    <button class="capiau-reply-trigger" tabindex="0">REPLY</button>
                    <div class="capiau-reply-box hide">
                        <textarea placeholder="escreva sua resposta..."></textarea>
                        <button class="capiau-reply-submit capiau-toggle-btn active" tabindex="0">Enviar Resposta</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function playAt(mediaId, timeMs) {
    if (!mediaId) return;
    const ticks = Math.floor(timeMs * 10000);
    import('../../components/playback/playbackmanager.js').then(({ playbackManager }) => {
        playbackManager.suppressResumeMenu(true);
        
        // Se o filme já estiver tocando, basta pular pro momento!
        const player = playbackManager.getCurrentPlayer();
        const currentItem = player ? playbackManager.currentItem(player) : null;
        if (currentItem && currentItem.Id === mediaId) {
            playbackManager.seek(ticks, player);
            return;
        }

        const item = (window.__capiauSidebarMedia && window.__capiauSidebarMedia[mediaId]) 
                        ? window.__capiauSidebarMedia[mediaId] 
                        : { Id: mediaId };
        playbackManager.play({
            items: [item],
            startPositionTicks: ticks
        });
    }).catch((err) => {
        console.error("[CapIAu] Playback navigation failed:", err);
        // fallback: navigate to movie page
        window.location.hash = `/details?id=${mediaId}`;
    });
}
