import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockFamilyTree, mockBoundingClientRect, cleanupDOM } from '../helpers/dom-helpers.js';

// We need to import the functions from renderer.js
// Since they're not exported, we'll need to test them through the module
// For now, let's create a test module that exposes the functions for testing

describe('Connection Rendering - setupConnectionPaths', () => {
    beforeEach(() => {
        cleanupDOM();
    });

    afterEach(() => {
        cleanupDOM();
    });

    it('should create SVG path elements for each child', async () => {
        // Create mock family tree
        createMockFamilyTree({
            sons: ['Son1', 'Son2'],
            daughters: ['Daughter1']
        });

        // Import and execute setupConnectionPaths
        const { setupConnectionPaths } = await import('../../js/renderer.js?v=' + Date.now());

        setupConnectionPaths();

        const svg = document.getElementById('connectionsSvg');
        const paths = svg.querySelectorAll('path');

        // Should create 3 paths (2 sons + 1 daughter)
        expect(paths.length).toBe(3);
    });

    it('should handle single-column layout', async () => {
        createMockFamilyTree({
            sons: ['Son1', 'Son2'],
            daughters: [],
            layout: 'single-column'
        });

        const { setupConnectionPaths } = await import('../../js/renderer.js?v=' + Date.now());
        setupConnectionPaths();

        const svg = document.getElementById('connectionsSvg');
        const paths = svg.querySelectorAll('path');

        expect(paths.length).toBe(2);
    });

    it('should return early if container missing', async () => {
        // Don't create any DOM
        const { setupConnectionPaths } = await import('../../js/renderer.js?v=' + Date.now());

        // Should not throw error
        expect(() => setupConnectionPaths()).not.toThrow();
    });

    it('should return early if SVG missing', async () => {
        // Create container but not SVG
        const container = document.createElement('div');
        container.id = 'treeContainer';
        document.body.appendChild(container);

        const { setupConnectionPaths } = await import('../../js/renderer.js?v=' + Date.now());

        expect(() => setupConnectionPaths()).not.toThrow();
    });

    it('should return early if focal couple missing', async () => {
        // Create container and SVG but no focal couple
        const container = document.createElement('div');
        container.id = 'treeContainer';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'connectionsSvg';
        document.body.appendChild(svg);
        document.body.appendChild(container);

        const { setupConnectionPaths } = await import('../../js/renderer.js?v=' + Date.now());

        expect(() => setupConnectionPaths()).not.toThrow();
    });
});

describe('Connection Rendering - calculatePathD', () => {
    it('should use ±60px Y-offset for horizontal connections (left)', async () => {
        const { calculatePathD } = await import('../../js/renderer.js?v=' + Date.now());

        const path = calculatePathD(100, 200, 300, 400, 'left');

        // Should contain y1 + 60 = 260
        expect(path).toContain('260');
        // Should contain y2 - 60 = 340
        expect(path).toContain('340');
        // Should NOT contain the OLD wrong values (y1 + 100 = 300 or y2 - 100 = 300)
        // But x2 = 300 is valid, so we can't test for "not 300"
        // Instead verify the full path structure
        expect(path).toBe('M 100 200 C 100 260, 350 340, 300 400');
    });

    it('should use ±60px Y-offset for horizontal connections (right)', async () => {
        const { calculatePathD } = await import('../../js/renderer.js?v=' + Date.now());

        const path = calculatePathD(100, 200, 300, 400, 'right');

        // Should contain y1 + 60 = 260
        expect(path).toContain('260');
        // Should contain y2 - 60 = 340
        expect(path).toContain('340');
    });

    it('should generate correct Bezier curve for vertical connections', async () => {
        const { calculatePathD } = await import('../../js/renderer.js?v=' + Date.now());

        const path = calculatePathD(100, 200, 100, 400, 'vertical');

        // Should start at origin (M 100 200)
        expect(path).toContain('M 100 200');
        // Should end at target (100 400)
        expect(path).toContain('100 400');
        // Should have control points with ±80px offset
        expect(path).toContain('280'); // y1 + 80
        expect(path).toContain('320'); // y2 - 80
    });

    it('should use correct control point X-offset for left direction', async () => {
        const { calculatePathD } = await import('../../js/renderer.js?v=' + Date.now());

        const path = calculatePathD(100, 200, 300, 400, 'left');

        // Should have cp2x = x2 + 50 = 350
        expect(path).toContain('350');
    });

    it('should use correct control point X-offset for right direction', async () => {
        const { calculatePathD } = await import('../../js/renderer.js?v=' + Date.now());

        const path = calculatePathD(100, 200, 300, 400, 'right');

        // Should have cp2x = x2 - 50 = 250
        expect(path).toContain('250');
    });

    it('should generate valid SVG path syntax', async () => {
        const { calculatePathD } = await import('../../js/renderer.js?v=' + Date.now());

        const path = calculatePathD(100, 200, 300, 400, 'left');

        // Should start with M (move to)
        expect(path).toMatch(/^M /);
        // Should contain C (cubic bezier)
        expect(path).toContain(' C ');
        // Should have correct number of coordinates (2 for M, 6 for C)
        const coords = path.match(/[\d.]+/g);
        expect(coords.length).toBe(8);
    });
});

describe('Connection Rendering - updateConnections', () => {
    beforeEach(() => {
        cleanupDOM();
    });

    afterEach(() => {
        cleanupDOM();
    });

    it('should use viewport coordinates from getBoundingClientRect', async () => {
        const { container, coupleWrapper } = createMockFamilyTree({
            sons: ['Son1'],
            daughters: []
        });

        // Mock getBoundingClientRect for couple wrapper
        mockBoundingClientRect(coupleWrapper, {
            left: 100,
            top: 50,
            width: 200,
            height: 100
        });

        // Mock getBoundingClientRect for child card
        const childCard = container.querySelector('.person-card[data-id="c-son-0"]');
        mockBoundingClientRect(childCard, {
            left: 300,
            top: 250,
            width: 150,
            height: 80
        });

        const { setupConnectionPaths, updateConnections } = await import('../../js/renderer.js?v=' + Date.now());

        setupConnectionPaths();
        updateConnections();

        const svg = document.getElementById('connectionsSvg');
        const path = svg.querySelector('path');

        expect(path).toBeTruthy();
        const d = path.getAttribute('d');
        expect(d).toBeTruthy();
        // Verify it's a valid path
        expect(d).toMatch(/^M /);
    });

    it('should return early if pathCache is empty', async () => {
        createMockFamilyTree({
            sons: ['Son1'],
            daughters: []
        });

        const { updateConnections } = await import('../../js/renderer.js?v=' + Date.now());

        // Don't call setupConnectionPaths, so pathCache is empty
        expect(() => updateConnections()).not.toThrow();
    });

    it('should update path d attribute for each cached path', async () => {
        const { container, coupleWrapper } = createMockFamilyTree({
            sons: ['Son1', 'Son2'],
            daughters: ['Daughter1']
        });

        // Mock getBoundingClientRect for all elements
        mockBoundingClientRect(coupleWrapper, {
            left: 100,
            top: 50,
            width: 200,
            height: 100
        });

        container.querySelectorAll('.person-card').forEach((card, idx) => {
            mockBoundingClientRect(card, {
                left: 200 + idx * 200,
                top: 250,
                width: 150,
                height: 80
            });
        });

        const { setupConnectionPaths, updateConnections } = await import('../../js/renderer.js?v=' + Date.now());

        setupConnectionPaths();
        updateConnections();

        const svg = document.getElementById('connectionsSvg');
        const paths = svg.querySelectorAll('path');

        // All 3 paths should have d attribute
        expect(paths.length).toBe(3);
        paths.forEach(path => {
            const d = path.getAttribute('d');
            expect(d).toBeTruthy();
            expect(d).toMatch(/^M /);
        });
    });

    it('should calculate origin from couple wrapper bottom-center', async () => {
        const { coupleWrapper } = createMockFamilyTree({
            sons: ['Son1'],
            daughters: []
        });

        mockBoundingClientRect(coupleWrapper, {
            left: 100,
            top: 50,
            width: 200,
            height: 100
        });

        const childCard = document.querySelector('.person-card[data-id="c-son-0"]');
        mockBoundingClientRect(childCard, {
            left: 300,
            top: 250,
            width: 150,
            height: 80
        });

        const { setupConnectionPaths, updateConnections } = await import('../../js/renderer.js?v=' + Date.now());

        setupConnectionPaths();
        updateConnections();

        const path = document.querySelector('#connectionsSvg path');
        const d = path.getAttribute('d');

        // Origin should be at (100 + 200/2, 50 + 100) = (200, 150)
        expect(d).toContain('M 200 150');
    });
});
