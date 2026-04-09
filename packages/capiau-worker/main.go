package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// WebhookPayload representa a estrutura base que o plugin Webhook do Jellyfin envia
type WebhookPayload struct {
	NotificationType string `json:"NotificationType"`
	Timestamp        string `json:"Timestamp"`
	Name             string `json:"Name"`
	ItemType         string `json:"ItemType"`
	Title            string `json:"Title"`
	Path             string `json:"Path"`
}

var JobQueue = make(chan WebhookPayload, 100)

func main() {
	go processorWorker()

	http.HandleFunc("/webhook", webhookHandler)

	port := "8090"
	log.Printf("🚀 CapIAu Worker inicializado. Escutando por eventos na porta %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed - Apenas POST", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Falha na leitura do Payload", http.StatusInternalServerError)
		return
	}

	var payload WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("❌ Erro fazendo parse do JSON Recebido: %v", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if payload.NotificationType == "ItemAdded" && isValidVideoItemType(payload.ItemType) {
		if strings.HasSuffix(strings.ToLower(payload.Path), "proxy.mp4") {
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Printf("📥 Novo evento válido capturado. Alocando na fila para [%s] - %s", payload.ItemType, payload.Name)
		JobQueue <- payload

		w.WriteHeader(http.StatusAccepted)
		fmt.Fprint(w, `{"status": "queued"}`)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status": "ignored"}`)
}

func isValidVideoItemType(t string) bool {
	return t == "Movie" || t == "Episode" || t == "MusicVideo" || t == "Video"
}

func processorWorker() {
	for payload := range JobQueue {
		log.Printf("\n⚙️ --- INICIANDO PIPELINE AUTÔNOMO ---")
		log.Printf("Mídia Alvo: %s", payload.Name)
		log.Printf("📂 Caminho: %s", payload.Path)

		log.Printf("🕵️ Acionando Bouncer (Análise de Bitrate FFprobe)...")
		if !shouldCreateProxy(payload.Path) {
			log.Printf("⏭️ Bouncer aprovou a mídia nativa (Já é leve o suficiente <= 5 Mbps). Pulando Proxy.")
			log.Printf("--- ESPERANDO PRÓXIMO DA FILA ---\n")
			continue
		}

		log.Printf("🔥 Arquivo muito pesado detectado! Iniciando Transcode FFmpeg H.264 (Proxy)...")
		err := createProxy(payload.Path)
		if err != nil {
			log.Printf("❌ Falha na criação do Proxy: %v", err)
		} else {
			log.Printf("✅ Pipeline de Proxy Concluído para %s", payload.Name)
		}

		// --- FASE 4: Whisper IA ---
		log.Printf("\n🤖 --- INICIANDO PIPELINE DE IA (LEGENDAS) ---")
		err = processWhisperSubtitles(payload.Path)
		if err != nil {
			log.Printf("❌ Falha na IA Whisper: %v", err)
		} else {
			log.Printf("✅ Transcrição Mágica finalizada!")
		}

		log.Printf("--- ESPERANDO PRÓXIMO DA FILA ---\n")
	}
}

// shouldCreateProxy usa FFprobe para descobrir o Bitrate do arquivo e só criar proxy se for > 5Mbps
func shouldCreateProxy(path string) bool {
	cmd := exec.Command("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=bit_rate", "-of", "default=noprint_wrappers=1:nokey=1", path)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		log.Printf("⚠️ Erro no FFprobe: %v", err)
		return true // Na duvida, gera o proxy por segurança pra nao travar o browser
	}

	bitrateStr := strings.TrimSpace(out.String())
	if bitrateStr == "N/A" || bitrateStr == "" {
		// Tenta pelo 'format' case o stream video cru não informe
		cmd = exec.Command("ffprobe", "-v", "error", "-show_entries", "format=bit_rate", "-of", "default=noprint_wrappers=1:nokey=1", path)
		out.Reset()
		cmd.Stdout = &out
		_ = cmd.Run()
		bitrateStr = strings.TrimSpace(out.String())
	}

	bitrate, err := strconv.ParseFloat(bitrateStr, 64)
	if err != nil {
		log.Printf("⚠️ FFprobe não retornou taxa clara: '%s'. Forçando criação do Proxy.", bitrateStr)
		return true 
	}

	// Limite da Peneira: 5 Milhões de bits por segundo (5 Megabits)
	mbps := bitrate / 1000000.0
	log.Printf("📊 Bitrate Analisado: %.2f Mbps", mbps)

	if mbps > 5.0 {
		return true
	}
	return false
}

// createProxy manda o FFmpeg escalar pra 720p H.264 Fast Encode com Legenda Queimada Timecode (PTS)
func createProxy(originalPath string) error {
	dir := filepath.Dir(originalPath)
	ext := filepath.Ext(originalPath)
	baseName := strings.TrimSuffix(filepath.Base(originalPath), ext)
	outPath := filepath.Join(dir, baseName+" - 720p Proxy.mp4")

	log.Printf("🎬 Output será gravado em: %s", outPath)

	// Filtro de Video (VF): escala proporcionalmente pra 720p (-2 na width mantém o aspect ratio)
	// e queima na parte inferior um Ticker ABSOLUTO do video formatado em Horas:Minutos:Segundos.Milisegundos (PTS)
	vfParam := `scale=-2:720,drawtext=fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:x=(w-text_w)/2:y=h-th-20:text='%{pts\:hms}'`

	cmd := exec.Command("ffmpeg", "-y", "-i", originalPath, "-vf", vfParam, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", outPath)
	
	// Prende o Output pra gente ver as barras do FFmpeg rodando soltas no terminal Go se quiser checar
	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout

	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("ffmpeg falhou durante conversao: %w", err)
	}

	return nil
}

// processWhisperSubtitles extrai o audio e chama o executor C++ do Whisper
func processWhisperSubtitles(originalPath string) error {
	dir := filepath.Dir(originalPath)
	ext := filepath.Ext(originalPath)
	baseName := strings.TrimSuffix(filepath.Base(originalPath), ext)
	
	srtFile := filepath.Join(dir, baseName+".pt.srt")
	wavFile := filepath.Join(dir, baseName+".temp.wav")

	// Pula a lentidão da IA se a legenda já existir na pasta
	if _, err := os.Stat(srtFile); err == nil {
		log.Printf("⏭️ Legenda nativa já existe para %s. Pulando trabalho da IA.", baseName)
		return nil
	}

	log.Printf("🎵 Extraindo áudio cru da mídia (PCM 16kHz Mono) para alimentar o modelo de IA...")
	err := exec.Command("ffmpeg", "-y", "-i", originalPath, "-vn", "-c:a", "pcm_s16le", "-ar", "16000", "-ac", "1", wavFile).Run()
	if err != nil {
		return fmt.Errorf("Erro extraindo áudio via FFmpeg: %v", err)
	}
	defer os.Remove(wavFile) // Limpa o áudio WAV temporário do c HD ao final

	log.Printf("🔍 Escaneando Hardware Hospedeiro...")
	hasCUDA := checkForNvidiaGPU()

	executable := "whisper-cpu.exe"
	if hasCUDA {
		log.Printf("🚀 PLACA NVIDIA DETECTADA! Os Cuda Cores vão evaporar esse tempo de processamento!")
		executable = "whisper-cuda.exe"
	} else {
		log.Printf("🐢 Sem GPU NVidia compatível. Recuando para processamento nativo em VCPU...")
	}

	log.Printf("✍️ Dando Play no Cérebro (Gerando %s com %s)...", srtFile, executable)
	
	// Executa os binários do Whisper.cpp (você deve colá-los na pasta root ou apontar p/ PATH global)
	whisperCmd := exec.Command(executable, "-m", "models/ggml-medium.bin", "-l", "pt", "-osrt", srtFile, wavFile)
	
	// Direciona o output para visualizarmos a máquina pensando no console PowerShell
	whisperCmd.Stdout = os.Stdout
	whisperCmd.Stderr = os.Stderr

	err = whisperCmd.Run()
	if err != nil {
		log.Printf("⚠️ AVISO: Binário '%s' não encontrado ou deu erro. Você precisa jogar o executável Whisper e o modelo na pasta correta para isso funcionar no final!", executable)
		return fmt.Errorf("Motor de IA não responde: %v", err)
	}

	return nil
}

// checkForNvidiaGPU pergunta elegantemente para o driver da Nvidia se ele existe e tem acesso
func checkForNvidiaGPU() bool {
	cmd := exec.Command("nvidia-smi")
	err := cmd.Run()
	return err == nil
}
