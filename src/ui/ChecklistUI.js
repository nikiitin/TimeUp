/**
 * ChecklistUI.js
 * Handles rendering of checklists with embedded timer controls
 */

import { TIMER_STATE } from '../utils/constants.js';
import { formatDuration, parseTimeString } from '../utils/formatTime.js';
import TimerService from '../services/TimerService.js';

export class ChecklistUI {
    constructor(t, containerId, { onRefresh }) {
        this.t = t;
        this.container = document.getElementById(containerId);
        this.onRefresh = onRefresh;
        
        // Track rendered IDs to avoid expensive DOM trashing if possible
        // But for "Gold Standard" readability, we'll start with full re-render 
        // unless performance dictates otherwise.
    }

    // Main render loop
    render(timerData, checklists) {
        if (!checklists || checklists.length === 0) {
            this.container.hidden = true;
            this.container.innerHTML = '';
            return;
        }

        this.container.hidden = false;
        // Build HTML string for performance
        const html = checklists.map(cl => this._renderChecklist(cl, timerData)).join('');
        this.container.innerHTML = html;

        // Attach event listeners after render
        this._attachListeners();
    }

    _renderChecklist(checklist, timerData) {
        if (!checklist.checkItems || checklist.checkItems.length === 0) return '';
        
        const itemsHtml = checklist.checkItems.map(item => this._renderItem(item, timerData)).join('');
        
        if (!itemsHtml) return '';

        return `
            <div class="checklist">
                <div class="checklist__title">${this._escape(checklist.name)}</div>
                ${itemsHtml}
            </div>
        `;
    }

    _renderItem(item, timerData) {
        const itemData = timerData.checklistItems?.[item.id];
        const isRunning = itemData?.state === TIMER_STATE.RUNNING;
        const totalTime = itemData ? this._sumDurations(itemData.entries) : 0;
        
        // Progress
        const estimate = itemData?.estimatedTime || 0;
        const progress = (estimate > 0) ? Math.min(totalTime / estimate, 1) : 0;
        const isOver = (estimate > 0 && totalTime > estimate);

        const classes = ['checklist-item'];
        if (isOver) classes.push('checklist-item--over');

        const btnClass = isRunning ? 'btn-item-toggle btn-item-toggle--running' : 'btn-item-toggle';
        const icon = isRunning 
            ? '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>' // stop
            : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; // play

        return `
            <div class="${classes.join(' ')}" style="--progress: ${progress}">
                <button class="${btnClass}" data-action="toggle" data-id="${item.id}">
                    ${icon}
                </button>
                <div class="checklist-item__name ${isOver ? 'checklist-item__name--over' : ''}" title="${this._escape(item.name)}">
                   ${this._escape(item.name)}
                </div>
                <input type="text" class="checklist-item__estimate-input" 
                       value="${estimate > 0 ? formatDuration(estimate, {compact:true}) : ''}"
                       placeholder="Est"
                       data-action="estimate" data-id="${item.id}">
                <div class="checklist-item__time ${isOver ? 'checklist-item__time--over' : ''}">
                    ${formatDuration(totalTime, {compact:true})}
                </div>
            </div>
        `;
    }

    _attachListeners() {
        // Delegate events for efficiency
        this.container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
            btn.addEventListener('click', (e) => this._handleToggle(e.currentTarget.dataset.id));
        });

        this.container.querySelectorAll('[data-action="estimate"]').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur(); // Trigger logic via blur or call directly
                    this._handleEstimate(e.target.dataset.id, e.target.value);
                }
            });
            // Keep blur for when user clicks away
            input.addEventListener('blur', (e) => this._handleEstimate(e.target.dataset.id, e.target.value));
        });
    }

    async _handleToggle(itemId) {
        // We need to know current state. We could pass it, or just try stop/start logic in Service
        // Ideally we check state first.
        // For now, let's optimize by asking the Service "toggle this" if it supports it, 
        // or we need to peek at the last known data.
        // Let's rely on the service to handle the "smart" logic or use a helper.
        
        // We'll trust the button class state in DOM for this quick action to decide intent
        // (A bit simplified, but effective for UI controllers)
        const btn = this.container.querySelector(`button[data-id="${itemId}"]`);
        const isRunning = btn.classList.contains('btn-item-toggle--running');

        let result;
        if (isRunning) {
            result = await TimerService.stopItemTimer(this.t, itemId);
        } else {
            result = await TimerService.startItemTimer(this.t, itemId);
        }

        if (result.success) {
             if (this.onRefresh) this.onRefresh();
        } else {
            console.error('Checklist toggle failed', result.error);
            alert(`Failed to toggle timer: ${result.error}`);
        }
    }

    async _handleEstimate(itemId, value) {
        const ms = parseTimeString(value);
        if (ms || value === '') {
             // If empty string, we might want to clear it? Service handles null/0 usu.
             const result = await TimerService.setItemEstimate(this.t, itemId, ms || 0);
             if (result.success) {
                 if (this.onRefresh) this.onRefresh();
             } else {
                 alert(`Failed to set estimate: ${result.error}`);
             }
        }
    }

    _escape(str) {
        if (!str) return '';
        return String(str).replace(/[<>&"']/g, c => ({
          '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }
    
    _sumDurations(entries) {
        if (!entries) return 0;
        return entries.reduce((acc, entry) => acc + (entry.duration || 0), 0);
    }
}
