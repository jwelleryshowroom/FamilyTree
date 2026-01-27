export class AddMemberForm {
    constructor(onSubmit) {
        this.onSubmit = onSubmit;
        this.overlay = null;
        this.form = null;
        this.currentParent = null; // Used for Adding
        this.currentRelation = null; // Used for Adding
        this.editingMemberId = null; // Used for Editing
        this.photoBase64 = null;

        this.init();
    }

    init() {
        // Create DOM
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modalTitle">Add Member</h2>
                </div>
                <form id="addMemberForm">
                    <div class="form-group">
                        <label for="memberName">Full Name</label>
                        <input type="text" id="memberName" required placeholder="e.g. Rahul Kumar">
                    </div>
                    
                    <div class="form-group">
                        <label for="gender">Gender</label>
                        <select id="gender" name="gender" required>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>

                    <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                        <input type="checkbox" id="isDeceased" name="isDeceased" style="width: auto;">
                        <label for="isDeceased" style="margin: 0; cursor: pointer;">Mark as Deceased 🕊️</label>
                    </div>

                    <div class="form-group">
                        <label for="memberPhoto">Photo (Optional)</label>
                        <input type="file" id="memberPhoto" accept="image/*">
                        <div id="photoPreview" style="margin-top: 10px; width: 60px; height: 60px; border-radius: 50%; overflow: hidden; display: none; background: #333;">
                            <img src="" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
                        <button type="submit" class="btn-primary" id="submitBtn">Add Member</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.form = overlay.querySelector('#addMemberForm');
        this.titleElement = overlay.querySelector('#modalTitle');
        this.submitBtn = overlay.querySelector('#submitBtn');
        this.photoPreview = overlay.querySelector('#photoPreview');
        this.photoPreview = overlay.querySelector('#photoPreview');
        this.photoInput = overlay.querySelector('#memberPhoto');
        this.nameInput = overlay.querySelector('#memberName');
        this.genderSelect = overlay.querySelector('#gender');
        this.isDeceasedCheckbox = overlay.querySelector('#isDeceased');
        this.selectedFile = null;

        // Bind Events
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        overlay.querySelector('#cancelBtn').addEventListener('click', () => this.close());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Photo Upload Handler
        this.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.selectedFile = file; // Store the file object
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                this.photoBase64 = readerEvent.target.result;
                this.showPreview(this.photoBase64);
            };
            reader.readAsDataURL(file);
        }
    }

    showPreview(url) {
        const img = this.photoPreview.querySelector('img');
        img.src = url;
        this.photoPreview.style.display = 'block';
    }

    // Mode: Add
    open(parent, relation) {
        this.currentParent = parent;
        this.currentRelation = relation;
        this.editingMemberId = null; // Clear edit mode
        this.photoBase64 = null;
        this.selectedFile = null;

        // UI Updates
        const relationText = relation === 'spouse' ? 'Spouse' : 'Child';
        this.titleElement.textContent = `Add ${relationText} to ${parent.name}`;
        this.submitBtn.textContent = 'Add Member';

        // Reset Form
        this.form.reset();
        this.photoPreview.style.display = 'none';

        // Auto-select gender if spouse or specific child type
        if (relation === 'spouse') {
            const spouseGender = parent.gender === 'male' ? 'female' : 'male';
            this.genderSelect.value = spouseGender;
        } else if (relation === 'child-son') {
            this.genderSelect.value = 'male';
        } else if (relation === 'child-daughter') {
            this.genderSelect.value = 'female';
        }

        this.overlay.classList.add('active');
        this.nameInput.focus();
    }

    // Mode: Edit
    openEdit(member) {
        this.editingMemberId = member.id;
        this.currentParent = null;
        this.currentRelation = null;
        this.photoBase64 = member.photoUrl || null;
        this.selectedFile = null;

        // UI Updates
        this.titleElement.textContent = `Edit Member`;
        this.submitBtn.textContent = 'Save Changes';

        // Fill Data
        this.nameInput.value = member.name;
        this.genderSelect.value = member.gender;
        this.isDeceasedCheckbox.checked = !!(member.isDeceased || member.status === 'deceased');

        if (this.photoBase64) {
            this.showPreview(this.photoBase64);
        } else {
            this.photoPreview.style.display = 'none';
        }

        this.overlay.classList.add('active');
        this.nameInput.focus();
    }

    close() {
        this.overlay.classList.remove('active');
        this.currentParent = null;
        this.currentRelation = null;
        this.editingMemberId = null;
        this.selectedFile = null;
    }

    handleSubmit(e) {
        e.preventDefault();

        const name = this.nameInput.value.trim();
        const gender = this.genderSelect.value;
        const isDeceased = this.isDeceasedCheckbox.checked;

        if (!name) return;

        // Basic payload
        const payload = {
            name,
            gender,
            isDeceased,
            status: isDeceased ? 'deceased' : 'active',
            photoFile: this.selectedFile, // NEW: Pass the file
            photoUrl: this.photoBase64   // Keep base64 as fallback/preview? 
            // Actually, app.js should prioritize photoFile if present
        };

        if (this.editingMemberId) {
            // Edit Mode: Send format expected by app.js ({ id, updates })
            this.onSubmit({
                type: 'EDIT',
                id: this.editingMemberId,
                updates: payload // Pass full payload
            });
        } else {
            // Add Mode
            const newMember = {
                id: Date.now().toString(),
                ...payload,
                parents: [],
                spouses: [],
                children: [],
                location: '',
                phone: ''
            };

            this.onSubmit({
                type: 'ADD',
                newMember,
                parentId: this.currentParent.id,
                relation: this.currentRelation
            });
        }

        this.close();
    }
}

