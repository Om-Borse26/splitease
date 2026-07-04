import { v4 as uuidv4 } from 'uuid';
import { query } from './client.js';

export async function initializeDatabase() {
  const queries = [
    `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS group_members (
      group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
      description VARCHAR(500) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      paid_by UUID REFERENCES users(id) ON DELETE CASCADE,
      split_type VARCHAR(20) DEFAULT 'equal',
      created_at TIMESTAMP DEFAULT NOW()
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS expense_splits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      balance DECIMAL(12,2) NOT NULL DEFAULT 0,
      UNIQUE(group_id, user_id)
    )
    `
  ];

  for (const q of queries) {
    await query(q);
  }
  console.log('Database tables initialized successfully');
}

export default initializeDatabase;