-- Migration to support Admin-created users with usernames and mandatory password change
-- Run this in the Supabase SQL Editor

-- 1. Add username column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. Populate username with email for existing users
UPDATE profiles SET username = email WHERE username IS NULL;

-- 3. Make email column nullable
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- 4. Add must_change_password column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
