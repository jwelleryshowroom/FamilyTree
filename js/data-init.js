import { dbService } from './firebase/db.js';

export async function initializeData() {
    console.log("Initializing Family Tree Data...");

    // Define the desired structure
    // IDs are arbitrary strings but we make them descriptive for the seed
    const initialMembers = [
        // ROOT COUPLE
        {
            id: 'root_nagendra',
            name: 'Nagendra',
            gender: 'male',
            generation: 0,
            spouseId: 'root_basanti',
            photoUrl: '',
            children: [
                'son_1', 'son_2', 'son_3', 'son_4', 'son_5', 'son_6',
                'daughter_1', 'daughter_2', 'daughter_3', 'daughter_4', 'daughter_5'
            ]
        },
        {
            id: 'root_basanti',
            name: 'Basanti',
            gender: 'female',
            generation: 0,
            spouseId: 'root_nagendra',
            photoUrl: '',
            children: [
                'son_1', 'son_2', 'son_3', 'son_4', 'son_5', 'son_6',
                'daughter_1', 'daughter_2', 'daughter_3', 'daughter_4', 'daughter_5'
            ]
        },

        // 6 SONS
        { id: 'son_1', name: 'Son 1', gender: 'male', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'son_2', name: 'Son 2', gender: 'male', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'son_3', name: 'Son 3', gender: 'male', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'son_4', name: 'Son 4', gender: 'male', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'son_5', name: 'Son 5', gender: 'male', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'son_6', name: 'Son 6', gender: 'male', generation: 1, parents: ['root_nagendra', 'root_basanti'] },

        // 5 DAUGHTERS
        { id: 'daughter_1', name: 'Daughter 1', gender: 'female', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'daughter_2', name: 'Daughter 2', gender: 'female', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'daughter_3', name: 'Daughter 3', gender: 'female', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'daughter_4', name: 'Daughter 4', gender: 'female', generation: 1, parents: ['root_nagendra', 'root_basanti'] },
        { id: 'daughter_5', name: 'Daughter 5', gender: 'female', generation: 1, parents: ['root_nagendra', 'root_basanti'] }
    ];

    try {
        const members = await dbService.seedIfEmpty(initialMembers);
        console.log("Data initialization successful. Members count:", members.length);
        return members;
    } catch (error) {
        console.error("Data initialization failed:", error);
        return [];
    }
}
