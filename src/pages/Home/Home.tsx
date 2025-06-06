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
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out successfully');
      history.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGoToCalendarClicked = () => {
    history.push('/calendar');
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Home</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleLogout}>Logout</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '1rem', width: '100%', height: '90%' }}>
          <IonButton onClick={handleGoToCalendarClicked}>Go To Calendar</IonButton>
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

export default Home;
