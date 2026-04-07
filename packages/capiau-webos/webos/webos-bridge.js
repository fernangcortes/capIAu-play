/**
 * CapIAu WebOS Bridge
 * 
 * Provides LG WebOS-specific API bridges for the CapIAu web app:
 * - Screen saver prevention during playback
 * - Magic Remote pointer handling
 * - App lifecycle (suspend/resume/relaunch)
 * - Luna service calls for device info
 */

(function() {
    'use strict';

    var keepAliveInterval = null;

    window.CapIAuWebOS = {
        /**
         * Prevent screen saver during video playback
         */
        preventScreenSaver: function() {
            if (keepAliveInterval) return;
            keepAliveInterval = setInterval(function() {
                try {
                    if (window.webOS && webOS.service) {
                        webOS.service.request('luna://com.webos.settingsservice', {
                            method: 'setSystemSettings',
                            parameters: {
                                category: 'option',
                                settings: { screenSaverOn: 'off' }
                            }
                        });
                    }
                } catch (e) {
                    // Ignore
                }
            }, 60000);
        },

        /**
         * Allow screen saver again
         */
        allowScreenSaver: function() {
            if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
            }
        },

        /**
         * Get LG device info for CapIAu Device Manager
         */
        getDeviceInfo: function(callback) {
            var info = {
                platform: 'webos',
                isTV: true,
                model: 'unknown',
                webOSVersion: 'unknown',
                sdkVersion: 'unknown'
            };

            try {
                if (window.webOS && webOS.service) {
                    // Get device model
                    webOS.service.request('luna://com.webos.service.tv.systemproperty', {
                        method: 'getSystemInfo',
                        parameters: { keys: ['modelName', 'firmwareVersion', 'sdkVersion'] },
                        onSuccess: function(result) {
                            info.model = result.modelName || 'unknown';
                            info.firmwareVersion = result.firmwareVersion || 'unknown';
                            info.sdkVersion = result.sdkVersion || 'unknown';
                            if (callback) callback(info);
                        },
                        onFailure: function() {
                            if (callback) callback(info);
                        }
                    });
                } else {
                    if (callback) callback(info);
                }
            } catch (e) {
                console.warn('[CapIAu WebOS] Could not get device info:', e);
                if (callback) callback(info);
            }

            return info;
        },

        /**
         * Handle platform back (minimizes app on LG)
         */
        platformBack: function() {
            try {
                if (window.webOS) {
                    webOS.platformBack();
                }
            } catch (e) {
                console.error('[CapIAu WebOS] Platform back failed:', e);
            }
        }
    };

    console.log('[CapIAu WebOS Bridge] Initialized');
})();
