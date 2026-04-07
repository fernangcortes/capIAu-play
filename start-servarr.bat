@echo off
title CapIAu Servarr Backend

echo ==============================================
echo Inciando Radarr (Filmes) - http://localhost:7878
echo ==============================================
start /b "" "%~dp0Servarr\Radarr\Radarr\Radarr.exe"

echo ==============================================
echo Inciando Sonarr (Series) - http://localhost:8989
echo ==============================================
start /b "" "%~dp0Servarr\Sonarr\Sonarr\Sonarr.exe"

echo ==============================================
echo Inciando Prowlarr (Indexers) - http://localhost:9696
echo ==============================================
start /b "" "%~dp0Servarr\Prowlarr\Prowlarr\Prowlarr.exe"

echo ==============================================
echo Inciando Bazarr (Legendas) - http://localhost:6767
echo ==============================================
start /b "" python "%~dp0Servarr\Bazarr\bazarr.py"

echo ==============================================
echo Inciando Jellyseerr (Pedidos) - http://localhost:5055
echo ==============================================
cd "%~dp0Servarr\jellyseerr"
start /b "" npm start
cd "%~dp0"

echo.
echo Servicos em background iniciados com sucesso!
echo Voce ja pode fechar esta janela.
timeout /t 5 >nul
