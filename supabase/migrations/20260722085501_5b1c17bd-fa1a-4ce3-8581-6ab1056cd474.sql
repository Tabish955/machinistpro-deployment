
CREATE POLICY "no client access devices" ON public.device_fingerprints FOR SELECT TO authenticated USING (false);
CREATE POLICY "no client access ip log" ON public.trial_ip_log FOR SELECT TO authenticated USING (false);
