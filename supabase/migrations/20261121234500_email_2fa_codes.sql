create table if not exists public.email_2fa_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.email_2fa_codes enable row level security;

create policy email_2fa_codes_own_select
  on public.email_2fa_codes for select
  to authenticated
  using (auth.uid() = user_id);
