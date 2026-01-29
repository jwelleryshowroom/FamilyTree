/**
 * Test Helper Utilities for DOM Manipulation
 * Provides reusable functions for setting up mock DOM structures in tests
 */

/**
 * Creates a realistic family tree DOM structure for testing
 * @param {Object} options - Configuration options
 * @returns {Object} References to created DOM elements
 */
export function createMockFamilyTree(options = {}) {
    const {
        focalCouple = { male: 'Father', female: 'Mother' },
        sons = ['Son1', 'Son2'],
        daughters = ['Daughter1'],
        layout = 'two-column' // or 'single-column'
    } = options;

    // Create container
    const container = document.createElement('div');
    container.id = 'treeContainer';
    container.className = layout === 'single-column' ? 'single-column' : '';

    // Create SVG for connections
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'connectionsSvg';
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    // Create focal couple wrapper
    const focalWrapper = document.createElement('div');
    focalWrapper.className = 'focal-couple';

    const coupleWrapper = document.createElement('div');
    coupleWrapper.className = 'couple-wrapper';

    // Create couple cards
    const maleCard = createMockCard(focalCouple.male, 'male', 'p-male');
    const femaleCard = createMockCard(focalCouple.female, 'female', 'p-female');

    coupleWrapper.appendChild(maleCard);
    coupleWrapper.appendChild(femaleCard);
    focalWrapper.appendChild(coupleWrapper);
    container.appendChild(focalWrapper);

    // Create children columns
    if (layout === 'single-column') {
        const childrenColumn = document.createElement('div');
        childrenColumn.className = 'single-column-children';

        [...sons, ...daughters].forEach((name, idx) => {
            const card = createMockCard(name, idx < sons.length ? 'male' : 'female', `c-${idx}`);
            childrenColumn.appendChild(card);
        });

        container.appendChild(childrenColumn);
    } else {
        // Sons column
        const sonsColumn = document.createElement('div');
        sonsColumn.className = 'sons-column';
        sons.forEach((name, idx) => {
            const card = createMockCard(name, 'male', `c-son-${idx}`);
            sonsColumn.appendChild(card);
        });
        container.appendChild(sonsColumn);

        // Daughters column
        const daughtersColumn = document.createElement('div');
        daughtersColumn.className = 'daughters-column';
        daughters.forEach((name, idx) => {
            const card = createMockCard(name, 'female', `c-daughter-${idx}`);
            daughtersColumn.appendChild(card);
        });
        container.appendChild(daughtersColumn);
    }

    // Append to document
    document.body.appendChild(svg);
    document.body.appendChild(container);

    return {
        container,
        svg,
        focalWrapper,
        coupleWrapper,
        maleCard,
        femaleCard
    };
}

/**
 * Creates a mock person card element
 * @param {string} name - Person's name
 * @param {string} gender - Gender ('male' or 'female')
 * @param {string} id - Element ID
 * @returns {HTMLElement} Card element
 */
function createMockCard(name, gender, id) {
    const card = document.createElement('div');
    card.className = `person-card ${gender}`;
    card.dataset.id = id;

    const nameEl = document.createElement('h3');
    nameEl.textContent = name;
    card.appendChild(nameEl);

    return card;
}

/**
 * Simulates window scroll by updating scroll position
 * @param {number} scrollY - Scroll position in pixels
 */
export function simulateScroll(scrollY) {
    // Update window.scrollY
    Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: scrollY
    });

    Object.defineProperty(window, 'pageYOffset', {
        writable: true,
        configurable: true,
        value: scrollY
    });

    // Dispatch scroll event
    window.dispatchEvent(new Event('scroll'));
}

/**
 * Mocks getBoundingClientRect for an element
 * @param {HTMLElement} element - Element to mock
 * @param {Object} rect - Rect properties (top, left, width, height, etc.)
 */
export function mockBoundingClientRect(element, rect) {
    const defaultRect = {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        ...rect
    };

    // Calculate derived properties
    defaultRect.right = defaultRect.left + defaultRect.width;
    defaultRect.bottom = defaultRect.top + defaultRect.height;
    defaultRect.x = defaultRect.left;
    defaultRect.y = defaultRect.top;

    element.getBoundingClientRect = () => defaultRect;
}

/**
 * Waits for the next animation frame
 * @returns {Promise} Resolves after requestAnimationFrame callback
 */
export function waitForAnimationFrame() {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
}

/**
 * Cleans up the DOM after tests
 */
export function cleanupDOM() {
    document.body.innerHTML = '';
}

/**
 * Simulates a resize event
 * @param {number} width - New window width
 * @param {number} height - New window height
 */
export function simulateResize(width, height) {
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width
    });

    Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height
    });

    window.dispatchEvent(new Event('resize'));
}
