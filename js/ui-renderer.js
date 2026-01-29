export const uiRenderer = {
    _members: [],
    _memberMap: new Map(),
    _currentRootId: null,
    _history: [],

    renderTree(members) {
        this._members = this.computeGenerations(members);
        this._memberMap = new Map(this._members.map(m => [m.id, m]));

        console.log("Initializing Page View. Total members:", this._members.length);

        let defaultRoot = this._members.find(m =>
            (m.name && m.name.toLowerCase().includes('nagendra'))
        );

        if (!defaultRoot) {
            defaultRoot = this._members.find(m => m.generation === 0);
        }

        if (defaultRoot) {
            this.renderView(defaultRoot.id);
        } else {
            console.error("No root member found to start view.");
        }

        this.attachEventListeners();
    },

    renderView(rootId) {
        console.log("Rendering View for Root ID:", rootId);
        this._currentRootId = rootId;

        const rootMember = this._memberMap.get(rootId);
        if (!rootMember) return;

        // --- 1. Render Parents (Top) - TWO SEPARATE CARDS ---
        const rootContainer = document.getElementById('root-container');
        rootContainer.innerHTML = '';

        let spouse = null;
        // Handle both 'spouseId' (singular) and 'spouses' (array) data formats
        if (rootMember.spouseId) {
            spouse = this._memberMap.get(rootMember.spouseId);
        } else if (rootMember.spouses && rootMember.spouses.length > 0) {
            spouse = this._memberMap.get(rootMember.spouses[0]);
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

        let childrenIds = new Set(rootMember.children || []);
        if (spouse && spouse.children) {
            spouse.children.forEach(id => childrenIds.add(id));
        }

        const children = [];
        childrenIds.forEach(id => {
            const child = this._memberMap.get(id);
            if (child) children.push(child);
        });

        const sons = children.filter(c => c.gender === 'male').sort((a, b) => a.name.localeCompare(b.name));
        const daughters = children.filter(c => c.gender === 'female' || c.gender === undefined).sort((a, b) => a.name.localeCompare(b.name));

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

        if (isRootPosition) {
            div.onclick = () => this.openModal(member.id);
        } else {
            div.onclick = () => this.navigateTo(member.id);
        }

        const getInit = (m) => m ? m.name.charAt(0).toUpperCase() : '?';

        let html = `
            <div class="member-photo ${!member.photoUrl ? 'placeholder' : ''}">
                ${member.photoUrl ? `<img src="${member.photoUrl}" alt="${member.name}">` : getInit(member)}
            </div>
            <div class="member-info">
                <div class="member-name">${member.name}</div>
                <div class="member-role">${member.gender === 'male' ? 'Father' : 'Mother'}</div>
            </div>
        `;

        div.innerHTML = html;
        return div;
    },

    createCoupleCard(member, spouse, isRootPosition) {
        const div = document.createElement('div');
        div.className = isRootPosition ? 'couple-card active-root' : 'couple-card child-node';

        if (isRootPosition) {
            div.onclick = () => this.openModal(member.id);
        } else {
            div.onclick = () => this.navigateTo(member.id);
        }

        const getInit = (m) => m ? m.name.charAt(0).toUpperCase() : '?';

        // Build card content
        let html = '';

        // Primary member photo
        html += `
            <div class="member-photo ${!member.photoUrl ? 'placeholder' : ''}">
                ${member.photoUrl ? `<img src="${member.photoUrl}" alt="${member.name}">` : getInit(member)}
            </div>
        `;

        // Names section - show names vertically
        html += `<div class="couple-info">`;
        html += `<div class="couple-names">`;
        html += `<div class="name-row">${member.name}</div>`;
        if (spouse) {
            html += `<div class="name-separator">&</div>`;
            html += `<div class="name-row">${spouse.name}</div>`;
        }
        html += `</div>`;
        html += `</div>`;

        // Spouse photo (if exists)
        if (spouse) {
            html += `
                <div class="member-photo ${!spouse.photoUrl ? 'placeholder' : ''}">
                    ${spouse.photoUrl ? `<img src="${spouse.photoUrl}" alt="${spouse.name}">` : getInit(spouse)}
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
        const closeModal = () => modal.classList.add('hidden');
        if (closeBtn) closeBtn.onclick = closeModal;
        if (overlay) overlay.onclick = closeModal;
    },

    openModal(id) {
        const member = this._memberMap.get(id);
        if (!member) return;

        console.log("Opening modal for:", member);

        const modal = document.getElementById('profile-modal');
        const modalName = document.getElementById('modal-name');
        const modalRole = document.getElementById('modal-role');
        const modalInitial = document.getElementById('modal-initials');
        const modalSpouse = document.getElementById('modal-spouse');
        const modalChildren = document.getElementById('modal-children');

        modalName.textContent = member.name;
        modalRole.textContent = `Generation ${member.generation}`;

        if (member.photoUrl) {
            modalInitial.innerHTML = `<img src="${member.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            modalInitial.textContent = member.name.charAt(0);
        }

        // Spouse
        modalSpouse.innerHTML = '';
        if (member.spouseId) {
            const spouse = this._memberMap.get(member.spouseId);
            modalSpouse.innerHTML = spouse ? `<span class="tag">${spouse.name}</span>` : `<span class="tag">Unknown</span>`;
        } else {
            modalSpouse.innerHTML = `<em style="color:var(--text-muted)">No spouse registered</em>`;
        }

        // Children
        modalChildren.innerHTML = '';
        const children = member.children || [];
        if (children.length > 0) {
            children.forEach(cid => {
                const child = this._memberMap.get(cid);
                if (child) {
                    const tag = document.createElement('span');
                    tag.className = 'tag';
                    tag.textContent = child.name;
                    tag.onclick = (e) => {
                        e.stopPropagation();
                        modal.classList.add('hidden');
                        this.navigateTo(cid);
                    };
                    modalChildren.appendChild(tag);
                }
            });
        } else {
            modalChildren.innerHTML = `<em style="color:var(--text-muted)">No children</em>`;
        }

        const btnSpouse = document.getElementById('btn-add-spouse');
        const btnChild = document.getElementById('btn-add-child');
        if (btnSpouse) btnSpouse.onclick = () => this.handleAddSpouse(member);
        if (btnChild) btnChild.onclick = () => this.handleAddChild(member);

        modal.classList.remove('hidden');
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

        // Calculate relative positions - center of couple wrapper (gap between parents)
        const rootCenterX = wrapperRect.left - containerRect.left + wrapperRect.width / 2;
        // Start wire slightly higher (at the vertical center of the parent cards) 
        // to give that "originating from between them" feel
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
    }
};
