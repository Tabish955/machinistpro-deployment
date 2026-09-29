ALTER TABLE public.device_fingerprints ADD COLUMN IF NOT EXISTS client_device_id text;
CREATE INDEX IF NOT EXISTS device_fingerprints_client_device_id_idx ON public.device_fingerprints(client_device_id);
CREATE INDEX IF NOT EXISTS device_fingerprints_fingerprint_hash_idx ON public.device_fingerprints(fingerprint_hash);