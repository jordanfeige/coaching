-- Keep schools.has_tennis_program in sync with school_tennis_programs membership.
-- schools.pk is ipeds_id (text); school_tennis_programs.school_id references it.

create or replace function public.update_school_tennis_flag()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.schools
    set has_tennis_program = true,
        updated_at = now()
    where ipeds_id = NEW.school_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.schools
    set has_tennis_program = false,
        updated_at = now()
    where ipeds_id = OLD.school_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists school_tennis_flag_trigger on public.school_tennis_programs;
create trigger school_tennis_flag_trigger
  after insert or delete on public.school_tennis_programs
  for each row execute function public.update_school_tennis_flag();
