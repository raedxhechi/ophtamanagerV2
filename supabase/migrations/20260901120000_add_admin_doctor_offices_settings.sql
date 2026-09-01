-- Column-selector state for the admin doctor-offices list (app/admin/doctor-offices).
--
-- Its own column, for the same reason admin_patients_settings and
-- admin_orders_settings got theirs in 20260806120000: it is a different table
-- with different columns, and sharing a blob would mean arranging one list
-- rearranged another behind the user's back.
--
-- Same shape as the existing settings columns:
--   {
--     "columnOrder": ["name", "contact_person", ...],
--     "columnVisibility": { "street": false, "created_at": false }
--   }
-- Nullable: a user who has never touched the column selector has no stored
-- preference and the table falls back to its built-in defaults.
alter table public.user_settings
    add column admin_doctor_offices_settings jsonb;
