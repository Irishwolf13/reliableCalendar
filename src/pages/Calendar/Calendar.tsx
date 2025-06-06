import React, { useRef, useState } from 'react';
import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonFooter, useIonViewDidEnter, IonBackButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import './Calendar.css';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// Define the job and event interfaces
interface Job {
  jobID: number;
  title: string;
  backgroundColor: string;
  eventDates: string[];
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

  // Use state for myJobs to keep updates in sync
  const [myJobs, setMyJobs] = useState<Job[]>([
    { jobID: 1, title: 'Project Launch', backgroundColor: 'green', eventDates: ['2025-07-01', '2025-07-02', '2025-07-03', '2025-07-04'] }
  ]);

  // Set up state for the events based on myJobs
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    myJobs.reduce<CalendarEvent[]>((acc, job) => {
      const expandedEvents = job.eventDates.map(date => ({
        jobID: job.jobID,
        title: job.title,
        date,
        backgroundColor: job.backgroundColor,
      }));
      return acc.concat(expandedEvents);
    }, [])
  );

  useIonViewDidEnter(() => {
    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.updateSize();
        calendarApi.gotoDate('2025-07-01');
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

  const handleEventDrop = (info: any) => {
  const { event } = info;
  const jobId = event.extendedProps.jobID;

  setMyJobs((prevJobs) => {
    const newJobs = prevJobs.map((job) => {
      if (job.jobID === jobId) {
        const oldStartDateStr = info.oldEvent.start.toISOString().substring(0, 10);
        const newStart = new Date(event.start);

        // Find the index of the moved date
        const movedDateIndex = job.eventDates.indexOf(oldStartDateStr);
        
        if (movedDateIndex !== -1) {
          // Clone the eventDates array
          const updatedEventDates = [...job.eventDates];

          // Function to advance to the next weekday if needed
          const getNextWeekday = (date: Date): Date => {
            let nextDate = new Date(date);
            while (nextDate.getDay() === 6 || nextDate.getDay() === 0) {
              nextDate.setDate(nextDate.getDate() + 1);
            }
            return nextDate;
          };

          // Update the moved date and subsequent dates 
          let currentDate = getNextWeekday(newStart); // Start with the new date adjusted to first valid weekday

          for (let i = movedDateIndex; i < updatedEventDates.length; i++) {
            updatedEventDates[i] = currentDate.toISOString().substring(0, 10);
            
            // Move to next day (consider weekdays only)
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate = getNextWeekday(currentDate);
          }

          return {
            ...job,
            eventDates: updatedEventDates,
          };
        }
      }
      return job;
    });

    // Update the events after myJobs changes
    updateEventsFromJobs(newJobs);
    return newJobs;
  });
};

  const updateEventsFromJobs = (jobs: Job[]) => {
    const updatedEvents = jobs.reduce<CalendarEvent[]>((acc, job) => {
      const expandedEvents = job.eventDates.map(date => ({
        jobID: job.jobID,
        title: job.title,
        date,
        backgroundColor: job.backgroundColor,
      }));
      return acc.concat(expandedEvents);
    }, []);
    setEvents(updatedEvents);
  };

  const handleEventClick = (info: any) => {
    const { event } = info;
    console.log(event);
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
          continue;
        }

        newEvents.push({
          jobID: event.extendedProps.jobID,
          title: event.title,
          date: newDate.toISOString().substring(0, 10),
          backgroundColor: event.backgroundColor,
        });
      }

      // Update myJobs array
      setMyJobs(prevJobs => {
        const newJobs = prevJobs.map(job => {
          if (job.jobID === event.extendedProps.jobID) {
            const newDates = newEvents.map(ev => ev.date);
            return {
              ...job,
              eventDates: [...new Set([...job.eventDates, ...newDates])], // Merge and deduplicate dates.
            };
          }
          return job;
        });

        updateEventsFromJobs(newJobs);
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