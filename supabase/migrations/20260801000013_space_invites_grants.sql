-- SharedLife V3: space_invites grants/revoke an Migration-7-Standard anbinden
-- Additiv und rückwärtskompatibel — keine Datenlöschung

revoke delete on table public.space_invites from authenticated, anon;

grant select, insert, update on table public.space_invites to authenticated;
grant all on table public.space_invites to service_role;
