/**
 * CapIAu Drag & Drop Collection Organizer
 * 
 * Estratégia: Armazenar a ordem no localStorage (chave: capiau_order_{collectionId}).
 * Tanto o itemDetails (tela de coleção) quanto o capiauHomeInjector (carrosséis)
 * leem essa ordem e reordenam os itens ANTES de renderizar.
 * Isso contorna totalmente a limitação do backend Jellyfin.
 */

// --- Persistence helpers ---
export function saveCustomOrder(collectionId, orderedIds) {
    const key = `capiau_order_${collectionId}`;
    localStorage.setItem(key, JSON.stringify(orderedIds));
}

export function getCustomOrder(collectionId) {
    const key = `capiau_order_${collectionId}`;
    try {
        return JSON.parse(localStorage.getItem(key)) || null;
    } catch { return null; }
}

/**
 * Reordena um array de items do Jellyfin de acordo com a ordem salva no localStorage.
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
    localStorage.setItem('capiau_carousel_order', JSON.stringify(orderedCollectionIds));
}

export function getCarouselOrder() {
    try {
        return JSON.parse(localStorage.getItem('capiau_carousel_order')) || null;
    } catch { return null; }
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
                <button id="capiau-dd-mode-items" style="flex:1;background:#e50914;color:#fff;border:none;padding:4px;font-size:10px;border-radius:3px;cursor:pointer;">Itens da Coleção</button>
                <button id="capiau-dd-mode-carousel" style="flex:1;background:#333;color:#aaa;border:none;padding:4px;font-size:10px;border-radius:3px;cursor:pointer;">Ordem Carrosseis</button>
            </div>
            <div id="capiau-dd-items-panel">
                <select id="capiau-dd-select" style="width:100%; padding: 6px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; font-size: 11px;">
                    <option value="">-- Selecione uma Coleção --</option>
                    ${collections.sort((a,b) => a.Name.localeCompare(b.Name)).map(c => `<option value="${c.Id}">${c.Name}</option>`).join('')}
                </select>
                <div style="margin-top: 10px; display: flex; justify-content: space-between;">
                    <button id="capiau-dd-load" style="background:#333; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:3px; cursor:pointer;">Carregar</button>
                    <button id="capiau-dd-save" style="background:#e50914; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:3px; cursor:pointer; display:none;">Salvar Nova Ordem</button>
                </div>
                <ul id="capiau-dd-list" style="list-style:none; padding:0; margin-top:16px; display:flex; flex-direction:column; gap:6px;"></ul>
            </div>
            <div id="capiau-dd-carousel-panel" style="display:none;">
                <p style="color:#999; font-size:10px; margin-bottom:8px;">Arraste os carrosséis para reorganizar a Home. Apenas coleções da IA aparecem aqui.</p>
                <button id="capiau-dd-carousel-load" style="background:#333; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:3px; cursor:pointer; margin-bottom:6px;">Carregar Carrosséis</button>
                <button id="capiau-dd-carousel-save" style="background:#e50914; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:3px; cursor:pointer; display:none; margin-bottom:6px;">Salvar Ordem</button>
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

            buildDraggableList(listEl, items);
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

        btnSave.innerText = '✓ Salvo! (Recarregue F5)';
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
        buildDraggableCarouselList(carouselList, ordered, (id) => {
            document.getElementById('capiau-dd-mode-items').click();
            document.getElementById('capiau-dd-select').value = id;
            document.getElementById('capiau-dd-load').click();
        });
        btnCarouselSave.style.display = 'block';
    });

    btnCarouselSave.addEventListener('click', () => {
        const orderedIds = Array.from(carouselList.children).map(li => li.dataset.id);
        saveCarouselOrder(orderedIds);

        btnCarouselSave.innerText = '✓ Salvo! (Recarregue F5)';
        btnCarouselSave.style.background = '#2ecc71';
        setTimeout(() => {
            btnCarouselSave.innerText = 'Salvar Ordem';
            btnCarouselSave.style.background = '#e50914';
        }, 3000);
    });
}


// ===== Shared Drag & Drop builder =====
function buildDraggableList(listEl, items) {
    listEl.innerHTML = '';
    let draggedItem = null;

    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.id = item.Id;
        li.style.cssText = 'background:#222; border:1px solid #444; padding:8px; display:flex; align-items:center; cursor:grab; border-radius:4px; font-size:11px; color:#ddd; user-select:none;';
        
        li.innerHTML = `<span style="font-size:14px; margin-right:8px; cursor:grab;">☰</span> 
                        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${index + 1}. ${item.Name}</span>`;

        li.addEventListener('dragstart', function() {
            draggedItem = this;
            setTimeout(() => this.style.opacity = '0.4', 0);
        });
        
        li.addEventListener('dragend', function() {
            draggedItem = null;
            this.style.opacity = '1';
            renumberList(listEl);
        });
        
        li.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        li.addEventListener('dragenter', function(e) {
            e.preventDefault();
            if (this !== draggedItem) this.style.borderColor = '#e50914';
        });

        li.addEventListener('dragleave', function() {
            this.style.borderColor = '#444';
        });
        
        li.addEventListener('drop', function(e) {
            e.stopPropagation();
            this.style.borderColor = '#444';
            if (draggedItem !== this) {
                const allItems = Array.from(listEl.children);
                const draggedIndex = allItems.indexOf(draggedItem);
                const targetIndex = allItems.indexOf(this);
                
                if (draggedIndex < targetIndex) {
                    this.parentNode.insertBefore(draggedItem, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedItem, this);
                }
            }
        });

        listEl.appendChild(li);
    });
}

function buildDraggableCarouselList(listEl, items, onEditItems) {
    listEl.innerHTML = '';
    let draggedItem = null;

    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.id = item.Id;
        li.style.cssText = 'background:#222; border:1px solid #444; padding:8px; display:flex; align-items:center; cursor:grab; border-radius:4px; font-size:11px; color:#ddd; user-select:none;';
        
        li.innerHTML = `<span style="font-size:14px; margin-right:8px; cursor:grab;">☰</span> 
                        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${index + 1}. ${item.Name}</span>
                        <button class="capiau-edit-carousel-items" style="background:#444; color:#fff; border:none; padding:2px 6px; font-size:9px; border-radius:3px; cursor:pointer; margin-left:8px;">Editar Filmes</button>`;

        const editBtn = li.querySelector('.capiau-edit-carousel-items');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onEditItems(item.Id);
        });

        li.addEventListener('dragstart', function(e) {
            if (e.target === editBtn) return e.preventDefault();
            draggedItem = this;
            setTimeout(() => this.style.opacity = '0.4', 0);
        });
        
        li.addEventListener('dragend', function() {
            draggedItem = null;
            this.style.opacity = '1';
            renumberList(listEl);
        });
        
        li.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        li.addEventListener('dragenter', function(e) {
            e.preventDefault();
            if (this !== draggedItem) this.style.borderColor = '#e50914';
        });

        li.addEventListener('dragleave', function() {
            this.style.borderColor = '#444';
        });
        
        li.addEventListener('drop', function(e) {
            e.stopPropagation();
            this.style.borderColor = '#444';
            if (draggedItem !== this) {
                const allItems = Array.from(listEl.children);
                const draggedIndex = allItems.indexOf(draggedItem);
                const targetIndex = allItems.indexOf(this);
                
                if (draggedIndex < targetIndex) {
                    this.parentNode.insertBefore(draggedItem, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedItem, this);
                }
            }
        });

        listEl.appendChild(li);
    });
}

function renumberList(listEl) {
    Array.from(listEl.children).forEach((child, i) => {
        const nameSpan = child.querySelector('span:nth-child(2)');
        if (nameSpan) {
            const pureName = nameSpan.innerText.replace(/^\d+\.\s*/, '');
            nameSpan.innerText = `${i + 1}. ${pureName}`;
        }
    });
}
