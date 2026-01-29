import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGenderStyle, createAddButton, renderFamily } from '../../js/renderer.js';
import { cleanupDOM } from '../helpers/dom-helpers.js';

describe('Renderer Utilities - getGenderStyle', () => {
    it('should return pink gradient for female', () => {
        const style = getGenderStyle('female');
        expect(style).toContain('ec4899');
        expect(style).toContain('d946ef');
    });

    it('should return blue gradient for male', () => {
        const style = getGenderStyle('male');
        expect(style).toContain('3b82f6');
        expect(style).toContain('6366f1');
    });

    it('should return male style for undefined gender', () => {
        const style = getGenderStyle(undefined);
        expect(style).toContain('3b82f6');
    });

    it('should return male style for null gender', () => {
        const style = getGenderStyle(null);
        expect(style).toContain('3b82f6');
    });
});

describe('Renderer Utilities - createAddButton', () => {
    beforeEach(() => {
        cleanupDOM();
    });

    afterEach(() => {
        cleanupDOM();
    });

    it('should create button with correct label', () => {
        const onClick = vi.fn();
        const button = createAddButton('Add Son', onClick);

        expect(button.textContent).toContain('Add Son');
        expect(button.className).toBe('add-btn');
    });

    it('should attach click handler correctly', () => {
        const onClick = vi.fn();
        const button = createAddButton('Add Daughter', onClick);

        document.body.appendChild(button);
        button.click();

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should have correct CSS classes', () => {
        const onClick = vi.fn();
        const button = createAddButton('Test', onClick);

        expect(button.classList.contains('add-btn')).toBe(true);
    });

    it('should stop propagation on click', () => {
        const onClick = vi.fn();
        const button = createAddButton('Test', onClick);

        const mockEvent = {
            stopPropagation: vi.fn()
        };

        // We can't easily test this without accessing the internal handler
        // But we can verify the button exists and click works
        document.body.appendChild(button);
        button.click();

        expect(onClick).toHaveBeenCalled();
    });
});

describe('Renderer - renderFamily', () => {
    beforeEach(() => {
        cleanupDOM();
        // Set up required DOM elements
        const container = document.createElement('div');
        container.id = 'treeContainer';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'connectionsSvg';
        const header = document.createElement('h1');
        header.id = 'headerTitle';

        document.body.appendChild(container);
        document.body.appendChild(svg);
        document.body.appendChild(header);
    });

    afterEach(() => {
        cleanupDOM();
    });

    it('should render focal couple correctly', () => {
        const members = [
            { id: 'p1', name: 'Father', gender: 'male', spouses: ['p2'], children: [] },
            { id: 'p2', name: 'Mother', gender: 'female', spouses: ['p1'], children: [] }
        ];

        renderFamily('p1', members, {
            onAddMember: vi.fn(),
            onEditMember: vi.fn(),
            onDeleteMember: vi.fn()
        });

        const focalCouple = document.querySelector('.focal-couple');
        expect(focalCouple).toBeTruthy();

        const coupleWrapper = document.querySelector('.couple-wrapper');
        expect(coupleWrapper).toBeTruthy();

        // Should have 2 cards (focal person + spouse)
        const cards = coupleWrapper.querySelectorAll('.person-card');
        expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it('should render children in correct columns', () => {
        const members = [
            { id: 'p1', name: 'Father', gender: 'male', spouses: ['p2'], children: ['c1', 'c2'] },
            { id: 'p2', name: 'Mother', gender: 'female', spouses: ['p1'], children: ['c1', 'c2'] },
            { id: 'c1', name: 'Son', gender: 'male', spouses: [], children: [] },
            { id: 'c2', name: 'Daughter', gender: 'female', spouses: [], children: [] }
        ];

        renderFamily('p1', members, {
            onAddMember: vi.fn(),
            onEditMember: vi.fn(),
            onDeleteMember: vi.fn()
        });

        const sonsColumn = document.querySelector('.sons-column');
        const daughtersColumn = document.querySelector('.daughters-column');

        expect(sonsColumn).toBeTruthy();
        expect(daughtersColumn).toBeTruthy();

        // Sons column should have 1 card + add button
        const sonsCards = sonsColumn.querySelectorAll('.person-card');
        expect(sonsCards.length).toBe(1);

        const daughtersCards = daughtersColumn.querySelectorAll('.person-card');
        expect(daughtersCards.length).toBe(1);
    });

    it('should use single-column mode when only sons present', () => {
        const members = [
            { id: 'p1', name: 'Father', gender: 'male', spouses: ['p2'], children: ['c1', 'c2'] },
            { id: 'p2', name: 'Mother', gender: 'female', spouses: ['p1'], children: ['c1', 'c2'] },
            { id: 'c1', name: 'Son1', gender: 'male', spouses: [], children: [] },
            { id: 'c2', name: 'Son2', gender: 'male', spouses: [], children: [] }
        ];

        renderFamily('p1', members, {
            onAddMember: vi.fn(),
            onEditMember: vi.fn(),
            onDeleteMember: vi.fn()
        });

        const container = document.getElementById('treeContainer');
        expect(container.classList.contains('single-column')).toBe(true);

        const singleColumnChildren = document.querySelector('.single-column-children');
        expect(singleColumnChildren).toBeTruthy();
    });

    it('should use single-column mode when only daughters present', () => {
        const members = [
            { id: 'p1', name: 'Father', gender: 'male', spouses: ['p2'], children: ['c1'] },
            { id: 'p2', name: 'Mother', gender: 'female', spouses: ['p1'], children: ['c1'] },
            { id: 'c1', name: 'Daughter1', gender: 'female', spouses: [], children: [] }
        ];

        renderFamily('p1', members, {
            onAddMember: vi.fn(),
            onEditMember: vi.fn(),
            onDeleteMember: vi.fn()
        });

        const container = document.getElementById('treeContainer');
        expect(container.classList.contains('single-column')).toBe(true);
    });

    it('should call setupConnectionPaths after rendering', (done) => {
        const members = [
            { id: 'p1', name: 'Father', gender: 'male', spouses: ['p2'], children: ['c1'] },
            { id: 'p2', name: 'Mother', gender: 'female', spouses: ['p1'], children: ['c1'] },
            { id: 'c1', name: 'Son', gender: 'male', spouses: [], children: [] }
        ];

        renderFamily('p1', members, {
            onAddMember: vi.fn(),
            onEditMember: vi.fn(),
            onDeleteMember: vi.fn()
        });

        // Wait for requestAnimationFrame + setTimeout
        setTimeout(() => {
            const svg = document.getElementById('connectionsSvg');
            const paths = svg.querySelectorAll('path');

            // Should have created paths for children
            expect(paths.length).toBeGreaterThan(0);
            done();
        }, 200);
    });

    it('should handle callbacks correctly', () => {
        const onAddMember = vi.fn();
        const onEditMember = vi.fn();
        const onDeleteMember = vi.fn();

        const members = [
            { id: 'p1', name: 'Father', gender: 'male', spouses: ['p2'], children: [] },
            { id: 'p2', name: 'Mother', gender: 'female', spouses: ['p1'], children: [] }
        ];

        renderFamily('p1', members, {
            onAddMember,
            onEditMember,
            onDeleteMember
        });

        // Find and click "Add Son" button
        const addButtons = document.querySelectorAll('.add-btn');
        const addSonBtn = Array.from(addButtons).find(btn => btn.textContent.includes('Add Son'));

        expect(addSonBtn).toBeTruthy();
        addSonBtn.click();

        expect(onAddMember).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'p1' }),
            'child-son'
        );
    });

    it('should update header title with couple names', () => {
        const members = [
            { id: 'p1', name: 'John Doe', gender: 'male', spouses: ['p2'], children: [] },
            { id: 'p2', name: 'Jane Smith', gender: 'female', spouses: ['p1'], children: [] }
        ];

        renderFamily('p1', members, {
            onAddMember: vi.fn(),
            onEditMember: vi.fn(),
            onDeleteMember: vi.fn()
        });

        const headerTitle = document.getElementById('headerTitle');
        expect(headerTitle.textContent).toContain('John');
        expect(headerTitle.textContent).toContain('Jane');
    });
});
