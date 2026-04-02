# 🧪 LabVault: Intelligent Pathology Management System

LabVault is a state-of-the-art, AI-powered platform designed to bridge the gap between complex medical reports and patient understanding. It provides a secure, scalable, and multilingual environment for patients, doctors, and pathology labs.

---

## 🌟 Key Features

### 🎙️ AI Voice Reports (Gemini 2.0 Flash)
Transform complex medical jargon into reassuring, easy-to-understand audio summaries.
- **Multilingual Support**: English, Hindi, Marathi, and Telugu.
- **Native Audio**: High-fidelity speech synthesis powered by Google Gemini 2.0 Flash (`v1beta`).
- **Reassuring Tone**: AI summaries are crafted to reduce patient anxiety while maintaining medical accuracy.

### 🔐 Secure Access Control
- **Role-Based Permissions**: Dedicated dashboards for Patients, Doctors, and Pathology Labs.
- **Doctor Authorization**: Patients must explicitly grant access to doctors before their reports can be viewed.
- **JWT Authentication**: Industry-standard security for all API endpoints.

### 🆔 Unique Patient Identity
- **LV-ID System**: Every patient receives a unique `LV-XXXXX` identifier for seamless record tracking across different pathology labs.

---

## 🏗️ Technical Architecture

### Backend (Node.js & Express)
- **Database**: MongoDB with Mongoose ODM.
- **AI Engine**: 
  - **Groq SDK**: High-speed LLM processing for report simplification.
  - **Google Generative AI (v1beta)**: Native multimodal audio generation.
- **Security**: Bcryptjs for password hashing and JSON Web Tokens (JWT) for session management.
- **Email**: Nodemailer integration for notifications and credentials.

### Frontend (Next.js & React)
- **Framework**: Next.js 15+ with App Router.
- **Styling**: Tailwind CSS 4.0 for a modern, responsive, and premium UI.
- **State Management**: React Hooks and Context API.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v20+)
- MongoDB Atlas account
- Google AI Studio API Key (for Gemini 2.0 Flash)
- Groq API Key (for fast summaries)

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your .env file (see .env.example)
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 👥 User Roles & Permissions

| Role | Permissions |
| :--- | :--- |
| **Patient** | View own reports, listen to AI summaries, grant/revoke doctor access. |
| **Doctor** | View reports of authorized patients, track health timelines. |
| **Pathology** | Upload reports, register patients, manage lab analytics. |
| **Admin** | System management and high-level platform oversight. |

---

## 🛠️ Project Structure

- `/backend`: Express API, Mongoose Models, and AI Controller logic.
- `/frontend`: Next.js application with Tailwind-styled components.
- `/uploads`: Storage for processed pathology PDFs (local storage/S3).

---

## 📝 License
Proprietary - LabVault HealthTech.
