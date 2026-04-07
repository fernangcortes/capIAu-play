# CapIAu Producer Dashboard (Painel da Produtora)

## Visão Geral
Este documento registra a implementação, estrutura técnica e os desafios superados na criação do **Painel da Produtora** (Anotações e Feedbacks) incorporado na interface "Home" do Jellyfin/CapIAu.

O objetivo do painel é permitir que produtores, diretores de arte, revisores e demais membros da equipe deixem **Post-Its (Anotações)** atrelados cirurgicamente a milissegundos específicos de qualquer mídia em reprodução no servidor, com suporte avançado à threads (respostas) em tempo real via **Google Firebase (Firestore)**.

## Arquitetura
- **Persistência de Dados**: Firebase Cloud Firestore (`capiau_comments`).
- **Controlador de Criação**: `src/controllers/playback/video/index.js` gerencia o input de anotações quando o usuário pausa o vídeo ou invoca a overlay de comentário. A submissão captura o exato `playbackManager.currentTime(currentPlayer)` do momento.
- **Controlador de Exibição (Sidebar)**: `src/scripts/capiau/capiauSidebar.js` gerencia uma barra lateral retrátil e compacta global. A renderização escuta os nós da coleção do Firestore (`onSnapshot`) atrelando comentários e hierarquias pais/filhos (Threads) no layout linear da produtora.

## Registro de Soluções e Desafios (Bugs Fixes)

### 1. Z-Index, Layout Cortado e Renderização Experimental do Jellyfin
A integração da barra no React Experimental do Jellyfin ("home.tsx") originalmente sofria cortes severos ("clipping") de interface (`overflow: hidden`).
- **A Solução:** Transferimos a renderização crítica — em especial a do controle de pre-view de vídeo (Mini-Player Global) — para a formatação mais crua possível (`document.body`). Alteramos de abordagens estáticas em colunas para nós posicionados com `fixed`. Os estilos deixaram de engessar o scroll na página ativa via `injectStyles` diretos.

### 2. A Invasão do `.hide` (O bug da invisibilidade forçada)
O motor de classes originais do Jellyfin possui diretivas como `.hide { display: none !important; }`. 
- **O Problema:** Durante a ativação da tag do mini-player, adicionar e remover `.hide` via javascript competia com lógicas nativas, causando momentos onde o display via `style.display="block"` era cancelado pela especificidade do `!important`.
- **A Solução:** A remoção completa da dependência de classes de utilidade do sistema original para controle de estados, adotando controles granulares embutidos em inline-style na lógica do Hovering Action (`mouseenter`, `mouseleave`).

### 3. Falha de Extração de Metadados ("Filme Desconhecido" / API 404s)
- **O Problema:** Durante testes inicias e "Hot Reload" via Webpack (`localhost:8080`), certas rotas de API não achavam o backend (`localhost:8096`), ocasionando em 404 não encontrados ou retornando metadados nulos no qual o card representava os filmes como "Filme Desconhecido".
- **A Solução:** Construção de uma macro `getBaseUrlFallback()` altamente adaptativa. Mais do que isso, em vez de depender apenas do ID salvo no Firebase, o sistema passou a executar consultas unificadas `apiClient.getItem(userId, mediaId)` cacheando o título real do filme e data de lançamento logo antes do preenchimento da visualização React/Vanilla.

### 4. Recarregamento Destrutivo ao Clicar (Seek Error)
- **O Problema:** Quando o produtor já estava assistindo o filme em tela cheia e decidia clicar numa anotação (Ex: pular para 32:00), o sistema chamava `playbackManager.play(items)`. Isso forçava a derrubada da instância de vídeo carregada, perda de posições de ticks atuais, e engasgos críticos, simulando uma recriação forçada de contexto.
- **A Solução:** Interceptação inteligente na função `playAt()`. O sistema checa ativamente `playbackManager.getCurrentPlayer()`. Caso o ID que estamos exibindo se alinhe com o ativo (mesmo filme), abandonamos o script de "Recarregar Play" e operamos um cirúrgico `playbackManager.seek(...)` invisível e assíncrono para o exato `tick`. 0 engasgos.

### 5. Reuso do Cache de Vídeo (Mini-Player Congelado no Mesmo Frame)
- **O Problema:** Quando várias anotações de um mesmo filme repousavam na barra, dar Hover em notas distintas causava o reprodutor nativo a exibir "O Exato Mesmo Frame (Tempo) do Vídeo da Nota Anterior". Esse bug persistia pois o navegador Chrome/Safari considera idêntico todo Media Stream (ex: `stream.mp4`), o que força o motor gráfico a reusar "o mesmo buffer de leitura" sem piscar uma piscadela de seek diferente se não houver um Hard Reload. 
- **A Solução (Fragmentos & Cache-Busting):** 
    1. A URL que alimenta a criação flutuante ganhou um token de assinatura fantasma por nota (`&c=${card.dataset.id}`). Isso convence o Chrome que o buffer é novo (Memory Isolation). 
    2. Passou-se a usar o evento estrito `loadedmetadata` com uma injeção bruta de `<video>.currentTime = X`, redefinindo a priorização do leitor. Isso superou instabilidades no uso de fragmentos na URL (`#t=`) e desdém do banco de API bruto às chaves de StartTimeTicks.

---
*Fim do Documentário de Implantação. Este documento baliza toda a espinha dorsal de modificações feitas na Barra de Controle de Revisão.*
