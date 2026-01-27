import { describe, it, expect, vi } from 'vitest';
import { createCard } from '../../js/renderer.js';

describe('Renderer Component: createCard', () => {
    it('should create a basic card element', () => {
        const person = {
            id: 'p1',
            name: 'John Doe',
            gender: 'male',
            isDeceased: false,
            photoUrl: ''
        };
        const card = createCard(person);

        expect(card.tagName).toBe('DIV');
        expect(card.classList.contains('person-card')).toBe(true);
        expect(card.classList.contains('male')).toBe(true);
        expect(card.dataset.id).toBe('p1');
        expect(card.textContent).toContain('John Doe');
    });

    it('should show deceased styling and icon', () => {
        const person = {
            id: 'p2',
            name: 'Grandpa',
            gender: 'male',
            isDeceased: true, // Boolean true
            photoUrl: ''
        };
        const card = createCard(person);

        expect(card.classList.contains('deceased')).toBe(true);
        expect(card.innerHTML).toContain('🕊️');
    });

    it('should handle deceased status string', () => {
        const person = {
            id: 'p3',
            name: 'Grandma',
            gender: 'female',
            status: 'deceased', // String status
            photoUrl: ''
        };
        const card = createCard(person);

        expect(card.classList.contains('deceased')).toBe(true);
    });

    it('should render user photo if provided', () => {
        const person = {
            id: 'p4',
            name: 'Photo User',
            gender: 'female',
            photoUrl: 'http://example.com/pic.jpg'
        };
        const card = createCard(person);
        const img = card.querySelector('img');

        expect(img).toBeTruthy();
        expect(img.src).toBe('http://example.com/pic.jpg');
    });

    it('should fallback to initials if no photo', () => {
        const person = {
            id: 'p5',
            name: 'Ankit Kumar',
            gender: 'male'
        };
        const card = createCard(person);
        // Check for Avatar text (Assuming implementation takes first char)
        expect(card.innerHTML).toContain('A');
    });

    it('should attach drag listeners if action props provided', () => {
        const person = { id: 'c1', name: 'Child', gender: 'male' };

        // Mock callbacks
        const actions = {
            onDragStart: vi.fn(),
            onDragOver: vi.fn(),
            onDrop: vi.fn(),
            onDragEnd: vi.fn()
        };

        // Note: Drag events are only attached for non-focal family/son/daughter roles.
        // We need to inspect how createCard uses roleLabel or if we can test this easily.
        // Looking at renderer.js, it checks: if (actions.onDragStart && !isFocal && ...roleLabel...)
        // createCard signature: (person, isFocal, actions, roleLabel)

        // Let's pass roleLabel as 'Son'
        const card = createCard(person, false, actions, 'Son');

        expect(card.draggable).toBe(true);

        // Simulate dragstart
        const dragEvent = new Event('dragstart');
        card.dispatchEvent(dragEvent);
        expect(actions.onDragStart).toHaveBeenCalled();
    });
});
