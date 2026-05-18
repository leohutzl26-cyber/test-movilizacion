# Supabase Deployment Checklist

## Phase 1: Setup
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Get project URL and anon key
- [ ] Create service role key
- [ ] Update environment variables in .env

## Phase 2: Database Setup
- [ ] Run schema.sql in Supabase SQL Editor
- [ ] Verify all tables are created
- [ ] Enable RLS on all tables
- [ ] Run test-data.sql to populate with sample data
- [ ] Verify RLS policies are working

## Phase 3: Functions Deployment
- [ ] Deploy auth-register function
- [ ] Deploy auth-login function
- [ ] Deploy trips-create function
- [ ] Deploy trips-assign function
- [ ] Deploy trips-update-status function
- [ ] Deploy users-approve function
- [ ] Deploy stats-dashboard function

## Phase 4: Frontend Setup
- [ ] Update REACT_APP_SUPABASE_URL in .env
- [ ] Update REACT_APP_SUPABASE_ANON_KEY in .env
- [ ] Run npm install to install dependencies
- [ ] Run npm start to start the app
- [ ] Test login with admin@hospital.cl / admin123

## Phase 5: Testing
- [ ] Run frontend-test.js in browser console
- [ ] Test user registration and approval
- [ ] Test trip creation and assignment
- [ ] Test dashboard statistics
- [ ] Test audit logs

## Phase 6: Production
- [ ] Set up proper environment variables
- [ ] Configure CORS settings
- [ ] Set up monitoring and logging
- [ ] Set up backup strategy
- [ ] Configure domain and SSL

## Test Accounts
- Admin: admin@hospital.cl / admin123
- Solicitante: solicitante@hospital.cl / admin123
- Conductor: conductor@hospital.cl / admin123
- Coordinador: coordinador@hospital.cl / admin123
