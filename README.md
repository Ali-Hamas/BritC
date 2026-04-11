# Britsee Assistant 🚀

**Britsee Assistant** is an integrated AI ecosystem designed to help digital agencies and businesses grow autonomously. It combines a sophisticated **Strategic Growth Dashboard** with an intelligent **Appointment Booking Widget**.

## 🌟 Key Features

### 1. **Strategic Growth Companion (Dashboard)**
- **Lead Generation**: Scrape high-intent leads from the web via LeadHunter integration.
- **Visual Intelligence**: Deep analysis of screenshots, documents, and business data using Vision LLMs.
- **Autonomous Tooling**: Britsee can research the web, draft email campaigns, create tasks, and generate professional documents.
- **Financial Forecasting**: Insights into business growth and financial planning.

- **Instant Email Confirmation**: Sends detailed confirmations to both the client and the agency.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion.
- **Backend**: Node.js (Express), MongoDB (Mongoose).
- **AI Engine**: Groq (Llama 3.3 70B & 3.2 Vision).
- **Automation**: Puppeteer (Browser Agent).
- **Storage & Auth**: Supabase (PostgreSQL).

---

## 🚀 Quick Setup

1.  **Install dependencies**:
    ```bash
    npm install
    cd server && npm install
    ```
2.  **Configure Environment**:
    - Copy `.env.example` to `.env`.
    - Copy `server/.env.example` to `server/.env`.
    - Fill in your API keys (Groq, LeadHunter, Supabase).
3.  **Google Calendar**:
    - Place your `service-account.json` in the `server/` directory.
4.  **Launch**:
    ```bash
    npm run dev
    ```

For a detailed walkthrough, see the [GUIDE.md](./GUIDE.md).

---

## 📄 License
This project is private and proprietary. All rights reserved.
