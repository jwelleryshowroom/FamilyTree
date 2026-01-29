
import { dbService } from './js/firebase/db.js';
import { initialMembers } from './js/data/familyData.js';

async function dump() {
    try {
        const members = await dbService.getAllMembers();
        console.log(JSON.stringify(members, null, 2));
    } catch (e) {
        console.error(e);
    }
}
dump();
