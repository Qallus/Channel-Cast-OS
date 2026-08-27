-- The unique index on (kind, external_id) was created WHERE external_id is not
-- null. Postgres will not accept a partial index as an ON CONFLICT arbiter, so
-- every upsert failed with "no unique or exclusion constraint matching the ON
-- CONFLICT specification" and no communication was ever written.
--
-- The predicate was unnecessary: Postgres already treats NULLs as distinct in a
-- unique index, so rows without an external id never collide with each other.

drop index if exists public.communications_external_uniq;

create unique index if not exists communications_external_uniq
  on public.communications (kind, external_id);
