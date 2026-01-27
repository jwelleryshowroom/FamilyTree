export const initialMembers = [
    // Root Couple
    {
        id: "root_nagendra",
        name: "Nagendra Prasad Sah",
        gender: "male",
        status: "deceased",
        parents: [],
        spouses: ["grandmother_basanti", "grandmother_second"],
        children: [
            "son_1", "son_2", "son_3", "son_4", "son_5", "son_6", // 6 Sons
            "daughter_1", "daughter_2", "daughter_3", "daughter_4", "daughter_5" // 5 Daughters
        ],
        location: "Heli, Katoriya",
        phone: ""
    },
    {
        id: "grandmother_basanti",
        name: "Basanti Devi",
        gender: "female",
        status: "deceased",
        parents: [],
        spouses: ["root_nagendra"],
        children: [
            "son_1", "son_2", "son_3", "son_4", "son_5", "son_6",
            "daughter_1", "daughter_2", "daughter_3", "daughter_4", "daughter_5"
        ],
        location: "Heli, Katoriya",
        phone: ""
    },

    // --- 6 Sons ---
    { id: "son_1", name: "Sankar", gender: "male", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "son_2", name: "Dinesh", gender: "male", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "son_3", name: "Ajay", gender: "male", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "son_4", name: "Ganga", gender: "male", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "son_5", name: "Rajesh", gender: "male", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "son_6", name: "Kamal", gender: "male", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },

    // --- 5 Daughters ---
    { id: "daughter_1", name: "Mala", gender: "female", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "daughter_2", name: "Mandila", gender: "female", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "daughter_3", name: "Bina", gender: "female", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "daughter_4", name: "Sindo", gender: "female", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] },
    { id: "daughter_5", name: "Bindo", gender: "female", status: "deceased", parents: ["root_nagendra", "grandmother_basanti"], spouses: [], children: [] }
];
