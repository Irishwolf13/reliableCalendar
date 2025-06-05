import React, { useRef } from 'react';
import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonFooter, useIonViewDidEnter, IonBackButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import './Calendar.css';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const Calendar: React.FC = () => {
  const history = useHistory();
  const calendarRef = useRef<FullCalendar | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out successfully');
      history.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleEventDrop = (info: any) => {
    const { event } = info;
    console.log(`Event ${event.title} was dropped on ${event.startStr}`);
    // Here you could also update your backend with the new event date.
  };

  const handleEventClick = (info: any) => {
    const { event } = info;
    console.log(`You clicked on event: ${event.title}`);
    console.log(event.allDay);
    // Additional logic or interactions can be performed here.
  };

  // Navigate to today's date in the calendar
  const handleTodayButtonClick = () => {
    console.log("today");
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
    }
  };

const handleEventResize = (info: any) => {
  // Get the new end date
  const newEndDate = info.event.end ? info.event.end.toISOString() : 'unknown';
  info.revert();
  console.log(`Resized event "${info.event.title}" to end at ${newEndDate}.`);
  // This is where we would need to add events
};

  useIonViewDidEnter(() => {
    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.updateSize(); // Resize fix
        calendarApi.gotoDate('2025-07-01'); // Force scroll to initialDate
      }
    }, 200); // Delay to allow Ionic to finish layout
  });

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
            editable={true} // Enables event editing
            events={[
              { title: 'Project Launch', date: '2025-07-01' },
              { title: 'Pro2', date: '2025-07-01' },
              { title: 'Pro3', date: '2025-07-01' },
              { title: 'Pro4', date: '2025-07-01' },
              { title: 'Birthday', date: '2025-09-10' },
              { title: 'Vacation', date: '2025-12-20' },
            ]}
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
            eventDrop={handleEventDrop} // Handles event drop
            eventClick={handleEventClick} // Handles event click
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
