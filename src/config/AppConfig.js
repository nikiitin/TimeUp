/**
 * AppConfig.js
 * Central configuration for the application
 */

import { APP_INFO } from '../utils/constants.js';

export const AppConfig = {
    // Trello Power-Up API Key
    // This is the public identifier for the app. It is safe to expose in client-side code.
    APP_KEY: 'ae35d861d2d08a8387667b6808686ad0',
    
    // Application Name
    APP_NAME: APP_INFO.POWER_UP_NAME,

    // Feature Flags (for future use)
    FEATURES: {
        REST_API_ENABLED: true,
    }
};
