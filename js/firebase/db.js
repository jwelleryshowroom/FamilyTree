import { db } from './config.js';
import { collection, getDocs, setDoc, doc, deleteDoc, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'members';

export const dbService = {
    // Fetch all members
    async getAllMembers() {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (error) {
            console.error("Error getting members: ", error);
            throw error;
        }
    },

    // Save or Update a member (Upsert)
    // We use setDoc with merge: true to handle both new and existing
    async saveMember(member) {
        try {
            const memberRef = doc(db, COLLECTION_NAME, member.id);
            // Ensure undefined values are not passed (Firestore hates undefined)
            const cleanMember = JSON.parse(JSON.stringify(member));
            await setDoc(memberRef, cleanMember, { merge: true });
        } catch (error) {
            console.error("Error saving member: ", error);
            throw error;
        }
    },

    // Update specific fields
    async updateMember(id, updates) {
        return this.saveMember({ id, ...updates });
    },

    // Delete a member
    async deleteMember(memberId) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, memberId));
        } catch (error) {
            console.error("Error deleting member: ", error);
            throw error;
        }
    },

    // Batch update sort order
    async updateMemberOrder(orderMap) {
        try {
            const batch = writeBatch(db);
            Object.keys(orderMap).forEach(memberId => {
                const memberRef = doc(db, COLLECTION_NAME, memberId);
                batch.set(memberRef, { sortOrder: orderMap[memberId] }, { merge: true });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error updating member order: ", error);
            throw error;
        }
    },

    // Seed or Sync database
    async seedIfEmpty(initialData) {
        let members = await this.getAllMembers();

        // Smart Sync: Check if any initial members are missing and add them
        // This fixes issues where code updates (new seed data) aren't reflected in existing DBs
        const missingMembers = [];
        const existingIds = new Set(members.map(m => m.id));

        initialData.forEach(seedMember => {
            if (!existingIds.has(seedMember.id)) {
                missingMembers.push(seedMember);
            }
        });

        if (missingMembers.length > 0) {
            console.log(`Found ${missingMembers.length} missing initial members. Syncing...`);
            const batch = writeBatch(db);
            missingMembers.forEach(member => {
                const docRef = doc(db, COLLECTION_NAME, member.id);
                const cleanMember = JSON.parse(JSON.stringify(member));
                batch.set(docRef, cleanMember);
            });
            await batch.commit();
            console.log("Database sync complete!");

            // Re-fetch to get complete list including the new ones
            members = await this.getAllMembers();
        }

        return members;
    }
};
