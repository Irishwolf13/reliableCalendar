import React, { useEffect, useRef, useState } from 'react';
import {
  IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonButton, IonFooter, useIonViewDidEnter, IonBackButton
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

// Import the controller's function
import { deleteLastEventByJobID, subscribeToJobs, updateJobEventDatesByNumberID } from '../../firebase/controller';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

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

  useEffect(() => {
    const unsubscribe = subscribeToJobs((jobs) => {
      setMyJobs(jobs);
      updateEventsFromJobs(jobs);
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  useIonViewDidEnter(() => {
    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.updateSize();
        // Navigate to today's date
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

  const handleEventClick = (info: any) => {
    const { event } = info;
    console.log(event.extendedProps.jobID)
    console.log(event.startStr);
  };

  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const jobId = event.extendedProps.jobID;

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

            // Update the Firestore document
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
          backgroundColor, // Use determined background color
        };
      });

      return acc.concat(expandedEvents);
    }, []);

    setEvents(updatedEvents);
  };

  const handleEventResize = (info: any) => {
    const { event } = info;
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


const renderEventContent = (eventInfo: any) => {
  const myJobID = eventInfo.event.extendedProps.jobID;
  const myEventDate = eventInfo.event.startStr;

  // Find the job associated with this event
  const job = myJobs.find(j => j.jobID === myJobID);

  // Check if this event is the last one for the given job
  const isLastEvent = job?.eventDates[job.eventDates.length - 1] === myEventDate;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span>{eventInfo.event.title}</span>
      {isLastEvent && (
        <button
          style={{ marginLeft: 'auto' }}
          onClick={() => handleDeleteEvent(eventInfo.event)}
        >
          X
        </button>
      )}
    </div>
  );
};

const handleDeleteEvent = (event:any) => {
  deleteLastEventByJobID(event.extendedProps.jobID)
};

  return (
    <IonPage>
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
        <div className='calendarHolder'>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialDate="2025-07-01"
            initialView="dayGridYear"
            height="90vh"
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
            eventContent={renderEventContent}
          />
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonTitle size="small">© 2025 Dancing Goat Studios</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Calendar;
