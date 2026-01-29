export async function debugData() {
    console.log("DEBUG: Fetching all members...");

    // We need to import dbService dynamically or assume it's available if this is run in context
    const { dbService } = await import('./firebase/db.js');

    try {
        const members = await dbService.getAllMembers();
        console.log("DEBUG: Total Members Found:", members.length);

        // Log raw data for first 5 to see schema
        console.log("DEBUG: RAW DATA SAMPLES:", JSON.stringify(members.slice(0, 5), null, 2));

        console.table(members.map(m => ({
            id: m.id,
            name: m.name,
            generation: m.generation,
            gender: m.gender,
            parents: m.parents
        })));

        // Specific checks
        const roots = members.filter(m => m.generation === 0);
        console.log("DEBUG: Roots found:", roots.length, roots.map(r => r.name));

        const sons = members.filter(m => m.generation === 1 && m.gender === 'male');
        console.log("DEBUG: Sons found (gen 1, male):", sons.length);

        const daughters = members.filter(m => m.generation === 1 && m.gender === 'female');
        console.log("DEBUG: Daughters found (gen 1, female):", daughters.length);

        return members;
    } catch (e) {
        console.error("DEBUG: Error fetching members", e);
    }
}
