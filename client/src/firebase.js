import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyB7RisFjy5L1sLiH_VpXrJB05qGhr1CcLY',
  authDomain: 'game-96c46.firebaseapp.com',
  projectId: 'game-96c46',
  storageBucket: 'game-96c46.firebasestorage.app',
  messagingSenderId: '31876054374',
  appId: '1:31876054374:web:d2f5a114a775f49d0a9ca7',
  measurementId: 'G-B4E37J6LR6',
};

let app;
let auth;
let googleProvider;
let googleEnabled = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  googleEnabled = true;
} catch (error) {
  console.warn('Firebase initialization failed. Google sign-in is disabled.', error.message);
}

export { auth, googleProvider, googleEnabled };
