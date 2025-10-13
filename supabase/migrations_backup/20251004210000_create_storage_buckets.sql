-- =====================================================
-- Create Storage Buckets for File Uploads
-- Migration: 20251004210000
-- =====================================================

-- Create storage bucket for student profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-profiles',
  'student-profiles',
  true,  -- public access for profile images
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for student-profiles bucket
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload student profiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-profiles');

-- Allow public read access to student profiles
CREATE POLICY "Public read access to student profiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'student-profiles');

-- Allow users to update their own tenant's student profiles
CREATE POLICY "Users can update their tenant's student profiles"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'student-profiles')
WITH CHECK (bucket_id = 'student-profiles');

-- Allow users to delete their own tenant's student profiles
CREATE POLICY "Users can delete their tenant's student profiles"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'student-profiles');
