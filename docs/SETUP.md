# Setup — CapIAu-Streaming

> Guia completo de instalação usando **aplicações nativas Windows** (sem Docker).

## 1. Pré-requisitos

### Obrigatórios
| Software | Versão | Download | Status |
|----------|--------|----------|--------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) | ✅ v24.12.0 |
| npm | v9+ | (incluído no Node) | ✅ v11.6.2 |
| Git | v2.40+ | [git-scm.com](https://git-scm.com/) | ✅ v2.52.0 |
| Jellyfin Server | v10.11+ | [jellyfin.org/downloads](https://jellyfin.org/downloads/) | ⬜ Instalar |
| FFmpeg | v6+ | [ffmpeg.org](https://ffmpeg.org/download.html) | ⬜ Verificar |

### Opcionais (para automação)
| Software | Download | Função |
|----------|----------|--------|
| Python 3.10+ | [python.org](https://python.org/) | Scripts de IA (Whisper, thumbnails) |
| CUDA Toolkit | [developer.nvidia.com](https://developer.nvidia.com/cuda-toolkit) | GPU acceleration para Whisper |

---

## 2. Jellyfin Server (Windows)

### Instalação
1. Baixar o instalador Windows: [jellyfin.org/downloads](https://jellyfin.org/downloads/)
2. Executar o instalador — instala como **serviço Windows** (roda automaticamente)
3. Acessar: `http://localhost:8096`
4. Criar conta de admin
5. **Criar Bibliotecas separadas:**
   - `Cinema - Filmes` → pasta de filmes de entretenimento
   - `Cinema - Séries` → pasta de séries
   - `Produtora - Projetos` → pasta de projetos (dailies, cortes)

### Configuração Importante
- **Dashboard > Rede**: Anotar a porta (padrão 8096)
- **Dashboard > API Keys**: Criar uma chave API dedicada para integrações
- **Dashboard > Usuários**: Criar perfis separados para Cinema vs Produtora

---

## 3. Servarr Stack (Instalação Nativa Windows)

> Todos esses serviços possuem instaladores nativos para Windows e rodam como serviços/tray apps.

### 3.1 Prowlarr (Hub de Indexers)
- **Download**: [prowlarr.com](https://prowlarr.com/) → Windows installer
- **Porta**: `9696`
- **Setup**: Adicionar seus indexers → serão sincronizados automaticamente com Radarr/Sonarr

### 3.2 Radarr (Gerenciador de Filmes)
- **Download**: [radarr.video](https://radarr.video/) → Windows installer
- **Porta**: `7878`
- **Setup**:
  1. Settings > Media Management → Root folder = pasta de filmes do Jellyfin
  2. Settings > Download Clients → Adicionar qBittorrent
  3. Settings > General → Anotar API Key
  4. Settings > Profiles → Configurar qualidade preferida (TRaSH Guides recomendado)

### 3.3 Sonarr (Gerenciador de Séries)
- **Download**: [sonarr.tv](https://sonarr.tv/) → Windows installer
- **Porta**: `8989`
- **Setup**: Igual ao Radarr, mas para séries

### 3.4 qBittorrent (Download Client)
- **Download**: [qbittorrent.org](https://www.qbittorrent.org/)
- **Porta**: `8080` (WebUI)
- **Setup**: Habilitar WebUI em Preferences > Web UI

### 3.5 Bazarr (Legendas Automáticas)
- **Download**: [bazarr.media](https://www.bazarr.media/) → Windows
- **Porta**: `6767`
- **Setup**:
  1. Conectar a Radarr e Sonarr (API Keys)
  2. Adicionar provedores de legendas (OpenSubtitles, etc.)
  3. Definir idioma padrão: `Portuguese (Brazil)`

### 3.6 Jellyseerr (Portal de Requisições)
- **Download**: [github.com/Fallenbagel/jellyseerr](https://github.com/Fallenbagel/jellyseerr)
- **Porta**: `5055`
- **Instalação via npm** (alternativa ao Docker):
  ```bash
  git clone https://github.com/Fallenbagel/jellyseerr.git
  cd jellyseerr
  npm install
  npm run build
  npm start
  ```
- **Setup**: Conectar ao Jellyfin (SSO) + Radarr + Sonarr

### 3.7 Tdarr (Transcoding Automático)
- **Download**: [tdarr.io](https://home.tdarr.io/) → Windows package
- **Porta**: `8265`
- **Setup**: Apontar para pastas de mídia → definir regras (ex: converter tudo para H.265)

### 3.8 Jellystat (Estatísticas)
- **Download**: [github.com/CyferShepard/Jellystat](https://github.com/CyferShepard/Jellystat)
- **Porta**: `3000`
- **Requer**: PostgreSQL ou SQLite
- **Instalação**:
  ```bash
  git clone https://github.com/CyferShepard/Jellystat.git
  cd Jellystat
  npm install
  npm start
  ```

---

## 4. Frontend (Jellyfin-Web Fork)

### Setup de Desenvolvimento
```bash
cd CapIAu-Streaming

# Clonar o jellyfin-web
git clone https://github.com/jellyfin/jellyfin-web.git
cd jellyfin-web

# Instalar dependências
npm install

# Iniciar dev server
npm start
# → Abre em http://localhost:8080
# → Conectar ao Jellyfin Server em http://localhost:8096
```

### Build de Produção
```bash
cd jellyfin-web
npm run build:production

# A pasta 'dist/' contém o build final
# Copiar para: C:\Program Files\Jellyfin\Server\jellyfin-web\
```

> ⚠️ **SEMPRE** faça backup da pasta `jellyfin-web` original antes de substituir!

---

## 5. Checklist de Verificação

- [ ] Jellyfin Server acessível em `http://localhost:8096`
- [ ] Bibliotecas criadas (Cinema + Produtora)
- [ ] API Key gerada no Jellyfin
- [ ] Prowlarr com indexers configurados
- [ ] Radarr conectado a Prowlarr + qBittorrent
- [ ] Sonarr conectado a Prowlarr + qBittorrent
- [ ] Bazarr conectado a Radarr + Sonarr
- [ ] Jellyseerr conectado a Jellyfin + Radarr + Sonarr
- [ ] Tdarr monitorando pastas de mídia
- [ ] Dev server do jellyfin-web rodando em `http://localhost:8080`
- [ ] FFmpeg disponível no PATH (`ffmpeg -version`)
