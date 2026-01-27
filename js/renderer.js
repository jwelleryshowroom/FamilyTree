// DOM Helpers
export function createCard(person, isFocal = false, actions = {}) {
    const card = document.createElement('div');
    card.className = `person-card ${person.gender}`;
    if (person.isDeceased || person.status === 'deceased') {
        card.classList.add('deceased');
    }
    card.dataset.id = person.id;

    // Avatar Logic
    let avatarContent = '';
    if (person.photoUrl) {
        avatarContent = `<img src="${person.photoUrl}" alt="${person.name}">`;
    } else {
        avatarContent = person.name.charAt(0).toUpperCase();
    }

    // Status Icon
    let statusIcon = '';
    if (person.isDeceased || person.status === 'deceased') {
        statusIcon = '<span class="deceased-icon" title="Deceased">🕊️</span>';
    }

    // Role Label
    let roleLabel = person.relationLabel || 'Family';
    if (person.id === 'root_nagendra' || person.id === 'root_basanti') {
        roleLabel = 'Root';
    }

    // Render HTML
    card.innerHTML = `
        <div class="person-avatar" style="${getGenderStyle(person.gender)}">
            ${avatarContent}
        </div>
        <div class="person-info">
            <h3>${person.name}${statusIcon}</h3>
            <span>${roleLabel}</span>
        </div>
        <div class="card-actions">
            ${actions.onEdit ? `<button class="action-btn edit-btn" title="Edit">✏️</button>` : ''}
            ${actions.onDelete && !isFocal ? `<button class="action-btn delete-btn" title="Delete">🗑️</button>` : ''}
        </div>
    `;

    // Attach Events
    if (actions.onDragStart && !isFocal && (roleLabel === 'Family' || roleLabel === 'Son' || roleLabel === 'Daughter')) {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', (e) => actions.onDragStart(e, person));
        card.addEventListener('dragover', (e) => actions.onDragOver(e));
        card.addEventListener('drop', (e) => actions.onDrop(e, person));
        card.addEventListener('dragend', (e) => actions.onDragEnd(e));
        card.style.cursor = 'grab';
    }

    // Attach Events
    if (actions.onEdit) {
        const editBtn = card.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.onclick = (e) => {
                e.stopPropagation();
                actions.onEdit(person);
            };
        }
    }

    if (actions.onDelete && !isFocal) {
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                actions.onDelete(person);
            };
        }
    }

    return card;
}

function getGenderStyle(gender) {
    if (gender === 'female') {
        return 'background: linear-gradient(135deg, #ec4899, #d946ef); border-color: #fbcfe8;';
    }
    return 'background: linear-gradient(135deg, #3b82f6, #6366f1); border-color: #bfdbfe;';
}

function createAddButton(label, onClick) {
    const btn = document.createElement('div');
    btn.className = 'add-btn';
    btn.innerHTML = `<span>+</span> ${label}`;
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent navigation
        onClick();
    });
    return btn;
}

// Internal Scroll Listener Setup
let scrollListenerAttached = false;

function attachScrollListener() {
    if (scrollListenerAttached) return;

    window.addEventListener('scroll', () => {
        requestAnimationFrame(updateConnections);
    }, { passive: true });

    scrollListenerAttached = true;
}

export function renderFamily(focalId, allMembers, callbacks = {}) {
    const { onAddMember, onEditMember, onDeleteMember } = callbacks;
    const container = document.getElementById('treeContainer');

    // Attach listener once (singleton pattern for scroll)
    attachScrollListener();
    const svgContainer = document.getElementById('connectionsSvg');

    // Clear previous
    container.innerHTML = '';
    svgContainer.innerHTML = '';
    container.className = 'tree-container'; // Reset class

    // Find Data
    const focalPerson = allMembers.find(m => m.id === focalId);
    if (!focalPerson) {
        console.error('Person not found:', focalId);
        return;
    }

    const spouses = focalPerson.spouses.map(sid => allMembers.find(m => m.id === sid)).filter(Boolean);
    const childrenIds = focalPerson.children || [];
    const children = childrenIds.map(cid => allMembers.find(m => m.id === cid)).filter(Boolean);

    // Filter Children by Gender
    const sons = children.filter(c => c.gender === 'male');
    const daughters = children.filter(c => c.gender === 'female');

    // Smart Layout Logic
    const hasSons = sons.length > 0;
    const hasDaughters = daughters.length > 0;
    let layoutMode = 'split'; // default

    if (hasSons && !hasDaughters) {
        layoutMode = 'sons-only';
        container.classList.add('single-column');
    } else if (!hasSons && hasDaughters) {
        layoutMode = 'daughters-only';
        container.classList.add('single-column');
    } else if (!hasSons && !hasDaughters) {
        // No children yet - split is fine (empty columns)
        layoutMode = 'empty';
    }

    // Common Action Props
    const actionProps = {
        onEdit: onEditMember,
        onDelete: onDeleteMember,
        onDragStart: callbacks.onDragStart,
        onDragOver: callbacks.onDragOver,
        onDrop: callbacks.onDrop,
        onDragEnd: callbacks.onDragEnd
    };

    // --- RENDER LAYOUT ---

    // 1. Focal Couple (Center)
    const focalWrapper = document.createElement('div');
    focalWrapper.className = 'focal-couple';
    const coupleInner = document.createElement('div');
    coupleInner.className = 'couple-wrapper';

    // Focal Person
    coupleInner.appendChild(createCard(focalPerson, true, actionProps));

    // Spouses
    if (spouses.length > 0) {
        const heart = document.createElement('div');
        heart.className = 'heart-icon';
        heart.innerHTML = '❤️';
        coupleInner.appendChild(heart);

        const stack = document.createElement('div');
        stack.className = 'spouses-stack';
        stack.style.display = 'flex';
        stack.style.flexDirection = 'column';
        stack.style.gap = '1rem';
        stack.style.alignItems = 'center'; // Align button center

        spouses.forEach(spouse => stack.appendChild(createCard(spouse, true, actionProps)));

        // Always add the "Add Spouse" button at the bottom of the stack
        const addSpouseBtn = document.createElement('button');
        addSpouseBtn.className = 'btn-secondary';
        addSpouseBtn.style.padding = '0.4rem 0.8rem';
        addSpouseBtn.style.fontSize = '0.8rem';
        addSpouseBtn.style.marginTop = '0.5rem'; // spacing
        addSpouseBtn.innerHTML = '+ Add Spouse';
        addSpouseBtn.title = 'Add Another Spouse';
        addSpouseBtn.onclick = (e) => { e.stopPropagation(); onAddMember(focalPerson, 'spouse'); };

        stack.appendChild(addSpouseBtn);
        coupleInner.appendChild(stack);

    } else {
        const addSpouseBtn = document.createElement('button');
        addSpouseBtn.className = 'btn-secondary';
        addSpouseBtn.style.padding = '0.5rem';
        addSpouseBtn.style.borderRadius = '50%';
        addSpouseBtn.innerHTML = '+';
        addSpouseBtn.title = 'Add Spouse';
        addSpouseBtn.onclick = (e) => { e.stopPropagation(); onAddMember(focalPerson, 'spouse'); };
        coupleInner.appendChild(addSpouseBtn);
    }
    focalWrapper.appendChild(coupleInner);

    // 2. Children Columns
    const leftColumn = document.createElement('div');
    leftColumn.className = 'sons-column'; // Default class

    const rightColumn = document.createElement('div');
    rightColumn.className = 'daughters-column'; // Default class

    if (layoutMode === 'split' || layoutMode === 'empty') {
        // Standard Split
        sons.forEach(c => leftColumn.appendChild(createCard(c, false, actionProps)));
        daughters.forEach(c => rightColumn.appendChild(createCard(c, false, actionProps)));

        leftColumn.appendChild(createAddButton('Add Son', () => onAddMember(focalPerson, 'child-son')));
        rightColumn.appendChild(createAddButton('Add Daughter', () => onAddMember(focalPerson, 'child-daughter')));

        container.appendChild(leftColumn);
        container.appendChild(focalWrapper);
        container.appendChild(rightColumn);
    }
    else if (layoutMode === 'sons-only') {
        // Single Column Centered for Sons
        // Use rightColumn as the 'Main' children container for single column?
        // Actually, CSS grid: 1fr auto 1fr. 
        // If single-column, we want:
        // [ Focal ]
        //    |
        // [ Children ]

        // We need to change CSS for .single-column to be flex-col.

        // Render all sons into a container
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'single-column-children';
        sons.forEach(c => childrenContainer.appendChild(createCard(c, false, actionProps)));
        childrenContainer.appendChild(createAddButton('Add Son', () => onAddMember(focalPerson, 'child-son')));
        childrenContainer.appendChild(createAddButton('Add Daughter', () => onAddMember(focalPerson, 'child-daughter'))); // Still allow adding

        container.appendChild(focalWrapper);
        container.appendChild(childrenContainer);
    }
    else if (layoutMode === 'daughters-only') {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'single-column-children';
        daughters.forEach(c => childrenContainer.appendChild(createCard(c, false, actionProps)));
        childrenContainer.appendChild(createAddButton('Add Son', () => onAddMember(focalPerson, 'child-son')));
        childrenContainer.appendChild(createAddButton('Add Daughter', () => onAddMember(focalPerson, 'child-daughter')));

        container.appendChild(focalWrapper);
        container.appendChild(childrenContainer);
    }

    // --- UPDATE HEADER ---
    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
        let title = focalPerson.name;
        // If there's at least one spouse, append " & SpouseName"
        // We take the first spouse for the title usually, or maybe " & Family" if multiple
        if (spouses.length > 0) {
            title += ` & ${spouses[0].name.split(' ')[0]}`; // Use first name for brevity
        }

        // If it's the root couple, maybe keep it full or special? 
        // User requested "Sankar & Munni", so First Name & First Name is good.
        // Let's try to be smart:
        const pName = focalPerson.name.split(' ')[0];
        if (spouses.length > 0) {
            const sName = spouses[0].name.split(' ')[0];
            title = `${pName} & ${sName}`;
        } else {
            title = focalPerson.name;
        }

        headerTitle.textContent = title;
    }

    // --- DRAW CONNECTIONS ---
    requestAnimationFrame(() => {
        updateConnections(); // Use smart update wrapper
    });
}

// Public function to re-draw lines (e.g. on scroll)
export function updateConnections() {
    const container = document.getElementById('treeContainer');
    const svg = document.getElementById('connectionsSvg');
    const focalWrapper = container ? container.querySelector('.focal-couple') : null;

    if (!container || !svg || !focalWrapper) return;

    // Detect Layout Mode based on DOM
    let mode = 'split';
    if (container.classList.contains('single-column')) {
        mode = 'single';
    } else if (container.querySelector('.sons-column') && container.querySelector('.daughters-column')) {
        mode = 'split';
    }

    drawConnections(focalWrapper, container, mode, svg);
}

function drawConnections(focalEl, container, mode, svg) {
    if (!focalEl || !svg) return;

    // Clear previous lines
    svg.innerHTML = '';

    const wrapper = focalEl.querySelector('.couple-wrapper');
    const wrapperRect = wrapper.getBoundingClientRect();

    // Origin: Bottom Center of Parents (Absolute to Document)
    const originX = wrapperRect.left + wrapperRect.width / 2 + window.scrollX;
    const originY = wrapperRect.bottom + window.scrollY;

    // Ensure SVG covers full scroll height
    const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
    );
    svg.style.height = `${docHeight}px`;

    if (mode === 'split' || mode === 'empty') {
        const leftCol = container.querySelector('.sons-column');
        const rightCol = container.querySelector('.daughters-column');

        // Draw Left Connections (Sons)
        const leftCards = leftCol.querySelectorAll('.person-card');
        leftCards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            // Use absolute doc coordinates
            const targetX = cardRect.right + window.scrollX;
            const targetY = cardRect.top + cardRect.height / 2 + window.scrollY;

            drawCurvedPath(svg, originX, originY, targetX, targetY, 'left');
        });

        // Draw Right Connections (Daughters)
        const rightCards = rightCol.querySelectorAll('.person-card');
        rightCards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const targetX = cardRect.left + window.scrollX;
            const targetY = cardRect.top + cardRect.height / 2 + window.scrollY;

            drawCurvedPath(svg, originX, originY, targetX, targetY, 'right');
        });
    } else if (mode === 'single') {
        const childrenContainer = container.querySelector('.single-column-children');
        if (childrenContainer) {
            const cards = childrenContainer.querySelectorAll('.person-card');
            cards.forEach(card => {
                const cardRect = card.getBoundingClientRect();
                // Target: Top Center of Child Card
                const targetX = cardRect.left + (cardRect.width / 2) + window.scrollX;
                const targetY = cardRect.top + window.scrollY;

                // Draw Vertical S-Curve
                // originX is Parent Center. targetX is Child Center.
                // Since they are stacked vertically, this is a clean S-curve down.

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                // Control Points:
                // CP1: Go down from parent
                // CP2: Go up from child (or come down into child)

                const cp1y = originY + 80;
                const cp2y = targetY - 80;

                // If practically vertical, x1 == x2 roughly.
                // M x1 y1 C x1 cp1y, x2 cp2y, x2 y2

                const d = `M ${originX} ${originY} C ${originX} ${cp1y}, ${targetX} ${cp2y}, ${targetX} ${targetY}`;
                path.setAttribute('d', d);
                svg.appendChild(path);
            });
        }
    }
}

function drawCurvedPath(svg, x1, y1, x2, y2, direction) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Logic for "Tree Branch" style curves
    // Start at x1,y1 (Parent Bottom)
    // End at x2,y2 (Child Side)

    // We want a curve that goes DOWN from parent, then OUT to the side.
    const cp1x = x1;
    // const cp1y = y1 + verticalDrop; // Unused

    const cp2x = direction === 'left' ? x2 + 50 : x2 - 50; // Curve out before hitting side
    const cp2y = y2;

    // Adjust logic if needed for better look
    const finalD = `M ${x1} ${y1} C ${x1} ${y1 + 100}, ${x2} ${y2 - 100}, ${x2} ${y2}`;
    path.setAttribute('d', finalD);

    svg.appendChild(path);
}

function drawPath(svg, x1, y1, x2, y2, direction) {
    // Legacy wrapper if needed, or replaced by above
    drawCurvedPath(svg, x1, y1, x2, y2, direction);
}
