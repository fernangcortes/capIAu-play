# CapIAu-Worker Backend 🤖

Bem-vindo ao coração autônomo do **CapIAu-Streaming**. Este é um micro-serviço (Worker) escrito em `Golang`, desenhado arquiteturalmente para interceptar eventos de inserção de mídia e disparar Pipelines pesados nos bastidores de forma 100% isolada e segura para a integridade do Servidor Produtor.

## ⚙️ A Arquitetura do Worker

### 1. Sistema Orientado a Eventos (Event-Driven)
O CapIAu Worker funciona majoritariamente escutando na porta **`8090`** por payloads JSON disparados ativamente pelo **Plugin Webhook do Jellyfin**.
*   **A Rota:** `POST http://localhost:8090/webhook`
*   **O Gatilho Esperado:** `ItemAdded`
Quando um novo filme, clipe ou vídeo bruto cai na biblioteca, o Jellyfin avisa o Go imediatamente.

### 2. CapIAu JobQueue (Fila de Threads de Sobrevivência)
O maior inimigo da automação de vídeo é transcodificar vídeos simultaneamente (o que causa CPU-Lock e travamentos eternos). 
Nosso código Go levanta um `Channel` nativo que armazena os Webhooks enfileirados 1-a-1. Uma gloriosa *Goroutine* dedicada (`processorWorker`) ataca a fila individualmente em ordem cronológica de chegada.

## 🚀 Fases do Pipeline

Cada vez que a fila puxa uma tarefa Nova, a magia acontece sequencialmente:

1. **🕵️ O Bouncer (Análise de FFprobe)**
   Antes de gastar energia, o sub-processo `ffprobe` mede a taxa bruta (Bitrate) do arquivo novo. Se for maior que **5.0 Mbps**, o vídeo é barrado na portaria como "Pesado demais". Se for leve, o pipeline termina aqui.
   
2. **🎬 Engine Transcoder (FFmpeg-Proxy)**
   Ao engolir um arquivo bruto "Gordo", acionamos o `ffmpeg` para compilar implacavelmente:
   - Uma cópia em Resolução `720p H.264`.
   - Um luxuoso relógio em formato de **Timecode Absoluto (PTS)** gravado a laser no rodapé do frame para navegação de revisão dos diretores.
   - Salvo ao lado da Matriz Crua com o sufixo `- 720p Proxy.mp4`.

3. **🧠 Cérebro de Legendas (Whisper IA)**
   Para habilitar busca e indexação, fechamos extraindo um arquivo ultra-leve sem vídeo (`pcm_s16le .wav` 16Khz Mono). Em seguida:
   - Invocamos `nvidia-smi` para diagnosticar o hardware local.
   - Poupamos uso do servidor rodando o binário `whisper-cuda.exe` se você for do time NVidia verde, ou o guerreiro `whisper-cpu.exe` se formos cruzar pelo processador.
   - Ejetamos por fim a valiosa mídia `.pt.srt` de legenda embutida.

## ⚡ Como inicializar

Na raiz do projeto gigante, basta dar o mítico duplo clique no **`CapIAu-Play.bat`** (Master Launcher). Ele compilará este Worker Go silently e erguerá tanto seu Backend quanto seu Frontend Node.js isolados simultaneamente.
