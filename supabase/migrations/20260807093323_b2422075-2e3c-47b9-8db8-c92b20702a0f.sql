ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS device_limit integer NOT NULL DEFAULT 1;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_device_limit_range CHECK (device_limit >= 1 AND device_limit <= 100);

CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  hwid text NOT NULL,
  user_agent text,
  label text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hwid)
);

GRANT ALL ON public.user_devices TO service_role;

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no client access user_devices"
  ON public.user_devices FOR SELECT TO authenticated USING (false);

CREATE INDEX IF NOT EXISTS user_devices_user_id_idx ON public.user_devices(user_id);

-- Carry existing single-device locks over into the registry.
INSERT INTO public.user_devices (user_id, hwid)
SELECT id, hwid FROM public.app_users WHERE hwid IS NOT NULL
ON CONFLICT (user_id, hwid) DO NOTHING;