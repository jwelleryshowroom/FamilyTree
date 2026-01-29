import { storage } from './config.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

export const storageService = {
    /**
     * Upload an image to Firebase Storage
     * @param {File} file The file to upload
     * @param {string} path The path in storage (e.g., 'profile_photos/memberId.jpg')
     * @returns {Promise<string>} The download URL of the uploaded image
     */
    async uploadImage(file, path) {
        try {
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image: ", error);
            throw error;
        }
    }
};
