ALTER TABLE public.device_fingerprints ADD COLUMN IF NOT EXISTS hw_hash text;
CREATE INDEX IF NOT EXISTS device_fingerprints_hw_hash_idx ON public.device_fingerprints(hw_hash);