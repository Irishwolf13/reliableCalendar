import { db } from "../firebase/config"; // Ensure the correct path is used
import { collection, query, onSnapshot, QuerySnapshot, doc, updateDoc, where, getDocs, addDoc, getDoc, deleteDoc } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

//////////////////////////////  GENERAL FUNCTIONS  //////////////////////////////

// Define the Job interface if not already defined here or imported
interface Job {
  jobID: string;
  title: string;
  companyName: string;
  backgroundColor: string;
  eventDates: string[];
  eventHours: number[];
  perDayHours: number;
  hours: number;
  shippingDate: string | null;
  inHandDate: string | null;
  calendarName: string;
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
        inHandDate: data.inHandDate,
        calendarName: data.calendarName,
        companyName: data.companyName,
        perDayHours: data.perDayHours,
      });
    });
    callback(jobs);
  });
};

// Function to retrieve calendar names from siteInfo collection
export const getCalendarNames = async (): Promise<string[]> => {
  const docRef = doc(collection(db, 'siteInfo'), 'calendarNames');
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.names || [];
    } else {
      console.error("No such document!");
      return [];
    }
  } catch (error) {
    console.error("Error getting document:", error);
    return [];
  }
};

// Function to add a calendar name to the siteInfo collection
export const addCalendarName = async (newCalendarName: string): Promise<void> => {
  const docRef = doc(collection(db, 'siteInfo'), 'calendarNames');

  try {
    // Get the existing document
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentNames = data.names || [];

      // Add the new calendar name if it's not already present
      if (!currentNames.includes(newCalendarName)) {
        await updateDoc(docRef, {
          names: [...currentNames, newCalendarName],
        });
        console.log(`Added new calendar name: ${newCalendarName}`);
      } else {
        console.log(`Calendar name '${newCalendarName}' already exists.`);
      }
    } else {
      console.error("No such document!");
    }
  } catch (error) {
    console.error("Error updating document:", error);
  }
};

// Function to remove a calendar name from the siteInfo collection
export const removeCalendarName = async (calendarNameToRemove: string): Promise<void> => {
  const docRef = doc(collection(db, 'siteInfo'), 'calendarNames');

  try {
    // Get the existing document
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentNames = data.names || [];

      // Filter out the calendar name to remove
      const updatedNames = currentNames.filter((name: string) => name !== calendarNameToRemove);

      // Check if there was any change before updating
      if (updatedNames.length !== currentNames.length) {
        await updateDoc(docRef, {
          names: updatedNames,
        });
        console.log(`Removed calendar name: ${calendarNameToRemove}`);
      } else {
        console.log(`Calendar name '${calendarNameToRemove}' not found.`);
      }
    } else {
      console.error("No such document!");
    }
  } catch (error) {
    console.error("Error updating document:", error);
  }
};

// Define the SiteInfo interface if not already defined here or imported
interface SiteInfo {
  email: string;
  calendarNames: string[];
  id?: string; // Optional because it's added after creation
}

export const createSiteInfoDocument = async (email: string): Promise<SiteInfo | false | null> => {
  try {
    const siteInfoCollectionRef = collection(db, 'siteInfo');

    // Query to check if a document with this email already exists
    const emailQuery = query(siteInfoCollectionRef, where('email', '==', email));
    const querySnapshot = await getDocs(emailQuery);

    // Check if any documents were returned by the query
    if (!querySnapshot.empty) {
      console.log("Email already in use.");
      return false;
    }

    // Create a new document with the specified structure
    const siteInfo: SiteInfo = {
      email,
      calendarNames: ['main', 'secondary'],
    };

    // Add the document to Firestore
    const docRef = await addDoc(siteInfoCollectionRef, siteInfo);

    // Return the data along with the generated document ID
    return { ...siteInfo, id: docRef.id };
  } catch (error) {
    console.error("Error adding document: ", error);
    return null;
  }
};

export const editSiteInfoDocument = async (email: string, field: string, newValue: any): Promise<boolean> => {
  try {
    const siteInfoCollectionRef = collection(db, 'siteInfo');
    
    // Query to find the document with the matching email
    const emailQuery = query(siteInfoCollectionRef, where('email', '==', email));
    const querySnapshot = await getDocs(emailQuery);

    // Check if the document exists
    if (querySnapshot.empty) {
      console.log("No document found with the provided email.");
      return false;
    }

    // Get the document ID and update the specified field
    const docRef = querySnapshot.docs[0].ref;  // Assuming email is unique

    // Create an object with the field to be updated
    const updateData: { [key: string]: any } = {};
    updateData[field] = newValue;

    // Perform the update
    await updateDoc(docRef, updateData);

    console.log(`Document updated successfully: ${field} -> ${newValue}`);
    return true;

  } catch (error) {
    console.error("Error updating document: ", error);
    return false;
  }
};

export const updateArrayElement = async (email: string, fieldName: string, index: number, newValue: any): Promise<boolean> => {
  try {
    const siteInfoCollectionRef = collection(db, 'siteInfo');

    // Query to find the document with the matching email
    const emailQuery = query(siteInfoCollectionRef, where('email', '==', email));
    const querySnapshot = await getDocs(emailQuery);

    if (querySnapshot.empty) {
      console.log("No document found with the provided email.");
      return false;
    }

    // Assuming the email is unique, take the first document
    const doc = querySnapshot.docs[0];
    const data = doc.data();

    if (!data || !Array.isArray(data[fieldName])) {
      console.error(`Field '${fieldName}' is not an array or does not exist.`);
      return false;
    }

    // Clone and update the array
    const updatedArray = [...data[fieldName]];

    if (index < 0) {
      console.error("Negative index is not allowed.");
      return false;
    }

    if (index >= updatedArray.length) {
      console.log(`Index ${index} out of bounds, appending value to the end of the array.`);
      updatedArray.push(newValue);
    } else {
      updatedArray[index] = newValue;
    }

    // Create an update object
    const updateData: { [key: string]: any } = {};
    updateData[fieldName] = updatedArray;

    // Update the document in Firestore
    await updateDoc(doc.ref, updateData);

    console.log(`Updated ${fieldName} in document successfully.`);
    return true;

  } catch (error) {
    console.error("Error updating document: ", error);
    return false;
  }
};

// Function to remove an item from an array that matches the given value
export const removeArrayElement = async (email: string, fieldName: string, valueToRemove: any): Promise<boolean> => {
  try {
    const siteInfoCollectionRef = collection(db, 'siteInfo');

    // Query to find the document with the matching email
    const emailQuery = query(siteInfoCollectionRef, where('email', '==', email));
    const querySnapshot = await getDocs(emailQuery);

    if (querySnapshot.empty) {
      console.log("No document found with the provided email.");
      return false;
    }

    // Assuming the email is unique, take the first document
    const doc = querySnapshot.docs[0];
    const data = doc.data();

    if (!data || !Array.isArray(data[fieldName])) {
      console.error(`Field '${fieldName}' is not an array or does not exist.`);
      return false;
    }

    // Filter the array to remove all instances of valueToRemove
    const updatedArray = data[fieldName].filter((item: any) => item !== valueToRemove);

    // Create an update object
    const updateData: { [key: string]: any } = {};
    updateData[fieldName] = updatedArray;

    // Update the document in Firestore
    await updateDoc(doc.ref, updateData);

    console.log(`Removed all instances of value from ${fieldName} in document successfully.`);
    return true;

  } catch (error) {
    console.error("Error updating document: ", error);
    return false;
  }
};

//////////////////////////////  CALENDAR FUNCTIONS  //////////////////////////////

export const updateJobEventDatesByNumberID = async (
  jobId: string,
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
export const deleteLastEventByJobID = async (jobId: string): Promise<void> => {
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

export const updateShippingOrInHandDate = async (
  jobId: number,
  newDate: string,
  dateType: 'shippingDate' | 'inHandDate'
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

        // Update the specified date field in Firestore
        await updateDoc(docRef, {
          [dateType]: newDate,
        });

        console.log(`Successfully updated the ${dateType} to ${newDate} for job ${jobId}.`);
      }
    });
  } catch (error) {
    console.error(`Error updating ${dateType} in Firestore:`, error);
  }
};

//////////////////////////////  JOB INFORMATION FUNCTIONS  //////////////////////////////
export const createJobOnFirebase = async (jobDetails: {
  backgroundColor: string;
  companyName: string;
  calendarName: string;
  hours: number;
  perDayHours: number;
  title: string;
  startDate: string | null;
  endDate: boolean;
  scheduled: boolean;
  shippingDate: string | null;
  inHandDate: string | null;
  stages: Record<string, boolean>; // A record with string keys and boolean values
}) => {
  // Set default values 
  const calendarName = jobDetails.calendarName === '' ? 'main' : jobDetails.calendarName;
  const backgroundColor = jobDetails.backgroundColor === '' ? 'blue' : jobDetails.backgroundColor;
  const title = jobDetails.title === '' ? 'New Job' : jobDetails.title;

  if (!jobDetails.startDate) {
    console.error("Start date is missing");
    return;
  }

  const jobID = uuidv4();

  // Provide default values if null
  const perDayHours = jobDetails.perDayHours || 8; // Default to 8 hours/day
  const hours = jobDetails.hours || 40; // Default to 40 total hours

  let remainingHours = hours;
  const eventDates: string[] = [];
  const eventHours: number[] = [];

  let currentDate = new Date(jobDetails.startDate);

  while (remainingHours > 0) {
    const dayOfWeek = currentDate.getDay();
    
    if (dayOfWeek !== 6 && dayOfWeek !== 0) {
      eventDates.push(currentDate.toISOString().substring(0, 10));
      
      const hoursForTheDay = Math.min(perDayHours, remainingHours);
      eventHours.push(hoursForTheDay);
      remainingHours -= hoursForTheDay;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Format shippingDate and inHandDate to 'YYYY-MM-DD'
  const formatISODate = (isoString: string | null): string | null =>
    isoString ? isoString.substring(0, 10) : null;

  const newJob = {
    jobID,
    title,
    companyName: jobDetails.companyName,
    backgroundColor,
    eventDates,
    eventHours,
    perDayHours,
    hours,
    shippingDate: formatISODate(jobDetails.shippingDate),
    inHandDate: formatISODate(jobDetails.inHandDate),
    calendarName,
    stages: jobDetails.stages,
  };

  try {
    await addDoc(collection(db, "jobs"), newJob);
    console.log("Job added successfully");
  } catch (error) {
    console.error("Error adding job:", error);
  }
};

// Delete a job by jobID
export const deleteJobById = async (jobID: string): Promise<void> => {
  try {
    // Reference to the 'jobs' collection
    const jobsCollectionRef = collection(db, "jobs");

    // Query to find the document with the matching jobID
    const q = query(jobsCollectionRef, where("jobID", "==", jobID));

    // Execute the query
    const querySnapshot = await getDocs(q);

    // Check if any documents were found
    if (querySnapshot.empty) {
      console.log(`No job found with ID: ${jobID}`);
      return;
    }

    // Loop through the documents and delete each one (there should only be one)
    querySnapshot.forEach(async (documentSnapshot) => {
      // Get a reference to the document
      const docRef = doc(db, "jobs", documentSnapshot.id);

      // Delete the document
      await deleteDoc(docRef);
      console.log(`Deleted job with ID: ${jobID}`);
    });
  } catch (error) {
    console.error("Error deleting job:", error);
  }
};

export const deleteJobByCalendarName = async (calendarName: string): Promise<void> => {
  try {
    // Reference to the 'jobs' collection
    const jobsCollectionRef = collection(db, "jobs");

    // Query to find all jobs with the matching calendarName
    const q = query(jobsCollectionRef, where("calendarName", "==", calendarName));

    // Execute the query
    const querySnapshot = await getDocs(q);

    // Check if any documents were found
    if (querySnapshot.empty) {
      console.log(`No jobs found with calendar name: ${calendarName}`);
      return;
    }

    // Loop through the documents and delete each one
    querySnapshot.forEach(async (documentSnapshot) => {
      // Get a reference to the document
      const docRef = doc(db, "jobs", documentSnapshot.id);

      // Delete the document
      await deleteDoc(docRef);
      console.log(`Deleted job with calendar name: ${calendarName}`);
    });
  } catch (error) {
    console.error("Error deleting jobs by calendar name:", error);
  }
};

// Update Per Day Hours
export const updateEventHoursForDate = async (
  jobID: string,
  perDayHours: number,
  date: string
): Promise<void> => {
  try {
    // Reference to the 'jobs' collection
    const jobsCollectionRef = collection(db, "jobs");

    // Query to find the document with the matching jobID
    const q = query(jobsCollectionRef, where("jobID", "==", jobID));

    // Execute the query
    const querySnapshot = await getDocs(q);

    // Check if any documents were found
    if (querySnapshot.empty) {
      console.log(`No job found with ID: ${jobID}`);
      return;
    }

    querySnapshot.forEach(async (documentSnapshot) => {
      const jobData = documentSnapshot.data() as Job;

      // Find the index of the matching date in the eventDates array
      const dateIndex = jobData.eventDates.indexOf(date);
      if (dateIndex === -1) {
        console.log(`Date: ${date} not found in eventDates for jobID: ${jobID}`);
        return;
      }

      // Update the eventHours at the found index
      jobData.eventHours[dateIndex] = perDayHours;

      // Update the document in Firestore with the modified eventHours
      const docRef = doc(db, "jobs", documentSnapshot.id);
      await updateDoc(docRef, { eventHours: jobData.eventHours });
    });
  } catch (error) {
    console.error("Error updating event hours:", error);
  }
};


////////////////////////////// COLOR SELECTION AND SEARCH //////////////////////////////
export const getCalendarBackgroundColor = async (email: string): Promise<string | null> => {
  try {
    const q = query(collection(db, 'siteInfo'), where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]; // Assuming only one result needed
      const data = doc.data();
      return data.backgroundColor || null;
    } else {
      console.error(`No documents found with email: ${email}`);
      return null;
    }
  } catch (error) {
    console.error("Error getting backgroundColor:", error);
    return null;
  }
};

export const updateCalendarBackgroundColor = async (email: string, newColor: string): Promise<void> => {
  try {
    const q = query(collection(db, 'siteInfo'), where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      querySnapshot.forEach(async (doc) => {
        // Assuming one match, but iterating in case there are multiple
        await updateDoc(doc.ref, { backgroundColor: newColor });
        console.log(`Updated backgroundColor`);
      });
    } else {
      console.error(`No documents found with email: ${email}`);
    }
  } catch (error) {
    console.error("Error updating backgroundColor:", error);
  }
};


export const getEventColors = async (): Promise<Record<string, string>[] | null> => {
  try {
    // Accessing the specific document by its ID
    const docRef = doc(db, 'siteInfo', 'backgroundColors');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      if (data && Array.isArray(data.colors)) {
        const colorsArray: Record<string, string>[] = data.colors;
        return colorsArray;  // Return the array directly
      } else {
        console.error("No valid colors array found in the document.");
        return null;
      }
    } else {
      console.error("Document backgroundColors not found.");
      return null;
    }
  } catch (error) {
    console.error("Error getting event colors:", error);
    return null;
  }
};

// Function to update event color in Firestore
export const updateEventColor = async (
  colorName: string,
  newColorValue: string
): Promise<void> => {
  try {
    // Reference to the specific document by its ID
    const docRef = doc(db, 'siteInfo', 'backgroundColors');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      if (data && Array.isArray(data.colors)) {
        // Find the old color value
        const oldColorObject = data.colors.find((colorObject: Record<string, string>) =>
          colorObject.hasOwnProperty(colorName)
        );
        const oldColorValue = oldColorObject ? oldColorObject[colorName] : null;

        if (oldColorValue !== null) {
          // Update the specified color in the colors array
          const updatedColors = data.colors.map((colorObject: Record<string, string>) => {
            if (colorObject.hasOwnProperty(colorName)) {
              return { [colorName]: newColorValue }; // Update the specific color value
            }
            return colorObject;
          });

          // Update the document with the new colors array
          await updateDoc(docRef, { colors: updatedColors });
          console.log(`Updated ${colorName} from ${oldColorValue} to ${newColorValue}`);

          // Query jobs collection for documents with backgroundColor matching oldColorValue
          const jobsCollectionRef = collection(db, 'jobs');
          const q = query(jobsCollectionRef, where('backgroundColor', '==', oldColorValue));
          const querySnapshot = await getDocs(q);

          // Update each job document's backgroundColor to newColorValue
          const batchUpdates = querySnapshot.docs.map(async (jobDoc) => {
            const jobDocRef = doc(db, 'jobs', jobDoc.id);
            await updateDoc(jobDocRef, { backgroundColor: newColorValue });
            console.log(`Updated job ${jobDoc.id} backgroundColor to ${newColorValue}`);
          });

          // Wait for all updates to complete
          await Promise.all(batchUpdates);
        } else {
          console.error(`No existing color found for ${colorName}`);
        }
      } else {
        console.error("No valid colors array found in the document.");
      }
    } else {
      console.error("Document backgroundColors not found.");
    }
  } catch (error) {
    console.error("Error updating event color:", error);
  }
};