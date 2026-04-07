# Implementação: Organização e Coleções Automáticas Baseadas em Metadados

Olá Agente! Este documento descreve as exigências para nossa próxima rodada de implementação no sistema base do **CapIAu-Streaming (Jellyfin Web / Backend)**. Por favor, leia os requisitos abaixo antes de inspecionar o código-fonte atual ou de planejar a mudança.

## Objetivo Principal
Construir uma feature ou injetar um script que organize a biblioteca ativamente ao invés de deixá-la estática. Queremos uma **separação dinâmica de filmes** virtualizada através de Pastas / Coleções construídas puramente pela manipulação inteligente de Metadados.

## Especificação das Regras de Negócio
Seja durante o escaneamento da biblioteca ou ativado via interface web/trabalho agendado, precisamos agrupar filmes obedecendo as 3 regras listadas abaixo:

### 1. Separação de Atores Frequentes
- Inspecionar a biblioteca de mídia.
- **Regra:** Se encontrarem-se **mais de 2 filmes** em que o mesmo Ator (Actor) pertença ao Metadado (Cast), o sistema deve criar (ou injetar) uma nova Coleção (Collection) com o nome do Ator.
- *Exemplo:* "Coleção: Wagner Moura" (contendo Tropa de Elite 1, Tropa de Elite 2, e Praia do Futuro).

### 2. Separação por Diretores
- Inspecionar a biblioteca de mídia sob o metadado `Director`.
- **Regra:** Semelhante aos atores, se o mesmo diretor catalogar **mais de 2 filmes** distintos na biblioteca global, o sistema deve unificar as visualizações criando uma Coleção nomeada pelo diretor.
- *Exemplo:* "Direção: Christopher Nolan".

### 3. Agrupamento por Épocas (Anos / Décadas)
- Inspecionar o campo `ProductionYear` das mídias.
- **Regra:** Separar e agrupar os filmes e séries dentro de Pastas Virtuais, Coleções ou Tags (dependendo da sua estratégia e capacidade da Api do Jellyfin) demarcando "Décadas" ou "Anos".
- *Exemplo:* Agrupar automaticamente clássicos nos rótulos de "Anos 80", "Anos 90", "Anos 2000". 

## Foco Técnico esperado do Agente:
1. Analisar se a modelagem dessas regras encaixa-se melhor na Web UI (Custom views lendo o banco) **OU** no Backend (Uso da API oficial para de fato dar Push em _Collections_ - sugerido). 
2. Como injetaremos essa verificação? Toda vez que o painel principal for aberto, ou atrelaremos ao Webhook / Scheduler script interno do Jellyfin Server? Proveja e levante prós e contras no seu Relatório Inicial (Implementation Plan).
3. Entenda e liste se podemos usar de bibliotecas do Supabase ou Javascript via `apiClient` para operar a criação e administração dos nós `Collections` ou se a própria feature "Views" nativa resolveria a renderização em pastas.
