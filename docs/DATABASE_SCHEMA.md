# CapIAu Data Architecture & Database Schema

Este mapa de dados centraliza as informações de infraestrutura em nuvem, bancos de dados e armazenamento local da aplicação. Como o CapIAu-Streaming estende as funcionaliades básicas do Jellyfin (SQLite native) integrando features exclusivas (Revisão e Ordenação Customizada), este guia ajuda futuros desenvolvedores a encontrar examente onde os estados do usuário são salvos.

---

## 1. Firebase Firestore (Painel da Produtora)

No momento, todas as anotações, comentários e links por *timestamp* feitos durante a reprodução de um material no player são salvos no Firestore, devido ao seu recurso imbatível de WebSockets (tempo real).

### Coleção Principal: `capiau_comments`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mediaId` | `String` | Referência canônica do ItemID oriunda do servidor Jellyfin `(Id)`. |
| `userId` | `String` | ID do Jellyfin correspondente ao autor do comentário. |
| `userName` | `String` | Nome do autor salvo como snapshot na hora do envio. |
| `text` | `String` | O texto do "Post-It" em si. |
| `timestamp` | `Number` | Timecode (em segundos e milissegundos) exatos da mídia no player onde a anotação repousa. |
| `createdAt` | `Timestamp` | Registro de data/hora interno do Firebase do surgimento da documentação. |
| `status` | `String` | Status de Resolução *(Planejado para o futuro: TBD, Aprovado, Feito, Requer Alteração)* |

> **Local de Inicialização:** `/src/scripts/capiau/firebaseConfig.js` (SDK v9 Modular)

---

## 2. LocalStorage Bypassing (CapIAu Organizer Engine)

A customização manual das Home Pages (Drag & Drop) contornou a limitação do database do servidor base utilizando injetores client-side. Estes dados repousam na memória persistente do Navegador.

| Chave de Armazenamento | Valor | Contexto |
|------------------------|-------|----------|
| `capiau_order_{BoxSetID}` | Array de `Strings` | Guarda a exata ordem customizada de vídeos **dentro** de uma coleção específica. Exemplo de valor: `["12abcd...", "89fed..."]`. Lida por `itemDetails` e `capiauHome.js` |
| `capiau_carousel_order` | Array de `Strings` | Define a hierarquia visual (Quem aparece primeiro, do topo para baixo) das Coleções Automáticas (`Acervo:`) construídas pela IA para a Tela Inicial (Home). |

---

## 3. RoadMap Estrutural: Integração com Supabase (Em Breve)

Para sanar a falta de persistência Cloud (caso um utilizador troque do PC para App de TV), os recursos acima serão encapsulados no ecossistema PostgreSQL (Supabase) assim que as migrações iniciais de OAuth/Google Logins (já idealizadas pelo repositório Ponto Real do desenvolvedor) entrarem em curso.

### Tabelas Virtuais Desenhadas (Postgres):

#### Tabela: `capiau_profiles`
Reflete meta-informações do usuário Jellyfin para atribuição de roles profissionais:
- `id` (UUID - Linked Auth Supabase)
- `jellyfin_id` (Identificador 100% nativo do ecossistema Emby)
- `role` (Admin, Reviewer, Producer, Client-Only)

#### Tabela: `capiau_custom_orders`
Transportaremos as chaves do Array JS para o SQL.
- `id` (PK)
- `jellyfin_user_id` (FK)
- `entity_id` (O ID da coleção que sofreu reordenação)
- `ordered_list` (Lista JSONB com os IDs na ordem correta)
- `updated_at` (Timestamptz para resolução de conflito de cache).

---
*Mantenha este documento atualizado toda vez que adicionar conectores de rede (GraphQL, REST, SDKs Cloud) novos aos scripts primários do Jellyfin Mod.*
