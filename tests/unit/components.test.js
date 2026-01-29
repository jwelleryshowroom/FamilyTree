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

    it('should handle empty name gracefully', () => {
        const person = {
            id: 'p6',
            name: '',
            gender: 'male'
        };
        const card = createCard(person);

        // Should not throw error
        expect(card).toBeTruthy();
        expect(card.querySelector('.person-avatar')).toBeTruthy();
    });

    it('should handle deceased icon positioning correctly', () => {
        const person = {
            id: 'p7',
            name: 'Deceased Person',
            gender: 'female',
            isDeceased: true
        };
        const card = createCard(person);

        const deceasedIcon = card.querySelector('.deceased-icon');
        expect(deceasedIcon).toBeTruthy();
        expect(deceasedIcon.getAttribute('title')).toBe('Deceased');
    });

    it('should handle missing gender with default styling', () => {
        const person = {
            id: 'p8',
            name: 'No Gender',
            gender: undefined
        };
        const card = createCard(person);

        // Should default to male styling (blue)
        const avatar = card.querySelector('.person-avatar');
        // Browsers convert hex to rgb(), so check for either format
        expect(avatar.style.background).toMatch(/3b82f6|rgb\(59, 130, 246\)/);
    });

    it('should render only edit button when onDelete not provided', () => {
        const person = { id: 'p9', name: 'Test', gender: 'male' };
        const actions = {
            onEdit: vi.fn()
        };

        const card = createCard(person, false, actions);

        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');

        expect(editBtn).toBeTruthy();
        expect(deleteBtn).toBeFalsy();
    });

    it('should not render delete button for focal person even with onDelete provided', () => {
        const person = { id: 'p10', name: 'Focal', gender: 'male' };
        const actions = {
            onEdit: vi.fn(),
            onDelete: vi.fn()
        };

        const card = createCard(person, true, actions); // isFocal = true

        const deleteBtn = card.querySelector('.delete-btn');
        expect(deleteBtn).toBeFalsy();
    });
});
