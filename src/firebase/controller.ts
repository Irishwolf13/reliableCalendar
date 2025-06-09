import { db } from "../firebase/config"; // Ensure the correct path is used
import { collection, query, onSnapshot, QuerySnapshot, doc, updateDoc, where, getDocs } from "firebase/firestore";

// Define the Job interface if not already defined here or imported
interface Job {
  jobID: number;
  title: string;
  backgroundColor: string;
  eventDates: string[];
  eventHours: number[];
  hours: number;
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
        eventHours: data.eventHours,
        hours: data.hours,
      });
    });
    callback(jobs);
  });
};

export const updateJobEventDatesByNumberID = async (
  jobId: number,
  updatedEventDates: string[]
): Promise<void> => {
  try {
    if (!jobId) {
      throw new Error('Invalid Job ID');
    } // Gate Check

    const jobsCollectionRef = collection(db, 'jobs'); // Reference to the jobs collection
    const q = query(jobsCollectionRef, where('jobID', '==', jobId)); // Create a query against the collection
    const querySnapshot = await getDocs(q); // Execute the query

    if (querySnapshot.empty) {
      // Check if we have any results
      console.error(`No job found with jobID: ${jobId}`);
      return;
    }

    querySnapshot.forEach((docSnapshot) => {
      if (docSnapshot.exists()) {
        const docRef = docSnapshot.ref;
        const jobData = docSnapshot.data();

        // Extract perDayHours from the job document
        const perDayHours = jobData.perDayHours;

        if (typeof perDayHours !== 'number') {
          console.error('perDayHours is not defined or invalid.');
          return;
        }

        // Get current eventHours or initialize an empty array if not present
        let currentEventHours = jobData.eventHours || [];

        // Ensure eventHours matches the length of updatedEventDates
        while (currentEventHours.length < updatedEventDates.length) {
          currentEventHours.push(perDayHours);
        }

        updateDoc(docRef, {
          eventDates: updatedEventDates,
          eventHours: currentEventHours,
        })
          .then(() => console.log('Firestore successfully updated!'))
          .catch((error) =>
            console.error('Error updating document:', error)
          );
      }
    });
  } catch (error) {
    console.error('Error accessing Firestore:', error);
  }
};
