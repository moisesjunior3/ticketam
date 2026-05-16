/* ============================================================
   TicketAM – Configuração do Firebase
   Arquivo: js/firebase-config.js

   ⚠️  INSTRUÇÕES:
   1. Acesse https://console.firebase.google.com
   2. Crie um projeto chamado "ticketam"
   3. Clique em "Adicionar app" > Web
   4. Copie o objeto firebaseConfig e substitua abaixo
   5. No console, vá em Firestore Database > Criar banco de dados
   6. Escolha "Iniciar no modo de teste" (para desenvolvimento)
   ============================================================ */

const firebaseConfig = {
  apiKey:            "AIzaSyBqTr9g31n-8j_VtdLpEoznJSL3WHGagzA",
  authDomain:        "tickeam.firebaseapp.com",
  projectId:         "tickeam",
  storageBucket:     "tickeam.firebasestorage.app",
  messagingSenderId: "977831692145",
  appId:             "1:977831692145:web:e2b7e1d603b1c3fdfd58d0",
  measurementId:     "G-ZK7N0ML7PE"
};

/* Inicializa o Firebase */
firebase.initializeApp(firebaseConfig);

/* Instâncias globais usadas pelos outros arquivos */
const db   = firebase.firestore();
const auth = firebase.auth();
