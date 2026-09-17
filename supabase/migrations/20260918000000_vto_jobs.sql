-- Apply through Supabase CLI/dashboard. Buckets are private by default.
insert into storage.buckets (id, name, public) values ('vto_inputs','vto_inputs',false),('vto_results','vto_results',false) on conflict (id) do nothing;
create table if not exists public.vto_jobs (
 id text primary key, user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null check (status in ('queued','processing','completed','failed','cancelled')),
 category text not null check (category in ('tops','bottoms')), garment_id text not null references public.garments(id),
 person_input_storage_key text not null, garment_input_storage_key text not null, output_storage_key text,
 outfit_name text, model_version text not null, model_resolution jsonb not null, inference_parameters jsonb not null, seed integer generated always as ((inference_parameters->>'seed')::integer) stored,
 idempotency_key text not null, created_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz, failed_at timestamptz, cancelled_at timestamptz,
 error_code text, safe_error_message text, processing_duration_ms integer,
 unique (user_id,idempotency_key)
);
create index if not exists idx_vto_jobs_status on public.vto_jobs(status);
create index if not exists idx_vto_jobs_created_at on public.vto_jobs(created_at desc);
alter table public.vto_jobs enable row level security;
create policy "VTO job owner access" on public.vto_jobs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "VTO input owner access" on storage.objects for all to authenticated using (bucket_id='vto_inputs' and (storage.foldername(name))[1]=(select auth.uid()::text)) with check (bucket_id='vto_inputs' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "VTO result owner read" on storage.objects for select to authenticated using (bucket_id='vto_results' and (storage.foldername(name))[1]=(select auth.uid()::text));
