/**
 * CapIAu Sync — Sincronização Multi-Device via Firebase Firestore
 * 
 * Substitui o acesso direto ao localStorage para persistência de ordenações
 * (Drag & Drop de coleções e carrosséis). Usa uma estratégia de "local-first":
 * 
 *   1. Sempre salva no localStorage (instantâneo, offline-safe)
 *   2. Se Firebase estiver disponível, sincroniza com Firestore (async)
 *   3. Listener real-time recebe mudanças de outros dispositivos
 * 
 * Coleção Firestore: `capiau_custom_orders`
 * Documento ID: `{jellyfinUserId}_{entityId}`
 * 
 * Uso:
 *   import { syncSave, syncGet, startSyncListener, stopSyncListener } from './capiauSync';
 *   
 *   // Salvar (substitui localStorage.setItem)
 *   await syncSave('collection', collectionId, orderedIds);
 *   
 *   // Ler (substitui localStorage.getItem → JSON.parse)
 *   const order = await syncGet('collection', collectionId);
 *   
 *   // Iniciar listener real-time (chamar uma vez na inicialização)
 *   startSyncListener((entityId, newOrder) => { ... });
 */

import { capiauDevice } from './capiauDeviceManager';

// --- Globals ---
let _firebaseReady = false;
let _db = null;
let _userId = null;
let _unsubscribeListener = null;
let _onUpdateCallbacks = [];

// --- Lazy Firebase initialization ---
async function ensureFirebase() {
    if (_firebaseReady) return true;
    
    try {
        const fb = await import('./firebaseConfig.js');
        _db = fb.db;
        if (!_db) {
            console.warn('[CapIAu Sync] Firebase DB not available, using localStorage only');
            return false;
        }
        _firebaseReady = true;
        return true;
    } catch (e) {
        console.warn('[CapIAu Sync] Firebase not available:', e.message);
        return false;
    }
}

// --- Get current Jellyfin user ID ---
function getJellyfinUserId() {
    if (_userId) return _userId;
    
    try {
        // Try getting from Jellyfin credentials in localStorage
        const creds = JSON.parse(localStorage.getItem('jellyfin_credentials') || '{}');
        const server = (creds.Servers || [])[0];
        _userId = server?.UserId || null;
    } catch {
        _userId = null;
    }
    
    return _userId;
}

/**
 * Generate consistent document ID for a user+entity pair
 */
function docId(entityId) {
    const userId = getJellyfinUserId();
    if (!userId) return null;
    return `${userId}_${entityId}`;
}

/**
 * Local storage key for an entity
 */
function localKey(entityType, entityId) {
    if (entityType === 'carousel') return 'capiau_carousel_order';
    return `capiau_order_${entityId}`;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Save ordered list — local-first, then Firebase sync.
 * Drop-in replacement for:
 *   localStorage.setItem(`capiau_order_${collectionId}`, JSON.stringify(orderedIds))
 * 
 * @param {'collection' | 'carousel'} entityType
 * @param {string} entityId - Collection ID or 'carousel' for carousel order
 * @param {string[]} orderedIds - Array of ordered item/collection IDs
 */
export async function syncSave(entityType, entityId, orderedIds) {
    // 1. Always save locally first (instant, works offline)
    const key = localKey(entityType, entityId);
    localStorage.setItem(key, JSON.stringify(orderedIds));
    
    // 2. Try to sync to Firebase (async, non-blocking)
    try {
        const ready = await ensureFirebase();
        if (!ready) return;
        
        const id = docId(entityId);
        if (!id) return;
        
        const fb = await import('./firebaseConfig.js');
        const docRef = fb.doc(_db, 'capiau_custom_orders', id);
        
        await fb.setDoc(docRef, {
            jellyfinUserId: getJellyfinUserId(),
            entityId: entityId,
            entityType: entityType,
            orderedList: orderedIds,
            deviceOrigin: `${capiauDevice.platform}-${navigator.userAgent.substring(0, 30)}`,
            updatedAt: fb.serverTimestamp()
        }, { merge: true });
        
        console.debug(`[CapIAu Sync] ✅ Saved ${entityType}/${entityId} → Firebase (${orderedIds.length} items)`);
    } catch (e) {
        // Firebase failure is non-fatal — data is still in localStorage
        console.warn(`[CapIAu Sync] ⚠️ Firebase save failed (localStorage OK):`, e.message);
    }
}

/**
 * Get ordered list — reads from local cache, falls back to Firebase.
 * Drop-in replacement for:
 *   JSON.parse(localStorage.getItem(`capiau_order_${collectionId}`))
 * 
 * @param {'collection' | 'carousel'} entityType
 * @param {string} entityId
 * @returns {string[] | null} Ordered array of IDs, or null if none saved
 */
export async function syncGet(entityType, entityId) {
    // 1. Try local first (fast, offline-safe)
    const key = localKey(entityType, entityId);
    try {
        const local = localStorage.getItem(key);
        if (local) return JSON.parse(local);
    } catch { /* continue to Firebase */ }
    
    // 2. Fallback to Firebase
    try {
        const ready = await ensureFirebase();
        if (!ready) return null;
        
        const id = docId(entityId);
        if (!id) return null;
        
        const fb = await import('./firebaseConfig.js');
        const docRef = fb.doc(_db, 'capiau_custom_orders', id);
        const snap = await fb.getDoc(docRef);
        
        if (snap.exists()) {
            const data = snap.data();
            const orderedList = data.orderedList || [];
            
            // Cache locally for next time
            localStorage.setItem(key, JSON.stringify(orderedList));
            console.debug(`[CapIAu Sync] 📥 Loaded ${entityType}/${entityId} from Firebase (${orderedList.length} items)`);
            return orderedList;
        }
    } catch (e) {
        console.warn(`[CapIAu Sync] Firebase read failed:`, e.message);
    }
    
    return null;
}

/**
 * Synchronous getter — reads only from localStorage (for hot paths).
 * Use this in rendering functions where async is not practical.
 * The real-time listener will keep localStorage updated from Firebase.
 * 
 * @param {'collection' | 'carousel'} entityType
 * @param {string} entityId
 * @returns {string[] | null}
 */
export function syncGetLocal(entityType, entityId) {
    const key = localKey(entityType, entityId);
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

/**
 * Start real-time listener for changes from other devices.
 * Call once at app initialization. Updates localStorage automatically
 * and triggers callbacks for UI re-rendering.
 * 
 * @param {function} onUpdate - Called with (entityId, orderedList) when remote change detected
 */
export async function startSyncListener(onUpdate) {
    if (onUpdate) _onUpdateCallbacks.push(onUpdate);
    
    // Don't start multiple listeners
    if (_unsubscribeListener) return;
    
    try {
        const ready = await ensureFirebase();
        if (!ready) return;

        const userId = getJellyfinUserId();
        if (!userId) {
            console.warn('[CapIAu Sync] No Jellyfin user ID — skipping real-time sync');
            return;
        }

        const fb = await import('./firebaseConfig.js');
        const q = fb.query(
            fb.collection(_db, 'capiau_custom_orders'),
            fb.where('jellyfinUserId', '==', userId)
        );

        _unsubscribeListener = fb.onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified' || change.type === 'added') {
                    const data = change.doc.data();
                    const entityId = data.entityId;
                    const orderedList = data.orderedList || [];
                    const entityType = data.entityType || 'collection';
                    
                    // Update local cache
                    const key = localKey(entityType, entityId);
                    localStorage.setItem(key, JSON.stringify(orderedList));
                    
                    // Notify all registered callbacks
                    _onUpdateCallbacks.forEach(cb => {
                        try {
                            cb(entityId, orderedList, data.deviceOrigin);
                        } catch (e) {
                            console.error('[CapIAu Sync] Callback error:', e);
                        }
                    });
                    
                    console.debug(`[CapIAu Sync] 🔄 Real-time update: ${entityType}/${entityId} from ${data.deviceOrigin}`);
                }
            });
        }, (error) => {
            console.error('[CapIAu Sync] Listener error:', error);
        });

        console.log('[CapIAu Sync] 🎧 Real-time sync listener started');
    } catch (e) {
        console.warn('[CapIAu Sync] Could not start listener:', e.message);
    }
}

/**
 * Stop the real-time listener.
 */
export function stopSyncListener() {
    if (_unsubscribeListener) {
        _unsubscribeListener();
        _unsubscribeListener = null;
        console.log('[CapIAu Sync] 🔇 Real-time sync listener stopped');
    }
    _onUpdateCallbacks = [];
}

/**
 * Migrate existing localStorage data to Firebase (one-time operation).
 * Call this once during initial setup to upload any pre-existing custom orders
 * that were saved before the sync module existed.
 */
export async function migrateLocalStorageToFirebase() {
    const ready = await ensureFirebase();
    if (!ready) return 0;
    
    const userId = getJellyfinUserId();
    if (!userId) return 0;
    
    let migrated = 0;
    
    // Migrate collection orders
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key.startsWith('capiau_order_')) {
            const entityId = key.replace('capiau_order_', '');
            try {
                const orderedIds = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(orderedIds) && orderedIds.length > 0) {
                    await syncSave('collection', entityId, orderedIds);
                    migrated++;
                }
            } catch { /* skip invalid entries */ }
        }
    }
    
    // Migrate carousel order
    const carouselOrder = localStorage.getItem('capiau_carousel_order');
    if (carouselOrder) {
        try {
            const orderedIds = JSON.parse(carouselOrder);
            if (Array.isArray(orderedIds) && orderedIds.length > 0) {
                await syncSave('carousel', 'carousel', orderedIds);
                migrated++;
            }
        } catch { /* skip */ }
    }
    
    if (migrated > 0) {
        console.log(`[CapIAu Sync] 📤 Migrated ${migrated} order(s) from localStorage to Firebase`);
    }
    
    return migrated;
}
