-- Who a suborder is invoiced to.
create type public.invoice_types as enum ('Praxis', 'Kasse', 'Patient');

alter table public.suborders
    add column invoice_type public.invoice_types;
