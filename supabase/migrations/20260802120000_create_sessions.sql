-- Server-validated session tokens.
-- Tokens are hashed client-side before storage; only the SHA-256 hash lives in the DB,
-- so a DB leak does not hand out live sessions. Tokens expire and are deleted lazily.

CREATE TABLE public.sessions (
  -- sha256(pepper + "|" + rawToken) as lower-case hex
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  subscription TEXT NOT NULL DEFAULT 'Standard',
  expiry_date TEXT,
  is_trial BOOLEAN NOT NULL DEFAULT false,
  remember_me BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for the periodic/lazy cleanup query
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);
-- Hot index for user-side "list my sessions" if ever needed
CREATE INDEX idx_sessions_username ON public.sessions(username);

GRANT ALL ON public.sessions TO service_role;
-- No grants to anon/authenticated: sessions are read and written only via the
-- service role from server code. RLS is on for defense-in-depth.
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Optional convenience: a cleanup function callers can schedule manually
CREATE OR REPLACE FUNCTION public.prune_expired_sessions()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.sessions WHERE expires_at < now() RETURNING 1;
$$;
