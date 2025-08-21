// firebase-init.js

// Importa las funciones que necesitas de los SDKs de Firebase
// Usamos la versión modular para cargar solo lo que necesitamos.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// TODO: Pega aquí tu objeto de configuración de Firebase
// Lo encuentras en tu consola de Firebase > Configuración del proyecto > General > Tus apps > Configuración de SDK
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializa Firebase y exporta las instancias de los servicios
// para que puedan ser usadas en otros archivos.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

console.log("Firebase inicializado. Esperando estado de autenticación...");

// Esta función se ejecuta cada vez que el estado de autenticación del usuario cambia (inicia sesión, cierra sesión).
// La exportamos para que el UI pueda reaccionar a los cambios.
onAuthStateChanged(auth, user => {
  if (user) {
    // El usuario ha iniciado sesión.
    console.log("Usuario conectado:", user.displayName || user.uid);
  } else {
    // El usuario ha cerrado sesión o es la primera visita (anónimo).
    // Intentamos un inicio de sesión anónimo para los nuevos visitantes.
    signInAnonymously(auth).catch((error) => {
      console.error("Error en la autenticación anónima:", error);
    });
    console.log("Usuario desconectado o anónimo.");
  }
});

// Exportamos las constantes y funciones para poder importarlas en otros scripts.
export { app, auth, db, provider, signInWithPopup, onAuthStateChanged, signOut };

