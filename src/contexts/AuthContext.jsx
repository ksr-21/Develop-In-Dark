/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, authPersistenceReady, db, hasFirebaseConfig } from '../firebase';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();
const ADMIN_EMAIL = 'admin@contest.com';
const ADMIN_DISPLAY_NAME = 'Administrator';

function normalizeRollNumber(value) {
  return String(value ?? '').trim();
}

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildParticipantEmail(rollNumber) {
  return `${normalizeRollNumber(rollNumber)}@contest.com`;
}

async function upsertAdminProfile(dbInstance, uid) {
  const adminRef = doc(dbInstance, 'users', 'admin');
  const adminSnap = await getDoc(adminRef);
  const now = new Date().toISOString();
  const existing = adminSnap.exists() ? adminSnap.data() : null;

  const adminData = {
    role: 'admin',
    email: ADMIN_EMAIL,
    authEmail: ADMIN_EMAIL,
    name: existing?.name || ADMIN_DISPLAY_NAME,
    uid,
    rollNumber: 'admin',
    nameSet: true,
    profileComplete: true,
    updatedAt: now,
    ...(existing ? {} : { createdAt: now }),
  };

  await setDoc(adminRef, adminData, { merge: true });
  return adminData;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  async function register({ rollNumber, name, contactNumber, email, college, password }) {
    if (!hasFirebaseConfig || !auth || !db) {
      throw new Error('Firebase is not configured. Add your .env values first.');
    }

    await authPersistenceReady;

    const normalizedRoll = normalizeRollNumber(rollNumber);
    const participantEmail = buildParticipantEmail(normalizedRoll);
    const displayName = String(name ?? '').trim();
    const now = new Date().toISOString();

    let cred;

    try {
      cred = await createUserWithEmailAndPassword(auth, participantEmail, password);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        cred = await signInWithEmailAndPassword(auth, participantEmail, password);
      } else {
        throw err;
      }
    }

    try {
      const profileData = {
        rollNumber: normalizedRoll,
        name: displayName,
        contactNumber: String(contactNumber ?? '').trim(),
        email: String(email ?? '').trim(),
        college: String(college ?? '').trim(),
        authEmail: participantEmail,
        uid: cred.user.uid,
        role: 'participant',
        nameSet: true,
        profileComplete: true,
        createdAt: now,
        updatedAt: now,
      };

      await updateProfile(cred.user, { displayName });
      await setDoc(doc(db, 'users', normalizedRoll), profileData, { merge: true });
      setCurrentUser(cred.user);
      setUserData(profileData);
      setIsAdmin(false);
      return cred;
    } catch (err) {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      setIsAdmin(false);
      throw err;
    }
  }

  async function login(rollNumber, name, password) {
    if (!hasFirebaseConfig || !auth) {
      throw new Error('Firebase is not configured. Add your .env values first.');
    }
    if (!db) {
      throw new Error('Firebase is not configured. Add your .env values first.');
    }

    await authPersistenceReady;

    const normalizedRoll = normalizeRollNumber(rollNumber);
    const participantEmail = buildParticipantEmail(normalizedRoll);
    const displayName = String(name ?? '').trim();
    const userRef = doc(db, 'users', normalizedRoll);

    const cred = await signInWithEmailAndPassword(auth, participantEmail, password);
    const userDoc = await getDoc(userRef);
    const now = new Date().toISOString();

    try {
      let profileData;

      if (userDoc.exists()) {
        const existing = userDoc.data();
        if (existing.name && normalizeName(existing.name) !== normalizeName(displayName)) {
          await signOut(auth);
          throw new Error('Roll number, name, or password is incorrect');
        }

        profileData = {
          ...existing,
          rollNumber: normalizedRoll,
          name: existing.name || displayName,
          authEmail: participantEmail,
          uid: cred.user.uid,
          nameSet: true,
          updatedAt: now,
        };
      } else {
        profileData = {
          rollNumber: normalizedRoll,
          name: displayName,
          authEmail: participantEmail,
          uid: cred.user.uid,
          role: 'participant',
          nameSet: true,
          profileComplete: false,
          createdAt: now,
          updatedAt: now,
        };
      }

      await setDoc(userRef, profileData, { merge: true });
      await updateProfile(cred.user, { displayName });
      setCurrentUser(cred.user);
      setUserData(profileData);
      setIsAdmin(false);
      return cred;
    } catch (err) {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      setIsAdmin(false);
      throw err;
    }
  }

  async function adminLogin(email, password) {
    if (!hasFirebaseConfig || !auth || !db) {
      throw new Error('Firebase is not configured. Add your .env values first.');
    }

    await authPersistenceReady;

    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (normalizedEmail !== ADMIN_EMAIL) {
      throw new Error('Use the admin email to sign in.');
    }

    let cred;

    try {
      cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err) {
      const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      if (signInMethods.length === 0) {
        cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        throw err;
      }
    }

    if (cred.user.email !== ADMIN_EMAIL) {
      await signOut(auth);
      throw new Error('Not an admin account');
    }

    const adminData = await upsertAdminProfile(db, cred.user.uid);
    await updateProfile(cred.user, { displayName: adminData.name });
    setCurrentUser(cred.user);
    setUserData(adminData);
    setIsAdmin(true);
    return cred;
  }

  async function logout() {
    setCurrentUser(null);
    setUserData(null);
    setIsAdmin(false);
    if (!auth) return;
    await signOut(auth);
  }

  async function setUserName(name) {
    if (!currentUser || !db) {
      throw new Error('Firebase is not configured. Add your .env values first.');
    }
    const rollNumber = currentUser.email.split('@')[0];
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'users', rollNumber),
      {
        name: String(name ?? '').trim(),
        authEmail: currentUser.email,
        rollNumber,
        uid: currentUser.uid,
        nameSet: true,
        updatedAt: now,
      },
      { merge: true }
    );
    await updateProfile(currentUser, { displayName: String(name ?? '').trim() });
  }

  useEffect(() => {
    if (!hasFirebaseConfig || !auth || !db) {
      setLoading(false);
      return;
    }

    let profileUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      setCurrentUser(user);
      try {
        if (user) {
          const rollNumber = user.email.split('@')[0];

          // Check if admin
          if (user.email === ADMIN_EMAIL || rollNumber === 'admin') {
            setIsAdmin(true);
            try {
              const adminData = await upsertAdminProfile(db, user.uid);
              setUserData(adminData);
            } catch (adminError) {
              console.error('Admin profile sync failed:', adminError);
              setUserData({
                role: 'admin',
                email: ADMIN_EMAIL,
                authEmail: ADMIN_EMAIL,
                name: ADMIN_DISPLAY_NAME,
                uid: user.uid,
                rollNumber: 'admin',
                nameSet: true,
                profileComplete: true,
              });
            }
          } else {
            setIsAdmin(false);
            // Regular user - listen for real-time updates
            profileUnsubscribe = onSnapshot(doc(db, 'users', rollNumber), (docSnap) => {
              if (docSnap.exists()) {
                setUserData({ rollNumber, ...docSnap.data() });
              } else {
                setUserData({ needsName: true, rollNumber, profileComplete: false });
              }
            });
          }
        } else {
          setUserData(null);
          setIsAdmin(false);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    isAdmin,
    loading,
    register,
    login,
    adminLogin,
    logout,
    setUserName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
