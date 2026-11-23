# SalonBook — Salon Appointment Booking Platform (Backend Server)

**SalonBook Server** is a RESTful backend API built with Node.js, Express.js, and MongoDB for the SalonBook appointment booking platform. It manages salon service catalogs, conflict-free appointment scheduling, role-based access control via JWT verification, customer account moderation, and signature-verified Stripe Checkout and Webhook payment processing.

---

## Live Links & Repositories

- **Live Website:** https://salonbo.vercel.app
- **Live Backend API:** https://salonbo.onrender.com

---

## Important Features

- **JWT Authentication & Role-Based Authorization:** Verifies Bearer JWT tokens on protected endpoints, checks live user and `isBlocked` status directly against MongoDB, and restricts administrative routes via `verifyAdmin` middleware.
- **Salon Service Management:** Supports public active-service querying (case-insensitive name search, category filtering, price sorting, and result limiting) alongside Admin-only CRUD operations and status toggling (`active` / `inactive`).
- **Conflict-Free Appointment Booking:** Prevents customers from booking inactive services, blocks duplicate active (`pending` or `confirmed`) bookings on the same date and time slot, and enforces role-specific status transitions.
- **Stripe Checkout & Verified Webhooks:** Creates Stripe Checkout sessions exclusively for confirmed, unpaid customer appointments and updates payment status to `paid` only after verifying incoming `checkout.session.completed` webhook signatures.
- **User & Transaction Auditing:** Enables administrators to inspect registered customers, block/unblock user access with immediate session revocation, and view read-only payment transaction logs.
- **Structured MongoDB Collections:** Organizes data across four core collections (`users`, `services`, `appointments`, and `transactions`) with indexing and aggregation pipelines.

---

## Technology Stack

- **Runtime & Framework:** Node.js, Express.js (ES Modules)
- **Database:** MongoDB (`mongodb` native driver)
- **Authentication & Security:** JSON Web Tokens (`jsonwebtoken`), CORS
- **Payments:** Stripe SDK & Webhooks
- **HTTP Logging & Dev Tools:** Morgan, Nodemon, Dotenv

---

## API Endpoints Overview

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Server health check |
| `GET` | `/api/services` | Public | List active services (supports `search`, `category`, `sort`, `limit`) |
| `GET` | `/api/services/:id` | Public | Get single service details by ID |
| `GET` | `/api/services/admin/all` | Admin | List all active and inactive services |
| `POST` | `/api/services` | Admin | Create a new salon service |
| `PATCH` | `/api/services/:id` | Admin | Update service details or toggle status |
| `DELETE` | `/api/services/:id` | Admin | Delete a salon service |
| `POST` | `/api/appointments` | Customer | Submit a new appointment request |
| `GET` | `/api/appointments/my` | Customer | Get logged-in customer's appointments |
| `PATCH` | `/api/appointments/:id/cancel` | Customer | Cancel own `pending` appointment |
| `GET` | `/api/appointments/admin/all` | Admin | List all customer appointment requests |
| `PATCH` | `/api/appointments/:id/status` | Admin | Confirm or cancel an appointment |
| `GET` | `/api/appointments/stats/customer` | Customer | Get customer dashboard metrics |
| `GET` | `/api/appointments/stats/admin` | Admin | Get admin dashboard overview metrics |
| `GET` | `/api/users/me` | Authenticated | Get current user profile |
| `PATCH` | `/api/users/me` | Authenticated | Update own name, phone, or profile image |
| `GET` | `/api/users/admin/customers` | Admin | List all registered customers |
| `GET` | `/api/users/admin/:id` | Admin | View customer details and booking count |
| `PATCH` | `/api/users/admin/:id/block` | Admin | Block or unblock a customer account |
| `POST` | `/api/payments/create-checkout-session` | Customer | Create Stripe Checkout session for confirmed booking |
| `POST` | `/api/payments/webhook` | Stripe | Signature-verified Stripe webhook listener |
| `GET` | `/api/payments/my` | Customer | Get customer's payment history |
| `GET` | `/api/payments/admin/all` | Admin | View all verified payment transactions |

---

## Installation Instructions

1. **Clone the server repository:**
   ```bash
   git clone [https://github.com/your-username/salonbook-server.git](https://github.com/your-username/salonbook-server.git)
   cd salonbook-server
