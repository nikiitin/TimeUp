/**
 * TimerUI.js
 * Handles the main timer interface (display, start/stop, description)
 */

import { TIMER_STATE } from '../utils/constants.js';
import { formatDuration } from '../utils/formatTime.js';
import TimerService from '../services/TimerService.js';

export class TimerUI {
    constructor(t, elements) {
        this.t = t;
        this.elements = elements;
        // Expected elements:
        // display, btnToggle, btnText, iconPlay, iconStop, description, total
        
        this._initListeners();
    }

    _initListeners() {
        if (this.elements.btnToggle) {
            this.elements.btnToggle.addEventListener('click', () => this._handleToggle());
        }
    }

    async _handleToggle() {
        const isRunning = this.elements.btnToggle.classList.contains('btn-toggle--running');
        try {
            if (isRunning) {
                const description = this.elements.description.value.trim();
                await TimerService.stopTimer(this.t, description);
            } else {
                await TimerService.startTimer(this.t);
            }
            // Trigger a refresh call (passed via callback usually, or main loop picks it up)
            // For now, we rely on the main loop in the parent to detect the state change
        } catch (error) {
            console.error('Timer operation failed:', error);
        }
    }

    update(timerData) {
        const isRunning = timerData.state === TIMER_STATE.RUNNING;
        const elapsed = TimerService.getCurrentElapsed(timerData);

        // Update Display
        this.elements.display.textContent = formatDuration(elapsed);
        this.elements.display.className = `timer-display timer-display--${isRunning ? 'running' : 'idle'}`;

        // Update Buttons
        this.elements.btnText.textContent = isRunning ? 'Stop' : 'Start';
        this.elements.btnToggle.className = `btn-toggle${isRunning ? ' btn-toggle--running' : ''}`;
        this.elements.btnToggle.title = isRunning ? 'Stop Timer' : 'Start Timer';
        
        this.elements.iconPlay.hidden = isRunning;
        this.elements.iconStop.hidden = !isRunning;
        
        // Update Description
        this.elements.description.hidden = !isRunning;
        if (isRunning && timerData.currentEntry) {
             // Avoid overwriting if user is typing (document.activeElement check could be added)
             if (document.activeElement !== this.elements.description) {
                 this.elements.description.value = timerData.currentEntry.description || '';
             }
        }
    }
}
