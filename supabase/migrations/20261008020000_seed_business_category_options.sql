-- Upsert the historical onboarding rubros into marketplace_business_categories
-- so /mi-negocio and admin/catalogo share the same source of truth.

with seed(slug, name, legacy_label, sort_order) as (
  values
    ('restaurante', 'Restaurante', 'Restaurante', 10),
    ('soda', 'Soda', 'Soda', 20),
    ('cafeteria', 'Cafetería', 'Cafetería', 30),
    ('bar', 'Bar', 'Bar', 40),
    ('licorera', 'Licorera', 'Licorera', 50),
    ('pulperia', 'Pulpería', 'Pulpería', 60),
    ('supermercado', 'Supermercado', 'Supermercado', 70),
    ('minisuper', 'Minisuper', 'Minisuper', 80),
    ('farmacia', 'Farmacia', 'Farmacia', 90),
    ('gimnasio', 'Gimnasio', 'Gimnasio', 100),
    ('crossfit', 'CrossFit', 'CrossFit', 110),
    ('yoga-y-pilates', 'Yoga y pilates', 'Yoga y pilates', 120),
    ('spa', 'Spa', 'Spa', 130),
    ('salon-de-belleza', 'Salón de belleza', 'Salón de belleza', 140),
    ('barberia', 'Barbería', 'Barbería', 150),
    ('clinica-medica', 'Clínica médica', 'Clínica médica', 160),
    ('laboratorio-clinico', 'Laboratorio clínico', 'Laboratorio clínico', 170),
    ('veterinaria', 'Veterinaria', 'Veterinaria', 180),
    ('ferreteria', 'Ferretería', 'Ferretería', 190),
    ('construccion-y-materiales', 'Construcción y materiales', 'Construcción y materiales', 200),
    ('tecnologia-y-electronica', 'Tecnología y electrónica', 'Tecnología y electrónica', 210),
    ('celulares-y-accesorios', 'Celulares y accesorios', 'Celulares y accesorios', 220),
    ('ropa-y-moda', 'Ropa y moda', 'Ropa y moda', 230),
    ('zapateria', 'Zapatería', 'Zapatería', 240),
    ('joyeria', 'Joyería', 'Joyería', 250),
    ('sex-shop', 'Sex shop', 'Sex shop', 260),
    ('surf-y-deportes-acuaticos', 'Surf y deportes acuáticos', 'Surf y deportes acuáticos', 270),
    ('deportes-y-fitness', 'Deportes y fitness', 'Deportes y fitness', 280),
    ('bicicletas', 'Bicicletas', 'Bicicletas', 290),
    ('entretenimiento', 'Entretenimiento', 'Entretenimiento', 300),
    ('videojuegos', 'Videojuegos', 'Videojuegos', 310),
    ('cine-y-eventos', 'Cine y eventos', 'Cine y eventos', 320),
    ('apuestas-y-loteria', 'Apuestas y lotería', 'Apuestas y lotería', 330),
    ('casino', 'Casino', 'Casino', 340),
    ('hotel', 'Hotel', 'Hotel', 350),
    ('hospedaje', 'Hospedaje', 'Hospedaje', 360),
    ('turismo-y-tours', 'Turismo y tours', 'Turismo y tours', 370),
    ('agencia-de-viajes', 'Agencia de viajes', 'Agencia de viajes', 380),
    ('auto-y-repuestos', 'Auto y repuestos', 'Auto y repuestos', 390),
    ('taller-mecanico', 'Taller mecánico', 'Taller mecánico', 400),
    ('lavado-de-autos', 'Lavado de autos', 'Lavado de autos', 410),
    ('gasolinera', 'Gasolinera', 'Gasolinera', 420),
    ('inmobiliaria', 'Inmobiliaria', 'Inmobiliaria', 430),
    ('legal-y-notaria', 'Legal y notaría', 'Legal y notaría', 440),
    ('contabilidad', 'Contabilidad', 'Contabilidad', 450),
    ('educacion-y-tutorias', 'Educación y tutorías', 'Educación y tutorías', 460),
    ('guarderia', 'Guardería', 'Guardería', 470),
    ('pet-shop', 'Pet shop', 'Pet shop', 480),
    ('flores-y-regalos', 'Flores y regalos', 'Flores y regalos', 490),
    ('musica-e-instrumentos', 'Música e instrumentos', 'Música e instrumentos', 500),
    ('arte-y-galeria', 'Arte y galería', 'Arte y galería', 510)
)
insert into public.marketplace_business_categories (slug, name, legacy_label, sort_order, is_active)
select s.slug, s.name, s.legacy_label, s.sort_order, true
from seed s
where not exists (
  select 1
  from public.marketplace_business_categories c
  where c.slug = s.slug
     or lower(btrim(c.legacy_label)) = lower(btrim(s.legacy_label))
);
