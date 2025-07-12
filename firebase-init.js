// firebase-init.js

// Importa las funciones que necesitas de los SDKs de Firebase
// Usamos la versión modular para cargar solo lo que necesitamos.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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

console.log("Firebase inicializado. Esperando estado de autenticación...");

// Esta función se ejecuta cada vez que el estado de autenticación del usuario cambia (inicia sesión, cierra sesión).
onAuthStateChanged(auth, user => {
  if (user) {
    // El usuario ha iniciado sesión (en este caso, de forma anónima).
    // Su información está en el objeto 'user'.
    console.log("Usuario conectado:", user.uid);
    // Aquí podrías guardar datos del usuario en Firestore si es la primera vez que se conecta.
  } else {
    // El usuario ha cerrado sesión.
    console.log("Usuario desconectado.");
  }
});

// Para empezar, vamos a dar a cada visitante una ID única
// iniciando su sesión de forma anónima.
signInAnonymously(auth).catch((error) => {
  console.error("Error en la autenticación anónima:", error);
});

// Exportamos las constantes para poder importarlas en otros scripts de tu proyecto.
export { app, auth, db };

