/**
 * EstimateUI.js
 * Handles estimate input, setting manual values, and displaying project status
 */

import { formatDuration, parseTimeString, getRemainingTime } from '../utils/formatTime.js';
import TimerService from '../services/TimerService.js';
import ChecklistService from '../services/ChecklistService.js';

export class EstimateUI {
    constructor(t, elements) {
        this.t = t;
        this.elements = elements; 
        // Expected: row, input, btnSet, btnClear, display, progressBar, progressFill, remaining
        
        this.cachedChecklists = [];
        this._initListeners();
    }

    _initListeners() {
        if (this.elements.btnSet) {
            this.elements.btnSet.addEventListener('click', () => this._handleSet());
        }
        if (this.elements.btnClear) {
            this.elements.btnClear.addEventListener('click', () => this._handleClear());
        }
    }

    setChecklists(checklists) {
        this.cachedChecklists = checklists || [];
    }

    async _handleSet() {
        const value = this.elements.input.value.trim();
        const ms = parseTimeString(value);
        if (ms) {
            await TimerService.setManualEstimate(this.t, ms);
            // Parent refresh triggers update
        } else if (value) {
            alert('Invalid time format. Try "2h" or "30m".');
        }
    }

    async _handleClear() {
        await TimerService.setManualEstimate(this.t, null); // Clear manual override
    }

    update(timerData) {
        // Calculate effective estimate
        const effectiveEstimate = ChecklistService.getEffectiveEstimate(timerData, this.cachedChecklists);
        const hasEstimate = effectiveEstimate && effectiveEstimate > 0;
        const hasManual = timerData.manualEstimateSet && timerData.estimatedTime > 0;

        // Visibility
        this.elements.display.hidden = !hasEstimate;
        this.elements.progressBar.hidden = !hasEstimate;
        this.elements.remaining.hidden = !hasEstimate;
        this.elements.btnClear.hidden = !hasManual;

        if (hasEstimate) {
            this.elements.display.textContent = formatDuration(effectiveEstimate, { compact: true, showSeconds: false });
            
            // Progress Logic
            const remainingInfo = getRemainingTime(timerData.entries, effectiveEstimate);
            if (remainingInfo) {
                this._renderProgress(remainingInfo);
            }
        }
    }

    _renderProgress(info) {
        const fill = this.elements.progressFill;
        const text = this.elements.remaining;

        fill.style.width = `${info.percentComplete}%`;
        
        // Reset classes
        fill.className = 'progress-bar__fill';
        text.className = 'timer-remaining';

        if (info.isOverBudget) {
            fill.classList.add('progress-bar__fill--over');
            text.classList.add('timer-remaining--over');
            text.textContent = `${formatDuration(Math.abs(info.remaining), { compact: true, showSeconds: false })} over`;
        } else if (info.percentComplete >= 80) {
            fill.classList.add('progress-bar__fill--warning');
            text.classList.add('timer-remaining--warning');
            text.textContent = `${formatDuration(info.remaining, { compact: true, showSeconds: false })} left`;
        } else {
            text.textContent = `${formatDuration(info.remaining, { compact: true, showSeconds: false })} left`;
        }
    }
}
