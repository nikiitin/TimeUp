/**
 * TimePickerUI.js
 * A popover component for selecting time durations (presets + sliders)
 */

import { formatDuration, parseTimeString } from '../utils/formatTime.js';

export class TimePickerUI {
    constructor({ containerId, onSelect, onClose }) {
        this.container = document.getElementById(containerId);
        this.onSelect = onSelect;
        this.onClose = onClose;
        this.targetInput = null;
        
        this.state = {
            hours: 0,
            minutes: 0
        };

        this._render();
        this._attachListeners();
    }

    _render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="time-picker__overlay"></div>
            <div class="time-picker__content">
                <div class="time-picker__header">
                    <span class="time-picker__title">Set Duration</span>
                    <button class="time-picker__close">×</button>
                </div>
                
                <div class="time-picker__presets">
                    <button class="btn-preset" data-value="5m">5m</button>
                    <button class="btn-preset" data-value="15m">15m</button>
                    <button class="btn-preset" data-value="30m">30m</button>
                    <button class="btn-preset" data-value="1h">1h</button>
                </div>

                <div class="time-picker__sliders">
                    <div class="time-picker__row">
                        <label>Hours</label>
                        <input type="range" min="0" max="12" step="0.5" id="tp-hours-range">
                        <span class="time-picker__val" id="tp-hours-val">0h</span>
                    </div>
                    <div class="time-picker__row">
                        <label>Minutes</label>
                        <input type="range" min="0" max="59" step="5" id="tp-mins-range">
                        <span class="time-picker__val" id="tp-mins-val">0m</span>
                    </div>
                </div>

                <div class="time-picker__actions">
                    <button class="btn-primary" id="tp-apply">Apply</button>
                </div>
            </div>
        `;
    }

    _attachListeners() {
        if (!this.container) return;

        // Close
        this.container.querySelector('.time-picker__close').addEventListener('click', () => this.hide());
        this.container.querySelector('.time-picker__overlay').addEventListener('click', () => this.hide());

        // Presets
        this.container.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ms = parseTimeString(e.target.dataset.value);
                this._updateStateFromMs(ms);
                this._updateInput();
            });
        });

        // Sliders
        const hRange = this.container.querySelector('#tp-hours-range');
        const mRange = this.container.querySelector('#tp-mins-range');

        hRange.addEventListener('input', (e) => {
            this.state.hours = parseFloat(e.target.value);
            this.container.querySelector('#tp-hours-val').textContent = `${this.state.hours}h`;
            this._updateInput();
        });

        mRange.addEventListener('input', (e) => {
            this.state.minutes = parseInt(e.target.value, 10);
            this.container.querySelector('#tp-mins-val').textContent = `${this.state.minutes}m`;
            this._updateInput();
        });

        // Apply (just closes, as we update live or strictly on click)
        this.container.querySelector('#tp-apply').addEventListener('click', () => {
            if (this.onSelect) {
                const ms = (this.state.hours * 3600000) + (this.state.minutes * 60000);
                this.onSelect(ms);
            }
            this.hide();
        });
    }

    _updateStateFromMs(ms) {
        if (!ms) return;
        
        // Naive breakdown for sliders
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        this.state.hours = hours + (minutes >= 30 && minutes < 60 && hours < 12 ? 0.5 : 0); // Simplified for 0.5 step? 
        // Better: strict
        this.state.hours = hours;
        this.state.minutes = minutes;

        // Update DOM
        this.container.querySelector('#tp-hours-range').value = this.state.hours;
        this.container.querySelector('#tp-hours-val').textContent = `${this.state.hours}h`;
        
        this.container.querySelector('#tp-mins-range').value = this.state.minutes;
        this.container.querySelector('#tp-mins-val').textContent = `${this.state.minutes}m`;
    }

    _updateInput() {
        if (!this.targetInput) return;
        
        // Format for input text
        const h = this.state.hours > 0 ? `${this.state.hours}h ` : '';
        const m = `${this.state.minutes}m`;
        this.targetInput.value = (h + m).trim();
    }

    show(targetInput) {
        this.targetInput = targetInput;
        this.container.hidden = false;
        
        // Parse current value to set initial state
        const currentMs = parseTimeString(targetInput.value);
        if (currentMs) {
            this._updateStateFromMs(currentMs);
        } else {
            this._updateStateFromMs(0);
        }
    }

    hide() {
        if (this.container) this.container.hidden = true;
        if (this.onClose) this.onClose();
    }
}
