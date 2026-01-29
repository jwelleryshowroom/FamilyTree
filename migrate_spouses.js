
import { dbService } from './js/firebase/db.js';

async function updateRelationships() {
    const log = [];
    log.push("Starting Relationship Update...");

    try {
        const members = await dbService.getAllMembers();

        // Find Rajesh
        const rajesh = members.find(m => m.name && m.name.includes("Rajesh"));
        if (!rajesh) {
            log.push("❌ Could not find Rajesh");
            throw new Error("Rajesh not found");
        }
        log.push(`✅ Found Rajesh: ${rajesh.id} (${rajesh.name})`);

        // Find Sasita
        const sasita = members.find(m => m.name && m.name.includes("Sasita"));
        if (!sasita) {
            log.push("❌ Could not find Sasita");
            throw new Error("Sasita not found");
        }
        log.push(`✅ Found Sasita: ${sasita.id} (${sasita.name})`);

        // Find Kanchana
        const kanchana = members.find(m => m.name && m.name.includes("Kanchana"));
        if (!kanchana) {
            log.push("❌ Could not find Kanchana");
            throw new Error("Kanchana not found");
        }
        log.push(`✅ Found Kanchana: ${kanchana.id} (${kanchana.name})`);

        // Find Amit and Priti
        const amit = members.find(m => m.name && m.name.includes("Amit"));
        const priti = members.find(m => m.name && m.name.includes("Priti"));

        if (amit) log.push(`✅ Found Amit: ${amit.id}`);
        if (priti) log.push(`✅ Found Priti: ${priti.id}`);

        // 1. Update Rajesh to have both spouses
        const spouses = Array.from(new Set([sasita.id, kanchana.id]));
        await dbService.updateMember(rajesh.id, { spouses: spouses });
        log.push("✅ Updated Rajesh spouses array");

        // 2. Clear Sasita and Kanchana's spouseId to use spouses array (future proof)
        await dbService.updateMember(sasita.id, { spouses: [rajesh.id] });
        await dbService.updateMember(kanchana.id, { spouses: [rajesh.id] });

        // 3. Assign Children
        const childrenIds = rajesh.children || [];
        for (const childId of childrenIds) {
            const child = members.find(m => m.id === childId);
            if (!child) continue;

            if (child.name && (child.name.includes("Amit") || child.name.includes("Priti"))) {
                // Sasita's children
                await dbService.updateMember(childId, { parents: [rajesh.id, sasita.id] });
                log.push(`👶 Linked ${child.name} to Sasita`);
            } else {
                // Kanchana's children
                await dbService.updateMember(childId, { parents: [rajesh.id, kanchana.id] });
                log.push(`👶 Linked ${child.name} to Kanchana`);
            }
        }

        log.push("🚀 ALL UPDATES COMPLETE!");
    } catch (e) {
        log.push(`❌ ERROR: ${e.message}`);
    }

    // Since I can't log to console and see, I'll log to a file
    console.log(log.join("\n"));
}

updateRelationships();
