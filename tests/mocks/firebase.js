// Mock Firebase implementation for tests
import { vi } from 'vitest';

export const initializeApp = vi.fn(() => ({
    name: '[Mock] Firebase App'
}));

export const getAnalytics = vi.fn();

export const getFirestore = vi.fn(() => ({
    type: 'firestore'
}));

export const getStorage = vi.fn(() => ({
    type: 'storage'
}));

// Firestore Functions
export const collection = vi.fn((db, name) => ({ db, name }));
export const doc = vi.fn((db, col, id) => ({ db, col, id }));
export const getDocs = vi.fn(() => Promise.resolve({ docs: [] }));
export const setDoc = vi.fn(() => Promise.resolve());
export const deleteDoc = vi.fn(() => Promise.resolve());
export const query = vi.fn();
export const where = vi.fn();
export const writeBatch = vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn(() => Promise.resolve())
}));

// Storage Functions
export const ref = vi.fn();
export const uploadBytes = vi.fn(() => Promise.resolve({ ref: {} }));
export const getDownloadURL = vi.fn(() => Promise.resolve('https://mock-storage.com/image.jpg'));
