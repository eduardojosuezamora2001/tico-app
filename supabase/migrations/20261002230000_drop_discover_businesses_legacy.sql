-- Discovery público: solo discover_businesses_v2 (MV business_catalog_search).

drop function if exists public.discover_businesses(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, text[], text, text
);
