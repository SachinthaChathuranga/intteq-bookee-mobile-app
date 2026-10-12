# Booking Platform — Product Spec (Phase 1: Salons)

> Working name: **BarberQ** — final app name not decided yet (see §1.1).
> Source: *BarberQ Functionality Document* (INTTEQ) + decisions confirmed on 2026-10-12.
> This file is the single source of truth for building the app.
> Agent: read this whole file before planning. Do not build anything listed under **Phase 2** or **Out of Scope**.
> Anything marked **[OPEN]** is not decided yet — ask before implementing it.

---

## 1. Overview

This is a **general-purpose booking & queue platform**. **Phase 1 supports salons only.** Later phases will add other business types such as **futsal / indoor ground booking**.

Phase 1 is a multi-role salon queue and appointment management app. It connects **salon owners, barbers, receptionists and customers** in one platform.

### 1.1 App name & branding
- The app name is **not final**. Never hard-code it — read it from one config file: `src/config/app.ts` (`APP_NAME`, `APP_SLUG`, support contact). Same for the backend (`.env` / config).
- No logo yet — use a simple text/placeholder mark that can be replaced later.

### 1.2 Built for more than salons (important for architecture)
Phase 1 only builds salon features, but the code must not assume the platform is salon-only:
- Core entity is **`Business`** (with `type: SALON`; later `SPORTS_VENUE` etc.), **not** `Salon`. Branches, services, bookings, reviews, favourites, payments and notifications hang off `Business`/`Branch` and stay generic.
- Salon-only logic (barber queues, walk-in tokens, commissions, shifts) lives in its own module (`features/salon/*` on mobile, `modules/salon/*` on backend) so a future `features/venue/*` can sit beside it.
- User-facing words ("Salon", "Barber") come from the i18n files, so they can differ per business type later.
- Don't build anything for grounds/futsal now — just don't block it.

**Problem it solves:** salons manage queues verbally, track income on paper, and can't tell customers how long they'll wait. Customers leave when they see a long queue. Owners can't see per-barber earnings. Barbers have no digital record of services or commissions.

**Phase 1 surface:** one **mobile app** (Expo / React Native). Everyone uses the same app.
Web pages (Live Salon Board for TV, SMS queue-tracking link) are **Phase 2**.

---

## 2. Tech Stack

- **Mobile:** Expo (latest SDK), **React Navigation**, TypeScript
- **State / data fetching:** TanStack Query + Zustand
- **Backend:** REST API — **Node.js / Express**
- **Real-time:** WebSockets (queue and shift status must update live)
- **DB:** PostgreSQL
- **Auth:** phone number + OTP (phone number is the identity — see §8)
- **Push notifications:** Expo Notifications (FCM/APNs)
- **SMS:** **notify.lk** (OTP and transactional SMS). Wrap it in a backend `SmsService` interface so the provider can be swapped. Credentials (`NOTIFY_LK_USER_ID`, `NOTIFY_LK_API_KEY`, `NOTIFY_LK_SENDER_ID`) only in backend env vars, never in the app. Send numbers in `94XXXXXXXXX` format (normalise `07X…` / `+94…` input). Check notify.lk's API docs for the exact endpoint; a custom sender ID needs approval from notify.lk.
- **Currency:** LKR (display as `Rs. 500`)
- **Languages:** Sinhala, Tamil, English — see §9
- **Theme:** Light + Dark — see §9

---

## 3. User Roles & App Modes

| Role | Scope | Workspace home screen |
|---|---|---|
| **Super Admin** (INTTEQ) | All accounts on the platform | Accounts list |
| **Salon Owner** | Their own salons/branches | Income dashboard |
| **Receptionist** | One branch; queue + walk-ins (no financials) | Live queue (all barbers) |
| **Barber** | Own shift, queue, appointments, earnings | Own queue |
| **Customer** | Own bookings, queue position, profile | Customer home |

### 3.1 Everyone starts as a customer
- **Every user — including owners, barbers, receptionists and super admins — lands in the Customer app after login** and sees the same customer screens (search salons, book, join queue, etc.). Staff can book haircuts like anyone else.
- **Profile → "My Workspaces"** lists every staff role the user holds, e.g.:
  - `Owner — Kasun's Salon`
  - `Barber — Kasun's Salon (Colombo branch)`
  - `Receptionist — Kasun's Salon (Kandy branch)`
- Tapping a workspace opens that role's dashboard (its own navigation stack / tab bar).
- Every workspace has a clear **"Back to customer app"** action.
- Users with no staff role simply don't see the "My Workspaces" section.

### 3.2 Rules
- One phone number can hold multiple roles (e.g. an owner who also cuts hair).
- **Any barber can also perform receptionist actions** (add walk-in, view all queues, assign barber).
- **One barber can be assigned to multiple branches/salons of the same owner.** If so, the barber workspace has a branch switcher.
- No Manager or Supervisor roles.

---

## 4. Features by Role

### 4.1 Salon Owner

**Salon & branch management**
- Create and manage multiple branches from one account.
- Per branch: name, location (address + map pin), working hours, services offered.
- Services & prices are set **per branch** (e.g. Haircut Rs. 500, Beard Rs. 300). Each service has name, price, estimated duration.
- View all branches in one dashboard and switch between them instantly.

**Barber management**
- Invite barbers to a branch via phone number or invite code.
- Set commission per barber: **percentage** (e.g. 40% of each service) **or fixed amount**.
- Live shift status: who is on shift right now.
- Shift history per barber (dates, start/end time, duration).
- Deactivate or remove a barber from a branch.
- Record barber payouts: **advance / partial / daily** payment (see `BarberPayout` in §7). Barber's view shows commission earned vs paid out.

**Earnings tracking**
- Total income: today, this week, this month.
- Per-barber breakdown for the selected period.
- Filter by service type and payment method (cash / card / transfer).
- Transaction list: customer, barber, service, amount, tip, payment method, time.
- Export earnings report as **PDF** or **spreadsheet**.

**Petty cash & expenses**
- **Start of day:** owner enters the **opening petty cash**.
- During the day: record expenses with amount + category — Tea/refreshments, Electricity/utilities, Cleaning supplies, Salon products, Other (custom).
- **End of day:** **closing petty cash** is calculated:
  ```
  Closing petty cash = Opening petty cash + Cash income − Expenses
  ```
  Only **cash** payments count as cash income (card/transfer do not).
- The day's closing petty cash is pre-filled as the next day's opening petty cash (owner can edit).
- Daily and monthly expense summaries.

**Reports (Phase 1)**
- Daily income summary vs previous day.
- Revenue trend chart (last 30 days).
- Top-earning barber (week / month).
- Most popular services by volume and revenue.

**Live floor (in-app)**
- All barbers' queues and status at a glance for the selected branch, live.

### 4.2 Barber

**Shift management**
- **Start Shift** → becomes visible to customers and owner; their queue opens.
- **Pause queue** (e.g. lunch) → no new joins to their personal queue; existing queue stays; they stop pulling from the general queue.
- **End Shift** → queue closes; shift earnings saved and sent to owner dashboard.
  - **A barber cannot end the shift while anyone is still waiting in their queue.**
  - The End Shift button opens a **Reassign** step: each waiting customer must be reassigned to another on-shift barber (with an "auto-assign all" option that uses §6 logic), or be marked Completed / No Show / Left.
  - Reassigned customers keep their original join time (no loss of place) and get a push notification: "You've been moved to Barber Amal's queue".
  - If the queue is empty, the shift ends normally — nothing extra needed.
  - **The barber cannot cancel a customer's queue entry themselves.** If a waiting customer can't be reassigned (e.g. no other barber is on shift), the barber must contact them and ask them to cancel:
    - **Call** button (opens the phone dialer with the customer's number), and/or
    - **Request to cancel** button → push notification (+ SMS for verified walk-ins without the app): "Barber Kasun is ending his shift. Please cancel your booking or move to another barber."
    - The customer then leaves the queue themselves (or picks another barber) from the wait screen.
    - Anonymous walk-ins (no phone) are physically at the salon — the barber talks to them and marks them **Left**.
  - End Shift stays disabled until the barber's queue has nobody `WAITING`.

**Queue management** (primary screen)
- Real-time list: name/token, service(s), estimated wait — shows own queue plus general-queue customers this barber can take (see §6).
- **Call Next** → brings next customer in (customer is notified).
- **Complete** → enter amount (pre-filled from service price, editable), payment method (cash/card/transfer), optional tip.
- **No Show** → removes customer from queue.
- **Reorder** own queue manually (e.g. appointment customer arrives).

**Walk-ins** — see §5.3 (shared with Receptionist).

**Appointments**
- Today's appointments: customer name, service, time.
- No confirm step — appointments are **confirmed automatically** when the customer books.
- Barber can reschedule (customer is notified).
- Mark arrival → customer is added to the live queue.

**Earnings**
- Today's total from completed services + commission earned.
- History by day / week / month.
- Service-by-service breakdown.
- Payouts received (advance / partial / daily) and balance due.

**Customer notes**
- Add a short note to a customer after service (e.g. "prefers fade, no razor on neck").
- Note shows the next time that customer is in this barber's queue.

### 4.3 Receptionist

- Add walk-ins (§5.3).
- Check barber availability by time slot.
- Assign walk-in to a specific barber, or put them in the general queue (§6).
- View live queue across all barbers in the branch, including the general queue.

### 4.4 Customer

**Salon discovery**
- Search salons by name or location.
- Salon details: address, working hours, services (name, price, duration), barbers and their status (working / not working today).
- Save favourite salons and favourite barbers.

**Booking & queue** — see §5.1.
- Live queue view: "2 people ahead of you", "Estimated wait: 18 minutes".
- See which barbers are free / serving.
- Choose a specific barber's queue **or** "Any barber" (general queue).
- Leave the queue any time before being called.

**Favourite barber**
- Mark from barber profile; join their queue directly.
- If not working today: show "Barber Kasun is not working today", suggest next available barber, offer to book for a future date.

**Appointments**
- Book by specific barber ("Tomorrow 5 PM with Kasun") or any barber ("Tomorrow ~3 PM, whoever is free").
- Appointments are **confirmed instantly** at booking — no barber approval step.
- For "any barber", the system auto-assigns a barber when the booking is confirmed, and **the confirmation screen shows the assigned barber's name**.
- View, reschedule, cancel upcoming appointments.

**Notifications** (push)
- "Your turn is coming up — 1 person ahead of you"
- "You are next — please make your way to the salon"
- "Barber Amal will serve you" (when a general-queue customer is picked up)
- "You've been moved to Barber Amal's queue" (reassignment at shift end)
- "Barber Kasun is ending his shift. Please cancel your booking or move to another barber." (request to cancel — opens the wait screen with Cancel / Choose another barber)
- Appointment reminder 1 hour before
- "Your barber Kasun is now on shift" (favourite barber started shift)
- Appointment confirmed / rescheduled / cancelled

**Ratings & reviews**
- After each completed service: 1–5 stars + optional comment.
- Shown on barber profile (average + recent reviews).

**Profile**
- Name, phone, preferred salon.
- Visit history: date, barber, service, amount.
- Favourite barbers and salons.
- Language (සිංහල / தமிழ் / English) and theme (Light / Dark / System).
- **My Workspaces** (staff only — §3.1).

### 4.5 Super Admin (INTTEQ)
- Opened via Profile → My Workspaces like any other role.
- View owners and their salons; activate / suspend accounts.
- No subscription or billing in this phase.

---

## 5. Key Flows

### 5.1 Customer booking flow

```
Select salon
  → Favourite barber? (optional)
      YES → Is barber on shift today / available on chosen date?
              NO  → "Not working today" → suggest other barber or future date
              YES → show THAT barber's services
      NO  → show ALL salon services
  → Select service(s)      (one or more; total price + total duration shown)
  → Pick a time            (available slots shown)
      NOW    → specific barber → join that barber's queue
               any barber      → join the branch GENERAL queue (§6)
               → Wait screen (X ahead · ~N min · notifications)
      FUTURE → Book appointment → system assigns barber at booking time
               → Booking confirmed (assigned barber name shown) → reminder 1 hr before
  → Done — awaiting service
```

- "Now" and "Future" are shown on the same time-selection screen as two kinds of slots.

### 5.2 Barber service cycle

```
Start Shift → queue open
  → Call Next → customer notified
  → Complete (amount, payment method, tip) → transaction saved, commission calculated
  → (optional) add customer note → rating request sent to customer
  → … repeat …
End Shift → queue empty? → end
           → people waiting? → reassign each to another barber
                               OR call / "request to cancel" → customer cancels or moves
           → nobody WAITING → queue closed → shift summary saved
```

### 5.3 Walk-in flow (no app required)

1. Receptionist or barber taps **Add Walk-in**.
2. Chooses mode:
   - **Anonymous** — name or token only (e.g. `W-04`); token told verbally.
   - **Verified** — collect phone number → creates/links a lightweight customer profile (§8). (SMS tracking link is Phase 2.)
3. Select service(s); optionally choose a barber.
4. Specific barber → added to that barber's queue. No preference → added to the general queue (§6).
5. Confirm with customer and tell them the token / estimated wait.
6. Walk-ins are treated exactly like app users in the queue. Barber sees name/token + service.

Token format: `W-` + sequential number, **resets daily per branch**.

---

## 6. Queue Assignment Logic

All customers — app users, walk-ins, receptionist-added — use the same logic.

### 6.1 Two kinds of live queue per branch
- **Barber queue** — customer chose a specific barber. Only that barber serves them.
- **General queue** — customer chose "Any barber". Not tied to a barber yet.

### 6.2 Late assignment for the general queue (walk-in / "now")
A general-queue customer is assigned to a barber **at the moment a barber is ready**, not when they join. This gives the shortest real wait because whichever barber frees up first takes them.

When a barber taps **Call Next**, the system picks the earliest-joined customer among:
1. that barber's own queue, and
2. general-queue customers whose selected services this barber offers,

ordered by `joinedAt` (manual reorder by the barber overrides order within their own queue). Assignment is done in a DB transaction / row lock so two barbers can never call the same general-queue customer.

On pickup the customer is notified: "Barber Amal will serve you".

### 6.3 Specific barber requested
- "Now": barber must be on shift and not paused. If not → show unavailable + suggest another barber or a future appointment.
- Future: barber must have a free slot.

### 6.4 Future appointments with no preference
Assigned **at booking time** to the barber with a free slot at that time who offers all selected services; tie → fewest bookings that day. Barber shown on confirmation.

### 6.5 Estimated wait
- Barber queue: sum of durations ahead in that barber's queue + remaining time of current service.
- General queue: total remaining work (general queue ahead + all eligible barbers' queues) ÷ number of eligible active barbers, rounded up to 5 minutes. Shown as "~N min".

---

## 7. Data Models

Field types are indicative. All tables have `id`, `createdAt`, `updatedAt`.

- **User**: phone (unique), name, email?, avatarUrl?, isAppUser (false = lightweight walk-in profile), language (`si | ta | en`), theme (`light | dark | system`)
- **RoleAssignment**: userId, role (`SUPER_ADMIN | OWNER | RECEPTIONIST | BARBER`), businessId?, branchId? *(everyone is implicitly a customer)*
- **Business**: ownerId, type (`SALON` — later `SPORTS_VENUE`, …), name, logoUrl?, status (active/suspended) *(shown as "Salon" in the UI)*
- **Branch**: businessId, name, address, lat, lng, phone?
- **WorkingHours**: branchId, dayOfWeek, openTime, closeTime, isClosed
- **Service**: branchId, name, price, durationMinutes, isActive
- **BarberProfile**: userId, bio?, photoUrl?, avgRating, ratingCount
- **BarberBranch**: barberId, branchId, commissionType (`PERCENT | FIXED`), commissionValue, isActive
- **BarberService**: barberId, serviceId
- **Invite**: branchId, phone?, code, expiresAt, status
- **Shift**: barberId, branchId, startAt, endAt?, status (`ACTIVE | PAUSED | ENDED`)
- **QueueEntry**: branchId, queueType (`BARBER | GENERAL`), barberId? (null while in general queue), customerId?, walkInName?, tokenNumber?, source (`APP | WALK_IN_ANON | WALK_IN_VERIFIED | APPOINTMENT`), manualPosition?, status (`WAITING | CALLED | IN_SERVICE | COMPLETED | NO_SHOW | LEFT`), joinedAt, assignedAt?, calledAt?, completedAt?, reassignedFromBarberId?
- **QueueEntryService**: queueEntryId, serviceId, price, durationMinutes (snapshot)
- **Appointment**: branchId, barberId, customerId, startAt, endAt, bookingMode (`SPECIFIC | ANY`), status (`CONFIRMED | RESCHEDULED | CANCELLED | ARRIVED | NO_SHOW | COMPLETED`)
- **AppointmentService**: appointmentId, serviceId, price, durationMinutes
- **Transaction**: branchId, barberId, customerId?, queueEntryId, amount, tip, paymentMethod (`CASH | CARD | TRANSFER`), commissionAmount, completedAt
- **BarberPayout**: barberId, branchId, amount, type (`ADVANCE | PARTIAL | DAILY`), date, note?
- **PettyCashDay**: branchId, date, openingPettyCash, cashIncome (computed), expensesTotal (computed), closingPettyCash (computed)
- **ExpenseCategory**: branchId?, name (seeded defaults + custom)
- **Expense**: branchId, categoryId, amount, note?, date, createdBy
- **CustomerNote**: barberId, customerId, text
- **Review**: transactionId, barberId, customerId, rating (1–5), comment?
- **Favourite**: customerId, type (`SALON | BARBER`), targetId
- **DeviceToken**: userId, expoPushToken, platform

**Relationships:** Owner 1→N Salon · Salon 1→N Branch · Branch 1→N Service · Barber N↔N Branch (same owner only) · Barber 1→N Shift · Branch 1→N QueueEntry · QueueEntry 1→0..1 Transaction · Transaction 1→0..1 Review · Barber 1→N BarberPayout.

---

## 8. Phone Number as Lightweight Account

- A verified walk-in's phone number automatically creates a `User` with `isAppUser = false`.
- It stores visit history, services and connected salons.
- If that person later installs the app and signs in with the same number (OTP), they see their full history immediately.

---

## 9. Localization & Theming

### 9.1 Languages
- Three languages: **Sinhala (`si`)**, **Tamil (`ta`)**, **English (`en`)**.
- One translation file per language:
  ```
  src/i18n/en.ts
  src/i18n/si.ts
  src/i18n/ta.ts
  ```
  `en.ts` is the source of truth; `si.ts` and `ta.ts` must have the same keys (typed so a missing key is a TypeScript error).
- **No hard-coded UI strings** in components — always use the translation function.
- Language chosen on first launch (before login) and changeable in Profile. Saved on device and on the `User` record.
- Default: device language if it's si/ta/en, otherwise English.
- Use fonts that render Sinhala and Tamil correctly; check that long Sinhala/Tamil text doesn't break layouts (buttons, tabs).

### 9.2 Theme
- Light and Dark themes, plus "System" (follows device setting). Default: System.
- All colours come from a theme tokens file (e.g. `src/theme/colors.ts` with `light` and `dark` sets) — **no hard-coded colours** in components.
- Navigation theme, status bar and charts must follow the active theme.
- **Brand colour: blue.** All colours live in **one palette file** so they can be adjusted later without touching components:
  ```
  src/theme/palette.ts   ← raw colours only (edit this to rebrand)
  src/theme/colors.ts    ← semantic tokens for light & dark, built from palette
  ```
  Starting palette (`palette.ts`):
  ```ts
  export const palette = {
    primary: {
      50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA',
      500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A',
    },
    neutral: {
      0: '#FFFFFF', 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8',
      500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A', 950: '#020617',
    },
    success: '#16A34A',
    warning: '#D97706',
    danger:  '#DC2626',
  };
  ```
  Semantic tokens (`colors.ts`) — e.g. `primary`, `onPrimary`, `background`, `surface`, `text`, `textMuted`, `border`, `success`, `warning`, `danger` — light uses `primary[600]` on light neutrals; dark uses `primary[400]` on `neutral[900]/[950]`. Components only ever use semantic tokens.
- Font: system default for now; must render Sinhala and Tamil.
- Logo: none yet (§1.1).

---

## 10. Screens (Phase 1, mobile only)

Design rule: each role sees only what it needs; **max 3 taps to any core feature** from that workspace's home.

**Shared / onboarding**
- Splash → Language select (first launch) → Phone login → OTP → (first time) Name → **Customer home**

**Customer app** (everyone)
- Home (search bar, favourite salons/barbers, active queue card)
- Salon search / results (list + map)
- Salon details (info, hours, services, barbers with status)
- Barber profile (photo, rating, reviews, favourite toggle)
- Booking: select barber or "Any barber" → select services → pick time → confirm
- Wait screen (position, est. wait, barber or "Any barber", leave queue)
- My appointments (upcoming / past; reschedule / cancel)
- Rate & review
- Profile: details, visit history, favourites, language, theme, **My Workspaces**

**Barber workspace**
- My Queue — home (shift Start/Pause/End, own + eligible general-queue customers, Call Next, Complete, No Show, drag to reorder, Add Walk-in)
- End Shift → Reassign waiting customers
- Complete service sheet (amount, method, tip, note)
- Today's appointments
- Earnings (today / week / month, commission, payouts, breakdown)
- Customer detail (history + notes)
- Branch switcher (if multiple branches)
- Back to customer app

**Receptionist workspace**
- All-barbers live queue + general queue — home
- Add walk-in (mode, services, barber / any, confirm)
- Barber availability by time slot
- Back to customer app

**Owner workspace**
- Income dashboard — home (today/week/month, per-barber, branch switcher)
- Transactions list + filters + export
- Petty cash & expenses (opening petty cash, add expense, closing petty cash, summaries)
- Branches (list, create/edit, hours, services & prices)
- Barbers (list with live status, invite, commission, shift history, payouts, deactivate)
- Live floor (all queues at a glance)
- Reports (trend chart, top barber, popular services)
- Back to customer app

**Super Admin workspace**
- Owners & salons list, activate / suspend
- Back to customer app

---

## 11. Open Questions

1. Final app name (placeholder via `src/config/app.ts` until decided).
2. Logo (placeholder until provided).

### Decided (2026-10-12)
- Shift end: no waiting customers → end freely. Waiting customers → reassign, or barber calls / requests the customer to cancel. Barber can't cancel for them.
- Appointments are confirmed instantly; no barber approval.
- Brand colour blue, defined in `src/theme/palette.ts`.
- SMS provider: notify.lk.
- Platform is generic (`Business.type`); Phase 1 = salons only.

---

## 12. Phase 2 (do NOT build now)

- **Web: Live Salon Board** — read-only TV/tablet page showing every barber's live status (e.g. `Kasun — Serving now (2 waiting)`).
- **Web: Queue tracking page** — SMS link sent to verified walk-ins to follow their queue position in a browser.
- Loyalty points (earn per Rs. spent, redeem for discounts, owner-set rates)
- QR code payments
- Advanced analytics: busiest-hours heat map, customer return rate
- Owner subscription / billing (Super Admin)

## Later phases
- **Sports venue booking** (futsal / indoor grounds): `Business.type = SPORTS_VENUE`, courts/grounds as bookable resources with time slots. Not part of Phase 1 — see §1.2 for how to keep the code ready for it.

## 13. Out of Scope

- In-app online payments for services
- Chat between customer and barber

---

## 14. Milestones

Build and test one milestone at a time; commit after each.

1. **Foundation** — Expo + React Navigation + TypeScript, i18n (`en.ts` / `si.ts` / `ta.ts`), `palette.ts` + light/dark theme tokens, `src/config/app.ts` (app name), API client, phone + OTP auth via notify.lk, Node/Express + PostgreSQL skeleton with generic `Business` entity and `modules/salon` folder.
2. **App modes** — customer app shell, Profile → My Workspaces, workspace navigation stacks with "Back to customer app".
3. **Owner setup** — branches, working hours, services & prices, barber invites, commission.
4. **Barber shift & queue** — start/pause/end shift (with reassign step), barber queue, call next, complete, no-show, reorder, WebSocket updates.
5. **General queue & walk-ins** — general queue with late assignment (§6.2), receptionist workspace, anonymous/verified walk-ins, tokens.
6. **Customer discovery & live queue** — search, salon/barber details, favourites, join/leave queue, wait screen.
7. **Appointments** — booking flow (§5.1), slots, auto-assign at booking, reschedule/cancel, barber appointment list.
8. **Notifications** — push for queue, reassignment, appointments, favourite barber on shift.
9. **Money** — transactions, earnings (owner + barber), payouts, petty cash & expenses.
10. **Reports & exports** — dashboard charts, top barber, popular services, PDF/spreadsheet export.
11. **Ratings, customer notes, Super Admin workspace.**
