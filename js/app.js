import { initialMembers } from './data/familyData.js';
import { renderFamily, updateConnections } from './renderer.js?v=3.8';
import { AddMemberForm } from './components/AddMemberForm.js';
import { ConfirmModal } from './components/ConfirmModal.js';
import { dbService } from './firebase/db.js';
import { storageService } from './firebase/storage.js';
import { initTilt } from './tilt.js';

// State
const state = {
    members: [], // Start empty, load from DB
    currentFocalId: 'root_nagendra',
    history: []
};

// Components
let addMemberForm;
let confirmModal;

// DOM Elements
const backButton = document.getElementById('backButton');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    try {
        // Init Components
        addMemberForm = new AddMemberForm((data) => onFormSubmit(data));
        confirmModal = new ConfirmModal((member) => executeDeleteMember(member));

        // Load Data / Seed
        state.members = await dbService.seedIfEmpty(initialMembers);
        console.log('Members loaded:', state.members.length);

        // Load persisted view
        const storedFocalId = localStorage.getItem('familyTree_currentFocalId');
        if (storedFocalId) {
            state.currentFocalId = storedFocalId;
        }

        // Initial Render
        updateView(state.currentFocalId);

        // View Toggle Listener
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        if (viewToggleBtn) {
            viewToggleBtn.addEventListener('click', () => {
                document.body.classList.toggle('view-only');
                const isViewMode = document.body.classList.contains('view-only');
                viewToggleBtn.textContent = isViewMode ? 'Edit' : 'Save View';
                viewToggleBtn.classList.toggle('btn-primary', isViewMode); // Highlight 'Edit'
                viewToggleBtn.classList.toggle('btn-secondary', !isViewMode);

                // Redraw lines after DOM update
                requestAnimationFrame(() => {
                    updateConnections();
                });
            });
        }

        // ... (Event Listeners) ...
        document.getElementById('treeContainer').addEventListener('click', (e) => {
            const card = e.target.closest('.person-card');
            if (card && card.dataset.id) {
                const selectedId = card.dataset.id;
                if (!isCurrentFocal(selectedId)) {
                    navigateTo(selectedId);
                }
            }
        });

        // Back Button
        backButton.addEventListener('click', () => {
            if (state.history.length > 0) {
                const previousId = state.history.pop();
                navigateTo(previousId, false); // false = don't push to history
            } else {
                // Fallback: If no history (e.g. after refresh), go to Root
                navigateTo('root_nagendra', false);
            }
        });

        // Resize Handler
        window.addEventListener('resize', () => {
            renderFamily(state.currentFocalId, state.members, {
                onAddMember: openAddModal,
                onEditMember: handleEditMember,
                onDeleteMember: handleDeleteMember,
                onDragStart: handleDragStart,
                onDragOver: handleDragOver,
                onDrop: handleDrop,
                onDragEnd: handleDragEnd
            });
        });

        // Scroll Handler for Connection Lines (Rubber-band effect)
        window.addEventListener('scroll', () => {
            requestAnimationFrame(() => {
                updateConnections();
                initTilt(); // Initial init
            });
        });

    } catch (error) {
        console.error("Initialization failed:", error);
        alert("Failed to load family tree data.");
    }
}

function navigateTo(id, addToHistory = true) {
    if (addToHistory && state.currentFocalId && state.currentFocalId !== id) {
        state.history.push(state.currentFocalId);
    }
    state.currentFocalId = id;
    localStorage.setItem('familyTree_currentFocalId', id);
    updateView(id);
}

function updateBackButton() {
    // Show back button if history exists OR if we are not at root (allow return to home)
    if (state.history.length > 0 || state.currentFocalId !== 'root_nagendra') {
        backButton.classList.remove('hidden');
    } else {
        backButton.classList.add('hidden');
    }
}

function isCurrentFocal(id) {
    const person = state.members.find(m => m.id === state.currentFocalId);
    if (!person) return false;
    if (person.id === id) return true;
    if (person.spouses && person.spouses.includes(id)) return true;
    return false;
}

// --- Add Member Logic ---

function openAddModal(parent, relation) {
    addMemberForm.open(parent, relation);
}

async function handleAddMember(data) {
    try {
        if (data.type === 'ADD') {
            const { newMember, parentId, relation } = data;

            // 1. Upload Photo if present
            if (newMember.photoFile) {
                try {
                    const url = await storageService.uploadFile(newMember.photoFile, `members/${newMember.id}`);
                    newMember.photoUrl = url;
                } catch (e) {
                    console.error("Photo upload failed", e);
                    // Continue without photo or alert?
                }
                delete newMember.photoFile; // Don't save File object to DB
            }

            // 2. Add new member to local state
            state.members.push(newMember);

            // 2. Link with Parent
            const parent = state.members.find(m => m.id === parentId);
            if (!parent) return;

            const affectedMembers = [newMember];

            if (relation === 'spouse') {
                newMember.spouses.push(parentId);
                if (!parent.spouses.includes(newMember.id)) {
                    parent.spouses.push(newMember.id);
                }
                affectedMembers.push(parent);

            } else if (relation.startsWith('child')) {
                newMember.parents.push(parentId);
                if (!parent.children.includes(newMember.id)) {
                    parent.children.push(newMember.id);
                }
                affectedMembers.push(parent);

                // Also add other parent (spouse of focal) if exists? 
                // For simplicity, we stick to the current parent logic.
            }

            // 3. Render (Optimistic)
            updateView(state.currentFocalId);
            setTimeout(initTilt, 100); // Re-init tilt on new elements

            // 4. Persist (Background)
            await Promise.all(affectedMembers.map(m => dbService.saveMember(m)));
        }
    } catch (error) {
        console.error('Error adding member:', error);
        alert('Failed to add member');
    }
}

// Handler for Form Submit (Add or Edit)
async function onFormSubmit(data) {
    if (data.type === 'ADD') {
        handleAddMember(data);
    } else if (data.type === 'EDIT') {
        try {
            const { id, updates } = data;



            // 1. Upload Photo if present in updates
            if (updates.photoFile) {
                try {
                    const url = await storageService.uploadFile(updates.photoFile, `members/${id}`);
                    updates.photoUrl = url;
                } catch (e) {
                    console.error("Photo upload failed", e);
                }
                delete updates.photoFile;
            }

            // 2. Update Local State (Optimistic)
            const memberIndex = state.members.findIndex(m => m.id === id);
            if (memberIndex !== -1) {
                state.members[memberIndex] = { ...state.members[memberIndex], ...updates };
            }

            // 2. Render IMMEDIATELY
            updateView(state.currentFocalId);
            setTimeout(initTilt, 100);

            // 3. Persist (Background)
            await dbService.updateMember(id, updates);

        } catch (error) {
            console.error('Error updating member:', error);
            alert('Save failed! Check internet connection.');
            // Optional: Revert state here
        }
    }
}


// --- Edit / Delete Logic ---

function handleEditMember(member) {
    addMemberForm.openEdit(member);
}

function handleDeleteMember(member) {
    // Open Custom Modal
    confirmModal.open(`Are you sure you want to delete ${member.name}?`, member, 'Delete');
}

async function executeDeleteMember(member) {
    try {
        const relatedIds = [...(member.parents || []), ...(member.spouses || []), ...(member.children || [])];

        // 1. Remove from Members Array
        state.members = state.members.filter(m => m.id !== member.id);

        // 2. Clean up References in Local State
        const affectedMembers = [];
        state.members.forEach(m => {
            let changed = false;
            if (m.spouses && m.spouses.includes(member.id)) {
                m.spouses = m.spouses.filter(id => id !== member.id);
                changed = true;
            }
            if (m.children && m.children.includes(member.id)) {
                m.children = m.children.filter(id => id !== member.id);
                changed = true;
            }
            if (m.parents && m.parents.includes(member.id)) {
                m.parents = m.parents.filter(id => id !== member.id);
                changed = true;
            }
            if (changed) affectedMembers.push(m);
        });

        // 3. Update View IMMEDIATELY (Optimistic)
        if (state.currentFocalId === member.id) {
            state.currentFocalId = 'root_nagendra';
            state.history = [];
        }
        updateView(state.currentFocalId);

        // 4. DB Updates (Background)
        // Delete the member doc
        await dbService.deleteMember(member.id);

        // Update all members who had references
        await Promise.all(affectedMembers.map(m => dbService.saveMember(m)));

    } catch (error) {
        console.error("Error deleting member:", error);
        alert("Failed to delete member.");
    }
}

function updateView(id) {
    const callbacks = {
        onAddMember: (parent, relation) => openAddModal(parent, relation),
        onEditMember: (member) => handleEditMember(member),
        onDeleteMember: (member) => handleDeleteMember(member),
        onDragStart: handleDragStart,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
        onDragEnd: handleDragEnd
    };

    renderFamily(id, state.members, callbacks);
    updateBackButton();
    document.getElementById('treeContainer').scrollTop = 0;
}

// --- Drag & Drop Handlers ---
let draggedPerson = null;

function handleDragStart(e, person) {
    draggedPerson = person;
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
    // Add dragging class for styling if needed
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';

    // Optional: Add visual indicator for drop target
    const card = e.target.closest('.person-card');
    if (card && !card.classList.contains('dragging')) {
        // Remove from others
        document.querySelectorAll('.person-card.drag-over').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
    }
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    e.target.classList.remove('dragging');
    draggedPerson = null;
    document.querySelectorAll('.person-card').forEach(card => card.classList.remove('drag-over'));
}

async function handleDrop(e, targetPerson) {
    e.preventDefault();
    if (!draggedPerson || draggedPerson.id === targetPerson.id) return;
    if (draggedPerson.gender !== targetPerson.gender) return; // Only allow reordering same gender

    const focalPerson = state.members.find(m => m.id === state.currentFocalId);
    if (!focalPerson || !focalPerson.children) return;

    // Get current children objects to find indices
    const children = focalPerson.children.map(cid => state.members.find(m => m.id === cid)).filter(Boolean);

    // Filter by gender to get the visual list we are reordering within
    const sameGenderChildren = children.filter(c => c.gender === draggedPerson.gender);

    const oldIndex = sameGenderChildren.findIndex(c => c.id === draggedPerson.id);
    const newIndex = sameGenderChildren.findIndex(c => c.id === targetPerson.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Remove from old position and insert at new position in the *visual* list
    const visualList = [...sameGenderChildren];
    visualList.splice(oldIndex, 1);
    visualList.splice(newIndex, 0, draggedPerson);

    // Reconstruct the full children list
    const otherGenderChildren = children.filter(c => c.gender !== draggedPerson.gender);

    let newChildrenList = [];
    if (draggedPerson.gender === 'male') {
        newChildrenList = [...visualList, ...otherGenderChildren];
    } else {
        newChildrenList = [...otherGenderChildren, ...visualList];
    }

    // Map back to IDs
    const newChildrenIds = newChildrenList.map(c => c.id);

    // Update State Optimistically
    focalPerson.children = newChildrenIds;
    updateView(state.currentFocalId);

    // Persist
    try {
        await dbService.updateMember(focalPerson.id, { children: newChildrenIds });
        console.log('Order updated');
    } catch (error) {
        console.error('Failed to save order:', error);
        alert('Failed to save new order.');
    }
}
