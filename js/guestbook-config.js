/*
  Guestbook settings.
  1) Paste your Firebase web config below (Firebase console → Project settings → Your apps → Web app).
     These values are meant to be public; your Firestore rules are what keep the guestbook safe.
  2) Sign in at whoopsies.win/admin, copy the account ID it shows, and put it in OWNER_ID
     (and in firestore.rules). It's just an ID number, not your email.
  Until FIREBASE is filled in, the guestbook button stays hidden.
*/
window.WHOOPSIES_GUESTBOOK = {
  FIREBASE: null,
  // FIREBASE: {
  //   apiKey: "...",
  //   authDomain: "....firebaseapp.com",
  //   projectId: "...",
  //   storageBucket: "....appspot.com",
  //   messagingSenderId: "...",
  //   appId: "..."
  // },
  OWNER_ID: ""
};
