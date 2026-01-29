import { initializeData } from './data-init.js';
import { uiRenderer } from './ui-renderer.js';
import { dbService } from './firebase/db.js';

async function initApp() {
    console.log("App starting...");

    // DEBUG: Analyse data
    // const { debugData } = await import('./debug-tools.js');
    // await debugData();

    const members = await initializeData();
    console.log("Loaded Members:", members.length);

    if (members && members.length > 0) {
        window.uiRenderer = uiRenderer; // v2.9.1 - Ensure global access for inline event handlers
        uiRenderer.renderTree(members);
    }
}

// Event Listeners for UI Actions

// --- ADD SPOUSE ---
document.addEventListener('add-spouse', async (e) => {
    const { memberId, spouseName } = e.detail;
    console.log("Processing add-spouse:", memberId, spouseName);

    try {
        // Fetch fresh list or find in current (better to fetch to be safe)
        const members = await dbService.getAllMembers();
        const originalMember = members.find(m => m.id === memberId);

        if (!originalMember) {
            alert("Error: Member not found.");
            return;
        }

        const newSpouseId = `spouse_${Date.now()}`;
        const newSpouse = {
            id: newSpouseId,
            name: spouseName,
            spouseId: memberId,
            generation: originalMember.generation, // Spouse is same generation
            gender: originalMember.gender === 'male' ? 'female' : 'male', // Assume opposite
            children: originalMember.children || []
        };

        console.log("Saving new spouse:", newSpouse);

        // 1. Create Spouse
        await dbService.saveMember(newSpouse);

        // 2. Update Original Member
        await dbService.updateMember(memberId, { spouseId: newSpouseId });

        console.log("Spouse added successfully!");
        uiRenderer.showToast("Spouse added successfully!", "success");
        await initApp(); // Refresh UI
    } catch (error) {
        console.error("Error adding spouse:", error);
        uiRenderer.showToast("Failed to add spouse.", "error");
    }
});

// --- ADD CHILD ---
document.addEventListener('add-child', async (e) => {
    const { parentId, childName, gender } = e.detail;
    console.log(`[EVENT] Received add-child: Target Parent ID=${parentId}, Child Name=${childName}`);

    try {
        const members = await dbService.getAllMembers();
        const parent = members.find(m => m.id === parentId);

        if (!parent) {
            alert("Error: Parent not found.");
            return;
        }

        const newChildId = e.detail.childId || `child_${Date.now()}`;
        const newChild = {
            id: newChildId,
            name: childName,
            gender: gender,
            generation: (parent.generation || 0) + 1,
            parents: [parentId],
            status: e.detail.status || 'alive',
            photoUrl: e.detail.photoUrl || null,
            dob: e.detail.dob || null,
            whatsapp: e.detail.whatsapp || null,
            gallery: e.detail.gallery || []
        };
        const spouseId = e.detail.spouseId || parent.spouseId;
        if (spouseId && !newChild.parents.includes(spouseId)) {
            newChild.parents.push(spouseId);
        }

        console.log("Saving new child with parents:", newChild.parents);

        // 1. Create Child
        await dbService.saveMember(newChild);

        // 2. Update Parents' children list
        const updates = [];
        const parentChildren = parent.children || [];
        updates.push(dbService.updateMember(parentId, { children: [...parentChildren, newChildId] }));

        if (spouseId) {
            const spouse = members.find(m => m.id === spouseId);
            if (spouse) {
                const spouseChildren = spouse.children || [];
                updates.push(dbService.updateMember(spouseId, { children: [...spouseChildren, newChildId] }));
            }
        }
        await Promise.all(updates);

        console.log("Child added successfully!");
        uiRenderer.showToast("Member added to lineage!", "success");
        await initApp(); // Refresh UI

    } catch (error) {
        console.error("Error adding child:", error);
        uiRenderer.showToast("Failed to add member.", "error");
    }
});

initApp();
