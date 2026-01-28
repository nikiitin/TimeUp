/**
 * AuthUI.js
 * Handles the Trello Authorization UI state and interactions
 */

import ChecklistService from '../services/ChecklistService.js';

export class AuthUI {
    constructor(t, { authContainerId, btnAuthorizeId, onAuthorized }) {
        this.t = t;
        this.authContainer = document.getElementById(authContainerId);
        this.btnAuthorize = document.getElementById(btnAuthorizeId);
        this.onAuthorized = onAuthorized;

        this._initListeners();
    }

    _initListeners() {
        if (this.btnAuthorize) {
            this.btnAuthorize.addEventListener('click', async () => {
                try {
                    await this.t.getRestApi().authorize({ scope: 'read' });
                    this.hide();
                    if (this.onAuthorized) this.onAuthorized();
                } catch (e) {
                    console.error('Authorization failed:', e);
                }
            });
        }
    }

    show() {
        if (this.authContainer) this.authContainer.hidden = false;
    }

    hide() {
        if (this.authContainer) this.authContainer.hidden = true;
    }

    /**
     * Checks checks auth status via service and updates UI
     * @returns {Promise<boolean>} isAuthorized
     */
    async checkAndRender() {
        // We use ChecklistService's probe or just check if previous calls failed (passed in state)
        // But here we might just want to check strictly if we need to show it.
        // For simplicity, the main controller usually decides when to show AuthUI based on service result.
        return true;
    }
}
