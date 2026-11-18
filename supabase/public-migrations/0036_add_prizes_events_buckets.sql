INSERT INTO storage.buckets (id, name, public) VALUES ('prizes_images', 'prizes_images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('events_images', 'events_images', true);

CREATE POLICY "Allow all for ANYONE on prizes images bucket"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'prizes_images')
WITH CHECK (bucket_id = 'prizes_images');

CREATE POLICY "Allow all for ANYONE on events images bucket"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'events_images')
WITH CHECK (bucket_id = 'events_images');
