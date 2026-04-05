# 🎬 CapIAu-Streaming

> Fork customizado do **Jellyfin-Web** com propósito duplo: plataforma de **entretenimento** (Netflix-like) e **ferramenta de revisão profissional** para produtoras (Frame.io-like).

## 🏗️ Arquitetura

O projeto é composto por:

1. **Jellyfin Server** — Backend de mídia (instalação nativa Windows)
2. **Jellyfin-Web Fork** — Frontend customizado com player profissional
3. **Servarr Stack** — Automação de mídia (Radarr, Sonarr, Prowlarr, Bazarr, etc.)
4. **Scripts de Automação** — FFmpeg pipelines, Whisper AI, metadata extraction

## 📁 Estrutura do Projeto

```
CapIAu-Streaming/
├── jellyfin-web/              # Fork do jellyfin-web (submodule)
│   └── src/
│       ├── apps/stable/       # App principal (foco das alterações)
│       ├── components/        # Componentes reutilizáveis
│       ├── plugins/           # Plugins client-side customizados
│       └── scripts/           # Lógica de negócio
├── scripts/                   # Scripts de automação
│   ├── proxy-generator.sh     # Geração de proxies FFmpeg
│   ├── timecode-burnin.sh     # Burn-in de timecode
│   ├── whisper-subtitles.py   # Legendas automáticas (Whisper AI)
│   └── thumbnail-generator.py # Thumbnails inteligentes
├── config/                    # Configurações dos serviços
│   ├── jellyfin/
│   ├── radarr/
│   ├── sonarr/
│   ├── prowlarr/
│   ├── bazarr/
│   ├── tdarr/
│   └── nginx/
└── docs/                      # Documentação
    ├── ARCHITECTURE.md
    ├── SETUP.md
    └── FEATURES.md
```

## 🚀 Quick Start

### Pré-requisitos
- [Node.js](https://nodejs.org/) v18+ (atual: v24.12.0)
- [Git](https://git-scm.com/) v2.50+
- [Jellyfin Server](https://jellyfin.org/downloads/) (Windows)
- [Python 3.10+](https://python.org/) (para scripts de IA)
- [FFmpeg](https://ffmpeg.org/) (para processamento de vídeo)

### Desenvolvimento do Frontend

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd CapIAu-Streaming

# 2. Entrar no fork do jellyfin-web
cd jellyfin-web

# 3. Instalar dependências
npm install

# 4. Iniciar dev server (aponta para Jellyfin local em :8096)
npm start
# → Abre em http://localhost:8080
```

### Stack Servarr (Instalação Nativa Windows)

| Serviço | Porta | Função |
|---------|-------|--------|
| Jellyfin | 8096 | Servidor de mídia |
| Radarr | 7878 | Gerenciador de filmes |
| Sonarr | 8989 | Gerenciador de séries |
| Prowlarr | 9696 | Hub de indexers |
| Bazarr | 6767 | Legendas automáticas |
| Jellyseerr | 5055 | Portal de requisições |
| Tdarr | 8265 | Transcoding automático |
| Jellystat | 3000 | Estatísticas de uso |

## 🎯 Modos de Operação

### 🍿 Modo Cinema (Entretenimento)
- Interface Netflix-like
- Auto-skip para próximo episódio
- Carrossel de preview no hover
- Legendas automáticas (Whisper AI)
- Download/organização automatizada (Servarr)

### 🎥 Modo Produtora (Profissional)
- Player com avanço frame-a-frame
- Timecode SMPTE (HH:MM:SS:FF)
- Comentários por timecode (estilo Frame.io)
- Anotações/desenho na tela
- Versionamento de cortes (V1, V2, Final)
- Marca d'água forense dinâmica
- Aprovação de cortes (Aprovado/Requer Alterações/Rejeitado)
- Links temporários com NDA

## 📄 Licença

Baseado no [Jellyfin](https://github.com/jellyfin/jellyfin-web) — GNU GPL v2.
