import { describe, it, expect } from 'vitest';

describe('Application Integrity', () => {
    it('app.js should load without syntax errors', async () => {
        try {
            // We use a dynamic import to catch syntax errors during module evaluation
            await import('../../js/app.js');
            expect(true).toBe(true);
        } catch (e) {
            // If there's a syntax error or runtime error at top-level, this catches it
            throw new Error(`CRITICAL: app.js failed to load: ${e.message}`);
        }
    });
});
