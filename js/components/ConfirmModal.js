export class ConfirmModal {
    constructor(onConfirm) {
        this.onConfirm = onConfirm;
        this.overlay = null;
        this.modal = null;
        this.render();
    }

    render() {
        // Create Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay'; // Re-use existing overlay style

        // Create Modal
        this.modal = document.createElement('div');
        this.modal.className = 'modal-content confirm-modal';
        this.modal.innerHTML = `
            <div style="text-align: center; font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 class="modal-title" style="text-align: center;">Confirm Action</h2>
            <p id="confirmMessage" class="confirm-message" style="text-align: center; color: #94a3b8;"></p>
            <div class="modal-actions" style="justify-content: center; gap: 1rem; margin-top: 2rem;">
                <button type="button" class="btn-secondary" id="confirmCancelBtn" style="border-radius: 9999px; padding: 0.8rem 1.5rem;">🚫 Cancel</button>
                <button type="button" class="btn-primary btn-danger" id="confirmOkBtn" style="border-radius: 9999px; padding: 0.8rem 1.5rem; display: flex; align-items: center; gap: 0.5rem;">🗑️ Delete</button>
            </div>
        `;

        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);

        // Events
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        this.modal.querySelector('#confirmCancelBtn').addEventListener('click', () => this.close());

        this.modal.querySelector('#confirmOkBtn').addEventListener('click', () => {
            if (this.onConfirm) this.onConfirm(this.data);
            this.close();
        });
    }

    open(message, data, confirmText = '🗑️ Delete') {
        this.data = data;
        this.modal.querySelector('#confirmMessage').textContent = message;

        const okBtn = this.modal.querySelector('#confirmOkBtn');
        okBtn.textContent = confirmText;
        okBtn.innerHTML = confirmText; // Allow emoji in usage if passed

        this.overlay.classList.add('active');
    }

    close() {
        this.overlay.classList.remove('active');
        this.data = null;
    }
}
