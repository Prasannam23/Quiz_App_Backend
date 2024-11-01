# 📚 Quiz App Backend

A scalable, professional-grade backend for Quiz Application, built with **Node.js**, **Express.js**, **PostgreSQL**, **Prisma ORM**, and **TypeScript**. Fully modular and production-ready with real-time capabilities and OAuth integration planned.

---

## 🚀 Tech Stack

- **Node.js** + **Express.js** - Web Server
- **TypeScript** - Type Safety
- **PostgreSQL** - Relational Database
- **Prisma ORM** - Database Client
- **JWT + bcrypt** - Secure Authentication
- **Google OAuth** - (Upcoming)
- **WebSockets (Socket.io)** - (Upcoming)
- **ESLint + Prettier** - Code Quality & Formatter
- **Docker Ready** - Deployment friendly

---

## 📂 Project Structure

```bash
Quiz-Backend/
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── controllers/     # All route controllers
│   ├── middlewares/     # Middlewares (auth, error handling etc.)
│   ├── routes/          # API routes
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions
│   └── app.ts           # Main entry point
│
├── package.json
├── tsconfig.json
├── .env
└── eslint.config.mjs
⚙️ Setup & Installation
1️⃣ Clone Repository
bash
Copy
Edit
git clone https://github.com/your-username/quiz-app-backend.git
cd quiz-app-backend
2️⃣ Install Dependencies
bash
Copy
Edit
npm install
3️⃣ Create .env file
env
Copy
Edit
DATABASE_URL="postgresql://quizuser:yourpassword@localhost:5432/quizdb"
JWT_SECRET=your_jwt_secret_key
4️⃣ Setup PostgreSQL Database
Make sure PostgreSQL is running locally.

Create DB & user matching above credentials.

5️⃣ Initialize Prisma
bash
Copy
Edit
npx prisma migrate dev --name init
npx prisma generate
6️⃣ Run Development Server
bash
Copy
Edit
npm run dev
7️⃣ Open Prisma Studio
bash
Copy
Edit
npx prisma studio
📜 Available Scripts
Script	Description
npm run dev	Run server in development mode
npm run build	Build the production bundle
npm start	Start production server
npm run format	Format code using Prettier & ESLint
npm run lint	Lint the project
npm run prisma:generate	Generate Prisma Client
npm run prisma:migrate	Apply new Prisma migrations
npm run prisma:studio	Open Prisma Studio

✅ Features (Completed & Planned)
✅ TypeScript setup

✅ PostgreSQL integration

✅ Prisma ORM setup

✅ Code formatting (ESLint & Prettier)

✅ Nodemon for development

🔜 User Authentication (JWT + bcrypt)

🔜 Google OAuth

🔜 Quiz Creation & Attempt APIs

🔜 Leaderboard & Real-time WebSockets

🔜 Docker Deployment

🧪 Testing
Postman will be used for API Testing.

👨‍💻 Author
Adesh & Jarvis (AI Assistant)

📌 License
MIT License.

📈 Future Upgrades
Stripe Payments

Admin Analytics

CI/CD Pipelines

Load balancing & scaling