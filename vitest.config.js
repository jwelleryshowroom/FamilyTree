import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true, // Allows using describe, it, expect without importing
        alias: {
            // Mock Firebase imports to avoid network calls and ESM issues with CDNs
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js': path.resolve(__dirname, './tests/mocks/firebase.js'),
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js': path.resolve(__dirname, './tests/mocks/firebase.js'),
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js': path.resolve(__dirname, './tests/mocks/firebase.js'),
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js': path.resolve(__dirname, './tests/mocks/firebase.js'),
        }
    }
});
