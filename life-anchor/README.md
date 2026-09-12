# 🩸 Life Anchor — Blood Donation Management System

## Quick Start

### 1. Setup database
```bash
# Only need to set your MySQL password — DB, tables & demo data create automatically
cd backend
cp .env.example .env
# Edit .env → set DB_PASSWORD=yourMySQLpassword
```

### 2. Run backend
```bash
cd backend
npm install
npm run dev   # runs on http://localhost:5000
```

### 3. Run frontend
```bash
cd frontend
npm install
npm run dev   # runs on http://localhost:5173
```

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| 👑 Admin | admin@lifeanchor.com | Admin@123 |
| 💉 Donor | ravi@demo.com | donor123 |
| 🙏 Seeker | meera@demo.com | seeker123 |
| 🏥 Hospital | citygeneral@demo.com | hospital123 |

## Key Changes in This Version

### Bug Fixed: Donor Contact System
- **Find Donors page**: Seekers and hospitals now see a "📞 Contact Donor" button on every donor card
- Clicking opens a **Contact Modal** with full donor profile, phone number, Call button, and WhatsApp button
- Donors without a phone number show a clear warning message

### Seeker Dashboard: Full Contact Card
- When a donor accepts a request, the seeker sees a **Contact Card** with donor name, blood group, badge, city
- **Direct Call button** (`tel:` link)
- **WhatsApp button** (pre-filled message)
- **Open Chat button** to start real-time Socket.IO chat

### Chat System: Completely Rebuilt
- **Online presence**: Shows how many participants are in the chat room
- **Typing indicators**: "Ravi is typing…" with animated dots
- **Join/leave notifications**: System messages when users join or leave
- **Other party shown in chat header**: Name, role, blood group, Call/WhatsApp buttons
- **Expired session**: Full-screen overlay with contact alternatives
- **Message confirmation**: Server broadcasts back to sender for delivery confirmation

### Admin: User Reactivation
- Admin can now **Activate** suspended users (not just suspend)

### Donor Notification on Completion
- Donor receives a **"🎉 Donation Confirmed!"** notification when seeker marks completed

## Architecture
- **Frontend**: React 18 + Vite + React Router v6
- **Backend**: Node.js + Express.js
- **Database**: MySQL (auto-created on first run)
- **Auth**: JWT + bcrypt
- **Real-time**: Socket.IO for chat
- **Charts**: Chart.js
