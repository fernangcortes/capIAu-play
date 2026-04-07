const fs = require('fs');
const path = require('path');

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.ts'];

// Ignora os modificadores de extras descritos no wiki do Jellyfin
const IGNORED_SUFFIXES = [
    '-trailer', '-featurette', '-behindthescenes', '-scene', 
    '-interview', '-deleted', '-short', '-sample'
];
const IGNORED_DIRECTORIES = [
    'trailers', 'extras', 'behind the scenes', 'interviews', 'deleted scenes'
];

function isMainVideoFile(fileName) {
    const lowerName = fileName.toLowerCase();
    const baseName = path.basename(lowerName, path.extname(lowerName));
    return !IGNORED_SUFFIXES.some(suffix => baseName.endsWith(suffix)) && 
           !lowerName.includes('sample') && 
           !lowerName.includes('mkof') &&
           !lowerName.includes('making of');
}

// Função para escapar caracteres no XML
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function generateSeriesNfo(folderPath, seriesName) {
    const nfoPath = path.join(folderPath, 'tvshow.nfo');
    if (!fs.existsSync(nfoPath)) {
        const content = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n<tvshow>\n  <title>${escapeXml(seriesName)}</title>\n</tvshow>`;
        fs.writeFileSync(nfoPath, content, 'utf8');
        console.log(`[+] tvshow.nfo criado na pasta: ${seriesName}`);
    }
}

function generateEpisodeNfo(folderPath, fileName, episodeIndex, totalEpisodes) {
    const baseName = path.basename(fileName, path.extname(fileName));
    const nfoPath = path.join(folderPath, `${baseName}.nfo`);
    
    if (!fs.existsSync(nfoPath)) {
        const content = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n<episodedetails>\n  <title>${escapeXml(baseName)}</title>\n  <season>1</season>\n  <episode>${episodeIndex}</episode>\n</episodedetails>`;
        fs.writeFileSync(nfoPath, content, 'utf8');
        console.log(`    -> Episódio ${episodeIndex} marcado: ${baseName}`);
    }
}

function scanDirectory(currentPath) {
    let files;
    try {
        files = fs.readdirSync(currentPath);
    } catch (e) {
        console.error('Falha ao ler diretório:', currentPath);
        return;
    }

    const videoFiles = [];
    const subdirectories = [];

    files.forEach(file => {
        const fullPath = path.join(currentPath, file);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (!IGNORED_DIRECTORIES.includes(file.toLowerCase())) {
                    subdirectories.push(fullPath);
                }
            } else if (VIDEO_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
                if (isMainVideoFile(file)) {
                    videoFiles.push(file);
                } else {
                    console.log(`    [Ignorado] Provável extra/trailer: ${file}`);
                }
            }
        } catch (e) {
            // ignorar symlinks quebrados etc
        }
    });

    // Se tivermos 2 ou mais videos, agimos como uma SEASONS/SERIES Box
    if (videoFiles.length > 2) {
        const folderName = path.basename(currentPath);
        console.log(`\n===========================================`);
        console.log(`[Detecção de Série/Curso]: ${folderName}`);
        console.log(`===========================================`);
        
        generateSeriesNfo(currentPath, folderName);
        
        // Vamos garantir a ordem alfabética que geralmente respeita "AULA 01", "AULA 02"
        videoFiles.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        
        videoFiles.forEach((file, index) => {
            generateEpisodeNfo(currentPath, file, index + 1, videoFiles.length);
        });
    }

    // Continua a recursão nos subdiretórios
    subdirectories.forEach(sub => scanDirectory(sub));
}

// Inicializador da Ferramenta de Linha de Comando
const targetFolder = process.argv[2];

if (!targetFolder || !fs.existsSync(targetFolder)) {
    console.error("Uso correto: node capiau-nfo-generator.js <caminho_da_pasta_downloads_torrents>");
    process.exit(1);
}

console.log(`\n🚀 [CapIAu] Iniciando Crawler Analítico em: ${targetFolder}`);
scanDirectory(targetFolder);
console.log(`\n✅ Escaneamento Completo! Volte ao Jellyfin e solicite que ele faça uma atualização rápida na biblioteca (Busca de arquivos).`);
