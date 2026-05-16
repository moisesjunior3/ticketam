# TicketAM Firebase — Guia de configuração

Plataforma de ingressos com **atualização em tempo real** via Firebase Firestore.

---

## 🗂️ Estrutura do projeto

```
ticketam-firebase/
│
├── index.html              ← Site público (eventos em tempo real)
│
├── css/
│   └── style.css           ← Estilos do site público
│
├── js/
│   ├── firebase-config.js  ← ⚠️ Suas credenciais do Firebase (preencher!)
│   └── app.js              ← Listener em tempo real + modal de compra + filtros
│
└── admin/
    ├── index.html          ← Painel admin (login + CRUD de eventos)
    ├── admin.css           ← Estilos do painel
    └── admin.js            ← Autenticação + criar/editar/excluir eventos
```

---

## 🚀 Passo a passo — configurar o Firebase

### 1. Criar o projeto

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê o nome `ticketam` e conclua o assistente

### 2. Registrar o app Web

1. Na tela do projeto, clique no ícone **`</>`** (Web)
2. Dê um apelido (ex: `ticketam-web`) e clique em **Registrar app**
3. Copie o objeto `firebaseConfig` exibido

### 3. Colar as credenciais

Abra `js/firebase-config.js` e substitua os valores:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "ticketam.firebaseapp.com",
  projectId:         "ticketam",
  storageBucket:     "ticketam.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc..."
};
```

### 4. Criar o banco de dados Firestore

1. No menu lateral: **Firestore Database → Criar banco de dados**
2. Escolha **"Iniciar no modo de teste"** (para desenvolvimento)
3. Selecione a região `us-east1` ou `southamerica-east1`

### 5. Criar o usuário admin

1. No menu lateral: **Authentication → Começar**
2. Ative o provedor **E-mail/Senha**
3. Vá em **Usuários → Adicionar usuário**
4. Crie o e-mail e senha do administrador (ex: `admin@ticketam.com.br`)

### 6. Regras de segurança do Firestore (recomendado)

No console Firebase → Firestore → **Regras**, cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Qualquer pessoa pode LER eventos
    match /eventos/{id} {
      allow read: if true;
      // Apenas usuários autenticados podem ESCREVER
      allow write: if request.auth != null;
    }
  }
}
```

---

## ▶️ Como rodar localmente

> Você precisa de um servidor local porque o Firebase requer HTTPS ou localhost.

**Opção 1 — VS Code (recomendado):**
Instale a extensão **Live Server**, clique com botão direito em `index.html` → *Open with Live Server*

**Opção 2 — Python:**
```bash
python -m http.server 8080
# acesse http://localhost:8080
```

**Opção 3 — Node.js:**
```bash
npx serve .
```

---

## 📖 Como usar o painel admin

1. Acesse `http://localhost:8080/admin/`
2. Faça login com o e-mail/senha criado no Firebase Auth
3. Clique em **+ Novo evento** e preencha:
   - Nome, local, emoji, categoria
   - Data de **início** e **fim** (o status "Ao vivo / Em breve / Encerrado" é calculado automaticamente)
   - Total de vagas
   - Tipos de ingresso com preço
4. Salve — o evento aparece **instantaneamente** no site público

---

## ⚡ Como funciona o tempo real

```
Admin salva evento no Firestore
          ↓
Firebase dispara onSnapshot() em todos os clientes conectados
          ↓
app.js re-renderiza os cards automaticamente
          ↓
Badge muda: 🟡 Em breve → 🔴 Ao vivo → ⚫ Encerrado
Barra de vagas atualiza conforme ingressos são vendidos
```

Não é necessário recarregar a página — tudo acontece em tempo real.

---

## 🔮 Próximos passos (produção)

| Funcionalidade       | Solução sugerida                        |
|----------------------|-----------------------------------------|
| Pagamentos           | Mercado Pago SDK ou Stripe              |
| Envio de ingressos   | Firebase Functions + Nodemailer         |
| QR Code de entrada   | Biblioteca `qrcode.js`                  |
| Deploy gratuito      | Firebase Hosting (`firebase deploy`)    |
| Notificações push    | Firebase Cloud Messaging (FCM)          |
