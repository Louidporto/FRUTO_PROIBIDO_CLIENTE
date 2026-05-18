const firebaseConfig = {
  apiKey: "AIzaSyCRIoKEfFU5LqBkszVgeZDfC2eiJsTtvkI",
  authDomain: "fruto-proibido-73c54.firebaseapp.com",
  databaseURL: "https://fruto-proibido-73c54-default-rtdb.firebaseio.com",
  projectId: "fruto-proibido-73c54",
  storageBucket: "fruto-proibido-73c54.firebasestorage.app",
  messagingSenderId: "1067844602315",
  appId: "1:1067844602315:web:b6f50d81fae62e15ee4e4e"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Atalho para o Banco de Dados
const database = firebase.database();

