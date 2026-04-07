# 🎬 CapIAu-Streaming

![Jellyfin Fork](https://img.shields.io/badge/Fork-Jellyfin--Web-blue?style=for-the-badge&logo=jellyfin) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Supabase/Firebase](https://img.shields.io/badge/Firebase/Supabase-DB-orange?style=for-the-badge)

O **CapIAu-Streaming** é um fork massivamente modificado do projeto open-source **[Jellyfin-Web](https://github.com/jellyfin/jellyfin-web)**, desenvolvido com uma premissa ousada de propósito duplo: atuar como uma plataforma premium de **Entretenimento (Estilo Netflix)** e ao mesmo tempo como um **Ecossistema de Revisão Profissional para Produtoras de Vídeo (Estilo Frame.io)**.

Este repositório contém a versão customizada do Frontend, contendo todas as integrações de metadados, controle de playback em tela cheia e ferramentas analíticas e da "Produtora".

---

## 🎯 Modos de Operação

### 🍿 1. Modo Cinema (Entretenimento)
Desenvolvido para consumo na mesa ou sofá da sua sala. Tudo foi pensado para aprimorar a usabilidade padrão do Jellyfin:
* Interface polida focada em visualização moderna.
* Geração de **Auto-Coleções Injetadas** (Ex: *Acervo: Comédia*, *Obras da Década*) construídas sob metadados e injetadas de forma invisível nos carrosséis da tela inicial.
* Script de retifica das mídias (**NFO Generator**) para auto-agrupar vídeos picados em cursos/séries perfeitas simulando episódios, com um simples clique via console.

### 🎥 2. Modo Produtora (Revisão e Dailies)
Desenvolvido para diretores, editores de vídeo e coloristas:
* **Painel da Produtora:** Uma barra lateral ativável (`/experimental/home`) que fornece dados atrelados diretamente ao timestamp (Timecode) dos vídeos no player.
* Integração de anotações (Post-Its) em nuvem via **Firebase (Firestore)** e/ou **Supabase**, desenhado com resposta em tempo real.
* **Smart Mini-Player Global:** Permite o usuário assistir e pular direto para o "minuto 10 onde precisa arrumar o CGI da cena", acoplado com uma travessia contínua sem que a página perca o cache do vídeo em buffer.

---

## 🔥 Principais Funcionalidades (`Features Exclusivas CapIAu`)

### Editor de Ordem Manual (Drag & Drop) `[NOVO]`
O Jellyfin falha historicamente na reordenação manual de BoxSets e Coleções, já que se apoia somente no SQLite interno ou nome de arquivo. O **CapIAu-Organizer Engine** cria um painel front-end poderoso:
1. Reordene a sequência dos Carrosséis da Tela Inicial arrastando-os pelo mouse.
2. Reordene os filmes inseridos **DENTRO** desses carrosséis sem estressar as queries do servidor.
3. Toda manipulação é 100% interceptada antes do _render_ do React/Jellyfin usando o poderoso `localStorage` e a função de _bypassing_ atômica.

### CapIAu NFO-Generator (`capiau-nfo-generator.js`)
Trabalha integrado à pasta raiz ou downloads. Lançado via Node, escaneia seu servidor local por hierarquias de pastas desestruturadas e injeta arquivos XML de TVShows / Seasons / Episodes automaticamente em pastas compostas de "Aulas", "Clipes" e "Behind the Scenes" sem necessidade do Sonarr.

### Injetor de Home Sections Dinâmico
Comanda toda a tela inicial principal. Lê marcadores analíticos, limpa lixo visual de coleções abandonadas, reordena através das preferências do *Drag & Drop Engine* e injeta as famosas galerias verticais com limites escaláveis de fetch da API para fluidez massiva do site.

---

## 🏗️ Estrutura do Projeto & Modificações Importantes

Os maiores núcleos do Capiroto Streaming residem nos diretórios abaixo dentro do diretório `/jellyfin-web/`:

* `src/scripts/capiau/` → Nossa pasta canônica contendo:
  * `capiauDragDrop.js` (O drag and drop via localStorage)
  * `capiauHomeInjector.js` (Interceptor de carrosséis da Home)
  * `capiauSidebar.js` (A UI flutuante da Produtora)
* `src/controllers/playback/` e `src/controllers/itemDetails/` → Telas centrais do Jellyfin que sofreram _injections_ (`.slice(0, 20)`, manipulação de cache-busting do DOM, links de reprodução exata).

Você também encontrará pastas auxiliares na raiz do repo:
* `/docs/` → Arquitetura e histórico granular de Features.
* `/config/` → Stack `.yml` pré prontas conectando a Suite Servarr (Sonarr, Radarr, Prowlarr) para infraestrutura on-premises.

---

## 🚀 Como Iniciar (Quick Start)

### Pré-requisitos Básicos
- Servidor Jellyfin (Local ou Remoto, preferencialmente rodando na porta padrão `8096`).
- **Node.js** V18+ para manipulação do Frontend.

### Instalação (Ambiente Dev)

1. Clone o repositório na sua máquina
```bash
git clone https://github.com/SeuUsuario/CapIAu-Streaming.git
cd CapIAu-Streaming/jellyfin-web
```

2. Instale as dependências robustas herdadas do Jellyfin original
```bash
npm install
```

3. Gire o servidor de Desenvolvimento do Webpack apontando o proxy para seu server Jelly local.
```bash
npm start
```
A build subirá no endereço padrão: `http://localhost:8080/`.

*(Para subir arquivos NFO usando a automação: Vá até a raiz e rode `node capiau-nfo-generator.js "X:\Caminho\das\Mídias"`)*

---

## 🤝 Colaboradores & Autores

Construído pelo Time do **Projeto CapIAu**, unificando automações Node, Javascript, integrações com o SDK do Firebase Firestore, e engenharia reversa no framework legado da web-app oficial da Jellyfin.

## 📄 Licença

Por se tratar de um fork massivo e restrito, toda integração gerada no ambiente da equipe rege-se sob as origens **GNU GPL v2** do [Projeto Oficial da Jellyfin](https://github.com/jellyfin/jellyfin-web).
