# KNI Super App - MVP

A comprehensive web application for managing kitchen/restaurant equipment services, built with Next.js 15+, TypeScript, Prisma, and PostgreSQL.

## Features

### Roles & Permissions
- **ADMIN**: Full system management (catalog, bookings, users, approvals)
- **OWNER**: Restaurant owners who book services and order from marketplace
- **VENDOR**: Suppliers who list products in the marketplace
- **ENGINEER**: Service technicians who complete assigned jobs

### Core Functionality
- Authentication with httpOnly cookie sessions (no localStorage)
- Role-Based Access Control (RBAC) on routes and APIs
- Full notification system with real-time unread counts
- Soft delete pattern for most entities

### Module Breakdown

#### Admin Module
- Manage categories, subcategories, services, and parts
- Approve/reject restaurant requests
- Approve/reject vendor applications
- Verify payment proofs
- Assign engineers to bookings
- View and manage all bookings

#### Owner Module
- Register restaurants for approval
- Browse service catalog (feed)
- Add services/parts to cart
- Book services with preferred time slots
- Upload payment screenshots
- Track booking status
- Browse vendor marketplace
- Place marketplace orders

#### Vendor Module
- Register and await approval
- Manage subscription (TRIAL/ACTIVE/EXPIRED)
- Add/edit/delete products
- Products visible in marketplace only when subscription active

#### Engineer Module
- View assigned jobs
- Accept/reject job assignments
- Start and complete work
- Upload completion proof with notes

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (manually created)
- **Validation**: Zod
- **Password Hashing**: bcrypt
- **Sessions**: httpOnly cookies (custom session table)

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- pnpm (recommended) or npm

### 1. Clone and Install

```bash
git clone <repository-url>
cd KNI-Super-App
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/kni_super_app?schema=public"

# Session
SESSION_SECRET="your-super-secret-session-key-at-least-32-chars"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed the database with sample data
pnpm prisma db seed
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Test Credentials

After running the seed, use these credentials to test different roles:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kni.com | admin123 |
| Owner | owner@test.com | owner123 |
| Vendor | vendor@test.com | vendor123 |
| Engineer | engineer@test.com | engineer123 |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── admin/             # Admin dashboard & pages
│   ├── owner/             # Owner dashboard & pages
│   ├── vendor/            # Vendor dashboard & pages
│   ├── engineer/          # Engineer dashboard & pages
│   └── api/               # API routes
├── components/
│   ├── layouts/           # Layout components (sidebar, topbar)
│   ├── notifications/     # Notification bell component
│   └── ui/                # UI components (button, input, etc.)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── server/
    ├── auth/              # Session & RBAC utilities
    ├── db.ts              # Prisma client
    ├── notifications/     # Notification service
    ├── upload/            # File upload handling
    └── validators/        # Zod schemas
```

## API Patterns

All API responses follow this format:

```typescript
// Success
{ ok: true, data: { ... } }

// Error
{ ok: false, error: "Error message" }
```

## Approval Flows

### Restaurant Approval
1. Owner creates restaurant request
2. Admin reviews and approves/rejects
3. Owner gets notified
4. Approved owners can book services

### Vendor Approval
1. Vendor registers account
2. Admin reviews and approves/rejects
3. Vendor gets notified
4. Approved vendors start with 14-day TRIAL

### Booking Flow
1. Owner adds services/parts to cart
2. Owner creates booking with preferred date/time
3. Owner uploads payment screenshot
4. Admin verifies payment
5. Admin assigns engineer with scheduled date/time
6. Engineer accepts/rejects assignment
7. Engineer starts work
8. Engineer completes and uploads proof
9. Owner receives completion notification

### Vendor Subscription
- **TRIAL**: 14 days free, products visible in marketplace
- **ACTIVE**: Paid subscription, products visible
- **EXPIRED**: Trial/subscription ended, products hidden
- **BLOCKED**: Admin blocked, products hidden

## Price Format

All prices are stored in **paise** (1 INR = 100 paise):
- `10000` = Rs. 100.00
- `150000` = Rs. 1,500.00

Use the `formatPrice()` utility to display prices:
```typescript
import { formatPrice } from "@/lib/utils";
formatPrice(10000); // "Rs. 100.00"
```

## File Uploads

Payment proofs and engineer completion images are saved to:
```
public/uploads/{type}/{yyyy-mm}/{filename}
```

Supported formats: PNG, JPG, WebP (max 5MB)

## Development Notes

### Adding New UI Components
UI components are in `src/components/ui/`. They use Tailwind CSS v4 with CSS variables for theming.

### Adding New API Routes
1. Create route file in `src/app/api/`
2. Use appropriate RBAC function (`requireAdmin`, `requireOwner`, etc.)
3. Validate input with Zod schemas
4. Return `{ ok: true/false, ... }` format

### Database Changes
1. Update `prisma/schema.prisma`
2. Run `pnpm prisma migrate dev --name <migration-name>`
3. Update seed file if needed

## Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server

# Database
pnpm prisma studio    # Open Prisma Studio
pnpm prisma migrate dev    # Run migrations
pnpm prisma db seed   # Seed database
pnpm prisma generate  # Generate Prisma client

# Linting
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript checks
```

## License

Private - All rights reserved.
