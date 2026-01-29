import { dbService } from './firebase/db.js';
import { storageService } from './firebase/storage.js';

export const uiRenderer = {
    _members: [],
    _memberMap: new Map(),
    _currentRootId: null,
    _history: [],
    _selectedSpouseMap: new Map(), // rootId -> selectedSpouseId
    _isEditMode: false,
    _listenersAttached: false,
    _isModalOpening: false,

    renderTree(members) {
        this._members = this.computeGenerations(members);
        this._memberMap = new Map(this._members.map(m => [m.id, m]));

        this.updateHeaderControls();

        if (!this._listenersAttached) {
            this.attachEventListeners();
            this._listenersAttached = true;
        }

        // v3.2.0 - Deep Link Persistence
        const hash = window.location.hash.substring(1);
        if (hash && this._memberMap.has(hash)) {
            this.renderView(hash);
        } else {
            let defaultRoot = this._members.find(m =>
                (m.name && m.name.toLowerCase().includes('nagendra'))
            );
            if (!defaultRoot) defaultRoot = this._members.find(m => m.generation === 0);
            if (defaultRoot) this.renderView(defaultRoot.id);
        }
    },

    toggleEditMode() {
        this._isEditMode = !this._isEditMode;
        document.body.classList.toggle('edit-mode-active', this._isEditMode);

        const btnEdit = document.getElementById('btn-edit');
        const btnSave = document.getElementById('btn-save');

        if (this._isEditMode) {
            btnEdit.textContent = 'Cancel Edit';
            btnEdit.classList.add('btn-secondary');
            btnSave.style.display = 'block';
        } else {
            btnEdit.textContent = 'Edit Tree';
            btnEdit.classList.remove('btn-secondary');
            btnSave.style.display = 'none';
        }

        this.renderView(this._currentRootId);
    },

    updateHeaderControls() {
        const btnEdit = document.getElementById('btn-edit');
        const btnSave = document.getElementById('btn-save');

        if (btnEdit) btnEdit.onclick = () => this.toggleEditMode();
        if (btnSave) btnSave.onclick = () => {
            this.toggleEditMode();
            this.showToast("Cloud sync enabled!", "success");
        };
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('exit');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    confirmCustom(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const msgEl = document.getElementById('confirm-message');
            const okBtn = document.getElementById('confirm-ok');
            const cancelBtn = document.getElementById('confirm-cancel');

            titleEl.textContent = title;
            msgEl.textContent = message;
            modal.classList.remove('hidden');

            const cleanUp = (val) => {
                modal.classList.add('hidden');
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                resolve(val);
            };

            okBtn.onclick = () => cleanUp(true);
            cancelBtn.onclick = () => cleanUp(false);
        });
    },

    renderView(rootId) {
        console.log("Rendering View for Root ID:", rootId);
        this._currentRootId = rootId;
        window.location.hash = rootId; // Update URL for persistence

        const rootMember = this._memberMap.get(rootId);
        if (!rootMember) return;

        // --- 1. Render Parents (Top) - TWO SEPARATE CARDS ---
        const rootContainer = document.getElementById('root-container');
        rootContainer.innerHTML = '';

        // Get all potential spouses
        const spouseIds = new Set();
        if (rootMember.spouseId) spouseIds.add(rootMember.spouseId);
        if (rootMember.spouses) rootMember.spouses.forEach(id => spouseIds.add(id));

        const allSpouses = Array.from(spouseIds)
            .map(id => this._memberMap.get(id))
            .filter(s => s);

        let spouse = null;
        if (allSpouses.length > 0) {
            const savedSpouseId = this._selectedSpouseMap.get(rootId);
            spouse = allSpouses.find(s => s.id === savedSpouseId) || allSpouses[0];
            this._selectedSpouseMap.set(rootId, spouse.id);
        }

        // Create wrapper for two cards
        const coupleWrapper = document.createElement('div');
        coupleWrapper.className = 'couple-wrapper';

        // Determine which is male and which is female
        let maleCard = null;
        let femaleCard = null;

        if (rootMember.gender === 'male') {
            maleCard = this.createSingleCard(rootMember, true);
            if (spouse) femaleCard = this.createSingleCard(spouse, true);
        } else {
            femaleCard = this.createSingleCard(rootMember, true);
            if (spouse) maleCard = this.createSingleCard(spouse, true);
        }

        if (maleCard) coupleWrapper.appendChild(maleCard);
        if (femaleCard) coupleWrapper.appendChild(femaleCard);

        rootContainer.appendChild(coupleWrapper);

        // v2.8.0 - Add Spouse Trigger in Edit Mode
        if (this._isEditMode) {
            const addSpouseBtn = document.createElement('div');
            addSpouseBtn.className = 'add-spouse-pod';
            addSpouseBtn.innerHTML = '<span>+</span>';
            addSpouseBtn.title = 'Add New Spouse';
            addSpouseBtn.onclick = () => {
                const name = prompt("Enter spouse name:");
                if (name) {
                    const event = new CustomEvent('add-spouse', {
                        detail: { memberId: rootId, spouseName: name }
                    });
                    document.dispatchEvent(event);
                }
            };
            coupleWrapper.appendChild(addSpouseBtn);
        }

        // Add Spouse Switcher if multiple spouses exist
        if (allSpouses.length > 1) {
            const switcher = document.createElement('div');
            switcher.className = 'spouse-switcher';
            allSpouses.forEach(s => {
                const dot = document.createElement('button');
                dot.className = `spouse-dot ${s.id === spouse.id ? 'active' : ''}`;
                dot.title = s.name;
                dot.textContent = s.name.charAt(0);
                dot.onclick = (e) => {
                    e.stopPropagation();
                    this._selectedSpouseMap.set(rootId, s.id);
                    this.renderView(rootId);
                };
                switcher.appendChild(dot);
            });
            rootContainer.appendChild(switcher);
        }

        // Update Back Button
        const navControls = document.getElementById('nav-controls');
        const btnBack = document.getElementById('btn-back');
        if (rootMember.generation === 0) {
            navControls.style.display = 'none';
            this._history = [];
        } else {
            navControls.style.display = 'block';
            btnBack.onclick = () => this.navigateUp();
        }

        // --- 2. Render Children (Split) ---
        const sonsContainer = document.getElementById('sons-container');
        const daughtersContainer = document.getElementById('daughters-container');
        sonsContainer.innerHTML = '';
        daughtersContainer.innerHTML = '';

        // Handle Branch Headers in Edit Mode
        const setupBranchHeader = (selector, title, gender) => {
            const branch = document.querySelector(selector);
            const h2 = branch.querySelector('.branch-title');

            if (this._isEditMode) {
                h2.classList.add('title-as-button');
                h2.innerHTML = `<span class="plus-icon">+</span> Add ${title.slice(0, -1)}`;
                // v3.1.1 - Pass the active spouse to ensure correct pairing
                h2.onclick = (e) => {
                    e.stopImmediatePropagation();
                    this.openCreateModal(rootId, gender, this._selectedSpouseMap.get(rootId));
                };
            } else {
                h2.classList.remove('title-as-button');
                h2.textContent = title;
                h2.onclick = null;
            }

            // v2.9.2 - Clean up old add-member-capsule if any exists from previous version
            const oldCapsule = branch.querySelector('.add-member-capsule');
            if (oldCapsule) oldCapsule.remove();
        };

        setupBranchHeader('.branch-left', 'Sons', 'male');
        setupBranchHeader('.branch-right', 'Daughters', 'female');

        const children = [];
        const allChildrenIds = new Set(rootMember.children || []);
        // Also collect children from the current active spouse
        if (spouse && spouse.children) {
            spouse.children.forEach(id => allChildrenIds.add(id));
        }

        allChildrenIds.forEach(id => {
            const child = this._memberMap.get(id);
            if (child) {
                // If there are multiple spouses, only show children of EXACT match (both parents)
                // If only one spouse, show all children of rootMember
                if (allSpouses.length > 1) {
                    if (child.parents && child.parents.includes(rootId) && child.parents.includes(spouse.id)) {
                        children.push(child);
                    }
                } else {
                    children.push(child);
                }
            }
        });

        const sortNodes = (nodes) => {
            return nodes.sort((a, b) => {
                const orderA = a.sortOrder !== undefined ? a.sortOrder : 1000;
                const orderB = b.sortOrder !== undefined ? b.sortOrder : 1000;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
        };

        const sons = sortNodes(children.filter(c => c.gender === 'male'));
        const daughters = sortNodes(children.filter(c => c.gender === 'female' || c.gender === undefined));

        sons.forEach(son => {
            let sonSpouse = son.spouseId ? this._memberMap.get(son.spouseId) : null;
            const card = this.createCoupleCard(son, sonSpouse, false);
            sonsContainer.appendChild(card);
        });

        daughters.forEach(daughter => {
            let dauSpouse = daughter.spouseId ? this._memberMap.get(daughter.spouseId) : null;
            const card = this.createCoupleCard(daughter, dauSpouse, false);
            daughtersContainer.appendChild(card);
        });

        // --- 3. Draw SVG Connectors ---
        setTimeout(() => this.drawConnectors(), 150);

        // --- 4. Setup Drag & Drop ---
        this.setupDragAndDrop();

        // Add scroll listener for sticky connectors UNLESS already added
        if (!this._scrollListenerAdded) {
            window.addEventListener('scroll', () => {
                if (this._currentRootId) {
                    requestAnimationFrame(() => this.drawConnectors());
                }
            }, { passive: true });
            this._scrollListenerAdded = true;
        }
    },

    navigateTo(memberId) {
        if (this._currentRootId === memberId) return;
        this._history.push(this._currentRootId);
        this.renderView(memberId);
    },

    navigateUp() {
        if (this._history.length > 0) {
            const prevId = this._history.pop();
            this.renderView(prevId);
        } else {
            const current = this._memberMap.get(this._currentRootId);
            if (current && current.parents && current.parents.length > 0) {
                this.renderView(current.parents[0]);
            }
        }
    },

    createSingleCard(member, isRootPosition) {
        const div = document.createElement('div');
        div.className = isRootPosition ? 'single-card active-root' : 'single-card child-node';
        if (member.status === 'deceased') div.classList.add('is-deceased');

        const getInit = (m) => m ? m.name.charAt(0).toUpperCase() : '?';

        let html = `
            <div class="member-photo ${!member.photoUrl ? 'placeholder' : ''}" onclick="event.stopImmediatePropagation(); uiRenderer.openModal('${member.id}')">
                ${member.photoUrl ? `<img src="${member.photoUrl}" alt="${member.name}">` : getInit(member)}
                <div class="photo-view-hint">VIEW</div>
            </div>
            <div class="member-info" onclick="event.stopImmediatePropagation(); uiRenderer.${isRootPosition ? 'openModal' : 'navigateTo'}('${member.id}')">
                <div class="member-name">${member.name}</div>
            </div>
        `;

        if (this._isEditMode) {
            html += `
                <div class="card-actions">
                    <button class="action-btn edit" title="Edit Member" onclick="event.stopPropagation(); uiRenderer.openEditModal('${member.id}')">✎</button>
                    <button class="action-btn delete" title="Delete Member" onclick="event.stopPropagation(); uiRenderer.handleDeleteMember('${member.id}')">✕</button>
                </div>
            `;
        }

        div.innerHTML = html;
        return div;
    },

    createCoupleCard(member, spouse, isRootPosition) {
        const div = document.createElement('div');
        div.className = isRootPosition ? 'couple-card active-root' : 'couple-card child-node';
        if (member.status === 'deceased') div.classList.add('is-deceased');

        if (!isRootPosition) {
            div.draggable = true;
            div.dataset.id = member.id;
        }

        const getInit = (m) => m ? m.name.charAt(0).toUpperCase() : '?';
        let html = '';

        // Primary member photo - Clicks to Profile View
        html += `
            <div class="member-photo ${!member.photoUrl ? 'placeholder' : ''}" onclick="event.stopImmediatePropagation(); uiRenderer.openModal('${member.id}')">
                ${member.photoUrl ? `<img src="${member.photoUrl}" alt="${member.name}">` : getInit(member)}
                <div class="photo-view-hint">VIEW</div>
            </div>
        `;

        // Info Section - Clicks to Navigate/Profile
        html += `<div class="couple-info" onclick="event.stopImmediatePropagation(); uiRenderer.${isRootPosition ? 'openModal' : 'navigateTo'}('${member.id}')">`;
        html += `<div class="couple-names">`;
        html += `<div class="name-row">${member.name}</div>`;
        if (spouse) {
            html += `<div class="name-separator">&</div>`;
            html += `<div class="name-row">${spouse.name}</div>`;
        }
        html += `</div>`;
        html += `</div>`;

        // Spouse photo - Clicks to Profile View
        if (spouse) {
            html += `
                <div class="member-photo ${!spouse.photoUrl ? 'placeholder' : ''} ${spouse.status === 'deceased' ? 'is-deceased' : ''}" onclick="event.stopImmediatePropagation(); uiRenderer.openModal('${spouse.id}')">
                    ${spouse.photoUrl ? `<img src="${spouse.photoUrl}" alt="${spouse.name}">` : getInit(spouse)}
                    <div class="photo-view-hint">VIEW</div>
                </div>
            `;
        }

        if (this._isEditMode) {
            html += `
                <div class="card-actions">
                    <button class="action-btn edit" title="Edit Member" onclick="event.stopPropagation(); uiRenderer.openEditModal('${member.id}')">✎</button>
                    <button class="action-btn delete" title="Delete Member" onclick="event.stopPropagation(); uiRenderer.handleDeleteMember('${member.id}')">✕</button>
                </div>
            `;
        }

        div.innerHTML = html;
        return div;
    },

    computeGenerations(members) {
        const memberMap = new Map(members.map(m => [m.id, { ...m }]));
        let roots = members.filter(m =>
            (m.name && m.name.toLowerCase().includes('nagendra')) ||
            (m.name && m.name.toLowerCase().includes('basanti'))
        );
        if (roots.length === 0) {
            roots = members.filter(m => !m.parents || m.parents.length === 0);
        }
        const queue = [];
        const visited = new Set();
        roots.forEach(r => {
            const m = memberMap.get(r.id);
            m.generation = 0;
            visited.add(m.id);
            queue.push(m);
        });
        while (queue.length > 0) {
            const current = queue.shift();
            if (current.children) {
                current.children.forEach(childId => {
                    if (memberMap.has(childId) && !visited.has(childId)) {
                        const child = memberMap.get(childId);
                        child.generation = current.generation + 1;
                        child.parents = child.parents || [];
                        if (!child.parents.includes(current.id)) child.parents.push(current.id);
                        visited.add(childId);
                        queue.push(child);
                    }
                });
            }
        }
        return Array.from(memberMap.values());
    },

    attachEventListeners() {
        const modal = document.getElementById('profile-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.close-btn');
        const overlay = modal.querySelector('.modal-overlay');
        const modalContent = modal.querySelector('.modal-content');

        const closeModal = (e) => {
            if (e) e.stopImmediatePropagation();
            modal.classList.add('hidden');
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (overlay) overlay.onclick = closeModal;

        // Harden click-outside logic to ignore internal content clicks
        modal.onclick = (e) => {
            if (modalContent && !modalContent.contains(e.target)) {
                closeModal(e);
            }
        };
    },

    setupDragAndDrop() {
        const containers = [
            document.getElementById('sons-container'),
            document.getElementById('daughters-container')
        ];

        containers.forEach(container => {
            if (!container) return;

            container.addEventListener('dragstart', (e) => {
                const card = e.target.closest('.couple-card');
                if (!card) return;
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            });

            container.addEventListener('dragend', (e) => {
                const card = e.target.closest('.couple-card');
                if (!card) return;
                card.classList.remove('dragging');
                card.classList.add('just-dragged');

                // Cleanup hover states
                container.classList.remove('drag-over');

                // Redraw connectors in case positions shifted
                this.drawConnectors();
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                container.classList.add('drag-over');

                const draggingCard = container.querySelector('.dragging');
                if (!draggingCard) return;

                const afterElement = this.getDragAfterElement(container, e.clientY);
                if (afterElement == null) {
                    container.appendChild(draggingCard);
                } else {
                    container.insertBefore(draggingCard, afterElement);
                }

                // Real-time connector update for smooth "wings" feeling
                this.drawConnectors();
            });

            container.addEventListener('dragleave', () => {
                container.classList.remove('drag-over');
            });

            container.addEventListener('drop', async (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');

                // Save New Order to Database
                const cards = Array.from(container.querySelectorAll('.couple-card'));
                const orderMap = {};
                cards.forEach((card, index) => {
                    orderMap[card.dataset.id] = index;
                    // Update local map to reflect changes without full reload
                    const member = this._memberMap.get(card.dataset.id);
                    if (member) member.sortOrder = index;
                });

                try {
                    await dbService.updateMemberOrder(orderMap);
                    console.log('✅ Order saved to database');
                } catch (error) {
                    console.error('❌ Failed to save order:', error);
                }
            });
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.couple-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    openModal(id) {
        const member = this._memberMap.get(id);
        if (!member) return;

        const modal = document.getElementById('profile-modal');
        const viewContent = document.getElementById('modal-view-content');
        const editForm = document.getElementById('modal-edit-form');
        const createForm = document.getElementById('modal-create-form');

        // Reset display states
        viewContent.style.display = 'block';
        editForm.style.display = 'none';
        createForm.style.display = 'none';

        // Render Tinder Card
        this.renderTinderCard(member);

        // State lock to prevent bounce
        if (this._isModalOpening) return;
        this._isModalOpening = true;

        setTimeout(() => {
            modal.classList.remove('hidden');
            this._isModalOpening = false;
        }, 30);
    },

    renderTinderCard(member) {
        const container = document.getElementById('tinder-photos-container');
        const indicators = document.getElementById('tinder-indicators');
        const nameEl = document.getElementById('modal-name');
        const roleEl = document.getElementById('modal-role');
        const editBtn = document.getElementById('btn-open-edit');

        // Reset
        container.innerHTML = '';
        indicators.innerHTML = '';
        this._currentPhotoIndex = 0;

        // Collect Photos: Profile + Gallery
        let photos = [];
        if (member.photoUrl) photos.push(member.photoUrl);
        if (member.gallery && member.gallery.length > 0) {
            photos = photos.concat(member.gallery);
        }

        // Fallback
        if (photos.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'tinder-photo active';
            placeholder.style.background = 'linear-gradient(135deg, #2c3e50, #000000)';
            placeholder.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;color:rgba(255,255,255,0.2);">${member.name.charAt(0)}</div>`;
            container.appendChild(placeholder);
        } else {
            photos.forEach((url, index) => {
                const img = document.createElement('img');
                img.src = url;
                img.className = `tinder-photo ${index === 0 ? 'active' : ''}`;
                container.appendChild(img);

                const bar = document.createElement('div');
                bar.className = `indicator-bar ${index === 0 ? 'active' : ''}`;
                bar.innerHTML = `<div class="indicator-progress"></div>`;
                indicators.appendChild(bar);
            });
        }

        // Info
        nameEl.textContent = member.name;

        // Modern Text: Simplified to just Age (Styling handled in CSS)
        let refinedText = "FAMILY MEMBER";
        if (member.dob) {
            const age = Math.floor((new Date() - new Date(member.dob)) / (1000 * 60 * 60 * 24 * 365.25));
            refinedText = `${age} YRS`;
        }
        roleEl.textContent = refinedText;
        roleEl.style = ""; // Clear any previous JS inline overrides

        // Premium Name styling is now handled in CSS for better performance
        nameEl.style = "";
        nameEl.textContent = member.name;

        // WhatsApp Quick Action
        const existingWA = document.getElementById('wa-quick-action');
        if (existingWA) existingWA.remove();

        if (member.whatsapp) {
            const waAction = document.createElement('a');
            waAction.id = 'wa-quick-action';
            waAction.href = `https://wa.me/${member.whatsapp.replace(/\D/g, '')}`;
            waAction.target = "_blank";
            waAction.className = 'edit-trigger';
            waAction.style.right = '5.5rem';
            waAction.style.background = '#25D366'; // WhatsApp Green
            waAction.style.borderColor = '#25D366';
            waAction.style.boxShadow = '0 4px 15px rgba(37, 211, 102, 0.4)';
            waAction.innerHTML = `
                <svg viewBox="-2.73 0 1225.016 1225.016" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#E0E0E0" d="M1041.858 178.02C927.206 63.289 774.753.07 612.325 0 277.617 0 5.232 272.298 5.098 606.991c-.039 106.986 27.915 211.42 81.048 303.476L0 1225.016l321.898-84.406c88.689 48.368 188.547 73.855 290.166 73.896h.258.003c334.654 0 607.08-272.346 607.222-607.023.056-162.208-63.052-314.724-177.689-429.463zm-429.533 933.963h-.197c-90.578-.048-179.402-24.366-256.878-70.339l-18.438-10.93-191.021 50.083 51-186.176-12.013-19.087c-50.525-80.336-77.198-173.175-77.16-268.504.111-278.186 226.507-504.503 504.898-504.503 134.812.056 261.519 52.604 356.814 147.965 95.289 95.36 147.728 222.128 147.688 356.948-.118 278.195-226.522 504.543-504.693 504.543z"/>
                    <defs>
                        <linearGradient id="wa_grad" gradientUnits="userSpaceOnUse" x1="609.77" y1="1190.114" x2="609.77" y2="21.084">
                            <stop offset="0" stop-color="#20b038"/><stop offset="1" stop-color="#60d66a"/>
                        </linearGradient>
                    </defs>
                    <path fill="url(#wa_grad)" d="M27.875 1190.114l82.211-300.18c-50.719-87.852-77.391-187.523-77.359-289.602.133-319.398 260.078-579.25 579.469-579.25 155.016.07 300.508 60.398 409.898 169.891 109.414 109.492 169.633 255.031 169.57 409.812-.133 319.406-260.094 579.281-579.445 579.281-.023 0 .016 0 0 0h-.258c-96.977-.031-192.266-24.375-276.898-70.5l-307.188 80.548z"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFF" d="M462.273 349.294c-11.234-24.977-23.062-25.477-33.75-25.914-8.742-.375-18.75-.352-28.742-.352-10 0-26.25 3.758-39.992 18.766-13.75 15.008-52.5 51.289-52.5 125.078 0 73.797 53.75 145.102 61.242 155.117 7.5 10 103.758 166.266 256.203 226.383 126.695 49.961 152.477 40.023 179.977 37.523s88.734-36.273 101.234-71.297c12.5-35.016 12.5-65.031 8.75-71.305-3.75-6.25-13.75-10-28.75-17.5s-88.734-43.789-102.484-48.789-23.75-7.5-33.75 7.516c-10 15-38.727 48.773-47.477 58.773-8.75 10.023-17.5 11.273-32.5 3.773-15-7.523-63.305-23.344-120.609-74.438-44.586-39.75-74.688-88.844-83.438-103.859-8.75-15-.938-23.125 6.586-30.602 6.734-6.719 15-17.508 22.5-26.266 7.484-8.758 9.984-15.008 14.984-25.008 5-10.016 2.5-18.773-1.25-26.273s-32.898-81.67-46.234-111.326z"/>
                    <path fill="#FFF" d="M1036.898 176.091C923.562 62.677 772.859.185 612.297.114 281.43.114 12.172 269.286 12.039 600.137 12 705.896 39.633 809.13 92.156 900.13L7 1211.067l318.203-83.438c87.672 47.812 186.383 73.008 286.836 73.047h.255.003c330.812 0 600.109-269.219 600.25-600.055.055-160.343-62.328-311.108-175.649-424.53zm-424.601 923.242h-.195c-89.539-.047-177.344-24.086-253.93-69.531l-18.227-10.805-188.828 49.508 50.414-184.039-11.875-18.867c-49.945-79.414-76.312-171.188-76.273-265.422.109-274.992 223.906-498.711 499.102-498.711 133.266.055 258.516 52 352.719 146.266 94.195 94.266 146.031 219.578 145.992 352.852-.118 274.999-223.923 498.749-498.899 498.749z"/>
                </svg>
            `;
            document.querySelector('.tinder-wrapper').appendChild(waAction);
        }

        // Navigation
        const prevBtn = document.getElementById('tinder-prev');
        const nextBtn = document.getElementById('tinder-next');

        const cycle = (dir) => {
            const items = container.querySelectorAll('.tinder-photo');
            const bars = indicators.querySelectorAll('.indicator-bar');
            if (items.length <= 1) return;

            // Update current
            items[this._currentPhotoIndex].classList.remove('active');
            bars[this._currentPhotoIndex].classList.remove('active');
            if (dir > 0) bars[this._currentPhotoIndex].classList.add('seen');

            // Calculate next
            this._currentPhotoIndex = (this._currentPhotoIndex + dir + items.length) % items.length;

            // Update next
            items[this._currentPhotoIndex].classList.add('active');
            bars[this._currentPhotoIndex].classList.add('active');
            bars[this._currentPhotoIndex].classList.remove('seen');
        };

        prevBtn.onclick = (e) => { e.stopPropagation(); cycle(-1); };
        nextBtn.onclick = (e) => { e.stopPropagation(); cycle(1); };

        // Edit Trigger
        editBtn.onclick = () => this.openEditModal(member.id);
    },

    openEditModal(id) {
        const member = this._memberMap.get(id);
        if (!member) return;

        const modal = document.getElementById('profile-modal');
        const viewContent = document.getElementById('modal-view-content');
        const editForm = document.getElementById('modal-edit-form');
        const createForm = document.getElementById('modal-create-form');
        const modalPhoto = document.getElementById('modal-photo');

        viewContent.style.display = 'none';
        editForm.style.display = 'block';
        createForm.style.display = 'none';

        // Populate Form & Header
        document.getElementById('edit-form-title').textContent = `Edit ${member.name.split(' ')[0]}`;
        document.getElementById('edit-form-subtitle').textContent = "Personal Portfolio Details";
        document.getElementById('edit-name').value = member.name;
        document.getElementById('edit-dob').value = member.dob || '';

        // WhatsApp Prefix Logic
        const waInput = document.getElementById('edit-whatsapp');
        let waValue = member.whatsapp || '';
        if (waValue && !waValue.startsWith('+')) waValue = '+91 ' + waValue;
        if (!waValue) waValue = '+91 ';
        waInput.value = waValue;

        waInput.oninput = (e) => {
            if (!e.target.value.startsWith('+91')) {
                e.target.value = '+91 ' + e.target.value.replace(/^\+?9?1?\s?/, '');
            }
        };

        // Injected Profile Photo Editor (Ultra-Compact Integrated)
        const photoInput = document.getElementById('edit-photo-input');
        const photoContainer = document.getElementById('edit-profile-photo-container');
        photoContainer.style.textAlign = 'left';
        photoContainer.style.marginBottom = '0';

        const renderPhotoControls = () => {
            const hasPhoto = !!member.photoUrl;

            let profileHtml = hasPhoto
                ? `<div class="profile-editor-circle" id="profile-editor-trigger">
                     <img src="${member.photoUrl}" id="edit-preview-img">
                     <div class="camera-badge">📸</div>
                   </div>`
                : `<div class="profile-editor-circle" id="profile-editor-trigger">
                     <div class="initials-placeholder">${member.name.charAt(0).toUpperCase()}</div>
                     <div class="camera-badge">📸</div>
                   </div>`;

            let removeBadgeHtml = hasPhoto
                ? `<button type="button" class="remove-photo-badge" id="btn-remove-pfp">REMOVE</button>`
                : '';

            photoContainer.innerHTML = profileHtml + removeBadgeHtml;

            // Interaction logic
            const trigger = photoContainer.querySelector('#profile-editor-trigger');
            trigger.onclick = () => photoInput.click();

            const removeBtn = photoContainer.querySelector('#btn-remove-pfp');
            if (removeBtn) {
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.removeProfilePhoto(id);
                };
            }
        };

        renderPhotoControls();

        photoInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const img = photoContainer.querySelector('img');
                    if (img) {
                        img.src = re.target.result;
                    } else {
                        // We were on placeholder, need to re-render to show <img>
                        renderPhotoControls();
                        const newImg = photoContainer.querySelector('img');
                        if (newImg) newImg.src = re.target.result;
                    }
                };
                reader.readAsDataURL(file);
            }
        };

        if (this._isModalOpening) return;
        this._isModalOpening = true;

        setTimeout(() => {
            if (modal.classList.contains('hidden')) {
                modal.classList.remove('hidden');
            }
            this._isModalOpening = false;
        }, 30);

        // Gender Toggle
        const genderToggle = document.getElementById('edit-gender-toggle');
        const genderLabel = genderToggle.querySelector('.switch-label');
        if (member.gender === 'female') {
            genderToggle.classList.add('switch-active');
            genderLabel.textContent = 'Female';
        } else {
            genderToggle.classList.remove('switch-active');
            genderLabel.textContent = 'Male';
        }
        genderToggle.onclick = () => {
            genderToggle.classList.toggle('switch-active');
            genderLabel.textContent = genderToggle.classList.contains('switch-active') ? 'Female' : 'Male';
        };

        // Status Toggle
        const statusToggle = document.getElementById('edit-status-toggle');
        const statusLabel = statusToggle.querySelector('.switch-label');
        if (member.status === 'deceased') {
            statusToggle.classList.add('switch-active');
        } else {
            statusToggle.classList.remove('switch-active');
        }
        statusToggle.onclick = () => statusToggle.classList.toggle('switch-active');

        // Gallery Management
        const galleryGrid = document.getElementById('edit-gallery-grid');
        const galleryInput = document.getElementById('gallery-photo-input');

        const renderEditGallery = () => {
            galleryGrid.innerHTML = '';
            const photos = member.gallery || [];
            photos.forEach((url, idx) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `
                    <img src="${url}">
                    <div class="photo-edit-overlay" onclick="uiRenderer.removeGalleryPhoto('${id}', ${idx})">✕</div>
                `;
                galleryGrid.appendChild(item);
            });

            const addCard = document.createElement('div');
            addCard.className = 'gallery-add-card';
            addCard.innerHTML = `<span>+</span> Add`;
            addCard.onclick = () => galleryInput.click();
            galleryGrid.appendChild(addCard);
        };

        renderEditGallery();

        galleryInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    console.log(`[GALLERY] Starting upload for ${member.name}...`);
                    this.showToast("Uploading to gallery...", "success");

                    const timestamp = Date.now();
                    const path = `gallery/${id}/${timestamp}`;
                    const url = await storageService.uploadImage(file, path);

                    console.log(`[GALLERY] Upload complete. URL: ${url}`);

                    const updatedGallery = [...(member.gallery || []), url];
                    await dbService.updateMember(id, { gallery: updatedGallery });

                    member.gallery = updatedGallery; // Synchronize local state
                    renderEditGallery();
                    this.showToast("Gallery updated!", "success");
                } catch (err) {
                    console.error("[GALLERY ERROR]", err);
                    this.showToast("Upload failed: " + err.message, "error");
                }
            }
        };

        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = editForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Save Changes';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            const newName = document.getElementById('edit-name').value;
            const dob = document.getElementById('edit-dob').value;
            const whatsapp = document.getElementById('edit-whatsapp').value;
            const isFemale = genderToggle.classList.contains('switch-active');
            const isDeceased = statusToggle.classList.contains('switch-active');

            try {
                console.log(`[UPDATE] Preparing updates for ${newName} (${id})`);
                const updates = {
                    name: newName,
                    dob: dob,
                    whatsapp: whatsapp,
                    gender: isFemale ? 'female' : 'male',
                    status: isDeceased ? 'deceased' : 'alive'
                };

                if (photoInput.files[0]) {
                    console.log("[UPDATE] Profile photo detected. Starting upload...");
                    this.showToast("Uploading profile photo...", "success");
                    const photoUrl = await storageService.uploadImage(photoInput.files[0], `profile_photos/${id}_${Date.now()}`);
                    updates.photoUrl = photoUrl;
                    console.log("[UPDATE] Profile photo upload success:", photoUrl);
                }

                await dbService.updateMember(id, updates);
                console.log("[UPDATE] Database document successfully updated.");

                this.showToast("Changes saved!", "success");

                // Real-time synchronization
                Object.assign(member, updates);
                this._memberMap.set(id, member);
                this.renderView(this._currentRootId);

                modal.classList.add('hidden');
            } catch (err) {
                console.error("[SAVE ERROR]", err);
                this.showToast("Save failed: " + err.message, "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        };

        const btnDelete = document.getElementById('btn-delete-member');
        btnDelete.onclick = () => this.handleDeleteMember(id);
    },

    openCreateModal(parentId, genderPref, spouseId) {
        const parent = this._memberMap.get(parentId);
        const spouse = spouseId ? this._memberMap.get(spouseId) : null;
        const modal = document.getElementById('profile-modal');
        const viewContent = document.getElementById('modal-view-content');
        const editForm = document.getElementById('modal-edit-form');
        const createForm = document.getElementById('modal-create-form');
        const modalPhoto = document.getElementById('modal-photo');

        viewContent.style.display = 'none';
        editForm.style.display = 'none';
        createForm.style.display = 'block';

        // Pre-generate ID for photo uploads
        const newMemberId = 'm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        let createGallery = [];

        // Form Header Setup
        const titleText = genderPref === 'male' ? 'Add Son' : 'Add Daughter';
        document.getElementById('create-form-title').textContent = titleText;
        document.getElementById('create-form-subtitle').textContent = `Expanding ${parent ? parent.name : 'Ancestry'}'s Legacy`;

        document.getElementById('create-name').value = '';
        document.getElementById('create-dob').value = '';

        // WhatsApp Prefix for Create
        const createWaInput = document.getElementById('create-whatsapp');
        createWaInput.value = '+91 ';
        createWaInput.oninput = (e) => {
            if (!e.target.value.startsWith('+91')) {
                e.target.value = '+91 ' + e.target.value.replace(/^\+?9?1?\s?/, '');
            }
        };

        // Injected Profile Photo Editor (Ultra-Compact for Create)
        const photoInput = document.getElementById('create-photo-input');
        const photoContainer = document.getElementById('create-profile-photo-container');
        photoContainer.style.textAlign = 'left';
        photoContainer.style.marginBottom = '0';

        const renderCreatePhotoControls = () => {
            photoContainer.innerHTML = `
                <div class="profile-editor-circle" id="create-editor-trigger">
                    <div class="initials-placeholder">?</div>
                    <div class="camera-badge">📸</div>
                </div>
                <div style="margin-top:12px; font-size:0.7rem; color:var(--text-muted); letter-spacing:0.05em; font-weight:600;">TAP TO UPLOAD PHOTO</div>
            `;

            const trigger = photoContainer.querySelector('#create-editor-trigger');
            trigger.onclick = () => photoInput.click();
        };

        renderCreatePhotoControls();

        // Create-Mode Gallery Logic
        const createGalleryGrid = document.getElementById('create-gallery-grid');
        const createGalleryInput = document.getElementById('create-gallery-photo-input');

        const renderCreateGallery = () => {
            createGalleryGrid.innerHTML = '';
            createGallery.forEach((url, idx) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `
                    <img src="${url}">
                    <div class="photo-edit-overlay" onclick="this.parentElement.remove()">✕</div>
                `;
                createGalleryGrid.appendChild(item);
            });

            const addCard = document.createElement('div');
            addCard.className = 'gallery-add-card';
            addCard.innerHTML = `<span>+</span> Add`;
            addCard.onclick = () => createGalleryInput.click();
            createGalleryGrid.appendChild(addCard);
        };

        renderCreateGallery();

        createGalleryInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    this.showToast("Uploading lifestyle photo...", "success");
                    const path = `gallery/${newMemberId}/${Date.now()}`;
                    const url = await storageService.uploadImage(file, path);
                    createGallery.push(url);
                    renderCreateGallery();
                } catch (err) {
                    this.showToast("Failed to upload photo", "error");
                }
            }
        };

        photoInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const trigger = photoContainer.querySelector('#create-editor-trigger');
                    trigger.innerHTML = `
                     <img src="${re.target.result}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                     <div class="camera-badge">📸</div>
                   `;
                };
                reader.readAsDataURL(file);
            }
        };

        const submitBtn = document.getElementById('btn-create-submit');
        const parentFirstName = parent ? parent.name.split(' ')[0] : 'Family';
        submitBtn.textContent = `Add to ${parentFirstName}'s Lineage`;

        // Gender Toggle
        const genderToggle = document.getElementById('create-gender-toggle');
        const genderLabel = genderToggle.querySelector('.switch-label');
        if (genderPref === 'female') {
            genderToggle.classList.add('switch-active');
            genderLabel.textContent = 'Female';
        } else {
            genderToggle.classList.remove('switch-active');
            genderLabel.textContent = 'Male';
        }
        genderToggle.onclick = () => {
            genderToggle.classList.toggle('switch-active');
            genderLabel.textContent = genderToggle.classList.contains('switch-active') ? 'Female' : 'Male';
        };

        // Status Toggle
        const statusToggle = document.getElementById('create-status-toggle');
        statusToggle.classList.remove('switch-active');
        statusToggle.onclick = () => statusToggle.classList.toggle('switch-active');

        if (this._isModalOpening) return;
        this._isModalOpening = true;

        setTimeout(() => {
            if (modal.classList.contains('hidden')) {
                modal.classList.remove('hidden');
            }
            this._isModalOpening = false;
        }, 30);

        createForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = createForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Add Member';

            const name = document.getElementById('create-name').value;
            const dob = document.getElementById('create-dob').value;
            const whatsapp = document.getElementById('create-whatsapp').value;

            if (!name) {
                this.showToast("Name is required", "error");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating...';
            }

            const isFemale = genderToggle.classList.contains('switch-active');
            const isDeceased = statusToggle.classList.contains('switch-active');

            try {
                let photoUrl = null;
                if (photoInput.files[0]) {
                    this.showToast("Uploading profile photo...", "success");
                    photoUrl = await storageService.uploadImage(photoInput.files[0], `profile_photos/${newMemberId}`);
                }

                const event = new CustomEvent('add-child', {
                    detail: {
                        parentId,
                        childId: newMemberId,
                        childName: name,
                        dob: dob,
                        whatsapp: whatsapp,
                        gender: isFemale ? 'female' : 'male',
                        status: isDeceased ? 'deceased' : 'alive',
                        photoUrl: photoUrl,
                        gallery: createGallery,
                        spouseId: spouseId
                    }
                });
                document.dispatchEvent(event);
                modal.classList.add('hidden');
            } catch (err) {
                console.error("CREATE MEMBER ERROR:", err);
                this.showToast("Failed to add member: " + err.message, "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        };
    },

    async handleDeleteMember(id) {
        const confirmed = await this.confirmCustom(
            "Delete Member",
            "This will remove the member specifically from this lineage view. This action is permanent."
        );

        if (!confirmed) return;

        try {
            await dbService.deleteMember(id);
            this.showToast("Member removed successfully.", "success");
            setTimeout(() => location.reload(), 800);
        } catch (err) {
            console.error(err);
            this.showToast("Failed to delete member.", "error");
        }
    },

    drawConnectors() {
        const svg = document.getElementById('connector-svg');
        if (!svg) {
            console.log('❌ SVG element not found');
            return;
        }

        svg.innerHTML = ''; // Clear existing paths

        const coupleWrapper = document.querySelector('.couple-wrapper');
        const sonsCards = document.querySelectorAll('.branch-left .couple-card');
        const daughtersCards = document.querySelectorAll('.branch-right .couple-card');

        if (!coupleWrapper) {
            console.log('❌ Couple wrapper not found');
            return;
        }

        const container = document.querySelector('.tree-container');
        const containerRect = container.getBoundingClientRect();
        const wrapperRect = coupleWrapper.getBoundingClientRect();

        // v2.5.7 - Mathematical Locking
        // Use absolute container center for horizontal axis to eliminate fast-scroll jitter
        const rootCenterX = container.offsetWidth / 2;
        // Scroll-compensated vertical origin for the sticky parents
        const rootBottomY = wrapperRect.top - containerRect.top + (wrapperRect.height / 2);

        console.log('✅ Drawing connectors from gap center:', rootCenterX, rootBottomY);
        console.log('📊 Found cards:', { sons: sonsCards.length, daughters: daughtersCards.length });

        let connectorCount = 0;

        // Draw curves to sons (Left Side -> Enter from Right)
        sonsCards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            // Target: Right side of the card, vertical center
            const cardTargetX = cardRect.right - containerRect.left;
            const cardTargetY = cardRect.top - containerRect.top + (cardRect.height / 2);

            console.log(`👦 Son ${index + 1}:`, { x: cardTargetX, y: cardTargetY });

            const path = this.createCurvedPath(
                rootCenterX, rootBottomY,
                cardTargetX, cardTargetY,
                'left-branch' // Direction indicator
            );
            svg.appendChild(path);
            connectorCount++;
        });

        // Draw curves to daughters (Right Side -> Enter from Left)
        daughtersCards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            // Target: Left side of the card, vertical center
            const cardTargetX = cardRect.left - containerRect.left;
            const cardTargetY = cardRect.top - containerRect.top + (cardRect.height / 2);

            console.log(`👧 Daughter ${index + 1}:`, { x: cardTargetX, y: cardTargetY });

            const path = this.createCurvedPath(
                rootCenterX, rootBottomY,
                cardTargetX, cardTargetY,
                'right-branch' // Direction indicator
            );
            svg.appendChild(path);
            connectorCount++;
        });

        console.log(`✅ Drew ${connectorCount} SVG connectors`);
    },

    createCurvedPath(x1, y1, x2, y2, branchType) {
        const svg = document.getElementById('connector-svg');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Create smooth bezier curve for side entry
        // Start: x1, y1 (Parent Bottom Center)
        // End: x2, y2 (Child Side Center)

        let d = '';

        if (branchType === 'left-branch') {
            // Logic for Sons (Left Column): Connect to Right Side of Card
            // Curve should go down, then curve left to hit the right side
            const controlPoint1X = x1; // Vertical down from parent
            const controlPoint1Y = y1 + (y2 - y1) * 0.5; // Go down 50%

            const controlPoint2X = x2 + 180; // Wide sweeping curve for expansive layout
            const controlPoint2Y = y2; // Horizontal entry

            d = `M ${x1} ${y1} 
                 C ${controlPoint1X} ${controlPoint1Y}, 
                   ${controlPoint2X} ${controlPoint2Y}, 
                   ${x2} ${y2}`;

        } else if (branchType === 'right-branch') {
            // Logic for Daughters (Right Column): Connect to Left Side of Card
            const controlPoint1X = x1; // Vertical down from parent
            const controlPoint1Y = y1 + (y2 - y1) * 0.5; // Go down 50%

            const controlPoint2X = x2 - 180; // Wide sweeping curve for expansive layout
            const controlPoint2Y = y2;

            d = `M ${x1} ${y1} 
                 C ${controlPoint1X} ${controlPoint1Y}, 
                   ${controlPoint2X} ${controlPoint2Y}, 
                   ${x2} ${y2}`;
        } else {
            // Fallback for default top-down
            const midY = (y1 + y2) / 2;
            d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        }

        path.setAttribute('d', d);
        path.setAttribute('stroke', 'url(#goldGradient)');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.8');
        path.style.filter = 'drop-shadow(0 0 8px rgba(246, 211, 101, 0.4))';

        // Add gradient definition if not exists
        if (!document.getElementById('goldGradient')) {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            gradient.setAttribute('id', 'goldGradient');
            gradient.setAttribute('x1', '0%');
            gradient.setAttribute('y1', '0%');
            gradient.setAttribute('x2', '100%');
            gradient.setAttribute('y2', '100%');

            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', '#f6d365');

            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', '#fda085');

            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            defs.appendChild(gradient);
            svg.appendChild(defs);
        }

        return path;
    },

    handleAddSpouse(member) {
        const name = prompt(`Enter name of spouse for ${member.name}:`);
        if (name) {
            document.dispatchEvent(new CustomEvent('add-spouse', {
                detail: { memberId: member.id, spouseName: name }
            }));
        }
    },

    handleAddChild(member) {
        const name = prompt(`Enter name of child for ${member.name}:`);
        if (name) {
            const gender = prompt("Enter gender (male/female):").toLowerCase();
            if (gender === 'male' || gender === 'female') {
                document.dispatchEvent(new CustomEvent('add-child', {
                    detail: { parentId: member.id, childName: name, gender: gender }
                }));
            }
        }
    },

    // --- Data Repair Helper for Rajesh's Multiple Spouses ---
    async fixRajeshRelationships() {
        console.log("🛠️ Starting Rajesh Relationship Fix...");
        try {
            const members = await dbService.getAllMembers();

            const rajesh = members.find(m => m.name && m.name.includes("Rajesh"));
            const sasita = members.find(m => m.name && m.name.includes("Sasita"));
            const kanchana = members.find(m => m.name && m.name.includes("Kanchana"));

            if (!rajesh || !sasita || !kanchana) {
                console.error("❌ Missing primary members:", { rajesh: !!rajesh, sasita: !!sasita, kanchana: !!kanchana });
                return;
            }

            console.log(`✅ Found Rajesh (${rajesh.id}), Sasita (${sasita.id}), Kanchana (${kanchana.id})`);

            // 1. Link Spouses
            await dbService.updateMember(rajesh.id, {
                spouses: [sasita.id, kanchana.id],
                spouseId: sasita.id // Default
            });
            await dbService.updateMember(sasita.id, { spouses: [rajesh.id] });
            await dbService.updateMember(kanchana.id, { spouses: [rajesh.id] });

            // 2. Segment Children
            const childrenIds = rajesh.children || [];
            for (const id of childrenIds) {
                const child = members.find(m => m.id === id);
                if (!child) continue;

                if (child.name && (child.name.includes("Amit") || child.name.includes("Priti"))) {
                    await dbService.updateMember(id, { parents: [rajesh.id, sasita.id] });
                    console.log(`👶 Linked ${child.name} to Sasita`);
                } else {
                    await dbService.updateMember(id, { parents: [rajesh.id, kanchana.id] });
                    console.log(`👶 Linked ${child.name} to Kanchana`);
                }
            }

            console.log("🚀 SUCCESS! Please refresh the page.");
            alert("Rajesh's family structure updated! Please refresh.");
        } catch (e) {
            console.error("❌ Fix failed:", e);
        }
    },

    async removeGalleryPhoto(memberId, index) {
        const confirmed = await this.confirmCustom(
            "Remove Photo",
            "Are you sure you want to delete this photo from the gallery?"
        );
        if (!confirmed) return;

        try {
            const member = this._memberMap.get(memberId);
            const updatedGallery = [...member.gallery];
            updatedGallery.splice(index, 1);

            await dbService.updateMember(memberId, { gallery: updatedGallery });
            member.gallery = updatedGallery;
            this.showToast("Photo removed", "success");

            // Trigger refresh of edit gallery if modal is open
            this.openEditModal(memberId);
        } catch (err) {
            this.showToast("Failed to remove photo", "error");
        }
    },

    async removeProfilePhoto(memberId) {
        const confirmed = await this.confirmCustom(
            "Remove Profile Photo",
            "Are you sure you want to remove the specific profile photo? This will revert to using the member's initials."
        );
        if (!confirmed) return;

        try {
            await dbService.updateMember(memberId, { photoUrl: null });

            // Update local state
            const member = this._memberMap.get(memberId);
            member.photoUrl = null;
            this._memberMap.set(memberId, member);

            this.showToast("Profile photo removed", "success");
            this.openEditModal(memberId); // Re-render modal to show initials
            this.renderView(this._currentRootId); // Update tree view
        } catch (err) {
            console.error(err);
            this.showToast("Failed to remove profile photo", "error");
        }
    }
};
