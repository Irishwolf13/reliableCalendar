import { db } from "../firebase/config"; // Ensure the correct path is used
import { collection, query, onSnapshot, QuerySnapshot, doc, updateDoc, where, getDocs } from "firebase/firestore";

// Define the Job interface if not already defined here or imported
interface Job {
  jobID: number;
  title: string;
  backgroundColor: string;
  eventDates: string[];
}

// Function to subscribe to jobs collection
export const subscribeToJobs = (callback: (jobs: Job[]) => void): (() => void) => {
  const q = query(collection(db, 'jobs'));

  // Returning unsubscribe function for cleanup
  return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
    const jobs: Job[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      jobs.push({
        jobID: data.jobID,
        title: data.title,
        backgroundColor: data.backgroundColor,
        eventDates: data.eventDates,
      });
    });
    callback(jobs);
  });
};

export const updateJobEventDatesByNumberID = async (jobId: number, updatedEventDates: string[]): Promise<void> => {
  try {
    if (!jobId) {
      throw new Error('Invalid Job ID');
    }

    // Reference to the jobs collection
    const jobsCollectionRef = collection(db, 'jobs');

    // Create a query against the collection
    const q = query(jobsCollectionRef, where('jobID', '==', jobId));

    // Execute the query
    const querySnapshot = await getDocs(q);

    // Check if we have any results
    if (querySnapshot.empty) {
      console.error(`No job found with jobID: ${jobId}`);
      return;
    }

    // Iterate over the query results
    querySnapshot.forEach((docSnapshot) => {
      if (docSnapshot.exists()) {
        // Get the document reference and update it
        const docRef = docSnapshot.ref;
        
        updateDoc(docRef, { eventDates: updatedEventDates })
          .then(() => console.log('Firestore successfully updated!'))
          .catch(error => console.error('Error updating document:', error));
      }
    });
    
  } catch (error) {
    console.error('Error accessing Firestore:', error);
  }
};