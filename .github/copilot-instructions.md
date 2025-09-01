# Copilot Instructions for Al-Ysabil App

This document provides guidelines and best practices for building the Al-Ysabil wholesale ordering app using Next.js and Firestore. It is intended to help GitHub Copilot generate consistent, secure, and maintainable code.

---

## 1. Project Overview

* **Stack**: Next.js (React) + Firebase Firestore
* **Authentication**: Custom script to create **Seller** accounts; no public registration.
* **User Roles**:

  * **Seller**: Creates and manages **Customer** profiles and product catalogue.
  * **Customer**: Browses products, places orders, views invoices.
* **Pages**:

  * **Landing Page**: Marketing overview, login link.
  * **Login Page**: Email & password fields, role-based redirect.
  * **Seller Dashboard**: Customer management, product catalogue, order list.
  * **Customer Dashboard**: Product catalogue, cart, order history.

---

## 2. Folder Structure

```
/al-ysabil-app
├── public/
├── scripts/
│   └── createSellers.ts     # CLI script to add seller accounts
├── src/
│   ├── pages/
│   │   ├── index.tsx          # Landing page
│   │   ├── login.tsx          # Login page
│   │   ├── seller/
│   │   │   ├── dashboard.tsx   # Overview: users, products, orders
│   │   │   ├── users/
│   │   │   │   ├── index.tsx   # List all customers
│   │   │   │   └── create.tsx  # Form to add new customer
│   │   │   └── products/
│   │   │       ├── index.tsx   # List all products (edit/delete)
│   │   │       └── create.tsx  # Form to add/edit product
│   │   └── customer/
│   │       ├── dashboard.tsx   # Browse products, view cart/orders
│   │       ├── cart.tsx        # Cart review & checkout
│   │       └── orders.tsx      # List orders with status
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Shared utilities, Firestore client
│   │   ├── firebase.ts        # Initialize Firebase app
│   │   └── auth.ts            # Auth helper functions
│   ├── styles/                # Tailwind or CSS modules
│   └── types/                 # Shared TypeScript interfaces/types
└── next.config.js
```

* API routes remain under `pages/api/`.
* Source code lives in `src/` (configured in `tsconfig.json`).

````

- Keep API routes under `pages/api/` to colocate serverless functions with Next.js.
- Use `src/` directory for all source code (enabled via `tsconfig.json`).

---

## 3. Authentication & Authorization

- **No public registration**: Run `npm run create-seller` to add Sellers via `scripts/createSellers.ts`.
- **Login**: NextAuth or custom JWT strategy in `pages/api/auth/login.ts`.
- **Session Handling**: Store JWT in HTTP-only cookie; use `getServerSideProps` on protected pages to verify.
- **Role Checks**:
  - In API routes and pages, verify `user.role === 'seller'` or `'customer'`.
  - Redirect unauthorized access to login.

---

## 4. Firestore Schema & Security Rules

### Collections

- `sellers/{sellerId}`
- `customers/{customerId}` (fields: `name`, `email`, `prices: Record<productId, number>`, `sellerId`)
- `products/{productId}`
- `orders/{orderId}` (fields: `customerId`, `items: Array<{productId, qty}>`, `status`, `sellerId`)

### Security Rules (Firestore)

```rules
service cloud.firestore {
  match /databases/{database}/documents {
    match /sellers/{sellerId} {
      allow read, write: if request.auth.uid == sellerId;
    }
    match /customers/{customerId} {
      allow read, write: if request.auth.uid == resource.data.sellerId;
    }
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'seller';
    }
    match /orders/{orderId} {
      allow create: if request.auth.token.role in ['seller', 'customer'];
      allow update: if request.auth.token.role == 'seller';
      allow read: if request.auth.token.uid == resource.data.sellerId \
                   || request.auth.token.uid == resource.data.customerId;
    }
  }
}
````

---

## 5. API Routes & Data Fetching

* **`/api/auth/login`**: Validate credentials, return JWT.
* **`/api/customers`**: CRUD endpoints; only Sellers can write, Customers can read their own.
* **`/api/products`**: Public read; Sellers manage products (CRUD).
* **`/api/orders`**: Customers create orders; Sellers update status.

**Best Practices**:

* Use `async/await` and proper `try/catch`.
* Return consistent JSON shapes: `{ success: boolean, data?, error? }`.
* Validate requests with Zod or Joi.

---

## 6. UI Components & Page Layout

* **Atomic Design**: Break UI into `atoms` (Button, Input), `molecules` (FormField), `organisms` (Header, Footer).
* **Tailwind CSS**: Utility-first; use responsive variants.
* **State Management**: Use React Context or SWR for data fetching & caching.
* **Forms**: Use React Hook Form + Yup for validation.

---

## 7. Scripts & Account Creation

* Place `scripts/createSellers.ts` in a `scripts/` folder—run via `node scripts/createSellers.ts`.
* Read `.env` for admin credentials, loop over seller list to write to Firestore.
* Log success/failure per user.

---

## 8. Environment & Secrets

* Store Firebase config, JWT secret, and any API keys in `.env.local` (gitignored).
* Prefix variables with `NEXT_PUBLIC_` only if they must be exposed client-side.

---

## 9. Coding Standards & Workflow

* **TypeScript Strict**: Enable `strict` in `tsconfig.json`.
* **ESLint + Prettier**: Enforce consistent style.
* **Commit Messages**: Use Conventional Commits (`feat:`, `fix:`, `chore:`).
* **Branching**: `main` protected; feature branches per ticket.

---

## 10. Testing & Linting

* **Unit Tests**: Jest for utility functions, API handlers.
* **Integration Tests**: Playwright or Cypress for end-to-end flows (login, order creation).
* **Pre-commit Hooks**: Husky to run `eslint --fix`, `npm test`.

---

## 11. Deployment

* Client provisions hosting (Vercel or any Node.js server).
* Use `next build` and `next start` for production.
* Ensure Firestore rules deployed via `firebase deploy --only firestore:rules`.

---

*End of copilot-instructions.md*
