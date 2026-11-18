-- Custom SQL migration file, put your code below! --

INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

CREATE POLICY "Allow all for ANYONE on videos bucket"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'videos')
WITH CHECK (bucket_id = 'videos');
