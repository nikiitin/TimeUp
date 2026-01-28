/**
 * Tests for TimerService.js
 */

import { jest } from '@jest/globals';
import { createTrelloMock } from '../mocks/trelloMock.js';
import TimerService from '../../src/services/TimerService.js';
import { TIMER_STATE, STORAGE_KEYS, STORAGE_SCOPES, DEFAULTS } from '../../src/utils/constants.js';

describe('TimerService', () => {
    let mockT;

    beforeEach(() => {
        mockT = createTrelloMock();
        jest.clearAllMocks();
    });

    const setTimerData = (data) => {
        mockT._setStorage('card', STORAGE_SCOPES.CARD_SHARED, STORAGE_KEYS.TIMER_DATA, data);
    };

    const getTimerData = () => {
        return mockT._getStorage('card', STORAGE_SCOPES.CARD_SHARED, STORAGE_KEYS.TIMER_DATA);
    };

    describe('startTimer', () => {
        test('starts timer when idle', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA });

            const result = await TimerService.startTimer(mockT);

            expect(result.success).toBe(true);
            expect(result.data.state).toBe(TIMER_STATE.RUNNING);
            expect(result.data.currentEntry).not.toBeNull();
            expect(result.data.currentEntry.startTime).toBeDefined();
        });

        test('fails when timer already running', async () => {
            setTimerData({
                entries: [],
                state: TIMER_STATE.RUNNING,
                currentEntry: { startTime: Date.now(), pausedDuration: 0 },
            });

            const result = await TimerService.startTimer(mockT);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Timer already running');
        });

        test('handles save errors gracefully', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA });
            // Mock setData to fail
            mockT.set = jest.fn(async () => {
                throw new Error('Storage quota exceeded');
            });

            const result = await TimerService.startTimer(mockT);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Save failed');
        });
    });

    describe('stopTimer', () => {
        test('stops running timer and creates entry', async () => {
            const startTime = Date.now() - 60000; // 1 minute ago
            setTimerData({
                entries: [],
                state: TIMER_STATE.RUNNING,
                currentEntry: { startTime, pausedDuration: 0 },
            });

            const result = await TimerService.stopTimer(mockT, 'Test description');

            expect(result.success).toBe(true);
            expect(result.data.state).toBe(TIMER_STATE.IDLE);
            expect(result.data.currentEntry).toBeNull();
            expect(result.data.entries).toHaveLength(1);
            expect(result.entry).toBeDefined();
            expect(result.entry.id).toMatch(/^entry_/);
            expect(result.entry.duration).toBeGreaterThan(0);
        });

        test('fails when no timer is running', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA });

            const result = await TimerService.stopTimer(mockT);

            expect(result.success).toBe(false);
            expect(result.error).toBe('No active timer');
        });

        test('preserves existing entries when stopping', async () => {
            const existingEntry = { id: 'existing', duration: 1000 };
            setTimerData({
                entries: [existingEntry],
                state: TIMER_STATE.RUNNING,
                currentEntry: { startTime: Date.now() - 1000, pausedDuration: 0 },
            });

            const result = await TimerService.stopTimer(mockT);

            expect(result.success).toBe(true);
            expect(result.data.entries).toHaveLength(2);
            expect(result.data.entries[0]).toEqual(existingEntry);
        });
    });

    describe('getCurrentElapsed', () => {
        test('returns 0 when no current entry', () => {
            const timerData = { currentEntry: null };
            expect(TimerService.getCurrentElapsed(timerData)).toBe(0);
        });

        test('returns 0 for null timer data', () => {
            expect(TimerService.getCurrentElapsed(null)).toBe(0);
        });

        test('calculates elapsed time for running timer', () => {
            const startTime = Date.now() - 5000;
            const timerData = {
                state: TIMER_STATE.RUNNING,
                currentEntry: { startTime, pausedDuration: 0 },
            };

            const elapsed = TimerService.getCurrentElapsed(timerData);
            expect(elapsed).toBeGreaterThanOrEqual(5000);
            expect(elapsed).toBeLessThan(6000);
        });

        test('subtracts paused duration', () => {
            const startTime = Date.now() - 10000;
            const timerData = {
                state: TIMER_STATE.RUNNING,
                currentEntry: { startTime, pausedDuration: 5000 },
            };

            const elapsed = TimerService.getCurrentElapsed(timerData);
            expect(elapsed).toBeGreaterThanOrEqual(5000);
            expect(elapsed).toBeLessThan(6000);
        });
    });

    describe('setEstimate', () => {
        test('sets estimate successfully', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA });

            const result = await TimerService.setEstimate(mockT, 3600000);

            expect(result.success).toBe(true);
            expect(result.data.estimatedTime).toBe(3600000);
        });

        test('clears estimate when null', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA, estimatedTime: 7200000 });

            const result = await TimerService.setEstimate(mockT, null);

            expect(result.success).toBe(true);
            expect(result.data.estimatedTime).toBeNull();
        });

        test('preserves other timer data', async () => {
            const entries = [{ id: 'e1', duration: 1000 }];
            setTimerData({
                entries,
                state: TIMER_STATE.IDLE,
                currentEntry: null,
                estimatedTime: null,
            });

            const result = await TimerService.setEstimate(mockT, 5400000);

            expect(result.data.entries).toEqual(entries);
            expect(result.data.state).toBe(TIMER_STATE.IDLE);
        });
    });

    describe('deleteEntry', () => {
        test('deletes existing entry', async () => {
            const entries = [
                { id: 'entry1', duration: 1000 },
                { id: 'entry2', duration: 2000 },
            ];
            setTimerData({ ...DEFAULTS.TIMER_DATA, entries });

            const result = await TimerService.deleteEntry(mockT, 'entry1');

            expect(result.success).toBe(true);
            expect(result.data.entries).toHaveLength(1);
            expect(result.data.entries[0].id).toBe('entry2');
        });

        test('fails when entry not found', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA, entries: [{ id: 'other' }] });

            const result = await TimerService.deleteEntry(mockT, 'nonexistent');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Entry not found');
        });

        test('handles empty entries array', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA });

            const result = await TimerService.deleteEntry(mockT, 'any');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Entry not found');
        });
    });

    describe('updateEntry', () => {
        test('updates entry duration', async () => {
            const entries = [{ id: 'entry1', duration: 1000, description: 'old' }];
            setTimerData({ ...DEFAULTS.TIMER_DATA, entries });

            const result = await TimerService.updateEntry(mockT, 'entry1', { duration: 5000 });

            expect(result.success).toBe(true);
            expect(result.entry.duration).toBe(5000);
            expect(result.entry.description).toBe('old');  // Preserved
        });

        test('updates entry description', async () => {
            const entries = [{ id: 'entry1', duration: 1000, description: '' }];
            setTimerData({ ...DEFAULTS.TIMER_DATA, entries });

            const result = await TimerService.updateEntry(mockT, 'entry1', { description: 'new desc' });

            expect(result.success).toBe(true);
            expect(result.entry.description).toBe('new desc');
            expect(result.entry.duration).toBe(1000);  // Preserved
        });

        test('updates entry checklistItemId', async () => {
            const entries = [{ id: 'entry1', duration: 1000, checklistItemId: null }];
            setTimerData({ ...DEFAULTS.TIMER_DATA, entries, checklistItems: {} });

            const result = await TimerService.updateEntry(mockT, 'entry1', { checklistItemId: 'item1' });

            expect(result.success).toBe(true);
            expect(result.entry.checklistItemId).toBe('item1');
            // Also check it was added to checklistItems
            expect(result.data.checklistItems.item1.entries).toHaveLength(1);
            expect(result.data.checklistItems.item1.entries[0].id).toBe('entry1');
        });

        test('clears checklistItemId when set to null', async () => {
            const entries = [{ id: 'entry1', duration: 1000, checklistItemId: 'item1' }];
            const checklistItems = { item1: { entries: [{ id: 'entry1', duration: 1000 }], estimate: 0 } };
            setTimerData({ ...DEFAULTS.TIMER_DATA, entries, checklistItems });

            const result = await TimerService.updateEntry(mockT, 'entry1', { checklistItemId: null });

            expect(result.success).toBe(true);
            expect(result.entry.checklistItemId).toBeNull();
            // Entry removed from old checklist item
            expect(result.data.checklistItems.item1.entries).toHaveLength(0);
        });

        test('moves entry between checklist items', async () => {
            const entries = [{ id: 'entry1', duration: 1000, checklistItemId: 'item1' }];
            const checklistItems = {
                item1: { entries: [{ id: 'entry1', duration: 1000 }], estimate: 0 },
                item2: { entries: [], estimate: 0 },
            };
            setTimerData({ ...DEFAULTS.TIMER_DATA, entries, checklistItems });

            const result = await TimerService.updateEntry(mockT, 'entry1', { checklistItemId: 'item2' });

            expect(result.success).toBe(true);
            expect(result.entry.checklistItemId).toBe('item2');
            expect(result.data.checklistItems.item1.entries).toHaveLength(0);
            expect(result.data.checklistItems.item2.entries).toHaveLength(1);
        });

        test('fails when entry not found', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA, entries: [{ id: 'other' }] });

            const result = await TimerService.updateEntry(mockT, 'nonexistent', { duration: 5000 });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Entry not found');
        });
    });

    describe('startItemTimer', () => {
        test('starts item timer when idle', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA });

            const result = await TimerService.startItemTimer(mockT, 'item1');

            expect(result.success).toBe(true);
            expect(result.data.checklistItems.item1.state).toBe(TIMER_STATE.RUNNING);
        });

        test('switches when card timer is running (stops global, starts item)', async () => {
            setTimerData({
                ...DEFAULTS.TIMER_DATA,
                state: TIMER_STATE.RUNNING,
                currentEntry: { startTime: Date.now() - 5000, pausedDuration: 0 },
            });

            const result = await TimerService.startItemTimer(mockT, 'item1');

            expect(result.success).toBe(true);
            expect(result.stoppedGlobal).toBe(true);
            expect(result.data.state).toBe(TIMER_STATE.IDLE);  // Global timer stopped
            expect(result.data.checklistItems.item1.state).toBe(TIMER_STATE.RUNNING);  // Item started
            expect(result.data.entries.length).toBe(1);  // Entry created for global
        });

        test('switches when another item timer is running (stops other, starts new)', async () => {
            setTimerData({
                ...DEFAULTS.TIMER_DATA,
                checklistItems: {
                    item1: { entries: [], state: TIMER_STATE.RUNNING, currentEntry: { startTime: Date.now() - 5000, pausedDuration: 0 } },
                },
            });

            const result = await TimerService.startItemTimer(mockT, 'item2');

            expect(result.success).toBe(true);
            expect(result.stoppedItemId).toBe('item1');
            expect(result.data.checklistItems.item1.state).toBe(TIMER_STATE.IDLE);  // item1 stopped
            expect(result.data.checklistItems.item2.state).toBe(TIMER_STATE.RUNNING);  // item2 started
            expect(result.data.checklistItems.item1.entries.length).toBe(1);  // Entry created for item1
        });
    });

    describe('stopItemTimer', () => {
        test('stops item timer and creates entry', async () => {
            setTimerData({
                ...DEFAULTS.TIMER_DATA,
                checklistItems: {
                    item1: {
                        entries: [],
                        state: TIMER_STATE.RUNNING,
                        currentEntry: { startTime: Date.now() - 60000, pausedDuration: 0 },
                    },
                },
            });

            const result = await TimerService.stopItemTimer(mockT, 'item1');

            expect(result.success).toBe(true);
            expect(result.data.checklistItems.item1.state).toBe(TIMER_STATE.IDLE);
            expect(result.data.checklistItems.item1.entries).toHaveLength(1);
            expect(result.entry.duration).toBeGreaterThan(0);
        });

        test('fails when no timer running for item', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA });

            const result = await TimerService.stopItemTimer(mockT, 'item1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('No active timer for this item');
        });
    });

    describe('setItemEstimate', () => {
        test('sets estimate for item', async () => {
            setTimerData({ ...DEFAULTS.TIMER_DATA });

            const result = await TimerService.setItemEstimate(mockT, 'item1', 3600000);

            expect(result.success).toBe(true);
            expect(result.data.checklistItems.item1.estimatedTime).toBe(3600000);
        });

        test('clears estimate when null', async () => {
            setTimerData({
                ...DEFAULTS.TIMER_DATA,
                checklistItems: { item1: { estimatedTime: 5000 } },
            });

            const result = await TimerService.setItemEstimate(mockT, 'item1', null);

            expect(result.success).toBe(true);
            expect(result.data.checklistItems.item1.estimatedTime).toBeNull();
        });
    });

    describe('getItemCurrentElapsed', () => {
        test('returns 0 for no current entry', () => {
            expect(TimerService.getItemCurrentElapsed(null)).toBe(0);
            expect(TimerService.getItemCurrentElapsed({})).toBe(0);
        });

        test('calculates elapsed for running item', () => {
            const itemData = {
                state: TIMER_STATE.RUNNING,
                currentEntry: { startTime: Date.now() - 5000, pausedDuration: 0 },
            };

            const elapsed = TimerService.getItemCurrentElapsed(itemData);
            expect(elapsed).toBeGreaterThanOrEqual(5000);
            expect(elapsed).toBeLessThan(6000);
        });
    });
});
