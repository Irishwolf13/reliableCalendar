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
  shippingDate: string;
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
        shippingDate: data.shippingDate,
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

// Function to delete the last eventDate and eventHour by job ID
export const deleteLastEventByJobID = async (jobId: number): Promise<void> => {
  try {
    if (!jobId) {
      throw new Error('Invalid Job ID');
    }

    const jobsCollectionRef = collection(db, 'jobs');
    const q = query(jobsCollectionRef, where('jobID', '==', jobId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error(`No job found with jobID: ${jobId}`);
      return;
    }

    querySnapshot.forEach(async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const docRef = docSnapshot.ref;
        const jobData = docSnapshot.data();

        // Extract current eventDates and eventHours
        let currentEventDates = jobData.eventDates || [];
        let currentEventHours = jobData.eventHours || [];

        // Remove the last element from eventDates and eventHours arrays
        if (currentEventDates.length > 0) {
          currentEventDates.pop();
        }
        if (currentEventHours.length > 0) {
          currentEventHours.pop();
        }

        // Update the job document in Firestore
        await updateDoc(docRef, {
          eventDates: currentEventDates,
          eventHours: currentEventHours,
        });

        console.log('Successfully deleted the last event.');
      }
    });
  } catch (error) {
    console.error('Error updating Firestore:', error);
  }
};



export const updateShippingDate = async (
  jobId: number,
  newShippingDate: string
): Promise<void> => {
  try {
    if (!jobId) {
      throw new Error('Invalid Job ID');
    }

    const jobsCollectionRef = collection(db, 'jobs');
    const q = query(jobsCollectionRef, where('jobID', '==', jobId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error(`No job found with jobID: ${jobId}`);
      return;
    }

    querySnapshot.forEach(async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const docRef = docSnapshot.ref;

        // Update the shippingDate field in Firestore
        await updateDoc(docRef, {
          shippingDate: newShippingDate,
        });

        console.log(`Successfully updated the shipping date to ${newShippingDate} for job ${jobId}.`);
      }
    });
  } catch (error) {
    console.error('Error updating shippingDate in Firestore:', error);
  }
};
