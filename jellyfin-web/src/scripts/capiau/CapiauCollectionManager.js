import { ServerConnections } from '../../lib/jellyfin-apiclient';

export class CapiauCollectionManager {
    constructor() {
        this.cacheKey = 'capiau_auto_collections_last_run';
    }

    /**
     * Resgata o cliente de API baseado no Server ID ativo
     */
    getApiClient(serverId) {
        return ServerConnections.getApiClient(serverId);
    }

    /**
     * Motor Principal - Faz o mapeamento da biblioteca, cruza os metadados
     * e dispara a criação das coleções.
     */
    async runAutoCollectionProcess(serverId, force = false) {
        const lastRun = localStorage.getItem(this.cacheKey);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (!force && lastRun && (Date.now() - parseInt(lastRun)) < sevenDays) {
            console.log('CapIAu Auto-Collections: Ignorando run (Em Cache)');
            return;
        }

        const apiClient = this.getApiClient(serverId);
        const userId = apiClient.getCurrentUserId();

        try {
            console.log('CapIAu Auto-Collections: Iniciando escaneamento de Metadados...');
            const movies = await this.scanLibrary(apiClient, userId);
            
            // Agregações
            const actorGroups = this.groupByActor(movies);
            const directorGroups = this.groupByDirector(movies);
            const decadeGroups = this.groupByDecade(movies);
            const studioGroups = this.groupByStudio(movies);
            const ratingGroups = this.groupByRating(movies);
            
            // Agrupar Filmes soltos em Pseudo-Séries
            const localSeriesGroups = this.groupByFolderSeries(movies);

            // Mapeia coleções existentes
            const existingCollections = await this.getExistingCollections(apiClient, userId);
            const existingMap = {};
            existingCollections.forEach(c => {
                existingMap[c.Name.toLowerCase()] = c.Id;
            });

            // Lista de propostas geradas
            const proposals = [];

            // Atores (> 2)
            Object.keys(actorGroups).forEach(actor => {
                if (actorGroups[actor].length > 2) {
                    proposals.push({
                        name: `Acervo: ${actor}`,
                        items: actorGroups[actor]
                    });
                }
            });

            // Diretores (> 2)
            Object.keys(directorGroups).forEach(director => {
                if (directorGroups[director].length > 2) {
                    proposals.push({
                        name: `Visão de ${director}`,
                        items: directorGroups[director]
                    });
                }
            });

            // Décadas
            Object.keys(decadeGroups).forEach(decade => {
                if (decadeGroups[decade].length > 2) {
                    proposals.push({
                        name: `Obras da Década ${decade}`,
                        items: decadeGroups[decade]
                    });
                }
            });

            // Estúdios (> 2)
            Object.keys(studioGroups).forEach(studio => {
                if (studioGroups[studio].length > 2) {
                    proposals.push({
                        name: `Padrão ${studio}`,
                        items: studioGroups[studio]
                    });
                }
            });

            // Aclamados (> 2)
            if (ratingGroups.acclaimed && ratingGroups.acclaimed.length > 2) {
                proposals.push({
                    name: `Aclamados pela Crítica (Rating > 8)`,
                    items: ratingGroups.acclaimed
                });
            }

            // ==========================================
            // PASSO 1: TWO-PASS -> GERA SÉRIES PRIMEIRO
            // ==========================================
            let createdCount = 0;
            let updatedCount = 0;
            const seriesIdMap = {}; // Guarda { folderPath: boxSetId }
            
            if (localSeriesGroups.length > 0) {
                for (const series of localSeriesGroups) {
                    const finalName = series.name;
                    const existingId = existingMap[finalName.toLowerCase()];
                    let targetId = existingId;
                    
                    // Ordena episódios alfabeticamente pelo Path para corrigir numeração 01, 02...
                    series.items.sort((a, b) => a.Path.localeCompare(b.Path, undefined, {numeric: true, sensitivity: 'base'}));
                    const itemIds = series.items.map(m => m.Id);

                    if (existingId) {
                        console.log(`CapIAu: Atualizando Série -> ${finalName}`);
                        await this.updateVirtualCollection(apiClient, existingId, itemIds);
                        updatedCount++;
                    } else {
                        console.log(`CapIAu: Criando Série -> ${finalName}`);
                        targetId = await this.createVirtualCollection(apiClient, finalName, itemIds);
                        createdCount++;
                    }
                    
                    if (targetId && series.items.length > 0) {
                        await this.setCollectionCoverImage(apiClient, targetId, series.items[0].Id);
                    }

                    // Injeta a Mutação: todos os episódios dessa série passam a responder pelo ID da Caixa Pai
                    for (const item of series.items) {
                        item.capiauReplacementId = targetId;
                    }
                }
            }

            // ==========================================
            // PASSO 2: AGREGADORES TRADICIONAIS (Nested)
            // ==========================================

            for (const prop of proposals) {
                const finalName = prop.name; 
                const existingId = existingMap[finalName.toLowerCase()];
                let targetId = existingId;
                
                // Converte a lista usando capiauReplacementId se existir, e elimina IDs duplicados (Set)
                // Isso garante que se 20 episodios pertencem a Serie A, a Serie A entra 1 unica vez no Acervo.
                const uniqueIds = [...new Set(prop.items.map(m => m.capiauReplacementId || m.Id))];
                
                if (existingId) {
                    console.log(`CapIAu: Atualizando Agregador -> ${finalName}`);
                    await this.updateVirtualCollection(apiClient, existingId, uniqueIds);
                    updatedCount++;
                } else {
                    console.log(`CapIAu: Criando Agregador -> ${finalName}`);
                    targetId = await this.createVirtualCollection(apiClient, finalName, uniqueIds);
                    createdCount++;
                }
                
                if (targetId && prop.items.length > 0) {
                    await this.setCollectionCoverImage(apiClient, targetId, prop.items[0].Id);
                }
            }

            console.log(`CapIAu Auto-Collections: Sucesso! Novas: ${createdCount}, Atualizadas: ${updatedCount}`);
            localStorage.setItem(this.cacheKey, Date.now().toString());
            return createdCount;

        } catch (err) {
            console.error('CapIAu Auto-Collections: Falha no processo', err);
            throw err;
        }
    }

    /**
     * Resgata as coleções persistentes já existentes
     */
    async getExistingCollections(apiClient, userId) {
        const options = {
            Recursive: true,
            IncludeItemTypes: 'BoxSet',
            EnableTotalRecordCount: false
        };
        const result = await apiClient.getItems(userId, options);
        return result.Items || [];
    }

    /**
     * Resgata todos os filmes e séries para varredura de meta-dados
     */
    async scanLibrary(apiClient, userId) {
        const options = {
            Recursive: true,
            IncludeItemTypes: 'Movie',
            Fields: 'People,Studios,ProductionYear,Path',
            EnableTotalRecordCount: false
        };
        const result = await apiClient.getItems(userId, options);
        return result.Items || [];
    }

    /**
     * Injeta e cria a coleção enviando requisição pra API do Jellyfin
     */
    async createVirtualCollection(apiClient, name, itemsIds) {
        const idsString = itemsIds.join(',');
        const url = apiClient.getUrl('Collections', {
            Name: name,
            IsLocked: false, // Permitindo BoxSet plugin montar as capinhas de colagem originais
            Ids: idsString
        });

        const result = await apiClient.ajax({
            type: 'POST',
            url: url,
            dataType: 'json'
        });
        
        const colId = result.Id || result.id;
        
        // 4. Force Custom Display Order
        try {
            const collectionItem = await apiClient.getItem(apiClient.getCurrentUserId(), colId);
            if (collectionItem && collectionItem.DisplayOrder !== 'Custom') {
                collectionItem.DisplayOrder = 'Custom';
                await apiClient.ajax({
                    type: 'POST',
                    url: apiClient.getUrl(`Items/${colId}`),
                    data: JSON.stringify(collectionItem),
                    contentType: 'application/json'
                });
            }
        } catch (e) { console.log('Coult not lock DisplayOrder', e); }

        return colId;
    }

    /**
     * Atualiza a coleção que já existe pelo padrão Limpa & Repõe (Clear & Replace)
     * Resolve persistência de itens incorretos do passado e garante a ordenação estrita.
     */
    async updateVirtualCollection(apiClient, collectionId, itemIds) {
        // 1. Resgatar IDs atuais que estão populando a coleção (o lixo histórico)
        const currentItemsReq = await apiClient.getItems(apiClient.getCurrentUserId(), {
            ParentId: collectionId,
            Fields: 'Id',
            EnableTotalRecordCount: false
        });
        const currentIds = (currentItemsReq.Items || []).map(i => i.Id);

        // 2. Apagar acoplamentos antigos para liberar espaço (Isso garante que o Two-Pass seja efetivo e remova episódios poluitores)
        if (currentIds.length > 0) {
            await apiClient.ajax({
                type: 'DELETE',
                url: apiClient.getUrl(`Collections/${collectionId}/Items`, {
                    Ids: currentIds.join(',')
                })
            });
        }

        // 3. Injetar a nova hierarquia (Ordenada cronologicamente e com ParentBoxsets únicos)
        if (itemIds.length > 0) {
            const url = apiClient.getUrl(`Collections/${collectionId}/Items`, {
                Ids: itemIds.join(',')
            });
            await apiClient.ajax({
                type: 'POST',
                url: url
            });
        }

        // 4. Force Custom Display Order (Apenas Custom respeita os dados arrastados/injetados)
        try {
            const collectionItem = await apiClient.getItem(apiClient.getCurrentUserId(), collectionId);
            if (collectionItem && collectionItem.DisplayOrder !== 'Custom') {
                collectionItem.DisplayOrder = 'Custom';
                await apiClient.ajax({
                    type: 'POST',
                    url: apiClient.getUrl(`Items/${collectionId}`),
                    data: JSON.stringify(collectionItem),
                    contentType: 'application/json'
                });
            }
        } catch (e) { console.log('Could not lock DisplayOrder', e); }
    }



    /**
     * Traz a imagem do item fonte e injeta na coleção alvo usando API Nativ do Jellyfin.
     */
    async setCollectionCoverImage(apiClient, collectionId, sourceMovieId) {
        try {
            const imgUrl = apiClient.getUrl(`/Items/${sourceMovieId}/Images/Primary`);
            const res = await fetch(imgUrl);
            if (!res.ok) throw new Error('Falha ao baixar poster base');
            const blob = await res.blob();
            
            // Mimetiza a interface nativa
            const fakeFile = new File([blob], "cover.jpg", { type: blob.type || 'image/jpeg' });
            await apiClient.uploadItemImage(collectionId, 'Primary', fakeFile);
        } catch(e) {
            console.error(`CapIAu: Falha ao setar a capa`, e);
        }
    }

    // --- Agregadores Lógicos ---

    groupByFolderSeries(items) {
        const pathGroups = {};
        for (const item of items) {
            if (!item.Path) continue;
            // Extrai a pasta pai ignorando o nome do arquivo mkv/mp4
            const folderMatch = item.Path.match(/^(.*)[/\\][^/\\]+$/);
            if (folderMatch) {
                const folder = folderMatch[1];
                if (!pathGroups[folder]) pathGroups[folder] = [];
                pathGroups[folder].push(item);
            }
        }

        const collections = [];
        for (const folder in pathGroups) {
            if (pathGroups[folder].length > 2) { // 3 ou mais arquivos configura uma série local
                const folderName = folder.split(/[/\\]/).pop();
                
                // Ignora pastas raiz mortas como "Torrents", "Downloads" se espalhadas
                const lName = folderName.toLowerCase();
                if (['torrents', 'downloads', 'filmes', 'movies'].includes(lName)) continue;

                collections.push({
                    name: `Série: ${folderName}`,
                    items: pathGroups[folder]
                });
            }
        }
        return collections;
    }

    groupByActor(items) {
        const dict = {};
        for (const item of items) {
            if (item.People) {
                const actors = item.People.filter(p => p.Type === 'Actor');
                for (const act of actors) {
                    if (!dict[act.Name]) dict[act.Name] = [];
                    dict[act.Name].push(item);
                }
            }
        }
        return dict;
    }

    groupByDirector(items) {
        const dict = {};
        for (const item of items) {
            if (item.People) {
                const directors = item.People.filter(p => p.Type === 'Director');
                for (const d of directors) {
                    if (!dict[d.Name]) dict[d.Name] = [];
                    dict[d.Name].push(item);
                }
            }
        }
        return dict;
    }

    groupByDecade(items) {
        const dict = {};
        for (const item of items) {
            if (item.ProductionYear) {
                const dec = Math.floor(item.ProductionYear / 10) * 10;
                const decName = dec + "s";
                if (!dict[decName]) dict[decName] = [];
                dict[decName].push(item);
            }
        }
        return dict;
    }

    groupByStudio(items) {
        const dict = {};
        for (const item of items) {
            if (item.Studios) {
                for (const st of item.Studios) {
                    if (!dict[st.Name]) dict[st.Name] = [];
                    dict[st.Name].push(item);
                }
            }
        }
        return dict;
    }

    groupByRating(items) {
        const dict = { acclaimed: [] };
        for (const item of items) {
            if (item.CommunityRating && item.CommunityRating >= 8.0) {
                dict.acclaimed.push(item);
            }
        }
        return dict;
    }
}

export const collectionManager = new CapiauCollectionManager();
