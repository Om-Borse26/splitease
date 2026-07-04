import bcrypt from 'bcrypt';
import { query } from './client.js';
import { initializeDatabase } from './schema.js';

async function seed() {
  console.log('Initializing database schema...');
  await initializeDatabase();
  
  console.log('Seeding data...');
  
  // Clear existing
  await query('TRUNCATE users, groups, group_members, expenses, expense_splits, balances CASCADE');
  
  const pw = await bcrypt.hash('password123', 10);
  
  // Users
  const u1 = await query('INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id', ['alice@example.com', 'alice', pw]);
  const u2 = await query('INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id', ['bob@example.com', 'bob', pw]);
  const u3 = await query('INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id', ['charlie@example.com', 'charlie', pw]);
  
  const alice = u1.rows[0].id;
  const bob = u2.rows[0].id;
  const charlie = u3.rows[0].id;
  
  // Group
  const g = await query('INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id', ['Weekend Trip', alice]);
  const groupId = g.rows[0].id;
  
  // Members
  await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2), ($1, $3), ($1, $4)', [groupId, alice, bob, charlie]);
  
  // Initial Balances
  await query('INSERT INTO balances (group_id, user_id, balance) VALUES ($1, $2, 0), ($1, $3, 0), ($1, $4, 0)', [groupId, alice, bob, charlie]);
  
  // Expense
  const amount = 120.00;
  const splitAmount = 40.00;
  
  const ex = await query('INSERT INTO expenses (group_id, description, amount, paid_by, split_type) VALUES ($1, $2, $3, $4, $5) RETURNING id', 
    [groupId, 'Dinner', amount, alice, 'equal']);
  const exId = ex.rows[0].id;
  
  // Splits
  await query('INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7)',
    [exId, alice, splitAmount, bob, splitAmount, charlie, splitAmount]);
    
  // Update Balances
  // Alice paid 120. Her share is 40. She is owed 80. (Balance +80)
  // Bob/Charlie share is 40. They owe 40. (Balance -40)
  await query('UPDATE balances SET balance = balance + 80 WHERE group_id = $1 AND user_id = $2', [groupId, alice]);
  await query('UPDATE balances SET balance = balance - 40 WHERE group_id = $1 AND user_id = $2', [groupId, bob]);
  await query('UPDATE balances SET balance = balance - 40 WHERE group_id = $1 AND user_id = $2', [groupId, charlie]);
  
  console.log('Seeding complete! You can login with alice@example.com / password123');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
