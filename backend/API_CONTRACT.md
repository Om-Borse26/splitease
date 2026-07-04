# SplitEase API Contract

## Database Schema

### Tables

#### 1. `users`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | User unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| username | VARCHAR(100) | UNIQUE, NOT NULL | User display name |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |

#### 2. `groups`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Group unique identifier |
| name | VARCHAR(255) | NOT NULL | Group name |
| created_by | UUID | FOREIGN KEY -> users.id | User who created the group |
| created_at | TIMESTAMP | DEFAULT NOW() | Group creation timestamp |

#### 3. `group_members`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Membership unique identifier |
| group_id | UUID | FOREIGN KEY -> groups.id, NOT NULL | Associated group |
| user_id | UUID | FOREIGN KEY -> users.id, NOT NULL | Member user |
| joined_at | TIMESTAMP | DEFAULT NOW() | Join timestamp |
| UNIQUE(group_id, user_id) | | Prevent duplicate memberships |

#### 4. `expenses`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Expense unique identifier |
| group_id | UUID | FOREIGN KEY -> groups.id, NOT NULL | Associated group |
| description | VARCHAR(500) | NOT NULL | Expense description |
| amount | DECIMAL(10,2) | NOT NULL | Total expense amount |
| paid_by | UUID | FOREIGN KEY -> users.id, NOT NULL | User who paid |
| created_at | TIMESTAMP | DEFAULT NOW() | Expense creation timestamp |

#### 5. `expense_splits`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Split record unique identifier |
| expense_id | UUID | FOREIGN KEY -> expenses.id, NOT NULL | Associated expense |
| user_id | UUID | FOREIGN KEY -> users.id, NOT NULL | User whose share this is |
| amount | DECIMAL(10,2) | NOT NULL | User's share amount |

#### 6. `balances`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Balance record unique identifier |
| group_id | UUID | FOREIGN KEY -> groups.id, NOT NULL | Associated group |
| user_id | UUID | FOREIGN KEY -> users.id, NOT NULL | User this balance is for |
| balance | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Net balance (positive = owed money, negative = owes money) |
| UNIQUE(group_id, user_id) | | Prevent duplicate balances |

---

## REST API Endpoints

### Authentication

#### 1. POST /api/auth/signup
**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "username": "john_doe",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. POST /api/auth/login
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "username": "john_doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. GET /api/auth/me
**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "username": "john_doe",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### Users

#### 4. GET /api/users
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:** `?search=john` (optional, searches username or email)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "username": "john_doe"
    }
  ]
}
```

---

### Groups

#### 4. POST /api/groups
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Vacation 2024"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "name": "Vacation 2024",
    "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

#### 5. GET /api/groups
**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "name": "Vacation 2024",
      "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "created_at": "2024-01-15T11:00:00Z",
      "member_count": 4
    }
  ]
}
```

#### 6. GET /api/groups/:id
**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "name": "Vacation 2024",
    "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2024-01-15T11:00:00Z",
    "members": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "username": "john_doe",
        "joined_at": "2024-01-15T11:00:00Z"
      },
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "username": "jane_smith",
        "joined_at": "2024-01-15T11:05:00Z"
      }
    ]
  }
}
```

#### 7. POST /api/groups/:id/members
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "user_ids": ["c3d4e5f6-a7b8-9012-cdef-345678901234", "d4e5f6a7-b8c9-0123-defg-456789012345"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "added_members": [
      {
        "user_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "username": "jane_smith",
        "joined_at": "2024-01-15T11:30:00Z"
      }
    ],
    "skipped": []
  }
}
```

#### 8. DELETE /api/groups/:id/members/:userId
**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

---

### Expenses

#### 9. POST /api/groups/:id/expenses
**Headers:** `Authorization: Bearer <token>`

**Request Body (Equal Split):**
```json
{
  "description": "Dinner at Mario's",
  "amount": 120.00,
  "paid_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "split_type": "equal"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "e5f6a7b8-c9d0-1234-efgh-567890123456",
      "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "description": "Dinner at Mario's",
      "amount": 120.00,
      "paid_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "created_at": "2024-01-15T18:30:00Z"
    },
    "splits": [
      {
        "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "username": "john_doe",
        "amount": 30.00
      },
      {
        "user_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "username": "jane_smith",
        "amount": 30.00
      },
      {
        "user_id": "d4e5f6a7-b8c9-0123-defg-456789012345",
        "username": "bob_wilson",
        "amount": 30.00
      },
      {
        "user_id": "e5f6a7b8-c9d0-1234-efgh-567890123456",
        "username": "alice_brown",
        "amount": 30.00
      }
    ]
  }
}
```

#### 10. GET /api/groups/:id/expenses
**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "e5f6a7b8-c9d0-1234-efgh-567890123456",
      "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "description": "Dinner at Mario's",
      "amount": 120.00,
      "paid_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "paid_by_username": "john_doe",
      "created_at": "2024-01-15T18:30:00Z",
      "splits": [
        {
          "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "username": "john_doe",
          "amount": 30.00
        },
        {
          "user_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
          "username": "jane_smith",
          "amount": 30.00
        }
      ]
    }
  ]
}
```

#### 11. DELETE /api/expenses/:id
**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

---

### Balances

#### 12. GET /api/groups/:id/balances
**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "group_name": "Vacation 2024",
    "balances": [
      {
        "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "username": "john_doe",
        "balance": 45.00
      },
      {
        "user_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "username": "jane_smith",
        "balance": -25.00
      },
      {
        "user_id": "d4e5f6a7-b8c9-0123-defg-456789012345",
        "username": "bob_wilson",
        "balance": -10.00
      },
      {
        "user_id": "e5f6a7b8-c9d0-1234-efgh-567890123456",
        "username": "alice_brown",
        "balance": -10.00
      }
    ],
    "settlement_suggestions": [
      {
        "from_user_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "from_username": "jane_smith",
        "to_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "to_username": "john_doe",
        "amount": 25.00
      },
      {
        "from_user_id": "d4e5f6a7-b8c9-0123-defg-456789012345",
        "from_username": "bob_wilson",
        "to_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "to_username": "john_doe",
        "amount": 10.00
      },
      {
        "from_user_id": "e5f6a7b8-c9d0-1234-efgh-567890123456",
        "from_username": "alice_brown",
        "to_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "to_username": "john_doe",
        "amount": 10.00
      }
    ]
  }
}
```

---

## WebSocket Events

### Client -> Server

#### `join_group`
**Payload:**
```json
{
  "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012"
}
```

#### `leave_group`
**Payload:**
```json
{
  "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012"
}
```

### Server -> Client

#### `expense_added`
**Payload:**
```json
{
  "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "expense": {
    "id": "e5f6a7b8-c9d0-1234-efgh-567890123456",
    "description": "Dinner at Mario's",
    "amount": 120.00,
    "paid_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2024-01-15T18:30:00Z"
  }
}
```

#### `expense_removed`
**Payload:**
```json
{
  "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "expense_id": "e5f6a7b8-c9d0-1234-efgh-567890123456"
}
```

#### `balances_updated`
**Payload:**
```json
{
  "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "balances": [
    {
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "john_doe",
      "balance": 45.00
    },
    {
      "user_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "username": "jane_smith",
      "balance": -25.00
    }
  ]
}
```

#### `member_joined`
**Payload:**
```json
{
  "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "member": {
    "user_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "username": "jane_smith"
  }
}
```

#### `member_left`
**Payload:**
```json
{
  "group_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "user_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "username": "jane_smith"
}
```

---

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Missing or invalid authentication token
- `FORBIDDEN` - User lacks permission for this action
- `NOT_FOUND` - Requested resource not found
- `VALIDATION_ERROR` - Invalid request body parameters
- `CONFLICT` - Resource already exists (e.g., duplicate email)
- `INTERNAL_ERROR` - Server-side error

### Example Error Response (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token"
  }
}
```