-- =========================================================
-- Ethiopian Payroll: schema + RLS + guards
-- Run ONCE on a fresh project.
-- =========================================================

-- ---------- Tables ----------
create table public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  tin        text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id),
  full_name  text,
  role       text not null default 'viewer'
             check (role in ('admin', 'hr', 'viewer'))
);

create table public.rate_schedules (
  id             uuid primary key default gen_random_uuid(),
  effective_from date not null unique,
  config         jsonb not null,
  created_at     timestamptz not null default now()
);

create table public.employees (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  emp_no     text not null,
  name       text not null,
  tin        text,
  department text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, emp_no)
);

create table public.payroll_runs (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id),
  period           text not null,
  status           text not null default 'draft'
                   check (status in ('draft', 'approved', 'locked')),
  rate_schedule_id uuid references public.rate_schedules(id),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  unique (company_id, period)
);

create table public.payslips (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.payroll_runs(id) on delete restrict,
  employee_id uuid not null references public.employees(id),
  inputs      jsonb not null,
  result      jsonb not null,
  created_at  timestamptz not null default now(),
  unique (run_id, employee_id)
);

create table public.audit_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  company_id uuid,
  user_id    uuid,
  action     text not null,
  details    jsonb
);

create index on public.employees (company_id);
create index on public.payroll_runs (company_id);
create index on public.payslips (run_id);
create index on public.audit_log (company_id, at desc);

-- ---------- Helper functions (avoid RLS recursion) ----------
create or replace function public.my_company_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role()
returns text language sql stable security definer
set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- Row-level security ----------
alter table public.companies      enable row level security;
alter table public.profiles       enable row level security;
alter table public.rate_schedules enable row level security;
alter table public.employees      enable row level security;
alter table public.payroll_runs   enable row level security;
alter table public.payslips       enable row level security;
alter table public.audit_log      enable row level security;

create policy "read own company" on public.companies
  for select to authenticated using (id = public.my_company_id());

create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "read rates" on public.rate_schedules
  for select to authenticated using (true);

create policy "read employees" on public.employees
  for select to authenticated using (company_id = public.my_company_id());

create policy "hr add employees" on public.employees
  for insert to authenticated
  with check (company_id = public.my_company_id()
              and public.my_role() in ('admin', 'hr'));

create policy "hr edit employees" on public.employees
  for update to authenticated
  using (company_id = public.my_company_id()
         and public.my_role() in ('admin', 'hr'))
  with check (company_id = public.my_company_id());

create policy "read runs" on public.payroll_runs
  for select to authenticated using (company_id = public.my_company_id());

create policy "read payslips" on public.payslips
  for select to authenticated using (
    exists (select 1 from public.payroll_runs r
            where r.id = payslips.run_id
              and r.company_id = public.my_company_id()));

create policy "admin reads audit" on public.audit_log
  for select to authenticated
  using (company_id = public.my_company_id() and public.my_role() = 'admin');

-- No client write policies on runs, payslips, audit_log:
-- only Netlify Functions (service key) can write them.

-- ---------- Guards: lock rules enforced in the database ----------
create or replace function public.guard_run_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Only draft runs can be deleted';
    end if;
    return old;
  end if;

  if old.status = 'locked' then
    raise exception 'Locked runs are read-only';
  end if;

  if (old.status, new.status) not in (
       ('draft', 'draft'), ('draft', 'approved'),
       ('approved', 'approved'), ('approved', 'locked')) then
    raise exception 'Invalid status change: % to %', old.status, new.status;
  end if;
  return new;
end $$;

create trigger run_status_guard
  before update or delete on public.payroll_runs
  for each row execute function public.guard_run_status();

create or replace function public.guard_payslips()
returns trigger language plpgsql as $$
declare s text;
begin
  select status into s from public.payroll_runs
   where id = coalesce(new.run_id, old.run_id);
  if s <> 'draft' then
    raise exception 'Payslips can only change while the run is draft';
  end if;
  return coalesce(new, old);
end $$;

create trigger payslips_guard
  before insert or update or delete on public.payslips
  for each row execute function public.guard_payslips();

-- ---------- Seed: 2025 rate schedule ----------
insert into public.rate_schedules (effective_from, config) values (
  '2025-07-01',
  '{
    "brackets": [
      {"upTo": 2000,  "rate": 0,    "deduction": 0},
      {"upTo": 4000,  "rate": 0.15, "deduction": 300},
      {"upTo": 7000,  "rate": 0.20, "deduction": 500},
      {"upTo": 10000, "rate": 0.25, "deduction": 850},
      {"upTo": 14000, "rate": 0.30, "deduction": 1350},
      {"upTo": null,  "rate": 0.35, "deduction": 2050}
    ],
    "employeePension": 0.07,
    "employerPension": 0.11,
    "transportCap": 2200,
    "transportPct": 0.25,
    "overtime": {"day": 1.5, "night": 1.75, "rest": 2, "holiday": 2.5}
  }'::jsonb
);