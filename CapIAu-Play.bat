@echo off
title CapIAu-Play Master Launcher
color 0b
echo ========================================================
echo        INICIANDO O ECOSSISTEMA CAPIAU-PLAY
echo ========================================================
echo.

:: 1. Compila silenciosamente o Go Worker para um arquivo .exe otimizado
echo [Buscando e Compilando o Worker Autonomo (Go)...]
cd "packages\capiau-worker"
go build -o capiau-worker.exe main.go
cd ..\..

:: 2. Inicia o Worker em uma nova Janela Menor dedicada
echo [Iniciando o Servidor de Inteligencia Artificial...]
start "CapIAu Webhook Worker (Backend)" cmd /k "title CapIAu Worker Backend & cd packages\capiau-worker & capiau-worker.exe"

:: Dá 1 segundinho pra não atropelar
timeout /t 1 /nobreak >nul

:: 3. Inicia a Interface Web principal (jellyfin-web)
echo [Iniciando o Cliente Web (Terminal Node.js)...]
start "CapIAu Player (Frontend)" cmd /k "title CapIAu Player Frontend & cd jellyfin-web & npm start"

:: 4. Fim com Sucesso
echo.
echo === INICIALIZACAO COMPLETA! ===
echo Tudo esta rodando isoladamente nas janelas recem-abertas!
echo Feche esta tela verde ou aperte qualquer tecla para sumir com este launcher...
pause >nul
