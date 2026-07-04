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

---

### Components

#### Auth Components

**`LoginForm`** (`src/components/auth/LoginForm.jsx`)
- **Renders:** Username input, password input, login button, error messages, link to signup
- **API Calls:**
  - `POST /api/auth/login`
  - Payload: `{ email: string, password: string }`
  - Response: `{ success: boolean, data: { token: string, user: { id, username, email } } }`

**`SignupForm`** (`src/components/auth/SignupForm.jsx`)
- **Renders:** Username input, email input, password input, signup button, error messages, link to login
- **API Calls:**
  - `POST /api/auth/signup`
  - Payload: `{ username: string, email: string, password: string }`
  - Response: `{ success: boolean, data: { token: string, user: { id, username, email } } }`

---

#### Group Components

**`GroupList`** (`src/components/groups/GroupList.jsx`)
- **Renders:** List of `GroupCard` components, "No groups" placeholder
- **API Calls:**
  - `GET /api/groups` (with JWT header)
  - Response: `{ success: boolean, data: [{ id, name, member_count: number, created_at: string }] }`

**`GroupCard`** (`src/components/groups/GroupCard.jsx`)
- **Renders:** Group name, member count, created date, "View" button
- **Props:** `{ id, name, memberCount, createdAt }`
- **API Calls:** None (renders data passed from parent)

**`CreateGroupModal`** (`src/components/groups/CreateGroupModal.jsx`)
- **Renders:** Modal overlay, group name input, create button, cancel button
- **API Calls:**
  - `POST /api/groups` (on submit)
  - Payload: `{ name: string }`
  - Response: `{ success: boolean, data: { id, name, member_count: 1, created_at: string } }`

**`InviteMemberModal`** (`src/components/groups/InviteMemberModal.jsx`)
- **Renders:** Modal overlay, user search dropdown, invite button, cancel button
- **API Calls:**
  - `GET /api/users` (to search users) - optional user discovery endpoint
  - `POST /api/groups/:id/members` (on submit)
  - Payload: `{ user_ids: string[] }`
  - Response: `{ success: boolean, data: { message: string } }`

---

#### Expense Components

**`ExpenseList`** (`src/components/expenses/ExpenseList.jsx`)
- **Renders:** List of `ExpenseCard` components, "No expenses" placeholder
- **Props:** `{ groupId }`
- **API Calls:**
  - `GET /api/groups/:id/expenses`
  - Response: `{ success: boolean, data: [{ id, description, amount, paid_by: string, paid_by_username: string, splits: [{ user_id: string, username: string, amount_owed: number }], created_at: string }] }`

**`ExpenseCard`** (`src/components/expenses/ExpenseCard.jsx`)
- **Renders:** Description, amount, payer username, list of splits with amounts, date
- **Props:** `{ id, description, amount, paidBy, paidByUsername, splits, createdAt }`
- **API Calls:** None

**`AddExpenseForm`** (`src/components/expenses/AddExpenseForm.jsx`)
- **Renders:** Description input, amount input, payer dropdown (users in group), submit button
- **Props:** `{ groupId }`
- **API Calls:**
  - `GET /api/groups/:id` - to fetch full group details with members
  - `POST /api/groups/:id/expenses` (on submit)
  - Payload: `{ description: string, amount: number, paid_by: string, split_type: "equal" }`
  - Response: `{ success: boolean, data: { id, description, amount, paid_by: string, splits: [], created_at: string } }`

---

#### Balance Components

**`BalanceOverview`** (`src/components/balances/BalanceOverview.jsx`)
- **Renders:** List of `BalanceCard` components, summary totals
- **Props:** `{ groupId }`
- **API Calls:**
  - `GET /api/groups/:id/balances`
  - Response: `{ success: boolean, data: { balances: [{ user_id: string, username: string, balance: number }] } }`

**`BalanceCard`** (`src/components/balances/BalanceCard.jsx`)
- **Renders:** User username, balance amount (positive=owed money, negative=owes money), colored indicator
- **Props:** `{ username, balance }`
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
{ "type": "join_group", "group_id": "group_id" }
{ "type": "leave_group", "group_id": "group_id" }
```

### Server -> Client Messages
```json
{ "type": "balances_updated", "group_id": "group_id", "balances": [{ user_id, balance }] }
{ "type": "expense_added", "group_id": "group_id", "expense": { ... } }
{ "type": "member_joined", "group_id": "group_id", "member": { ... } }
```

---

## Routing Structure

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | `LoginPage` | Public |
| `/signup` | `SignupPage` | Public |
| `/` | `DashboardPage` | Protected |
| `/groups/:groupId` | `GroupPage` | Protected |

---

## State Management Expectations

1. **Auth State:** JWT token stored in localStorage/httpOnly cookie, user object in context
2. **Group State:** Fetched once on dashboard, invalidated on group creation/invite
3. **Expense State:** Fetched per group, invalidated on new expense or WebSocket update
4. **Balance State:** Fetched per group, updated via WebSocket subscription

---

## File Path Summary

```
frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── GroupPage.jsx
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

---

## API Response Unwrapping Convention

All backend responses follow this pattern:
```json
{ "success": boolean, "data": { ... } }
```

Frontend API calls must:
1. Check `response.success` for errors
2. Extract payload from `response.data`
3. Use snake_case field names as returned by backend