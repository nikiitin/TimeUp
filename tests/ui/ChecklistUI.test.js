import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { TIMER_STATE } from '../../src/utils/constants.js';

const mockTimerService = {
    startItemTimer: jest.fn(),
    stopItemTimer: jest.fn(),
    setItemEstimate: jest.fn(),
    getItemCurrentElapsed: jest.fn(),
};

jest.unstable_mockModule('../../src/services/TimerService.js', () => ({ default: mockTimerService }));

const { ChecklistUI } = await import('../../src/ui/ChecklistUI.js');
const { default: TimerService } = await import('../../src/services/TimerService.js');

describe('ChecklistUI', () => {
    let t;
    let container;
    let checklistUI;

    beforeEach(() => {
        t = {};
        document.body.innerHTML = '<div id="checklists"></div>';
        container = document.getElementById('checklists');
        jest.clearAllMocks();
        window.alert = jest.fn();
        
        checklistUI = new ChecklistUI(t, 'checklists', { onRefresh: jest.fn() });
    });

    test('render empty state', () => {
        checklistUI.render({}, []);
        expect(container.hidden).toBe(true);
        expect(container.innerHTML).toBe('');
    });

    test('render checklists with items', () => {
        const checklists = [{
            id: 'cl1', name: 'Checklist 1',
            checkItems: [{ id: 'item1', name: 'Task 1' }]
        }];
        const timerData = { checklistItems: {} };

        checklistUI.render(timerData, checklists);

        expect(container.hidden).toBe(false);
        expect(container.innerHTML).toContain('Checklist 1');
        expect(container.innerHTML).toContain('Task 1');
        expect(container.querySelector('.btn-item-toggle')).toBeTruthy();
    });

    test('render running state', () => {
        const checklists = [{
            id: 'cl1', name: 'CL',
            checkItems: [{ id: 'item1', name: 'Item' }]
        }];
        const timerData = { 
            checklistItems: { 
                'item1': { state: TIMER_STATE.RUNNING, entries: [] }
            }
        };

        checklistUI.render(timerData, checklists);

        const btn = container.querySelector('.btn-item-toggle');
        expect(btn.classList).toContain('btn-item-toggle--running');
    });

    test('handle toggle click', async () => {
        const checklists = [{
            id: 'cl1', name: 'CL',
            checkItems: [{ id: 'item1', name: 'Item' }]
        }];
        checklistUI.render({}, checklists);
        TimerService.startItemTimer.mockResolvedValue({ success: true });

        const btn = container.querySelector('.btn-item-toggle');
        btn.click();

        expect(TimerService.startItemTimer).toHaveBeenCalledWith(t, 'item1');
    });

    test('handle estimate input enter', async () => {
        const checklists = [{
            id: 'cl1', name: 'CL',
            checkItems: [{ id: 'item1', name: 'Item' }]
        }];
        checklistUI.render({}, checklists);
        TimerService.setItemEstimate.mockResolvedValue({ success: true });

        const input = container.querySelector('.checklist-item__estimate-input');
        input.value = '1h';
        input.focus();
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(TimerService.setItemEstimate).toHaveBeenCalledWith(t, 'item1', 3600000);
    });
});
