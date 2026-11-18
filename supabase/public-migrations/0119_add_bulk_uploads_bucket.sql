INSERT INTO storage.buckets (id, name, public)
VALUES ('bulk-uploads', 'bulk-uploads', true);

CREATE POLICY "Allow all for ANYONE on bulk-uploads bucket"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'bulk-uploads')
WITH CHECK (bucket_id = 'bulk-uploads');
