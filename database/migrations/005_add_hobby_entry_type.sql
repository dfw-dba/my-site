-- 005_add_hobby_entry_type.sql
-- Add 'hobby' to the entry_type check constraint on professional_entries.

-- Drop old constraint and add updated one with 'hobby' included
alter table internal.professional_entries
  drop constraint professional_entries_entry_type_check;

alter table internal.professional_entries
  add constraint professional_entries_entry_type_check
  check (entry_type in ('work', 'education', 'certification', 'award', 'hobby'));

comment on column internal.professional_entries.entry_type is 'One of: work, education, certification, award, hobby';
