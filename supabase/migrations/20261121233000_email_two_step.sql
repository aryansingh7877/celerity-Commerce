alter table public.profiles
  add column if not exists email_2fa_enabled boolean not null default false;

comment on column public.profiles.email_2fa_enabled is
  'When true, password sign-in requires a one-time email code (firewall two-step).';
