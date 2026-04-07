package com.capiau.streaming.tv.ui.main

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.leanback.app.BrowseSupportFragment
import androidx.leanback.widget.*
import androidx.lifecycle.lifecycleScope
import com.capiau.streaming.tv.R
import com.capiau.streaming.tv.data.CapIAuFirebaseSync
import com.capiau.streaming.tv.data.JellyfinConnection
import com.capiau.streaming.tv.ui.player.PlayerActivity
import com.capiau.streaming.tv.ui.producer.ProducerActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jellyfin.sdk.api.client.extensions.itemsApi
import org.jellyfin.sdk.api.client.extensions.userApi
import org.jellyfin.sdk.model.api.BaseItemDto
import org.jellyfin.sdk.model.api.BaseItemKind
import java.util.UUID

/**
 * HomeFragment — Tela Home do CapIAu Android TV (Leanback BrowseFragment)
 * 
 * Exibe carrosséis com as coleções da IA do Jellyfin,
 * respeitando a ordenação customizada do Firebase Sync.
 * 
 * Layout visual:
 * ┌─────────────────────────────────────────────────┐
 * │  CapIAu Streaming                    🎬 Produtora │
 * ├─────────────────────────────────────────────────┤
 * │  Acervo: Drama Brasileiro                       │
 * │  [Card1] [Card2] [Card3] [Card4] ...            │
 * │                                                 │
 * │  Visão de Mulheres no Cinema                    │
 * │  [Card1] [Card2] [Card3] ...                    │
 * │                                                 │
 * │  Obras da Década de 90                          │
 * │  [Card1] [Card2] [Card3] ...                    │
 * └─────────────────────────────────────────────────┘
 */
class HomeFragment : BrowseSupportFragment() {

    private val connection by lazy { JellyfinConnection.getInstance(requireContext()) }
    private val sync by lazy { CapIAuFirebaseSync.getInstance() }
    private val rowsAdapter = ArrayObjectAdapter(ListRowPresenter())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupUI()
        loadContent()
    }

    private fun setupUI() {
        title = "CapIAu Streaming"
        headersState = HEADERS_DISABLED // No side navigation, just rows
        isHeadersTransitionOnBackEnabled = false
        brandColor = resources.getColor(R.color.capiau_red, null)

        adapter = rowsAdapter

        // Click → play the movie
        setOnItemViewClickedListener { _, item, _, _ ->
            if (item is BaseItemDto) {
                val intent = Intent(requireContext(), PlayerActivity::class.java).apply {
                    putExtra("MEDIA_ID", item.id.toString())
                    putExtra("MEDIA_NAME", item.name)
                }
                startActivity(intent)
            }
        }

        // Long press → open Producer Mode
        setOnItemViewSelectedListener { _, item, _, _ ->
            // Update background with selected item backdrop
            if (item is BaseItemDto) {
                updateBackground(item)
            }
        }
    }

    fun loadContent() {
        lifecycleScope.launch {
            try {
                val api = connection.createApiClient() ?: return@launch
                val userId = UUID.fromString(connection.userId)

                // Fetch all BoxSet collections
                val response = withContext(Dispatchers.IO) {
                    api.itemsApi.getItems(
                        userId = userId,
                        recursive = true,
                        includeItemTypes = listOf(BaseItemKind.BOX_SET)
                    )
                }

                val allCollections = response.content.items ?: emptyList()

                // Filter CapIAu auto-collections
                val autoCollections = allCollections.filter { coll ->
                    val name = coll.name ?: ""
                    name.startsWith("Acervo: ") ||
                    name.startsWith("Visão de ") ||
                    name.startsWith("Obras da Década") ||
                    name.startsWith("Padrão") ||
                    name.startsWith("Aclamados") ||
                    name.startsWith("Série: ")
                }

                // Apply carousel custom order from Firebase Sync
                val ordered = applyCarouselOrder(autoCollections)

                // Build Leanback rows
                rowsAdapter.clear()

                // Row 0: "Painel da Produtora" button row
                addProducerRow()

                // Rows 1..N: One per collection
                ordered.take(15).forEachIndexed { index, coll ->
                    addCollectionRow(api, userId, coll, index + 1)
                }

            } catch (e: Exception) {
                Log.e("CapIAu", "Failed to load home content", e)
            }
        }
    }

    fun refreshCarousels() {
        loadContent()
    }

    private fun addProducerRow() {
        val presenterSelector = ClassPresenterSelector()
        // Add a simple action card for "Modo Produtora"
        val headerItem = HeaderItem(0, "🎬 Ferramentas")
        val actionAdapter = ArrayObjectAdapter(ActionPresenter())
        
        actionAdapter.add(ProducerAction("Painel da Produtora", "Anotações, status e sync IA"))
        actionAdapter.add(ProducerAction("Organizar Coleções", "Reordenar carrosséis e filmes"))
        
        rowsAdapter.add(ListRow(headerItem, actionAdapter))
    }

    private fun addCollectionRow(
        api: org.jellyfin.sdk.api.client.ApiClient,
        userId: UUID,
        collection: BaseItemDto,
        rowIndex: Int
    ) {
        lifecycleScope.launch {
            try {
                val items = withContext(Dispatchers.IO) {
                    api.itemsApi.getItems(
                        userId = userId,
                        parentId = collection.id,
                        limit = 25,
                        fields = listOf(
                            org.jellyfin.sdk.model.api.ItemFields.PRIMARY_IMAGE_ASPECT_RATIO
                        )
                    )
                }

                val collectionItems = items.content.items ?: emptyList()
                
                // Apply custom order from Firebase Sync
                val ordered = applyItemOrder(collection.id.toString(), collectionItems)

                val cardPresenter = CardPresenter(connection.serverUrl)
                val listRowAdapter = ArrayObjectAdapter(cardPresenter)
                ordered.forEach { listRowAdapter.add(it) }

                val header = HeaderItem(rowIndex.toLong(), collection.name ?: "Coleção")
                rowsAdapter.add(ListRow(header, listRowAdapter))

            } catch (e: Exception) {
                Log.w("CapIAu", "Failed to load collection ${collection.name}", e)
            }
        }
    }

    /**
     * Aplica a ordem customizada do Firebase para carrosséis.
     */
    private fun applyCarouselOrder(collections: List<BaseItemDto>): List<BaseItemDto> {
        val order = sync.getLocal("carousel", "carousel") ?: return collections
        if (order.isEmpty()) return collections

        val indexMap = order.withIndex().associate { (i, id) -> id to i }
        return collections.sortedBy { indexMap[it.id.toString()] ?: 99999 }
    }

    /**
     * Aplica a ordem customizada do Firebase para items dentro de uma coleção.
     */
    private fun applyItemOrder(collectionId: String, items: List<BaseItemDto>): List<BaseItemDto> {
        val order = sync.getLocal("collection", collectionId) ?: return items
        if (order.isEmpty()) return items

        val indexMap = order.withIndex().associate { (i, id) -> id to i }
        return items.sortedBy { indexMap[it.id.toString()] ?: 99999 }
    }

    private fun updateBackground(item: BaseItemDto) {
        // Background updates handled by BackgroundManager (can be added later)
    }

    /**
     * Data class for producer action cards on the home screen
     */
    data class ProducerAction(val title: String, val description: String)
}
