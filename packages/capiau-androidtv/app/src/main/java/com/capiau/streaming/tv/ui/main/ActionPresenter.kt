package com.capiau.streaming.tv.ui.main

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.leanback.widget.Presenter
import com.capiau.streaming.tv.R

/**
 * ActionPresenter — Renderiza botões de ação na home (Modo Produtora, Organizar, etc.)
 */
class ActionPresenter : Presenter() {

    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(android.R.layout.simple_list_item_2, parent, false).apply {
                isFocusable = true
                isFocusableInTouchMode = true
                minimumWidth = 300
                minimumHeight = 100
                setBackgroundColor(parent.context.getColor(R.color.capiau_dark_card))
                setPadding(24, 16, 24, 16)
            }
        return ViewHolder(view)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any?) {
        val action = item as? HomeFragment.ProducerAction ?: return
        val view = viewHolder.view

        view.findViewById<TextView>(android.R.id.text1)?.apply {
            text = action.title
            setTextColor(view.context.getColor(R.color.capiau_text_primary))
            textSize = 16f
        }
        view.findViewById<TextView>(android.R.id.text2)?.apply {
            text = action.description
            setTextColor(view.context.getColor(R.color.capiau_text_secondary))
            textSize = 12f
        }
    }

    override fun onUnbindViewHolder(viewHolder: ViewHolder) {
        // Nothing to unbind
    }
}
