-- Custom SQL migration file, put your code below! --

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

CREATE POLICY "Allow all for ANYONE on documents bucket"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');