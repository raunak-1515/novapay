# NovaPay 💳

NovaPay is a **Dockerized fintech microservice backend** that simulates how real-world payment systems work. It supports secure authentication, wallet management, and peer‑to‑peer money transfers using a microservice architecture.

This project was built by a 3rd‑year engineering student to deeply learn backend system design, distributed debugging, and DevOps practices.

---

# 🚀 Features

• User registration & login with JWT authentication
• Wallet creation and balance management
• Secure money transfer between users
• Transaction history tracking
• Microservice architecture
• MongoDB replica set for reliability
• Fully Dockerized setup with one‑command startup

---

# 🧠 Architecture Overview

NovaPay consists of 3 independent services:

1. **Auth Service** – handles registration, login, JWT generation
2. **Wallet Service** – manages wallet balances and top‑ups
3. **Payment Service** – coordinates money transfers and history

All services communicate via REST APIs and use MongoDB as database.

```
Client → Auth Service → Wallet Service → Payment Service → MongoDB
```

Each service has its own database:
• novapay-auth
• novapay-wallet
• novapay-payment

This mirrors real fintech backend design.

---

# 🛠️ Tech Stack

Backend: Node.js, Express
Database: MongoDB Replica Set
Auth: JWT
DevOps: Docker, Docker Compose
Other: REST APIs, Microservices

---

# 🐳 How to Run (Docker)

## 1. Install Docker Desktop

## 2. Clone repo

```
git clone https://github.com/raunak-1515/novapay.git
cd novapay
```

## 3. Start everything

```
docker compose up -d --build
```

This starts:
• MongoDB
• Auth Service (port 4001)
• Wallet Service (port 4002)
• Payment Service (port 4003)

---

# 📡 API Examples

## Register

POST `/auth/register`

## Login

POST `/auth/login`

## Create Wallet

POST `/wallet/create`
Authorization: Bearer <JWT>

## Transfer Money

POST `/payments/transfer`
Authorization: Bearer <JWT>

---

# 🧩 Key Design Decisions

• JWT authentication for scalable security
• Separate microservices to simulate real fintech systems
• MongoDB replica set to support transactions
• Docker networking to remove environment issues
• Payment service calls Wallet service via API instead of DB access

---

# 🧪 Challenges Faced

• MongoDB replica set setup and debugging
• Docker networking issues (localhost vs container name)
• Service startup race conditions
• JWT expiry handling
• Distributed debugging across services

These problems reflect real‑world backend development.

---

# 🔮 Future Improvements

• Add Redis caching
• Add idempotency for payments
• Add rate limiting
• Build React frontend
• Add CI/CD pipeline

---

# 🤝 Contributing

Contributions, suggestions, and issues are welcome! Open an issue or pull request.

---

# 📌 One‑Line Summary

NovaPay is a Dockerized fintech backend built with microservices, JWT authentication, MongoDB replica sets, and REST APIs to simulate real payment systems.
