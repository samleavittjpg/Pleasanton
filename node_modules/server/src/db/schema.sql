-- Pleasanton MVP schema (Postgres)

create table if not exists users (
  id uuid primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create type match_status as enum ('lobby', 'running', 'finished');

create table if not exists matches (
  id uuid primary key,
  status match_status not null,
  length_seconds int not null,
  seed int not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists match_players (
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  player_index int not null,
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table if not exists neighborhoods (
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  budget numeric(12,2) not null,
  heat numeric(6,2) not null,
  grid_json jsonb not null,
  services_json jsonb not null,
  metrics_json jsonb not null,
  avg_happiness numeric(4,2) not null,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table if not exists actions (
  id uuid primary key,
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  result_json jsonb
);

create index if not exists actions_match_id_created_at_idx
  on actions(match_id, created_at desc);

create table if not exists snapshots (
  match_id uuid not null references matches(id) on delete cascade,
  tick int not null,
  state_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, tick)
);

create table if not exists results (
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  final_happiness numeric(4,2) not null,
  components_json jsonb not null,
  rank int not null,
  primary key (match_id, user_id)
);

