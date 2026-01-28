/**
 * EntryListUI.js
 * Handles rendering time entries and editing logic
 */

import { formatDuration, formatTimestamp, parseTimeString } from '../utils/formatTime.js';
import TimerService from '../services/TimerService.js';

export class EntryListUI {
    constructor(t, containerId, { onRefresh, getChecklists }) {
        this.t = t;
        this.container = document.getElementById(containerId);
        this.onRefresh = onRefresh;
        this.getChecklists = getChecklists; // Function to get current checklists for dropdowns

        this.editingId = null;
        this.currentEntries = [];

        // No global listeners here, we attach per render for simplicity with the list items
    }

    render(entries) {
        this.currentEntries = entries || [];

        if (!this.currentEntries.length) {
            this.container.innerHTML = '<div class="empty-msg">No time entries yet</div>';
            return;
        }

        const sorted = [...this.currentEntries].reverse();
        const html = sorted.map(entry => {
            if (entry.id === this.editingId) {
                return this._renderEdit(entry);
            }
            return this._renderView(entry);
        }).join('');

        this.container.innerHTML = html;
        this._attachListeners();
    }

    _renderView(entry) {
        // Resolve checklist name
        const checklists = this.getChecklists ? this.getChecklists() : [];
        let itemName = null;
        // Naive lookup (optimize if needed)
        outer: for (const cl of checklists) {
            for (const item of (cl.checkItems || [])) {
                if (item.id === entry.checklistItemId) {
                    itemName = item.name;
                    break outer;
                }
            }
        }

        const labelHtml = itemName ? `<span class="entry__label">☑ ${this._escape(itemName)}</span>` : '';
        const descHtml = entry.description ? `<span class="entry__desc">${this._escape(entry.description)}</span>` : '';

        return `
            <div class="entry ${itemName ? 'entry--linked' : ''}"
                 data-id="${entry.id}" role="button" tabindex="0">
                <div class="entry__info">
                    <span class="entry__time">${formatTimestamp(entry.startTime, { showDate: true })}</span>
                    ${labelHtml}
                    ${descHtml}
                </div>
                <div class="entry__right">
                    <span class="entry__duration">${formatDuration(entry.duration, { compact: true })}</span>
                    <button class="btn-delete" data-id="${entry.id}">×</button>
                </div>
            </div>
        `;
    }

    _renderEdit(entry) {
        const checklists = this.getChecklists ? this.getChecklists() : [];
        // Flatten for select
        const options = [];
        checklists.forEach(cl => {
            (cl.checkItems || []).forEach(item => {
                options.push(`<option value="${item.id}" ${entry.checklistItemId === item.id ? 'selected' : ''}>${this._escape(item.name)}</option>`);
            });
        });

        return `
            <div class="entry entry--editing" data-id="${entry.id}">
                 <div class="entry__edit-row">
                    <span class="entry__edit-label">Duration:</span>
                    <input type="text" class="entry__edit-input" id="edit-duration-input" value="${formatDuration(entry.duration, {compact:true})}">
                 </div>
                 <div class="entry__edit-row">
                    <span class="entry__edit-label">Checklist:</span>
                    <select class="entry__edit-select" id="edit-checklist-select">
                        <option value="">— None —</option>
                        ${options.join('')}
                    </select>
                 </div>
                 <div class="entry__edit-row">
                    <span class="entry__edit-label">Desc:</span>
                    <input type="text" class="entry__edit-input" id="edit-desc-input" value="${this._escape(entry.description || '')}">
                 </div>
                 <div class="entry__edit-actions">
                    <button class="btn-cancel" id="btn-cancel-edit">Cancel</button>
                    <button class="btn-save" id="btn-save-edit">Save</button>
                </div>
            </div>
        `;
    }

    _attachListeners() {
        // Edit Mode Listeners
        if (this.editingId) {
            const saveBtn = this.container.querySelector('#btn-save-edit');
            const cancelBtn = this.container.querySelector('#btn-cancel-edit');

            if (saveBtn) saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleSave();
            });
            if (cancelBtn) cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editingId = null;
                this.render(this.currentEntries);
            });
        }

        // View Mode Listeners (Click to edit)
        this.container.querySelectorAll('.entry:not(.entry--editing)').forEach(el => {
            el.addEventListener('click', (e) => {
                // Ignore if delete button clicked
                if (e.target.classList.contains('btn-delete')) return;
                this.editingId = el.dataset.id;
                this.render(this.currentEntries);
            });
        });

        // Delete Listeners
        this.container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this entry?')) {
                    await TimerService.deleteEntry(this.t, btn.dataset.id);
                    if (this.onRefresh) this.onRefresh();
                }
            });
        });
    }

    async _handleSave() {
        const durationInput = this.container.querySelector('#edit-duration-input');
        const descInput = this.container.querySelector('#edit-desc-input');
        const select = this.container.querySelector('#edit-checklist-select');

        const ms = parseTimeString(durationInput.value);
        if (!ms) {
            alert('Invalid duration');
            return;
        }

        const updates = {
            duration: ms,
            description: descInput.value,
            checklistItemId: select.value || null
        };

        const result = await TimerService.updateEntry(this.t, this.editingId, updates);
        if (result.success) {
            this.editingId = null;
            if (this.onRefresh) this.onRefresh();
        } else {
            alert('Update failed');
        }
    }

    _escape(str) {
        if (!str) return '';
        return String(str).replace(/[<>&"']/g, c => ({
          '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }
}
