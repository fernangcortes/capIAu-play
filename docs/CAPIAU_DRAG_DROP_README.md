# Jellyfin Drag & Drop Organizer (CapIAu Mod)

![Jellyfin Drag and Drop](https://img.shields.io/badge/Jellyfin-10.9%2B-blue?style=for-the-badge&logo=jellyfin) ![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

Um mod (modificação) para o Jellyfin Web Client que resolve de forma criativa um dos problemas mais antigos e requisitados pela comunidade: **a organização manual da ordem de filmes dentro de BoxSets (Coleções) e Carrosséis na Home.**

Como o Jellyfin [não possui uma API nativa](https://github.com/jellyfin/jellyfin/issues) madura para reordenação manual de Coleções (ele se baseia em critérios engessados como `SortName` ou indexadores de SQLite via `DateCreated`), esta implementação adota uma **estratégia 100% front-end** baseada em `localStorage`.

---

## 🚀 Funcionalidades

1. **Ordenação de Coleções (Drag and Drop):**
   * Selecione qualquer coleção (BoxSet) da sua biblioteca.
   * Arraste e solte (Drag & Drop) os itens na ordem visual que desejar.
   * Salve localmente de forma instantânea, sem sobrecarga no servidor.

2. **Ordenação de Carrosséis na Home:**
   * Altere quais carrosséis (Coleções Automáticas) aparecem primeiro na sua tela inicial.
   * Suporte para arrastar e soltar painéis inteiros da Home.

3. **Edição Rápida ("Editar Filmes"):**
   * Ao lado de cada carrossel na lista de ordenação, há um botão de acesso rápido que carrega imediatamente os filmes contidos nele, permitindo reordenar os conteúdos internos do carrossel com apenas dois cliques.

4. **Bypass Completo do Backend (Client-Side Interception):**
   * O servidor Jellyfin pode continuar retornando os filmes na ordem arbitrária do Banco de Dados. Nosso mod intercepta o payload no frontend (durante o `getItemsHtml` e `renderCollectionItems`) e aplica a ordem salva na memória antes dos cards serem renderizados.

---

## 🧠 Como Funciona a Arquitetura (O Segredo)

O problema clássico do Jellyfin é que as Queries para obter itens de Coleção (`BoxSet`) não aceitam reordenação forçada via `SortBy`. O C# envia o BoxSet na ordem bruta (geralmente data de inserção SQLite). 

**Nossa solução (Engine CapIAu):**
1. O usuário reordena visualmente no painel lateral utilizando a API nativa de Drag & Drop do HTML5.
2. Extraímos a sequência de `Item.Id`s e salvamos no `localStorage` do navegador com a chave: `capiau_order_{collectionId}`.
3. No arquivo core do Jellyfin (`itemDetails/index.js`), injetamos o método `applyCustomOrder()`.
4. Quando o `renderCollectionItems` vai desenhar a tela, nossa função compara a resposta do servidor com o mapa salvo no `localStorage` e realiza um `Array.prototype.sort()` baseado no índice salvo.
5. Magia! A Collection renderiza na ordem exata solicitada pelo usuário, e requisições subsequentes continuam perfeitas.

---

## 🛠️ Instalação (Como implementar no seu fork Jellyfin-web)

Este mod foi implementado diretamente no código fonte do `jellyfin-web`. Para adicioná-lo ao seu projeto, você precisa integrar os seguintes arquivos:

### 1. `src/scripts/capiau/capiauDragDrop.js`
Este arquivo é o Motor Principal. Ele é responsável pelo painel DOM do "Painel da Produtora", lidando com os eventos de `dragstart`, `drop` e por salvar as variáveis locais.
* *Funções chave:* `applyCustomOrder()`, `saveCustomOrder()`, `buildDraggableList()`.

### 2. Modificação no `src/controllers/itemDetails/index.js`
Injete a importação no topo do arquivo:
```javascript
import { applyCustomOrder } from '../../scripts/capiau/capiauDragDrop';
```

Encontre a declaração `renderCollectionItems(page, item, collectionItemTypes, result.Items);` (linha ~1607) e altere para:
```javascript
// CapIAu: Apply custom drag-drop order from localStorage
const orderedItems = applyCustomOrder(item.Id, result.Items);
renderCollectionItems(page, item, collectionItemTypes, orderedItems);
```

### 3. Modificação na Home (`src/scripts/capiau/capiauHomeInjector.js`)
Para que a ordenação também reflita nos Carrosséis em telas Iniciais ("Home"), envolva os itens da Home com a nossa injeção de ordem antes de passar as propriedades pro `cardBuilder`:

```javascript
import { applyCustomOrder, getCarouselOrder } from './capiauDragDrop';

itemsContainer.getItemsHtml = function(items) {
    // Aplica a ordem local e exibe os top 20
    const ordered = applyCustomOrder(collectionId, items).slice(0, 20); 
    return cardBuilder.getCardsHtml({ items: ordered, ... });
};
```
*(Nota: Certifique-se de que a Query do `fetchData` utilize um `Limit` generoso (ex: 100), para que o interceptador tenha acesso a filmes que possam ter sido movidos do final para o início da lista).*

---

## 🛡️ Limitações Conhecidas

Por utilizar `localStorage`, a ordenação **fica restrita ao navegador/dispositivo onde a edição foi feita**.
Se você logar na sua TV LG (WebOS) ou pelo Celular, a ordem exibida será a padrão do Servidor.
*Solução Futura:* Estamos estudando formas de hospedar a chave `capiau_order_*` no banco do Supabase do ecossistema CapIAu, sincronizando as ordens entre múltiplos dispositivos e fazendo com que a injeção do front-end reordene a partir da Nuvem.

---

## 👨‍💻 Desenvolvido Por

Criado com muito ❤️ para aprimorar a usabilidade do **Projeto CapIAu Streaming**, convertendo a experiência padrão do Jellyfin em algo robusto e preparado para Produtoras e Editores profissionais!
