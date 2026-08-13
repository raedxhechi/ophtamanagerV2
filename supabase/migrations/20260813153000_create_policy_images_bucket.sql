-- Storage for the insurance-policy info image an office sees in its header
-- drawer.
--
-- One shared image covers every office for now. The scope lives in the object
-- key ('shared' today, 'offices/<doctor_office_id>' later — see
-- lib/policyImage.ts), so giving each office its own image is a key change and
-- needs no schema change here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'policy-images',
    'policy-images',
    false,
    5242880, -- 5 MB
    array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Private bucket: reads go through a signed URL the app mints for a session it
-- has already authenticated, so the file is not world-readable by its path.
create policy "Authenticated users can view policy images"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'policy-images');

-- Only admins upload, replace, or clear it — offices read what they're given.
create policy "Admins can add policy images"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'policy-images' and public.is_admin());

create policy "Admins can replace policy images"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'policy-images' and public.is_admin())
    with check (bucket_id = 'policy-images' and public.is_admin());

create policy "Admins can remove policy images"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'policy-images' and public.is_admin());
