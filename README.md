# FORO Management System

A modern, serverless web application designed to manage shifts, attendance, and studey hall operations efficiently. Built with performance and automation in mind, it leverages a robust stack of **React (Vite)**, **Node.js (Vercel Serverless)**, and **Turso (LibSQL)**.

## 🚀 Key Features

*   **Shift Management**: automated scheduling and visual dashboard for monitoring study hall coverage.
*   **Attendance Tracking**: streamlined check-in system for users.
*   **Real-time Notifications**: integrated Telegram bot for instant alerts and reminders.
*   **Automated Maintenance**: complex cron jobs for weekly reports and database transitions.

---

## 🛠 Technology Stack

*   **Frontend**: React, Vite, TypeScript
*   **Backend**: Node.js, Vercel Serverless Functions
*   **Database**: Turso (LibSQL)
*   **Integrations**: Telegram API, Resend (Email), Google Sheets

---

## ⚡ API Architecture & Engineering Strengths

The core leverage of this project lies in its **Serverless API implementation**, designed for high reliability and low maintenance.

### 1. Intelligent Cron System (`/api/cron.js`)
The project features a highly sophisticated Cron Job handler that serves as the heartbeat of the application. Unlike simple scheduled tasks, this system acts as an **autonomous decision engine**:

*   **Timezone-Aware Execution**: implemented a custom `getItalianTime()` logic to strictly enforce CET/CEST timing, ensuring operations are accurate regardless of the server's region.
*   **Granular Task Routing**: A single entry point determines the specific sub-task to execute based on precise time slots (e.g., `notification_morning` at 08:00, `weekly_report` on Saturdays at 12:00).
*   **Performance Optimization**: The weekly shift report generator uses advanced in-memory processing (`Set` lookups) and single-query data fetching to handle complex calendar logic in milliseconds, avoiding N+1 query problems.
*   **Self-Healing**: Automatic transaction rollback and error reporting to Telegram if a critical task (like the Sunday week transition) fails.

### 2. Custom Secure Authentication (`/api/autenticazione.js`)
Instead of relying on heavy third-party auth providers for simple needs, the API implements a lean, custom authentication flow:

*   **Security**: Uses `PBKDF2` with unique per-user salts for password hashing, ensuring robust protection against rainbow table attacks.
*   **Session Management**: Lightweight session handling optimized for stateless serverless environments.

### 3. Deep Telegram Integration
The API doesn't just send messages; it manages a two-way communication flow:
*   **Contextual Reminders**: Users receive personalized reminders exactly 1 hour before their shift starts.
*   **Admin Reports**: Administrators receive detailed statistical breakdowns of empty shifts and coverage gaps directly in chat.

### 4. Database Efficiency
Built on **Turso**, the API layer is optimized for edge compatibility:
*   **Transactional Integrity**: Critical operations (like the "End of Week" reset) use strict ACID transactions to ensure no data is lost during the rollover from "Current Week" to "Archive".
