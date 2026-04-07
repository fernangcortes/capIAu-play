/**
 * CapIAu Drag & Drop Collection Organizer
 * 
 * Estratégia: Armazenar a ordem no localStorage (chave: capiau_order_{collectionId}).
 * Tanto o itemDetails (tela de coleção) quanto o capiauHomeInjector (carrosséis)
 * leem essa ordem e reordenam os itens ANTES de renderizar.
 * Isso contorna totalmente a limitação do backend Jellyfin.
 * 
 * v2.0 — Multi-input: Desktop (HTML5 D&D), Mobile (touch reorder), TV (arrow keys + buttons)
 */

import { capiauDevice } from './capiauDeviceManager';
import { syncSave, syncGetLocal } from './capiauSync';

// --- Persistence helpers (backed by capiauSync: localStorage + Firebase) ---

/**
 * Salva a ordem personalizada de uma coleção.
 * Salva localmente (instantâneo) E no Firebase (async, multi-device).
 */
export function saveCustomOrder(collectionId, orderedIds) {
    // Sync: salva local + Firebase (fire and forget)
    syncSave('collection', collectionId, orderedIds);
}

/**
 * Lê a ordem personalizada de uma coleção.
 * Leitura síncrona do localStorage (o listener real-time mantém o localStorage atualizado).
 */
export function getCustomOrder(collectionId) {
    return syncGetLocal('collection', collectionId);
}

/**
 * Reordena um array de items do Jellyfin de acordo com a ordem salva.
 * Items que não constam na lista ficam no final.
 */
export function applyCustomOrder(collectionId, items) {
    const order = getCustomOrder(collectionId);
    if (!order || !order.length) return items;

    const indexMap = {};
    order.forEach((id, i) => { indexMap[id] = i; });

    return [...items].sort((a, b) => {
        const ia = indexMap[a.Id] !== undefined ? indexMap[a.Id] : 99999;
        const ib = indexMap[b.Id] !== undefined ? indexMap[b.Id] : 99999;
        return ia - ib;
    });
}

// --- Carousel Order helpers ---
export function saveCarouselOrder(orderedCollectionIds) {
    syncSave('carousel', 'carousel', orderedCollectionIds);
}

export function getCarouselOrder() {
    return syncGetLocal('carousel', 'carousel');
}


// --- UI Renderer ---
export async function renderDragDropTools(container, apiClient, userId) {
    container.innerHTML = '<div class="capiau-loading">Carregando Coleções...</div>';

    // 1. Fetch available collections
    let collections = [];
    try {
        const result = await apiClient.getItems(userId, {
            Recursive: true,
            IncludeItemTypes: 'BoxSet',
            EnableTotalRecordCount: false
        });
        collections = result.Items || [];
    } catch (e) {
        container.innerHTML = '<div class="capiau-empty">Falha ao buscar Coleções.</div>';
        return;
    }

    if (collections.length === 0) {
        container.innerHTML = '<div class="capiau-empty">Nenhuma Coleção Encontrada.</div>';
        return;
    }

    // 2. Build UI with two modes: Collection Items + Carousel Order
    let html = `
        <div style="padding: 10px;">
            <div style="display:flex; gap:4px; margin-bottom:10px;">
                <button id="capiau-dd-mode-items" tabindex="0" style="flex:1;background:#e50914;color:#fff;border:none;padding:4px;font-size:10px;border-radius:3px;cursor:pointer;">Itens da Coleção</button>
                <button id="capiau-dd-mode-carousel" tabindex="0" style="flex:1;background:#333;color:#aaa;border:none;padding:4px;font-size:10px;border-radius:3px;cursor:pointer;">Ordem Carrosseis</button>
            </div>
            <div id="capiau-dd-items-panel">
                <select id="capiau-dd-select" tabindex="0" style="width:100%; padding: 6px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; font-size: 11px;">
                    <option value="">-- Selecione uma Coleção --</option>
                    ${collections.sort((a,b) => a.Name.localeCompare(b.Name)).map(c => `<option value="${c.Id}">${c.Name}</option>`).join('')}
                </select>
                <div style="margin-top: 10px; display: flex; justify-content: space-between;">
                    <button id="capiau-dd-load" tabindex="0" style="background:#333; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:3px; cursor:pointer;">Carregar</button>
                    <button id="capiau-dd-save" tabindex="0" style="background:#e50914; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:3px; cursor:pointer; display:none;">Salvar Nova Ordem</button>
                </div>
                <ul id="capiau-dd-list" style="list-style:none; padding:0; margin-top:16px; display:flex; flex-direction:column; gap:6px;"></ul>
            </div>
            <div id="capiau-dd-carousel-panel" style="display:none;">
                <p style="color:#999; font-size:10px; margin-bottom:8px;">Arraste os carrosséis para reorganizar a Home. Apenas coleções da IA aparecem aqui.</p>
                <button id="capiau-dd-carousel-load" tabindex="0" style="background:#333; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:3px; cursor:pointer; margin-bottom:6px;">Carregar Carrosséis</button>
                <button id="capiau-dd-carousel-save" tabindex="0" style="background:#e50914; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:3px; cursor:pointer; display:none; margin-bottom:6px;">Salvar Ordem</button>
                <ul id="capiau-dd-carousel-list" style="list-style:none; padding:0; display:flex; flex-direction:column; gap:6px;"></ul>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // --- Mode switching ---
    const btnModeItems = document.getElementById('capiau-dd-mode-items');
    const btnModeCarousel = document.getElementById('capiau-dd-mode-carousel');
    const panelItems = document.getElementById('capiau-dd-items-panel');
    const panelCarousel = document.getElementById('capiau-dd-carousel-panel');

    btnModeItems.addEventListener('click', () => {
        panelItems.style.display = '';
        panelCarousel.style.display = 'none';
        btnModeItems.style.background = '#e50914'; btnModeItems.style.color = '#fff';
        btnModeCarousel.style.background = '#333'; btnModeCarousel.style.color = '#aaa';
    });
    btnModeCarousel.addEventListener('click', () => {
        panelItems.style.display = 'none';
        panelCarousel.style.display = '';
        btnModeCarousel.style.background = '#e50914'; btnModeCarousel.style.color = '#fff';
        btnModeItems.style.background = '#333'; btnModeItems.style.color = '#aaa';
    });

    // ===== COLLECTION ITEMS PANEL =====
    const btnLoad = document.getElementById('capiau-dd-load');
    const btnSave = document.getElementById('capiau-dd-save');
    const listEl = document.getElementById('capiau-dd-list');
    const selectEl = document.getElementById('capiau-dd-select');

    btnLoad.addEventListener('click', async () => {
        const collectionId = selectEl.value;
        if (!collectionId) return;

        listEl.innerHTML = '<li class="capiau-loading">Buscando itens...</li>';
        btnSave.style.display = 'none';

        try {
            const itemsResult = await apiClient.getItems(userId, {
                ParentId: collectionId,
                Fields: 'Id',
                EnableTotalRecordCount: false
            });
            let items = itemsResult.Items || [];

            // Apply saved order if exists
            items = applyCustomOrder(collectionId, items);

            if (items.length === 0) {
                listEl.innerHTML = '<li class="capiau-empty">Coleção Vazia.</li>';
                return;
            }

            buildReorderableList(listEl, items);
            btnSave.style.display = 'block';
        } catch(e) {
            listEl.innerHTML = '<li class="capiau-empty">Erro ao carregar itens.</li>';
        }
    });

    btnSave.addEventListener('click', () => {
        const collectionId = selectEl.value;
        if (!collectionId) return;

        const orderedIds = Array.from(listEl.children).map(li => li.dataset.id);
        saveCustomOrder(collectionId, orderedIds);

        btnSave.innerText = '✓ Salvo + Sincronizado!';
        btnSave.style.background = '#2ecc71';
        setTimeout(() => {
            btnSave.innerText = 'Salvar Nova Ordem';
            btnSave.style.background = '#e50914';
        }, 3000);
    });

    // ===== CAROUSEL ORDER PANEL =====
    const btnCarouselLoad = document.getElementById('capiau-dd-carousel-load');
    const btnCarouselSave = document.getElementById('capiau-dd-carousel-save');
    const carouselList = document.getElementById('capiau-dd-carousel-list');

    const autoCollections = collections.filter(c => c.Name && (
        c.Name.startsWith('Acervo: ') || 
        c.Name.startsWith('Visão de ') || 
        c.Name.startsWith('Obras da Década') || 
        c.Name.startsWith('Padrão') || 
        c.Name.startsWith('Aclamados') ||
        c.Name.startsWith('Série: ')
    ));

    btnCarouselLoad.addEventListener('click', () => {
        let ordered = autoCollections;
        const savedOrder = getCarouselOrder();
        if (savedOrder) {
            const indexMap = {};
            savedOrder.forEach((id, i) => { indexMap[id] = i; });
            ordered = [...autoCollections].sort((a, b) => {
                const ia = indexMap[a.Id] !== undefined ? indexMap[a.Id] : 99999;
                const ib = indexMap[b.Id] !== undefined ? indexMap[b.Id] : 99999;
                return ia - ib;
            });
        }
        buildReorderableCarouselList(carouselList, ordered, (id) => {
            document.getElementById('capiau-dd-mode-items').click();
            document.getElementById('capiau-dd-select').value = id;
            document.getElementById('capiau-dd-load').click();
        });
        btnCarouselSave.style.display = 'block';
    });

    btnCarouselSave.addEventListener('click', () => {
        const orderedIds = Array.from(carouselList.children).map(li => li.dataset.id);
        saveCarouselOrder(orderedIds);

        btnCarouselSave.innerText = '✓ Salvo + Sincronizado!';
        btnCarouselSave.style.background = '#2ecc71';
        setTimeout(() => {
            btnCarouselSave.innerText = 'Salvar Ordem';
            btnCarouselSave.style.background = '#e50914';
        }, 3000);
    });
}


// ===== ADAPTIVE Reorderable list — adapts to device input method =====

/**
 * Builds a reorderable list with the best interaction for the current device:
 * - Desktop: HTML5 Drag & Drop
 * - Mobile: Touch drag + ▲/▼ buttons
 * - TV: ▲/▼ buttons + Arrow key support
 */
function buildReorderableList(listEl, items) {
    listEl.innerHTML = '';

    items.forEach((item, index) => {
        const li = createReorderableItem(item, index, listEl);
        listEl.appendChild(li);
    });

    // Desktop: attach drag events
    if (capiauDevice.supportsDragDrop) {
        attachDragEvents(listEl);
    }

    // Mobile: attach touch reorder events
    if (capiauDevice.supportsTouchReorder) {
        attachTouchReorderEvents(listEl);
    }
}

function buildReorderableCarouselList(listEl, items, onEditItems) {
    listEl.innerHTML = '';

    items.forEach((item, index) => {
        const li = createReorderableItem(item, index, listEl, true);
        
        const editBtn = li.querySelector('.capiau-edit-carousel-items');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onEditItems(item.Id);
            });
        }

        listEl.appendChild(li);
    });

    if (capiauDevice.supportsDragDrop) {
        attachDragEvents(listEl);
    }

    if (capiauDevice.supportsTouchReorder) {
        attachTouchReorderEvents(listEl);
    }
}

function createReorderableItem(item, index, listEl, isCarousel = false) {
    const li = document.createElement('li');
    li.dataset.id = item.Id;
    li.tabIndex = 0;
    li.style.cssText = 'background:#222; border:1px solid #444; padding:8px; display:flex; align-items:center; border-radius:4px; font-size:11px; color:#ddd; user-select:none; outline:none; transition: transform 0.15s, border-color 0.15s;';

    // Desktop: show drag handle; Mobile/TV: show ▲/▼ buttons
    const showButtons = !capiauDevice.supportsDragDrop;
    const showDragHandle = capiauDevice.supportsDragDrop;

    let innerHtml = '';

    // Drag handle (desktop only)
    if (showDragHandle) {
        li.draggable = true;
        li.style.cursor = 'grab';
        innerHtml += `<span style="font-size:14px; margin-right:8px; cursor:grab;">☰</span>`;
    }

    // ▲/▼ buttons (mobile + TV)
    if (showButtons) {
        innerHtml += `
            <div style="display:flex; flex-direction:column; margin-right:8px; gap:2px;">
                <button class="capiau-reorder-up" tabindex="0" style="background:#333; border:1px solid #555; color:#fff; font-size:10px; padding:2px 6px; border-radius:2px; cursor:pointer; line-height:1;" title="Mover para cima" aria-label="Mover para cima">▲</button>
                <button class="capiau-reorder-down" tabindex="0" style="background:#333; border:1px solid #555; color:#fff; font-size:10px; padding:2px 6px; border-radius:2px; cursor:pointer; line-height:1;" title="Mover para baixo" aria-label="Mover para baixo">▼</button>
            </div>
        `;
    }

    // Name
    innerHtml += `<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${index + 1}. ${item.Name}</span>`;

    // Edit button (carousel mode only)
    if (isCarousel) {
        innerHtml += `<button class="capiau-edit-carousel-items" tabindex="0" style="background:#444; color:#fff; border:none; padding:2px 6px; font-size:9px; border-radius:3px; cursor:pointer; margin-left:8px;">Editar Filmes</button>`;
    }

    li.innerHTML = innerHtml;

    // ▲/▼ button click handlers
    const upBtn = li.querySelector('.capiau-reorder-up');
    const downBtn = li.querySelector('.capiau-reorder-down');
    
    if (upBtn) {
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveItem(li, -1);
        });
    }
    if (downBtn) {
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveItem(li, 1);
        });
    }

    // TV: Arrow key support for in-list reordering
    li.addEventListener('keydown', (e) => {
        if (!capiauDevice.supportsArrowReorder) return;

        if (e.key === 'ArrowUp' && e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            moveItem(li, -1);
            li.focus();
        } else if (e.key === 'ArrowDown' && e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            moveItem(li, 1);
            li.focus();
        }
    });

    // Focus styling
    li.addEventListener('focus', () => {
        li.style.borderColor = '#e50914';
        li.style.boxShadow = '0 0 8px rgba(229,9,20,0.3)';
    });
    li.addEventListener('blur', () => {
        li.style.borderColor = '#444';
        li.style.boxShadow = 'none';
    });

    return li;
}

/**
 * Move an item up (-1) or down (+1) in its parent list.
 */
function moveItem(li, direction) {
    const parent = li.parentElement;
    if (!parent) return;

    const items = Array.from(parent.children);
    const idx = items.indexOf(li);
    const newIdx = idx + direction;

    if (newIdx < 0 || newIdx >= items.length) return;

    if (direction === -1) {
        parent.insertBefore(li, items[newIdx]);
    } else {
        parent.insertBefore(li, items[newIdx].nextSibling);
    }

    // Visual feedback
    li.style.transform = 'scale(1.02)';
    li.style.borderColor = '#2ecc71';
    setTimeout(() => {
        li.style.transform = '';
        li.style.borderColor = li === document.activeElement ? '#e50914' : '#444';
    }, 200);

    renumberList(parent);
}

// ===== HTML5 Drag & Drop (Desktop) =====
function attachDragEvents(listEl) {
    let draggedItem = null;

    listEl.addEventListener('dragstart', (e) => {
        if (e.target.tagName !== 'LI' && !e.target.closest('li')) return;
        draggedItem = e.target.closest('li') || e.target;
        setTimeout(() => draggedItem.style.opacity = '0.4', 0);
    });

    listEl.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.style.opacity = '1';
            draggedItem = null;
        }
        renumberList(listEl);
    });

    listEl.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    listEl.addEventListener('dragenter', (e) => {
        e.preventDefault();
        const target = e.target.closest('li');
        if (target && target !== draggedItem) {
            target.style.borderColor = '#e50914';
        }
    });

    listEl.addEventListener('dragleave', (e) => {
        const target = e.target.closest('li');
        if (target) target.style.borderColor = '#444';
    });

    listEl.addEventListener('drop', (e) => {
        e.stopPropagation();
        const target = e.target.closest('li');
        if (!target) return;
        target.style.borderColor = '#444';

        if (draggedItem && draggedItem !== target) {
            const allItems = Array.from(listEl.children);
            const draggedIndex = allItems.indexOf(draggedItem);
            const targetIndex = allItems.indexOf(target);

            if (draggedIndex < targetIndex) {
                target.parentNode.insertBefore(draggedItem, target.nextSibling);
            } else {
                target.parentNode.insertBefore(draggedItem, target);
            }
        }
    });
}

// ===== Touch Reorder (Mobile/Tablet) =====
function attachTouchReorderEvents(listEl) {
    let touchedItem = null;
    let touchStartY = 0;
    let touchClone = null;
    let originalIndex = -1;
    let placeholder = null;

    listEl.addEventListener('touchstart', (e) => {
        const target = e.target.closest('li');
        if (!target || e.target.closest('button') || e.target.closest('select')) return;

        // Long press to start reorder
        target._longPressTimer = setTimeout(() => {
            touchedItem = target;
            touchStartY = e.touches[0].clientY;
            originalIndex = Array.from(listEl.children).indexOf(target);

            // Visual feedback: item being moved
            target.style.opacity = '0.5';
            target.style.borderColor = '#e50914';
            target.style.background = 'rgba(229,9,20,0.1)';

            // Create placeholder
            placeholder = document.createElement('li');
            placeholder.style.cssText = 'height: 40px; border: 2px dashed #e50914; border-radius: 4px; margin-bottom: 6px; background: rgba(229,9,20,0.05);';
            target.after(placeholder);

            // Haptic feedback if supported
            if (navigator.vibrate) navigator.vibrate(50);
        }, 400); // 400ms long press
    }, { passive: true });

    listEl.addEventListener('touchmove', (e) => {
        if (!touchedItem) {
            // Cancel long press if finger moved
            const target = e.target.closest('li');
            if (target && target._longPressTimer) {
                clearTimeout(target._longPressTimer);
            }
            return;
        }

        const touchY = e.touches[0].clientY;
        const items = Array.from(listEl.children).filter(el => el !== placeholder);

        // Find target position
        for (const item of items) {
            if (item === touchedItem) continue;
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            if (touchY < midY && item !== placeholder.previousElementSibling) {
                listEl.insertBefore(placeholder, item);
                break;
            } else if (touchY > midY && item.nextSibling !== placeholder) {
                listEl.insertBefore(placeholder, item.nextSibling);
                break;
            }
        }
    }, { passive: true });

    listEl.addEventListener('touchend', (e) => {
        // Clear long press timer
        const target = e.target.closest('li');
        if (target && target._longPressTimer) {
            clearTimeout(target._longPressTimer);
        }

        if (!touchedItem) return;

        // Move the item to placeholder position
        if (placeholder && placeholder.parentElement) {
            listEl.insertBefore(touchedItem, placeholder);
            placeholder.remove();
        }

        // Reset styles
        touchedItem.style.opacity = '1';
        touchedItem.style.borderColor = '#444';
        touchedItem.style.background = '#222';

        touchedItem = null;
        placeholder = null;
        renumberList(listEl);
    }, { passive: true });

    listEl.addEventListener('touchcancel', () => {
        if (touchedItem) {
            touchedItem.style.opacity = '1';
            touchedItem.style.borderColor = '#444';
            touchedItem.style.background = '#222';
        }
        if (placeholder && placeholder.parentElement) {
            placeholder.remove();
        }
        touchedItem = null;
        placeholder = null;
    }, { passive: true });
}

function renumberList(listEl) {
    Array.from(listEl.children).forEach((child, i) => {
        // Skip placeholder elements
        if (!child.dataset || !child.dataset.id) return;
        const nameSpan = child.querySelector('span:nth-of-type(1)');
        // Find the span that has the number + name (the one with flex:1)
        const spans = child.querySelectorAll('span');
        for (const span of spans) {
            if (span.style.flex === '1' || span.style.cssText.includes('flex:1')) {
                const pureName = span.innerText.replace(/^\d+\.\s*/, '');
                span.innerText = `${i + 1}. ${pureName}`;
                break;
            }
        }
    });
}
