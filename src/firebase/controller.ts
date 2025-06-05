import { db } from "./config";
import { doc, onSnapshot } from "firebase/firestore";

// Function to subscribe and listen for changes
export const listenForGameEnd = (gameId: string, onGameEnd: () => void) => {
  const gameDocRef = doc(db, "games", gameId);

  // Set up a listener for the 'isEnded' field
  onSnapshot(gameDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.isEnded) {
        onGameEnd(); // Call the provided callback when the game ends
      }
    }
  });
};