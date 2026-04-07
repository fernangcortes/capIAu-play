package com.capiau.streaming.tv.ui.main

import android.view.ViewGroup
import android.widget.ImageView
import androidx.leanback.widget.ImageCardView
import androidx.leanback.widget.Presenter
import coil.load
import com.capiau.streaming.tv.R
import org.jellyfin.sdk.model.api.BaseItemDto

/**
 * CardPresenter — Renderiza cards de mídia no estilo Netflix/Leanback
 * 
 * Cada card mostra:
 * - Poster principal (Primary Image do Jellyfin)
 * - Título do filme/série
 * - Ano de lançamento
 * 
 * Visual:
 * ┌──────────────┐
 * │              │
 * │   POSTER     │  ← 176x264dp (2:3 aspect ratio)
 * │              │
 * ├──────────────┤
 * │ Título       │
 * │ 2024         │
 * └──────────────┘
 */
class CardPresenter(
    private val serverUrl: String
) : Presenter() {

    companion object {
        private const val CARD_WIDTH = 176   // dp
        private const val CARD_HEIGHT = 264  // dp (2:3 ratio)
    }

    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val cardView = ImageCardView(parent.context).apply {
            isFocusable = true
            isFocusableInTouchMode = true

            // Card dimensions
            setMainImageDimensions(CARD_WIDTH, CARD_HEIGHT)
            mainImageView.scaleType = ImageView.ScaleType.CENTER_CROP

            // Card styling
            setBackgroundColor(parent.context.getColor(R.color.capiau_dark_card))
            setInfoAreaBackgroundColor(parent.context.getColor(R.color.capiau_dark_surface))
        }
        return ViewHolder(cardView)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any?) {
        val media = item as? BaseItemDto ?: return
        val cardView = viewHolder.view as ImageCardView

        cardView.titleText = media.name ?: ""
        cardView.contentText = media.productionYear?.toString() ?: ""

        // Load poster from Jellyfin server
        val imageTag = media.imageTags?.get(org.jellyfin.sdk.model.api.ImageType.PRIMARY)
        if (imageTag != null) {
            val imageUrl = "${serverUrl.trimEnd('/')}/Items/${media.id}/Images/Primary?tag=$imageTag&maxWidth=352&quality=90"
            cardView.mainImageView.load(imageUrl) {
                crossfade(true)
                placeholder(R.color.capiau_dark_card)
                error(R.color.capiau_dark_surface)
            }
        }
    }

    override fun onUnbindViewHolder(viewHolder: ViewHolder) {
        val cardView = viewHolder.view as ImageCardView
        cardView.mainImage = null
    }
}
