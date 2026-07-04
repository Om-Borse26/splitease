# SplitEase Frontend Component Contract

## Overview

This document defines the component structure and expected API contracts for the SplitEase expense splitting app frontend.

---

## Component Structure

### Pages

| Component | Location | Purpose |
|-----------|----------|---------|
| `LoginPage` | `src/pages/LoginPage.jsx` | Login page wrapper |
| `SignupPage` | `src/pages/SignupPage.jsx` | Signup page wrapper |
| `DashboardPage` | `src/pages/DashboardPage.jsx` | List user's groups, create new group |
| `GroupPage` | `src/pages/GroupPage.jsx` | View expenses, balances, add expenses, invite members |
| `BalancePage` | `src/pages/BalancePage.jsx` | View overall user balances across all groups |

---

### Components

#### Auth Components

**`LoginForm`** (`src/components/auth/LoginForm.jsx`)
- **Renders:** Email input, password input, login button, error messages, link to signup
- **API Calls:**
  - `POST /api/auth/login`
  - Payload: `{ email: string, password: string }`
  - Response: `{ token: string, user: { id, name, email } }`

**`SignupForm`** (`src/components/auth/SignupForm.jsx`)
- **Renders:** Name input, email input, password input, signup button, error messages, link to login
- **API Calls:**
  - `POST /api/auth/signup`
  - Payload: `{ name: string, email: string, password: string }`
  - Response: `{ token: string, user: { id, name, email } }`

---

#### Group Components

**`GroupList`** (`src/components/groups/GroupList.jsx`)
- **Renders:** List of `GroupCard` components, "No groups" placeholder
- **API Calls:**
  - `GET /api/groups` (with JWT header)
  - Response: `[{ id, name, members: [{ id, name }], createdAt }]`

**`GroupCard`** (`src/components/groups/GroupCard.jsx`)
- **Renders:** Group name, member count, created date, "View" button
- **Props:** `{ id, name, memberCount, createdAt }`
- **API Calls:** None (renders data passed from parent)

**`CreateGroupModal`** (`src/components/groups/CreateGroupModal.jsx`)
- **Renders:** Modal overlay, group name input, create button, cancel button
- **API Calls:**
  - `POST /api/groups` (on submit)
  - Payload: `{ name: string }`
  - Response: `{ id, name, members: [], createdAt }`

**`InviteMemberModal`** (`src/components/groups/InviteMemberModal.jsx`)
- **Renders:** Modal overlay, user search dropdown, invite button, cancel button
- **API Calls:**
  - `GET /api/users` (to search users) - optional user discovery endpoint
  - `POST /api/groups/:id/invite` (on submit)
  - Payload: `{ userId: string }`
  - Response: `{ success: boolean, message: string }`

---

#### Expense Components

**`ExpenseList`** (`src/components/expenses/ExpenseList.jsx`)
- **Renders:** List of `ExpenseCard` components, "No expenses" placeholder
- **Props:** `{ groupId }`
- **API Calls:**
  - `GET /api/groups/:id/expenses`
  - Response: `[{ id, description, amount, payer: { id, name }, participants: [{ id, name, amountOwed }], createdAt }]`

**`ExpenseCard`** (`src/components/expenses/ExpenseCard.jsx`)
- **Renders:** Description, amount, payer name, list of participants with amounts, date
- **Props:** `{ id, description, amount, payer, participants, createdAt }`
- **API Calls:** None

**`AddExpenseForm`** (`src/components/expenses/AddExpenseForm.jsx`)
- **Renders:** Description input, amount input, payer dropdown (users in group), participants checkboxes, submit button
- **Props:** `{ groupId }`
- **API Calls:**
  - `GET /api/groups/:id/members` - to fetch available participants
  - `POST /api/groups/:id/expenses` (on submit)
  - Payload: `{ description: string, amount: number, payerId: string, participantIds: string[] }`
  - Response: `{ id, description, amount, payerId, participants: [], createdAt }`

---

#### Balance Components

**`BalanceOverview`** (`src/components/balances/BalanceOverview.jsx`)
- **Renders:** List of `BalanceCard` components, summary totals
- **Props:** `{ groupId (optional), isGlobal (default: false) }`
- **API Calls:**
  - If `groupId` provided: `GET /api/groups/:id/balance`
  - If `isGlobal=true`: `GET /api/users/:id/balance`
  - Response (group): `{ balances: [{ userId, userName, balance: number }] }`
  - Response (global): `{ totals: { owesTotal: number, owedTotal: number }, byGroup: [{ groupId, groupName, balance }] }`

**`BalanceCard`** (`src/components/balances/BalanceCard.jsx`)
- **Renders:** User name, balance amount (positive=owed money, negative=owes money), colored indicator
- **Props:** `{ userName, balance }`
- **API Calls:** None

---

#### Common Components

**`Button`** (`src/components/common/Button.jsx`)
- **Renders:** Styled button element
- **Props:** `{ children, variant (primary/secondary/danger), size, onClick, disabled, type }`
- **API Calls:** None

**`Input`** (`src/components/common/Input.jsx`)
- **Renders:** Styled input element with label and error message
- **Props:** `{ label, type, value, onChange, error, placeholder, required }`
- **API Calls:** None

**`Modal`** (`src/components/common/Modal.jsx`)
- **Renders:** Overlay, dialog container, header, body, footer slots
- **Props:** `{ isOpen, onClose, title, children }`
- **API Calls:** None

**`LoadingSpinner`** (`src/components/common/LoadingSpinner.jsx`)
- **Renders:** Animated spinner icon with optional loading text
- **Props:** `{ size, text }`
- **API Calls:** None

**`Alert`** (`src/components/common/Alert.jsx`)
- **Renders:** Styled alert box with icon (success/error/warning/info)
- **Props:** `{ type, message, onClose }`
- **API Calls:** None

---

## WebSocket Contract

**Connection:** `wss://api-host/ws`

### Client -> Server Messages
```json
{ "type": "auth", "token": "jwt_token" }
{ "type": "subscribe", "groupId": "group_id" }
{ "type": "unsubscribe", "groupId": "group_id" }
```

### Server -> Client Messages
```json
{ "type": "balance_update", "groupId": "group_id", "balances": [{ userId, balance }] }
{ "type": "expense_added", "groupId": "group_id", "expense": { ... } }
{ "type": "member_joined", "groupId": "group_id", "member": { ... } }
```

---

## Routing Structure

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | `LoginPage` | Public |
| `/signup` | `SignupPage` | Public |
| `/` | `DashboardPage` | Protected |
| `/groups/:groupId` | `GroupPage` | Protected |
| `/balances` | `BalancePage` | Protected |

---

## State Management Expectations

1. **Auth State:** JWT token stored in localStorage/httpOnly cookie, user object in context
2. **Group State:** Fetched once on dashboard, invalidated on group creation/invite
3. **Expense State:** Fetched per group, invalidated on new expense or WebSocket update
4. **Balance State:** Fetched per group/user, updated via WebSocket subscription

---

## File Path Summary

```
frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── GroupPage.jsx
│   │   └── BalancePage.jsx
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   └── SignupForm.jsx
│   │   ├── groups/
│   │   │   ├── GroupList.jsx
│   │   │   ├── GroupCard.jsx
│   │   │   ├── CreateGroupModal.jsx
│   │   │   └── InviteMemberModal.jsx
│   │   ├── expenses/
│   │   │   ├── ExpenseList.jsx
│   │   │   ├── ExpenseCard.jsx
│   │   │   └── AddExpenseForm.jsx
│   │   ├── balances/
│   │   │   ├── BalanceOverview.jsx
│   │   │   └── BalanceCard.jsx
│   │   └── common/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── Modal.jsx
│   │       ├── LoadingSpinner.jsx
│   │       └── Alert.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── FRONTEND_CONTRACT.md
```