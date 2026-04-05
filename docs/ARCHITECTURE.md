# Arquitetura — CapIAu-Streaming

## Visão Geral

O sistema é dividido em **três camadas** que se comunicam entre si:

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Browser)                     │
│  Jellyfin-Web Fork (React/TypeScript + Legacy JS)       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Modo Cinema  │  │ Modo Produtora│  │ Admin Dashboard│  │
│  │ (Netflix UI) │  │ (Frame.io UI) │  │ (Stats/Config)│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│  ┌──────┴─────────────────┴──────────────────┴────────┐  │
│  │              Player Unificado (Video.js)           │  │
│  │  + Controles Pro + Comentários + Watermark         │  │
│  └────────────────────────┬───────────────────────────┘  │
└───────────────────────────┼──────────────────────────────┘
                            │ REST API (JSON)
┌───────────────────────────┼──────────────────────────────┐
│                   BACKEND (Jellyfin Server)              │
│  ┌────────────────────────┴───────────────────────────┐  │
│  │              Jellyfin API (.NET/C#)                │  │
│  │  + Bibliotecas + Users + Transcoding + Metadata    │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────┴───────────────────────────┐  │
│  │              FFmpeg (Transcoding Engine)            │  │
│  │  + HW Accel + Proxy Gen + HDR→SDR + Burn-in TC    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│               SERVIÇOS DE APOIO (Windows Nativo)         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Radarr   │ │ Sonarr   │ │ Prowlarr │ │ Bazarr     │  │
│  │ (Filmes) │ │ (Séries) │ │ (Index)  │ │ (Legendas) │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Jellyseerr│ │ Tdarr    │ │Jellystat │ │ Rclone     │  │
│  │(Pedidos) │ │(Transc.) │ │(Stats)   │ │(GDrive)    │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Jellyfin-Web — Estrutura do Fork

O `jellyfin-web` (v10.11.x) usa uma arquitetura mista:

### Diretórios Principais
```
src/
├── apps/
│   ├── stable/          ← APP PRINCIPAL (90% das mudanças)
│   │   ├── routes/      ← Definição de rotas (React Router)
│   │   ├── features/    ← Features organizadas por domínio
│   │   └── AppRouter.tsx
│   ├── experimental/    ← Layout MUI (referência, não modificar)
│   └── dashboard/       ← Painel admin (MUI)
├── components/          ← Componentes compartilhados
│   ├── playback/        ← ★ PLAYER DE VÍDEO (foco principal)
│   ├── mediainfo/       ← Informações de mídia
│   └── ...
├── plugins/             ← Plugins client-side
├── scripts/             ← Lógica de negócio / API calls
│   ├── playbackManager  ← Gerenciador de reprodução
│   └── ...
├── types/               ← TypeScript types
└── themes/              ← Temas visuais
```

### Stack Tecnológico do Jellyfin-Web
| Tecnologia | Uso |
|-----------|-----|
| React 18 | Componentes modernos |
| TypeScript | Tipagem estática |
| React Router | Navegação SPA |
| TanStack Query | Data fetching / cache |
| MUI (Material UI) | Componentes do experimental/dashboard |
| Webpack | Bundling |
| Jellyfin SDK (TS) | Comunicação com API do servidor |
| Legacy JS/jQuery | Componentes antigos (evitar para código novo) |

## Fluxo de Dados — Modo Produtora

```
Arquivo bruto (.R3D / ProRes)
        │
        ▼
  Watch Folder detecta novo arquivo
        │
        ├─→ FFmpeg gera Proxy (H.264 720p)
        ├─→ FFmpeg burn-in Timecode
        └─→ Whisper AI gera legendas (.srt)
        │
        ▼
  Jellyfin Library Scan
        │
        ▼
  Player Profissional carrega vídeo
        │
        ├─→ Frame-a-frame / Timecode SMPTE
        ├─→ Editor adiciona Comentários por TC
        ├─→ Diretor faz Anotações na tela
        └─→ Cliente clica em Aprovar/Rejeitar
        │
        ▼
  Webhook → Discord/Telegram notifica equipe
```

## Segurança — Camadas de Proteção

```
Camada 1: Autenticação Jellyfin (user/pass)
    │
Camada 2: Separação de Bibliotecas (Cinema vs Produtora)
    │
Camada 3: NDA obrigatório antes do play
    │
Camada 4: Marca d'água forense (user + IP + timestamp)
    │
Camada 5: Links temporários (JWT com expiração)
    │
Camada 6: Log de auditoria (quem viu, quando, quanto)
    │
Camada 7: Restrição por IP (materiais sensíveis)
```
