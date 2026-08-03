CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text,
  password_hash text NOT NULL,
  subscription text NOT NULL DEFAULT 'Standard',
  expiry_date timestamptz,
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  hwid text,
  allow_multi_device boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access app_users" ON public.app_users FOR SELECT TO authenticated USING (false);

CREATE TABLE public.sessions (
  token_hash text PRIMARY KEY,
  user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,
  username text NOT NULL,
  subscription text NOT NULL DEFAULT 'Standard',
  expiry_date text,
  is_trial boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  remember_me boolean NOT NULL DEFAULT false,
  hwid text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON public.sessions(user_id);
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access sessions" ON public.sessions FOR SELECT TO authenticated USING (false);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access app_settings" ON public.app_settings FOR SELECT TO authenticated USING (false);

INSERT INTO public.app_settings (key, value) VALUES
  ('maintenance', '{"enabled": false, "message": "MachinistPro is temporarily under maintenance. Please check back shortly."}'::jsonb),
  ('announcement', '{"enabled": false, "message": ""}'::jsonb);

INSERT INTO public.app_users (username, email, password_hash, subscription, is_admin, allow_multi_device)
VALUES (
  'ahmedtabish1000@gmail.com',
  'ahmedtabish1000@gmail.com',
  'pbkdf2$120000$aba407b4d15e162ffd0a363cb677ecfb$9e401f4d908caf10153bbb78a6a6e889fb1e16d7f55afc84a02d521cccf4c232',
  'Admin',
  true,
  true
);