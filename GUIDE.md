# BritSync Assistant - User & Developer Guide

This guide explains how to use, run, and extend the BritSync Assistant (BritC).

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or newer)
- **MongoDB** (Local or Atlas)
- **Groq Cloud API Key** (Get one at [console.groq.com](https://console.groq.com))
- **Google Cloud Service Account** (For Calendar integration)
- **LeadHunter API Key** (Optional, for lead scraping)

### 2. Initial Setup
1.  **Clone the repository** and install dependencies:
    ```bash
    npm install
    cd server && npm install
    ```
2.  **Environment Variables**:
    - Copy `server/.env.example` to `server/.env` and fill in your secrets.
    - Set up `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your root `.env` or in the frontend config if using Supabase.
3.  **Google Calendar**:
    - Create a Service Account in the [Google Cloud Console](https://console.cloud.google.com/).
    - Download the JSON key file and save it as `server/service-account.json`.
    - Share your Google Calendar with the service account email.

### 3. Running the Project
From the root directory, run:
```bash
npm run dev
```
This will start both the Vite frontend (port 5173) and the Express backend (port 5010).

---

## 🤖 Interacting with BritC

BritC is a dual-purpose agent:

1.  **Dashboard Assistant (Growth Partner)**:
    - Located in the "Chat" tab of the dashboard.
    - Can perform autonomous actions like scraping leads, generating documents, and web research.
    - It uses `[[ACTION:{...}]]` tags to trigger these tools.

2.  **Website Widget (Appointment Booker)**:
    - Specialised in converting website visitors into discovery calls.
    - Handles natural language date/time parsing.
    - Automatically checks availability and sends confirmation emails.

### Example Commands:
- "Find me 10 leads for digital agencies in London."
- "Create a web design proposal for Client X for £2,500."
- "Research the latest trends in AI automation for 2024."
- "Schedule a discovery call for next Tuesday at 2 PM."

---

## 🛠 Extending the Agent

### Adding a New Action
1.  **Define Action Type**: Add your new action name to the `ActionType` union in `src/lib/agent.ts`.
2.  **Implement Logic**: Add a new `case` in the `executeAction` function in `src/lib/agent.ts`.
3.  **Update System Prompt**: Update the `BASE_SYSTEM_PROMPT` in `src/lib/ai.ts` to teach BritC how to use the new action.
4.  **(Optional) Backend Route**: If your action needs server-side processing (like scraping or complex file I/O), add a route in `server/index.js`.

### Modifying the Persona
You can adjust BritC's personality by editing the `WIDGET_SYSTEM_PROMPT` in `server/index.js` (for the widget) or `BASE_SYSTEM_PROMPT` in `src/lib/ai.ts` (for the dashboard).

---

## 🐛 Troubleshooting
- **Backend Offline**: If the status indicator in the Chat says "Local Brain (Backend Offline)", ensure the server is running on port 5010.
- **Groq API Errors**: Double-check your API key in the Dashboard Settings.
- **Puppeteer Issues**: If lead scraping or web research fails, ensure all Puppeteer dependencies are installed on your OS (especially on Linux). You can toggle `PUPPETEER_HEADLESS=false` in `server/.env` to debug visually.
