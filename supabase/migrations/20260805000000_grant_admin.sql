-- Promote a named account to administrator.
--
-- Only one admin has ever existed: the seeded ahmedtabish1000@gmail.com. Every
-- other row takes the column default, is_admin false, so anyone else signing in
-- is turned away from the admin panel — correctly, but with no way to tell that
-- from a fault.
--
-- Matches on username or email, case-insensitively, because the login form
-- takes either. If no such account exists this updates nothing and the
-- migration still succeeds, so it cannot half-apply.
UPDATE public.app_users
SET is_admin = true,
    subscription = 'Admin',
    updated_at = now()
WHERE lower(username) = lower('hadeedabdulrahman22@gmail.com')
   OR lower(email) = lower('hadeedabdulrahman22@gmail.com');

-- No session revocation needed. Rights are read from this table on every
-- request now, so the change applies to any session already open rather than
-- waiting for the holder to sign out and back in.
