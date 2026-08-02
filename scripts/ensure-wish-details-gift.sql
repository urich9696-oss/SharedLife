-- SharedLife: wish_details für wish und legacy gift (idempotent)

create or replace function public.enforce_entity_type_for_detail()
returns trigger
language plpgsql
as $$
declare
  v_type text;
  v_expected text;
begin
  v_expected := tg_argv[0];
  select e.entity_type into v_type
  from public.entities e
  where e.id = new.entity_id;

  if TG_TABLE_NAME = 'wish_details' then
    if v_type is distinct from 'wish' and v_type is distinct from 'gift' then
      raise exception 'entity % has type %, expected wish/gift for table %',
        new.entity_id, v_type, TG_TABLE_NAME;
    end if;
    return new;
  end if;

  if v_type is distinct from v_expected then
    raise exception 'entity % has type %, expected % for table %',
      new.entity_id, v_type, v_expected, TG_TABLE_NAME;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
