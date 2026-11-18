INSERT INTO storage.buckets (id, name, public) VALUES ('summary', 'summary', true);

CREATE POLICY "Allow all for ANYONE on summary bucket"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'summary')
WITH CHECK (bucket_id = 'summary');
