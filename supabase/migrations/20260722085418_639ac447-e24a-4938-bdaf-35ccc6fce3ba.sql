
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL UNIQUE,
  ip_hash TEXT,
  user_agent TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_used BOOLEAN NOT NULL DEFAULT false,
  trial_user_id UUID,
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ
);
CREATE INDEX idx_device_ip_hash ON public.device_fingerprints(ip_hash);
GRANT ALL ON public.device_fingerprints TO service_role;
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trial_ip_log (
  ip_hash TEXT PRIMARY KEY,
  trial_count INT NOT NULL DEFAULT 0,
  first_trial_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_trial_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.trial_ip_log TO service_role;
ALTER TABLE public.trial_ip_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_trials (
  user_id UUID PRIMARY KEY,
  device_fingerprint_id UUID REFERENCES public.device_fingerprints(id),
  fingerprint_hash TEXT,
  ip_hash TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);
GRANT SELECT ON public.user_trials TO authenticated;
GRANT ALL ON public.user_trials TO service_role;
ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trial read" ON public.user_trials FOR SELECT TO authenticated USING (auth.uid() = user_id);
