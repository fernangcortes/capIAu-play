/**
 * CapIAu Tizen Bridge
 * 
 * Provides Samsung Tizen-specific API bridges for the CapIAu web app:
 * - AVPlay API for native video playback (bypasses HTML5 video limitations)
 * - Remote control key registration
 * - App lifecycle management
 * - Screen saver prevention
 */

(function() {
    'use strict';

    // Prevent screen saver while video is playing
    var screenSaverInterval = null;

    window.CapIAuTizen = {
        /**
         * Prevent screen saver from activating (call during video playback)
         */
        preventScreenSaver: function() {
            if (screenSaverInterval) return;
            screenSaverInterval = setInterval(function() {
                try {
                    if (window.webapis && webapis.avplay) {
                        // AVPlay keeps screen awake automatically
                    } else if (window.tizen && tizen.power) {
                        tizen.power.request('SCREEN', 'SCREEN_NORMAL');
                    }
                } catch (e) {
                    // Ignore
                }
            }, 60000); // Every 60 seconds
        },

        /**
         * Allow screen saver again (call when video stops)
         */
        allowScreenSaver: function() {
            if (screenSaverInterval) {
                clearInterval(screenSaverInterval);
                screenSaverInterval = null;
            }
            try {
                if (window.tizen && tizen.power) {
                    tizen.power.release('SCREEN');
                }
            } catch (e) {
                // Ignore
            }
        },

        /**
         * Get device info for CapIAu Device Manager
         */
        getDeviceInfo: function() {
            var info = {
                platform: 'tizen',
                isTV: true,
                model: 'unknown',
                firmwareVersion: 'unknown',
                tizenVersion: 'unknown'
            };

            try {
                if (window.webapis && webapis.productinfo) {
                    info.model = webapis.productinfo.getModel();
                    info.firmwareVersion = webapis.productinfo.getFirmware();
                }
                if (window.tizen && tizen.systeminfo) {
                    tizen.systeminfo.getPropertyValue('BUILD', function(buildInfo) {
                        info.tizenVersion = buildInfo.model || 'unknown';
                    });
                }
            } catch (e) {
                console.warn('[CapIAu Tizen] Could not get device info:', e);
            }

            return info;
        },

        /**
         * Exit the application properly
         */
        exit: function() {
            try {
                tizen.application.getCurrentApplication().exit();
            } catch (e) {
                console.error('[CapIAu Tizen] Exit failed:', e);
            }
        }
    };

    console.log('[CapIAu Tizen Bridge] Initialized');
})();
