-- Column-selector state for the two admin list tables (app/admin/patients and
-- app/admin/orders). They are stored apart from patient_table_settings /
-- orders_table_settings because they are different tables: the admin ones span
-- every office and carry columns the office-scoped lists don't have (the
-- doctor office itself, most obviously). Sharing one blob would mean arranging
-- the admin list rearranged the office list behind your back.
--
-- Same shape as the existing settings columns:
--   {
--     "columnOrder": ["name", "doctor_office", ...],
--     "columnVisibility": { "street": false, "zipcode": false }
--   }
-- Nullable: a user who has never touched the column selector has no stored
-- preference and the table falls back to its built-in defaults.
alter table public.user_settings
    add column admin_patients_settings jsonb,
    add column admin_orders_settings jsonb;
