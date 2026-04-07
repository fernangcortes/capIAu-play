// CapIAu-Streaming: Feature #7 — Auto Dark/Light Theme
// Automatically switches between dark and light themes based on OS preference
// Falls back to user's saved preference if available

import * as userSettings from './settings/userSettings';
import skinManager from './themeManager';
import { ServerConnections } from 'lib/jellyfin-apiclient';
import { pageClassOn } from 'utils/dashboard';
import Events from 'utils/events.ts';

// CapIAu: Detect OS color scheme preference
function getAutoTheme() {
    const savedTheme = userSettings.theme();

    // If user explicitly chose a theme, respect it
    if (savedTheme && savedTheme !== 'auto') {
        return savedTheme;
    }

    // Auto-detect from OS preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }

    // Default to dark
    return 'dark';
}

// Set the default theme when loading
skinManager.setTheme(getAutoTheme())
    /* this keeps the scrollbar always present in all pages, so we avoid clipping while switching between pages
       that need the scrollbar and pages that don't.
     */
    .then(() => document.body.classList.add('force-scroll'));

// CapIAu: Listen for OS theme changes in real-time
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const savedTheme = userSettings.theme();
        // Only auto-switch if user hasn't explicitly set a theme
        if (!savedTheme || savedTheme === '' || savedTheme === 'auto') {
            skinManager.setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// set the saved theme once a user authenticates
Events.on(ServerConnections, 'localusersignedin', () => {
    skinManager.setTheme(getAutoTheme());
});

pageClassOn('viewbeforeshow', 'page', function () {
    if (this.classList.contains('type-interior')) {
        skinManager.setTheme(userSettings.dashboardTheme() || getAutoTheme());
    } else {
        skinManager.setTheme(getAutoTheme());
    }
});
