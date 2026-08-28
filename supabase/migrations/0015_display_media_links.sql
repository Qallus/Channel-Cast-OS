-- Creative can be a hosted link rather than an uploaded file.
--
-- Not every screen owner wants to push a 200MB MP4 through the dashboard, and
-- some creative already lives on YouTube or Vimeo. A linked item stores the
-- provider and a normalised embed URL instead of a storage path, so the player
-- can decide between a <video> element and an iframe.

alter table public.display_media add column if not exists source    text not null default 'upload';  -- upload | link
alter table public.display_media add column if not exists embed_url text;
alter table public.display_media add column if not exists provider  text;                            -- youtube | vimeo | direct

-- Linked creative has no object in storage.
alter table public.display_media alter column storage_path drop not null;
