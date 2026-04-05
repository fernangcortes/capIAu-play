# Features — CapIAu-Streaming

> Catálogo completo de funcionalidades organizadas por categoria e modo de operação.

## Legenda de Status
- ⬜ Planejado
- 🔧 Em desenvolvimento
- ✅ Implementado
- ❌ Cancelado

---

## 🎬 Controles Avançados do Player (Modo Produtora)

| # | Feature | Status | Fase | Descrição |
|---|---------|--------|------|-----------|
| P01 | Avanço Frame-a-Frame | ⬜ | 3 | Teclas ←/→ avançam 1 frame (1/fps segundos) |
| P02 | Timecode SMPTE | ⬜ | 3 | Display `HH:MM:SS:FF` no player |
| P03 | Marcadores de Timeline | ⬜ | 3 | Pontos coloridos na barra de progresso (cenas, erros) |
| P04 | Controle de Velocidade | ⬜ | 3 | 0.5x–2x com pitch correction (Web Audio API) |
| P05 | Zoom e Pan | ⬜ | 3 | Zoom com scroll, pan com drag, reset com double-click |
| P06 | A/B Looping | ⬜ | 3 | Loop infinito entre dois pontos selecionados |
| P07 | Toggle de LUT | ⬜ | 3 | Correção de cor básica para vídeos RAW/Flat |
| P08 | Seletor de Canal de Áudio | ⬜ | 3 | Isolar trilhas (lapela vs ambiente) |
| P09 | Safe Margins | ⬜ | 3 | Overlay com linhas de corte (16:9, 9:16, 4:3) |
| P10 | Waveform Visualizer | ⬜ | 3 | Ondas de áudio em tempo real (Web Audio API) |

## 💬 Revisão e Colaboração (Modo Produtora)

| # | Feature | Status | Fase | Descrição |
|---|---------|--------|------|-----------|
| C01 | Comentários por Timecode | ⬜ | 4 | Comentários vinculados a momentos específicos |
| C02 | Annotations (Desenho na Tela) | ⬜ | 4 | Caneta/formas para marcar erros no frame |
| C03 | Empilhamento de Versões | ⬜ | 4 | Toggle V1/V2/Final no player |
| C04 | Status de Aprovação | ⬜ | 4 | Aprovado / Requer Alterações / Rejeitado |
| C05 | Exportação de Comentários | ⬜ | 4 | CSV/XML para Premiere/DaVinci |
| C06 | Menções (@user) + Webhooks | ⬜ | 4 | Notificações via Discord/Telegram |
| C07 | Dicionário de Dailies | ⬜ | 4 | Organização: Cena > Plano > Take |

## 🔒 Segurança (Modo Produtora)

| # | Feature | Status | Fase | Descrição |
|---|---------|--------|------|-----------|
| S01 | Marca d'água Forense | ⬜ | 5 | Email + IP + timestamp sobre o vídeo |
| S02 | Links Temporários | ⬜ | 5 | JWT com expiração configurável |
| S03 | Tela de NDA | ⬜ | 5 | Aceite obrigatório antes do play |
| S04 | Bloqueio de Download | ⬜ | 5 | Desabilitar download + context menu |
| S05 | Log de Auditoria | ⬜ | 5 | Registro de play/pause/seek/completion |
| S06 | Restrição por IP | ⬜ | 5 | Whitelist de IPs do escritório |
| S07 | Acesso Guest | ⬜ | 5 | Login simplificado direto na pasta do projeto |

## 🍿 Experiência Cinema (Modo Entretenimento)

| # | Feature | Status | Fase | Descrição |
|---|---------|--------|------|-----------|
| E01 | Auto-skip Próximo Ep. | ⬜ | 3 | Countdown em 90% do vídeo (estilo Netflix) |
| E02 | Botão Trailer YouTube | ⬜ | 2 | Link para trailer na página do filme |
| E03 | Botão Reportar Erro | ⬜ | 2 | Webhook para Discord/Telegram |
| E04 | Carrossel de Preview | ⬜ | 7 | Preview no hover da thumbnail |
| E05 | Abas Lançamentos | ⬜ | 7 | Seção "Lançamentos da Semana" (TMDb) |
| E06 | Pular Abertura | ⬜ | 6 | Detecção automática de intro |

## 🤖 Automação & IA

| # | Feature | Status | Fase | Descrição |
|---|---------|--------|------|-----------|
| A01 | Whisper AI Legendas | ⬜ | 6 | Legendas .srt automáticas |
| A02 | TMDb/OMDb Metadata | ⬜ | 6 | Posters e sinopses automáticas |
| A03 | Proxy Generation | ⬜ | 6 | FFmpeg H.264 720p automático |
| A04 | Timecode Burn-in | ⬜ | 6 | TC queimado na imagem (dailies) |
| A05 | Smart Thumbnails | ⬜ | 6 | Frame mais nítido como capa |
| A06 | EXIF Extraction | ⬜ | 6 | Câmera, FPS, ISO na página do item |
| A07 | Watch Folders | ⬜ | 6 | Auto-import de renders |
| A08 | HDR→SDR Mapping | ⬜ | 6 | Tone-mapping para monitores SDR |

## 🎨 Interface & UX

| # | Feature | Status | Fase | Descrição |
|---|---------|--------|------|-----------|
| U01 | Landing Page Dual | ⬜ | 2 | Escolha Produtora vs Cinema |
| U02 | Tema Dark/Light Auto | ⬜ | 2 | Respeita preferência do OS |
| U03 | Identidade por Cliente | ⬜ | 7 | Cor + logo dinâmicos por projeto |
| U04 | Botão Download Proxy | ⬜ | 7 | Baixar versão leve do bruto |
| U05 | Splash Screen | ⬜ | 7 | Vinheta pré-roll no player |
| U06 | Perfis de Bitrate | ⬜ | 7 | Labels customizados de qualidade |
| U07 | Página de Casting | ⬜ | 7 | Banco de atores local |
