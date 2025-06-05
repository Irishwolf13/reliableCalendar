import React, { useRef } from 'react';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonFooter,
  useIonViewDidEnter,
  IonBackButton,
} from '@ionic/react';
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

  const handleEventDrop = (info:any) => {
    const { event } = info;
    console.log(`Event ${event.title} was dropped on ${event.startStr}`);
    
    // Here you could also update your backend with the new event date.
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
        <div style={{ padding: '1rem', width: '100%', height: '90%' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialDate="2025-07-01"
            initialView="dayGridYear"
            height="90vh"
            editable={true} // Enables event editing
            events={[
              { title: 'Project Launch', date: '2025-07-01' },
              { title: 'Birthday', date: '2025-09-10' },
              { title: 'Vacation', date: '2025-12-20' },
            ]}
            eventDrop={handleEventDrop} // Handles event drop
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
