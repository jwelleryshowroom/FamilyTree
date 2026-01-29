import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AddMemberForm } from '../../js/components/AddMemberForm.js';

describe('Integration: AddMemberForm Flow', () => {
    let form;
    let onSubmitMock;

    beforeEach(() => {
        document.body.innerHTML = ''; // Clean DOM
        onSubmitMock = vi.fn();
        // Initialize form
        form = new AddMemberForm(onSubmitMock);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should open the modal with correct title for "Add Son"', () => {
        const parent = { id: 'p1', name: 'Father', gender: 'male' };
        form.open(parent, 'child-son');

        const modal = document.querySelector('.modal-overlay');
        const title = document.getElementById('modalTitle');
        const genderSelect = document.getElementById('gender');

        expect(modal.classList.contains('active')).toBe(true);
        expect(title.textContent).toBe('Add Child to Father');
        expect(genderSelect.value).toBe('male');
    });

    it('should submit correct data when adding a member', () => {
        const parent = { id: 'p1', name: 'Father', gender: 'male' };
        form.open(parent, 'child-daughter');

        // Fill Form
        const nameInput = document.getElementById('memberName');
        const formEl = document.getElementById('addMemberForm');

        nameInput.value = 'New Daughter';

        // Trigger Submit
        formEl.dispatchEvent(new Event('submit'));

        expect(onSubmitMock).toHaveBeenCalledTimes(1);
        const payload = onSubmitMock.mock.calls[0][0];

        expect(payload.type).toBe('ADD');
        expect(payload.parentId).toBe('p1');
        expect(payload.newMember.name).toBe('New Daughter');
        expect(payload.newMember.gender).toBe('female'); // Auto-selected
        expect(payload.newMember.id).toBeDefined();
    });

    it('should handle file selection', () => {
        const parent = { id: 'p1', name: 'Father', gender: 'male' };
        form.open(parent, 'child-son');

        // Mock File
        const file = new File(['(⌐□_□)'], 'cool.png', { type: 'image/png' });
        const fileInput = document.getElementById('memberPhoto');

        // Simulate user selecting file
        // We need to verify that 'change' event creates the preview and stores the file
        // Since FileReader is async and hard to mock perfectly in JSDOM without more setup,
        // we mainly check if the 'file' is safely stored in the instance if we access it,
        // OR check if onSubmit receives it.

        // Manually setting 'files' on input is tricky in JSDOM (read-only).
        // We can simulate the handler call directly or use Object.defineProperty.
        Object.defineProperty(fileInput, 'files', {
            value: [file]
        });

        fireEvent(fileInput, 'change');

        // Submit
        document.getElementById('memberName').value = 'Son with Photo';
        const formEl = document.getElementById('addMemberForm');
        formEl.dispatchEvent(new Event('submit'));

        const payload = onSubmitMock.mock.calls[0][0];
        expect(payload.newMember.photoFile).toBe(file);
    });

    it('should close modal when cancel button clicked', () => {
        const parent = { id: 'p1', name: 'Father', gender: 'male' };
        form.open(parent, 'child-son');

        const modal = document.querySelector('.modal-overlay');
        expect(modal.classList.contains('active')).toBe(true);

        const cancelBtn = modal.querySelector('.btn-secondary');
        if (cancelBtn) {
            cancelBtn.click();
            expect(modal.classList.contains('active')).toBe(false);
        }
    });

    it('should reset form fields when opened', () => {
        const parent = { id: 'p1', name: 'Father', gender: 'male' };

        // Open once and fill
        form.open(parent, 'child-son');
        const nameInput = document.getElementById('memberName');
        nameInput.value = 'First Name';

        // Close (we'd need a close method or simulate)
        // Then open again
        form.open(parent, 'child-daughter');

        // Name should be reset
        expect(nameInput.value).toBe('');
    });
});

// Helper to fire events conveniently
function fireEvent(element, eventName) {
    const event = new Event(eventName, { bubbles: true });
    element.dispatchEvent(event);
}
