import React, { useEffect, useRef, useState } from 'react';
import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonFooter, useIonViewDidEnter, IonBackButton, IonAlert, IonMenu } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { deleteLastEventByJobID, subscribeToJobs, updateJobEventDatesByNumberID } from '../../firebase/controller';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { menuController } from '@ionic/core/components';
import './Calendar.css'

// Job and CalendarEvent interfaces remain unchanged
interface Job {
  jobID: number;
  title: string;
  backgroundColor: string;
  eventDates: string[];
  eventHours: number[];
  hours: number
}

interface CalendarEvent {
  jobID: number;
  title: string;
  date: string;
  backgroundColor: string;
}

const Calendar: React.FC = () => {
  const history = useHistory();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [myTitle, setMyTitle] = useState('')
  const [myJobNumber, setMyJobNumber] = useState(0)
  const [myJobDate, setMyJobDate] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeToJobs((jobs) => {
      setMyJobs(jobs);
      updateEventsFromJobs(jobs);
    });

    return () => unsubscribe();
  }, []);

  // Navigate to today's date
  useIonViewDidEnter(() => {
    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.updateSize();
        calendarApi.gotoDate(new Date());
      }
    }, 200);
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out successfully');
      history.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleTodayButtonClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
    }
  };

  // Start of Event Handling
  const handleEventClick = (info: any) => {
    const { event } = info;
    const [titleBeforeColon] = event.title.split(':');
    console.log(event);

    console.log(myJobs);
    setMyTitle(titleBeforeColon);
    setMyJobNumber(event.extendedProps.jobID);

    // Parse the date string into a Date object
    const date = new Date(event.startStr);
    
    // Add one day to the date
    date.setDate(date.getDate() + 1);

    // Format the date as 'Month day, year'
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    };
    const formattedDate = date.toLocaleDateString('en-US', options);

    setMyJobDate(formattedDate);
    openFirstMenu();
  };

  // Handle Drop Event
  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const myStartDate = info.event.startStr
    const myOldStartDate = info.oldEvent.startStr
    const jobId = event.extendedProps.jobID;
    const jobToUpdate = myJobs.find((job) => job.jobID === jobId);

    if (jobToUpdate) {
      const eventDateFound = jobToUpdate.eventDates.includes(myStartDate);
      const firstEventDate = jobToUpdate.eventDates[0];
      if (myOldStartDate !== firstEventDate ) {
        if (eventDateFound && new Date(myOldStartDate) > new Date(myStartDate)) {
          info.revert();
          return;
        }
        if (new Date(myStartDate) < new Date(firstEventDate)) {
          info.revert();
          return;
        }
      } 
    }
    // If it passes the checks, then adjust the job events
    setMyJobs((prevJobs) => {
      const newJobs = prevJobs.map((job) => {
        if (job.jobID === jobId) {
          const oldStartDateStr = info.oldEvent.start.toISOString().substring(0, 10);
          const newStart = new Date(event.start);

          const movedDateIndex = job.eventDates.indexOf(oldStartDateStr);

          if (movedDateIndex !== -1) {
            const updatedEventDates = [...job.eventDates];

            const getNextWeekday = (date: Date): Date => {
              let nextDate = new Date(date);
              while (nextDate.getDay() === 6 || nextDate.getDay() === 0) {
                nextDate.setDate(nextDate.getDate() + 1);
              }
              return nextDate;
            };

            let currentDate = getNextWeekday(newStart);

            for (let i = movedDateIndex; i < updatedEventDates.length; i++) {
              updatedEventDates[i] = currentDate.toISOString().substring(0, 10);
              currentDate.setDate(currentDate.getDate() + 1);
              currentDate = getNextWeekday(currentDate);
            }

            updateJobEventDatesByNumberID(jobId, updatedEventDates);

            return {
              ...job,
              eventDates: updatedEventDates,
            };
          }
        }
        return job;
      });

      updateEventsFromJobs(newJobs);
      return newJobs;
    });
  };

  // Helper function for updatting the back end
  const updateEventsFromJobs = (jobs: Job[]) => {
    const updatedEvents = jobs.reduce<CalendarEvent[]>((acc, job) => {
      let remainingHours = job.hours; // Initialize with total job hours

      const expandedEvents = job.eventDates.map((date, index) => {
        const eventHour = job.eventHours[index];
        
        // Use the minimum of eventHour or remainingHours for display title and calculation
        const applicableHours = Math.min(eventHour, remainingHours);
        const eventTitle = `${job.title} : ${applicableHours} / ${remainingHours}`;

        // Adjust remainingHours only if it is more than or equal to applicableHours
        if (remainingHours >= applicableHours) {
          remainingHours -= applicableHours;
        }

        // Determine background color based on remaining hours being negative
        const backgroundColor =
          remainingHours < 0 ? 'red' : job.backgroundColor;

        return {
          jobID: job.jobID,
          title: eventTitle,
          date,
          backgroundColor,
        };
      });

      return acc.concat(expandedEvents);
    }, []);

    setEvents(updatedEvents);
  };

  // Modify the handleEventResize function to check for the last event
  const handleEventResize = (info: any) => {
    const { event } = info;
    const jobID = event.extendedProps.jobID;
    const job = myJobs.find(j => j.jobID === jobID);
    const isLastEvent = job?.eventDates[job.eventDates.length - 1] === event.startStr;

    // If not the last event, prevent resizing
    if (!isLastEvent) { info.revert(); return; }

    const startDate = event.start;
    const endDate = event.end;

    if (startDate && endDate) {
      const differenceInTime = endDate.getTime() - startDate.getTime();
      const totalDays = Math.floor(differenceInTime / (1000 * 3600 * 24));

      const newEvents: CalendarEvent[] = [];
      for (let i = 0; i < totalDays; i++) {
        const newDate = new Date(startDate);
        newDate.setDate(startDate.getDate() + i);

        const dayOfWeek = newDate.getDay();
        if (dayOfWeek === 6 || dayOfWeek === 0) {
          continue; // Skip weekends
        }

        newEvents.push({
          jobID: event.extendedProps.jobID,
          title: event.title,
          date: newDate.toISOString().substring(0, 10),
          backgroundColor: event.backgroundColor,
        });
      }

      setMyJobs(prevJobs => {
        const newJobs = prevJobs.map(job => {
          if (job.jobID === event.extendedProps.jobID) {
            const newDates = newEvents.map(ev => ev.date);
            const updatedEventDates = [...new Set([...job.eventDates, ...newDates])];

            // Update the Firestore document
            updateJobEventDatesByNumberID(job.jobID, updatedEventDates);

            return {
              ...job,
              eventDates: updatedEventDates,
            };
          }
          return job;
        });
        return newJobs;
      });

      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        event.remove();
        newEvents.forEach(newEvent => calendarApi.addEvent(newEvent));
      }
    }
    console.log(`Resized event "${event.title}" was split into multiple events, excluding weekends.`);
  };

  //////////////////////////////  DELETE EVENT  //////////////////////////////
const renderDeleteButton = (eventInfo: any) => {
  const myJobID = eventInfo.event.extendedProps.jobID;
  const myEventDate = eventInfo.event.startStr;

  const job = myJobs.find(j => j.jobID === myJobID);
  const isLastEvent = job?.eventDates[job.eventDates.length - 1] === myEventDate;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span>{eventInfo.event.title}</span>
      {isLastEvent && (
        <button className='deleteButton'
          onClick={(e) => {
            e.stopPropagation(); // Prevent event click from also triggering
            handleDeleteEvent(eventInfo.event);
          }}
        >
          X
        </button>
      )}
    </div>
  );
};

  //////////////////////////////  ALERT MODAL  //////////////////////////////
  const [showAlert, setShowAlert] = useState(false);
  const [selectedEventID, setSelectedEventID] = useState<number | null>(null);

  const handleDeleteEvent = (event: any) => {
    setSelectedEventID(event.extendedProps.jobID);
    setShowAlert(true);
  };

  const confirmDelete = () => {
    if (selectedEventID !== null) {
      deleteLastEventByJobID(selectedEventID);
      setSelectedEventID(null); // Clear selected event ID after deletion
    }
    setShowAlert(false);
  };

  //////////////////////////////  SIDE MENUS  //////////////////////////////
  async function openFirstMenu() {
    await menuController.open('first-menu');
  }

  // async function openSecondMenu() {
  //   await menuController.open('second-menu');
  // }

  // async function openEndMenu() {
  //   await menuController.open('end');
  // }

  return (
    <>
      <IonMenu menuId="first-menu" contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>{myJobDate}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div>{myTitle}</div>
          <div>
            {myJobNumber}
          </div>
        </IonContent>
      </IonMenu>

      {/* <IonMenu menuId="second-menu" contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Second Menu</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">This is the second menu content.</IonContent>
      </IonMenu>

      <IonMenu side="end" contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>End Menu</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">This is the end menu content.</IonContent>
      </IonMenu> */}

      <IonPage id="main-content" className='mainContent'>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton></IonBackButton>
            </IonButtons>
            <IonTitle>Calendar</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleLogout}>Logout</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          {/* <IonButton expand="block" onClick={openFirstMenu}>
            Open First Menu
          </IonButton>
          <IonButton expand="block" onClick={openSecondMenu}>
            Open Second Menu
          </IonButton>
          <IonButton expand="block" onClick={openEndMenu}>
            Open End Menu
          </IonButton> */}
          <div className='calendarHolder'>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialDate="2025-07-01"
              initialView="dayGridYear"
              height="87vh"
              editable={true}
              events={events}
              customButtons={{
                myTodayButton: {
                  text: 'Today',
                  click: handleTodayButtonClick,
                }
              }}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridYear,dayGridMonth,dayGridWeek,dayGridDay,myTodayButton'
              }}
              eventDrop={handleEventDrop}
              eventClick={handleEventClick}
              eventResize={handleEventResize}
              eventContent={renderDeleteButton}
              />
          </div>

          <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={'Confirm Delete'}
          message={'Are you sure you want to delete this event?'}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                setShowAlert(false);
              },
            },
            {
              text: 'Delete',
              handler: confirmDelete,
            },
          ]}
          />
        </IonContent>

        <IonFooter>
          <IonToolbar>
            <IonTitle size="small">© 2025 Dancing Goat Studios</IonTitle>
          </IonToolbar>
        </IonFooter>
      </IonPage>
    </>
  );
};

export default Calendar;
