import React, { useEffect } from 'react';
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonFooter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './Splash.css';
import { useAuth } from '../../firebase/AuthContext';

const Splash: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      history.push('/home');
    }
  }, [user, history]);

  const navigateToLogin = () => {
    history.push('/login');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reliable Calendar</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
            <h1>Splash Page</h1>
            <IonButton expand="full" onClick={navigateToLogin}>
              Login / Sign Up
            </IonButton>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonTitle size="small">© 2025 Dancing Goat Studios</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Splash;
