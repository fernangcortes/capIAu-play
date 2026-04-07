import cardBuilder from '../../components/cardbuilder/cardBuilder';
import layoutManager from '../../components/layoutManager';
import { appRouter } from '../../components/router/appRouter';
import { getPortraitShape } from '../../components/cardbuilder/utils/shape';
import { applyCustomOrder, getCarouselOrder } from './capiauDragDrop';
import { capiauDevice } from './capiauDeviceManager';

export async function injectHomeSections(parentContainer, apiClient) {
    try {
        const userId = apiClient.getCurrentUserId();
        
        // 1. Recover active auto collections
        const options = {
            Recursive: true,
            IncludeItemTypes: 'BoxSet',
            EnableTotalRecordCount: false
        };
        const result = await apiClient.getItems(userId, options);
        if (!result.Items) return;
        // Filtra coleções da IA
        let autoCollections = result.Items.filter(c => c.Name && (
             c.Name.startsWith('Acervo: ') || 
             c.Name.startsWith('Visão de ') || 
             c.Name.startsWith('Obras da Década') || 
             c.Name.startsWith('Padrão') || 
             c.Name.startsWith('Aclamados') ||
             c.Name.startsWith('Série: ')
        ));
        
        if (autoCollections.length === 0) return;

        // CapIAu: Apply custom carousel order from localStorage
        const carouselOrder = getCarouselOrder();
        if (carouselOrder && carouselOrder.length) {
            const indexMap = {};
            carouselOrder.forEach((id, i) => { indexMap[id] = i; });
            autoCollections.sort((a, b) => {
                const ia = indexMap[a.Id] !== undefined ? indexMap[a.Id] : 99999;
                const ib = indexMap[b.Id] !== undefined ? indexMap[b.Id] : 99999;
                return ia - ib;
            });
        }

        // Pega as 15 mais proeminentes
        const recentColls = autoCollections.slice(0, 15);

        for (const coll of recentColls) {
            const cleanName = coll.Name;
            
            // Cria um container pro carrossel
            const frag = document.createElement('div');
            frag.classList.add('verticalSection');
            
            let html = '';
            html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';
            if (!layoutManager.tv) {
                html += '<a is="emby-linkbutton" href="' + appRouter.getRouteUrl(coll) + '" class="more button-flat button-flat-mini sectionTitleTextButton">';
                html += '<h2 class="sectionTitle sectionTitle-cards">' + cleanName + '</h2>';
                html += '<span class="material-icons chevron_right" aria-hidden="true"></span>';
                html += '</a>';
            } else {
                html += '<h2 class="sectionTitle sectionTitle-cards">' + cleanName + '</h2>';
            }
            html += '</div>';

            html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-centerfocus="true">';
            html += '<div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x capiau-custom-container">';
            html += '</div></div>';

            frag.innerHTML = html;
            parentContainer.appendChild(frag);

            // Closure pra capturar o ID da coleção
            const collectionId = coll.Id;

            // Vincula busca dinâmica pro lazy loading
            const itemsContainer = frag.querySelector('.itemsContainer');
            if (itemsContainer) {
                itemsContainer.fetchData = function() {
                    return apiClient.getItems(userId, {
                        ParentId: collectionId,
                        Limit: 100, // Pegamos até 100 na API
                        Fields: 'PrimaryImageAspectRatio',
                        EnableImageTypes: 'Primary,Backdrop,Thumb'
                    });
                };

                itemsContainer.getItemsHtml = function(items) {
                    // CapIAu: Adaptive limits per device
                    const itemLimit = capiauDevice.isMobile ? 10 : capiauDevice.isTV ? 25 : 20;
                    const ordered = applyCustomOrder(collectionId, items).slice(0, itemLimit);

                    return cardBuilder.getCardsHtml({
                        items: ordered,
                        shape: getPortraitShape(true),
                        preferThumb: capiauDevice.isMobile ? true : 'auto',
                        showUnplayedIndicator: false,
                        showChildCountIndicator: false,
                        context: 'home',
                        overlayText: false,
                        centerText: true,
                        overlayPlayButton: true,
                        allowBottomPadding: !capiauDevice.isMobile,
                        cardLayout: false,
                        showTitle: true,
                        showYear: !capiauDevice.isMobile,
                        showParentTitle: false,
                        lines: capiauDevice.isMobile ? 1 : 2
                    });
                };
                itemsContainer.parentContainer = frag;
            }
        }
    } catch (e) {
        console.error('Falha ao injetar AutoCollections na Home', e);
    }
}
