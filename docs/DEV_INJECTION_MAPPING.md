# Guia de Bypasses da Interface (CapIAu vs Jellyfin)

O projeto **CapIAu-Streaming** consiste na transformação e hackeamento da plataforma original Open Source do Webpack Legado do Jellyfin (Fork `10.9.x`). Diferente de ecossistemas React limpos onde a lógica é centralizada, desenvolver nessa vertente Open Source significa criar "Interceptores" (Bypasses) da lógica vanilla de renderização.

Use esta "bússola de código" para evitar quebrar componentes fundamentais do software ao aplicar novos recursos na interface ou na reprodução.

---

## 🗺️ Mapa de Injeções (Componentes Primários)

### 1. Interceptando a Tela Inicial (Home)
O "Painel Home" principal de Bibliotecas do Jellyfin fica oculto em múltiplas camadas devido ao ecossistema políglota (React vs Vanilla). Quando precisamos que o usuário veja a **Integração das Coleções Automáticas** feitas pela CapIAu, interagimos nos seguintes arquivos:

* **Arquivo Alvo:** `/src/components/homesections/homesections.js`
* **Descrição da Quebra:** Essa é a "Fábrica de views HTML" utilizada de base de renderização quando você carrega a home de filmes/bibliotecas padrões do site original.
* **Onde a injeção acontece:** No término de `return Promise.all(promises)...`. Onde nós chamamos programaticamente `import('../../scripts/capiau/capiauHomeInjector')`. Toda funcionalidade extra de HomeScreen deve ser agrupada num script modular paralelo e evocada assim como fizemos com `capiauHomeInjector` para não viciar a promessa inicial e atrasar a FCP (First Contentful Paint) inicial do site.

### 2. Controles de Reprodução e a Vida Útil do Player
Sempre que uma Anotação (Post-It da produtora) deve ser inserida, é vital escutar o relógio interno do reprodutor do servidor e injetar o Timecode para o Cloud.

* **Arquivo Alvo:** `/src/controllers/playback/video/index.js`
* **Como interceptar a Timeline:** Não invente reescrever os seletores nativos de DOM `<video>`. O Jellyfin gerencia a vida útil e cache disto pela classe Global `playbackManager`.
* **Chamadas Úteis e Críticas:**
  - `playbackManager.currentTime(playbackManager.getCurrentPlayer())`: Nos fornece o timestamp absoluto de pausa.
  - `playbackManager.seek(timestamp * 10000)`: O `seek` oficial do Webpack usa TimeTicks (10.000 ms), multiplicar por 10K na hora de interceptar click-to-play na sidebar é fundamental.

### 3. Tela de Detalhes da Mídia & Carrosséis (BoxSets)
Sabe quando você clica em um Filme na Home e a tela sobe deslizando de baixo e revelando o Cast e Trailers? É isso. Alteramos esse componente para driblar falhas de indexação manual do banco nativo e embutir painéis de controle do Capiroto.

* **Arquivo Alvo:** `/src/controllers/itemDetails/index.js`
* **Desafio dos `.hide` ou `.is-hidden`**: Quase todas as chamadas HTML da view de detalhes nascem usando CSS utility classes do OSD. Sempre que injetar interfaces fixas Customizadas da Produtora sobre esses contêineres, remova explicitamente estas classes utilitárias ou trave sobreposições forçosas de `style.display`.
* **Interceptando o Backbone de Array (Drag and Drop):**
  Linha ~ 1600. Procure por `renderCollectionItems(page, item, ...result.Items)`. Modifique a matriz `result.Items` ali mesmo. Nós injetamos `applyCustomOrder()` nesse momento, mudando a matriz antes do Javascript pintar o array HTML. É ali que a mágica da interface reordenada ganha vida antes da renderização.

---

## 🛠️ Elementos Emby WebComponents (Cuidados Extremos)
O software roda diversas tags WebComponents (`is="emby-scroller"`, `is="emby-itemscontainer"`). Isso significa que elas são interceptadas no nível Browser DOM Shadowing.

Se você está criando um injetor, **cuidado com a ordem de execução!**
Um WebComponent só consegue carregar itens se:
1. `itemsContainer.fetchData = function() { ... }` (O motor onde o componente diz para a API "me dá o JSON dos IDs!") for mapeado.
2. E seguido imediatamente do seu override: `itemsContainer.getItemsHtml = function(items) { return cardBuilder... }`

Caso você perca essa janela de design paramétrico, o "Virtual Scroller" do Emby deixará de renderizar seus blocos com "LazyLoad", colapsando a performance.

---
**Nota Diária para Engenheiros CapIAu:** Sempre que integrar features colaterais ao Modo Produtora, tente criar arquivos independentes na sandbox interna `/src/scripts/capiau/` e realizar uma ÚNICA importação condicional no ecossistema primário Jellyfin (ex: injetar seu método export `initCapiau()` lá dentro invés de construir blocos imensos nas 400 linhas de arquivos raiz).
