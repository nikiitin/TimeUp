/**
 * Tests for ReportService.js
 */

import { jest } from '@jest/globals';
import { createTrelloMock } from '../mocks/trelloMock.js';
import ReportService from '../../src/services/ReportService.js';
import { STORAGE_KEYS, STORAGE_SCOPES } from '../../src/utils/constants.js';

describe('ReportService', () => {
    describe('fetchAllCardTimers', () => {
        test('fetches timer data from all cards', async () => {
            const mockT = createTrelloMock();

            // Setup mock cards
            mockT.cards = jest.fn(async () => [
                { id: 'card-1', name: 'Task 1' },
                { id: 'card-2', name: 'Task 2' },
            ]);

            // Setup timer data for each card - mock t.get with card-specific data
            mockT.get = jest.fn(async (cardId, visibility, key) => {
                if (cardId === 'card-1' && key === STORAGE_KEYS.TIMER_DATA) {
                    return { totalTime: 1000, recentEntries: [{ id: 'e1', duration: 1000 }] };
                }
                if (cardId === 'card-2' && key === STORAGE_KEYS.TIMER_DATA) {
                    return { totalTime: 2000, recentEntries: [{ id: 'e2', duration: 2000 }] };
                }
                return null;
            });

            const result = await ReportService.fetchAllCardTimers(mockT);

            expect(result).toHaveLength(2);
            expect(result[0].cardId).toBe('card-1');
            expect(result[0].cardName).toBe('Task 1');
            expect(result[0].totalTime).toBe(1000);
            expect(result[0].recentEntries).toHaveLength(1);
        });

        test('skips cards with no totalTime', async () => {
            const mockT = createTrelloMock();
            mockT.cards = jest.fn(async () => [
                { id: 'card-1', name: 'Task 1' },
            ]);
            mockT.get = jest.fn(async () => ({ totalTime: 0, recentEntries: [] }));

            const result = await ReportService.fetchAllCardTimers(mockT);
            expect(result).toHaveLength(0);
        });

        test('handles errors gracefully', async () => {
            const mockT = createTrelloMock();
            mockT.cards = jest.fn(async () => {
                throw new Error('Network error');
            });

            const result = await ReportService.fetchAllCardTimers(mockT);
            expect(result).toEqual([]);
        });
    });

    describe('flattenEntries', () => {
        test('flattens card data into entries with card metadata', () => {
            const cardData = [
                { cardId: 'c1', cardName: 'Task 1', totalTime: 3000, recentEntries: [{ id: 'e1' }, { id: 'e2' }] },
                { cardId: 'c2', cardName: 'Task 2', totalTime: 1000, recentEntries: [{ id: 'e3' }] },
            ];

            const result = ReportService.flattenEntries(cardData);

            expect(result).toHaveLength(3);
            expect(result.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
            expect(result[0].cardId).toBe('c1');
            expect(result[0].cardName).toBe('Task 1');
        });

        test('returns empty array for empty input', () => {
            expect(ReportService.flattenEntries([])).toEqual([]);
        });
    });

    describe('filterByDateRange', () => {
        const entries = [
            { id: 'e1', startTime: new Date('2025-01-15T10:00:00').getTime() },
            { id: 'e2', startTime: new Date('2025-01-20T14:00:00').getTime() },
            { id: 'e3', startTime: new Date('2025-01-25T18:00:00').getTime() },
        ];

        test('filters entries within date range', () => {
            const result = ReportService.filterByDateRange(
                entries,
                new Date('2025-01-18'),
                new Date('2025-01-22')
            );

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('e2');
        });

        test('includes entries on boundary dates', () => {
            const result = ReportService.filterByDateRange(
                entries,
                new Date('2025-01-20'),
                new Date('2025-01-20')
            );

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('e2');
        });

        test('returns empty array when no entries match', () => {
            const result = ReportService.filterByDateRange(
                entries,
                new Date('2025-02-01'),
                new Date('2025-02-28')
            );

            expect(result).toHaveLength(0);
        });
    });

    describe('groupByDate', () => {
        test('groups entries by date', () => {
            const entries = [
                { id: 'e1', startTime: new Date('2025-01-20T10:00:00').getTime() },
                { id: 'e2', startTime: new Date('2025-01-20T14:00:00').getTime() },
                { id: 'e3', startTime: new Date('2025-01-21T09:00:00').getTime() },
            ];

            const result = ReportService.groupByDate(entries);

            expect(Object.keys(result)).toHaveLength(2);
            expect(result['2025-01-20']).toHaveLength(2);
            expect(result['2025-01-21']).toHaveLength(1);
        });

        test('sorts dates in descending order', () => {
            const entries = [
                { startTime: new Date('2025-01-15').getTime() },
                { startTime: new Date('2025-01-25').getTime() },
                { startTime: new Date('2025-01-20').getTime() },
            ];

            const result = ReportService.groupByDate(entries);
            const keys = Object.keys(result);

            expect(keys[0]).toBe('2025-01-25');
            expect(keys[2]).toBe('2025-01-15');
        });
    });

    describe('groupByCard', () => {
        test('groups card data by cardId', () => {
            const cardData = [
                { cardId: 'c1', cardName: 'Task 1', totalTime: 3000, recentEntries: [{ id: 'e1' }, { id: 'e2' }] },
                { cardId: 'c2', cardName: 'Task 2', totalTime: 5000, recentEntries: [{ id: 'e3' }] },
            ];

            const result = ReportService.groupByCard(cardData);

            expect(Object.keys(result)).toHaveLength(2);
            expect(result['c1'].totalTime).toBe(3000);
            expect(result['c1'].recentEntries).toHaveLength(2);
            expect(result['c2'].cardName).toBe('Task 2');
        });
    });

    describe('calculateTotal', () => {
        test('sums all totalTime values', () => {
            const cardData = [
                { cardId: 'c1', totalTime: 1000 },
                { cardId: 'c2', totalTime: 2000 },
                { cardId: 'c3', totalTime: 3000 },
            ];

            expect(ReportService.calculateTotal(cardData)).toBe(6000);
        });

        test('handles missing totalTime', () => {
            const cardData = [
                { cardId: 'c1', totalTime: 1000 },
                { cardId: 'c2', other: 'data' },
                { cardId: 'c3', totalTime: 2000 },
            ];

            expect(ReportService.calculateTotal(cardData)).toBe(3000);
        });

        test('returns 0 for empty array', () => {
            expect(ReportService.calculateTotal([])).toBe(0);
        });
    });

    describe('generateCSV', () => {
        test('generates CSV with headers and data', () => {
            const cardData = [
                {
                    cardId: 'c1',
                    cardName: 'Test Task',
                    totalTime: 3600000,
                    recentEntries: [{ id: 'e1' }],
                },
            ];

            const csv = ReportService.generateCSV(cardData);

            expect(csv).toContain('Card Name,Total Time,Hours,Recent Entries Count');
            expect(csv).toContain('Test Task');
            expect(csv).toContain('1.00'); // 1 hour
            expect(csv).toContain(',1'); // 1 entry count
        });

        test('escapes quotes in card names', () => {
            const cardData = [
                {
                    cardId: 'c1',
                    cardName: 'Task with "quotes"',
                    totalTime: 1000,
                    recentEntries: [],
                },
            ];

            const csv = ReportService.generateCSV(cardData);
            expect(csv).toContain('""quotes""');
        });

        test('returns only headers for empty data', () => {
            const csv = ReportService.generateCSV([]);
            expect(csv).toBe('Card Name,Total Time,Hours,Recent Entries Count');
        });
    });

    describe('Error Handling Coverage', () => {
        test('fetchAllCardTimers should handle card data fetch errors', async () => {
            const mockT = {
                cards: jest.fn().mockResolvedValue([
                    { id: 'card1', name: 'Test Card' },
                ]),
                get: jest.fn().mockRejectedValue(new Error('Card data error')),
            };

            const results = await ReportService.fetchAllCardTimers(mockT);

            // Should return empty array for failed card
            expect(results).toHaveLength(0);
            expect(mockT.get).toHaveBeenCalled();
        });

        test('fetchAllCardTimers should handle network errors', async () => {
            const mockT = {
                cards: jest.fn().mockRejectedValue(new Error('Network error')),
            };

            const results = await ReportService.fetchAllCardTimers(mockT);

            // Should return empty array on error
            expect(results).toEqual([]);
        });

        test('fetchAllCardTimers should handle partial failures', async () => {
            const mockT = {
                cards: jest.fn().mockResolvedValue([
                    { id: 'card1', name: 'Card 1' },
                    { id: 'card2', name: 'Card 2' },
                ]),
                get: jest.fn()
                    .mockResolvedValueOnce({
                        totalTime: 1000,
                        recentEntries: [{ id: 'e1', startTime: 1000, endTime: 2000 }],
                    })
                    .mockRejectedValueOnce(new Error('Card 2 failed')),
            };

            const results = await ReportService.fetchAllCardTimers(mockT);

            // Should return only successful results
            expect(results).toHaveLength(1);
            expect(results[0].cardId).toBe('card1');
        });
    });

    // Note: downloadCSV requires DOM APIs and is tested in UI integration tests
});
