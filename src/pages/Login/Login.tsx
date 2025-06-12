import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonPage, IonTitle, IonToolbar, IonSegment, IonSegmentButton, IonLabel, } from '@ionic/react';
import { createSiteInfoDocument } from '../../firebase/controller';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const history = useHistory();

const handleLogin = async (event: React.FormEvent) => {
  event.preventDefault();

  if (isSignUp) {
    try {
      // Create a new user account
      await createUserWithEmailAndPassword(auth, email, password);
      await createSiteInfoDocument(email);
      console.log('User registered successfully');

      // Clear the form fields before redirecting
      setEmail('');
      setPassword('');

      // Redirect to /home after sign-up
      history.push('/home');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        alert('The email address is already in use by another account.');
      } else {
        alert('Sign-up failed. Please check your inputs.');
      }
    }
  } else {
    try {
      // Sign-in existing user
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in successfully');

      // Clear the form fields before redirecting
      setEmail('');
      setPassword('');

      // Redirect to /home on successful login
      history.push('/home');
    } catch (err) {
      alert('Login failed. Please check your credentials.');
    }
  }
};


  const goToSplash = () => {
    history.push('/');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isSignUp ? 'Sign Up' : 'Login'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={goToSplash}>Back</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="login-container" style={{ padding: '16px' }}>
          <IonSegment value={isSignUp ? 'signup' : 'login'} onIonChange={(e) => setIsSignUp(e.detail.value === 'signup')}>
            <IonSegmentButton value="login">
              <IonLabel>Login</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="signup">
              <IonLabel>Sign Up</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          <h2>{isSignUp ? 'Create an Account' : 'Welcome Back!'}</h2>
          <form onSubmit={handleLogin}>
            <IonItem>
              <IonInput
                type="email"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value!)}
                required
                label="Email"
                labelPlacement="floating"
                placeholder="frank@sabotage.com"
              />
            </IonItem>
            <IonItem>
              <IonInput
                type="password"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value!)}
                required
                label="Password"
                labelPlacement="floating"
                placeholder="********"
              />
            </IonItem>
            <IonButton expand="full" type="submit" style={{ marginTop: '20px' }}>
              {isSignUp ? 'Sign Up' : 'Login'}
            </IonButton>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
