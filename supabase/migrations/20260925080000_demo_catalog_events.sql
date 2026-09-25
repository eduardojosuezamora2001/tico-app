-- Catálogo amplio de la dueña de prueba para recorrer productos, servicios y eventos.

do $$
declare
  owner_id uuid := 'a1111111-1111-4111-8111-111111111111';
  soda_id uuid := 'b1111111-1111-4111-8111-111111111111';
  farmacia_id uuid := 'b2222222-2222-4222-8222-222222222222';
  ferreteria_id uuid := 'b3333333-3333-4333-8333-333333333333';
  pulperia_id uuid := 'b4444444-4444-4444-8444-444444444444';
  belleza_id uuid := 'b5555555-5555-4555-8555-555555555555';
  taller_id uuid := 'b6666666-6666-4666-8666-666666666666';
begin
  if exists (
    select 1 from public.products
    where business_id = soda_id and name = 'Agua embotellada 600 ml'
  ) then
    return;
  end if;

  insert into public.business_modules (business_id, module_name, enabled)
  select id, module_name, true
  from (
    values
      (soda_id), (farmacia_id), (ferreteria_id), (pulperia_id), (belleza_id), (taller_id)
  ) as shops (id)
  cross join (
    values ('products'::text), ('services')
  ) as mods (module_name)
  on conflict (business_id, module_name) do update set enabled = true;

  insert into public.products (business_id, name, description, price, stock, category, created_by) values
    (soda_id, 'Agua embotellada 600 ml', 'Botella fría para llevar.', 700, 80, 'Bebidas', owner_id),
    (soda_id, 'Café chorreado de tarro', 'Para llevar, 12 oz.', 1200, 40, 'Bebidas', owner_id),
    (soda_id, 'Empanada de chiverre', 'Horneada el mismo día.', 900, 24, 'Repostería', owner_id),
    (soda_id, 'Queque de naranja', 'Porción individual.', 1500, 16, 'Repostería', owner_id),
    (soda_id, 'Gallo pinto para llevar', 'Porción familiar, sin proteína.', 2800, 12, 'Para llevar', owner_id),
    (soda_id, 'Plátano maduro', 'Orden de tres tajadas.', 1100, 20, 'Acompañamientos', owner_id),
    (farmacia_id, 'Ibuprofeno 400 mg', 'Caja de 10 tabletas.', 2100, 35, 'Medicamentos', owner_id),
    (farmacia_id, 'Loratadina 10 mg', 'Caja de 10 tabletas.', 2400, 28, 'Medicamentos', owner_id),
    (farmacia_id, 'Suero oral', 'Sobre para un litro.', 800, 50, 'Cuidado', owner_id),
    (farmacia_id, 'Curitas surtidas', 'Caja de 20 unidades.', 1300, 40, 'Primeros auxilios', owner_id),
    (farmacia_id, 'Alcohol 70% 250 ml', 'Uso externo.', 1600, 30, 'Cuidado', owner_id),
    (farmacia_id, 'Protector solar FPS 50', 'Tubo de 60 ml.', 8900, 14, 'Cuidado', owner_id),
    (farmacia_id, 'Termómetro digital', 'Punta flexible.', 6500, 10, 'Equipo', owner_id),
    (farmacia_id, 'Mascarillas desechables', 'Paquete de 10.', 1800, 45, 'Cuidado', owner_id),
    (farmacia_id, 'Vitamina C 1 g', 'Tubo de 10 tabletas efervescentes.', 3200, 22, 'Vitaminas', owner_id),
    (farmacia_id, 'Jabón antibacterial', 'Barra de 90 g.', 950, 36, 'Higiene', owner_id),
    (ferreteria_id, 'Clavos de 2 pulgadas', 'Bolsa de 1 kg.', 1800, 40, 'Fijaciones', owner_id),
    (ferreteria_id, 'Tornillos para madera', 'Caja de 100, 1 pulgada.', 2200, 30, 'Fijaciones', owner_id),
    (ferreteria_id, 'Brocha de 2 pulgadas', 'Cerda sintética.', 2500, 18, 'Pintura', owner_id),
    (ferreteria_id, 'Pintura blanca 1 galón', 'Látex interior.', 14500, 12, 'Pintura', owner_id),
    (ferreteria_id, 'Cinta adhesiva gris', 'Rollo de 25 m.', 1700, 25, 'Adhesivos', owner_id),
    (ferreteria_id, 'Candado de 40 mm', 'Arco corto, dos llaves.', 4800, 15, 'Seguridad', owner_id),
    (ferreteria_id, 'Extensión de 5 m', 'Tres tomas.', 7200, 9, 'Eléctrico', owner_id),
    (ferreteria_id, 'Foco LED 9 W', 'Luz blanca.', 1900, 40, 'Eléctrico', owner_id),
    (ferreteria_id, 'Llave stillson 10 pulgadas', 'Para tubo.', 9800, 6, 'Herramientas', owner_id),
    (ferreteria_id, 'Guantes de trabajo', 'Par, talla L.', 2100, 20, 'Seguridad', owner_id),
    (pulperia_id, 'Leche semidescremada 1 L', 'Caja para la semana.', 1100, 48, 'Lácteos', owner_id),
    (pulperia_id, 'Huevos rojos', 'Media caja, 15 unidades.', 2400, 20, 'Abarrotes', owner_id),
    (pulperia_id, 'Pan cuadrado', 'Bolsa familiar.', 1600, 18, 'Panadería', owner_id),
    (pulperia_id, 'Azúcar 1 kg', 'Bolsa.', 1000, 30, 'Abarrotes', owner_id),
    (pulperia_id, 'Aceite 750 ml', 'Vegetal.', 2100, 22, 'Abarrotes', owner_id),
    (pulperia_id, 'Atún en agua', 'Lata de 140 g.', 1300, 36, 'Enlatados', owner_id),
    (pulperia_id, 'Fresco en polvo', 'Sobre de 30 g.', 400, 60, 'Bebidas', owner_id),
    (pulperia_id, 'Recarga Kolbi ₡1000', 'Se acredita al número que indiques.', 1000, 100, 'Recargas', owner_id),
    (belleza_id, 'Esmalte rojo', 'Secado rápido, 8 ml.', 2800, 16, 'Uñas', owner_id),
    (belleza_id, 'Shampoo de keratina', 'Frasco de 250 ml.', 6400, 12, 'Cabello', owner_id),
    (belleza_id, 'Mascarilla capilar', 'Sobre de un uso.', 1800, 24, 'Cabello', owner_id),
    (belleza_id, 'Cepillo desenredante', 'Dientes flexibles.', 3500, 10, 'Accesorios', owner_id),
    (belleza_id, 'Aceite de cutícula', 'Gotero de 10 ml.', 2200, 14, 'Uñas', owner_id),
    (taller_id, 'Cinta de teflón', 'Rollo para rosca.', 600, 40, 'Plomería', owner_id),
    (taller_id, 'Empaque de llave', 'Juego de tres medidas.', 900, 30, 'Plomería', owner_id),
    (taller_id, 'Tomacorriente doble', 'Sin instalación.', 2400, 18, 'Eléctrico', owner_id),
    (taller_id, 'Interruptor sencillo', 'Sin instalación.', 1600, 20, 'Eléctrico', owner_id),
    (taller_id, 'Tubo PVC 1/2 pulgada', 'Tramo de 3 m.', 2800, 12, 'Plomería', owner_id),
    (taller_id, 'Codo PVC 1/2 pulgada', 'Unidad.', 450, 40, 'Plomería', owner_id);

  insert into public.services (business_id, name, description, price, duration_minutes, category, created_by) values
    (soda_id, 'Almuerzo para oficina', 'Casados empacados, mínimo ocho.', 4200, 60, 'Encargos', owner_id),
    (soda_id, 'Café para reunión', 'Termo de 2 litros y vasos.', 8000, 30, 'Encargos', owner_id),
    (soda_id, 'Montaje de mesa', 'Mantel y servicio para 10 personas en el local.', 15000, 90, 'Eventos', owner_id),
    (farmacia_id, 'Toma de presión', 'En el local, sin cita.', 1500, 10, 'Salud', owner_id),
    (farmacia_id, 'Aplicación de inyección', 'Debes traer la receta y el medicamento.', 2500, 15, 'Salud', owner_id),
    (farmacia_id, 'Entrega a domicilio', 'Dentro de San José centro, el mismo día.', 2000, 45, 'Entrega', owner_id),
    (farmacia_id, 'Revisión de botiquín', 'Te decimos qué conviene reponer.', 0, 20, 'Salud', owner_id),
    (ferreteria_id, 'Corte de tubo', 'Según la medida que traigas.', 1000, 15, 'Taller', owner_id),
    (ferreteria_id, 'Copia de llave', 'Mientras esperas.', 1500, 10, 'Taller', owner_id),
    (ferreteria_id, 'Entrega de materiales', 'En Escazú, pedido mínimo ₡20000.', 3000, 60, 'Entrega', owner_id),
    (ferreteria_id, 'Asesoría de pintura', 'Cálculo de galones para una habitación.', 0, 20, 'Pintura', owner_id),
    (pulperia_id, 'Encargo semanal', 'Armamos la canasta y la apartamos.', 0, 30, 'Encargos', owner_id),
    (pulperia_id, 'Entrega en el barrio', 'Pedidos de la pulpería, por la tarde.', 800, 40, 'Entrega', owner_id),
    (pulperia_id, 'Recarga express', 'Kolbi, Movistar o Claro.', 0, 5, 'Recargas', owner_id),
    (belleza_id, 'Corte y secado', 'Incluye lavado y peinado corto.', 10000, 50, 'Cabello', owner_id),
    (belleza_id, 'Tinte completo', 'El tinte se cotiza aparte.', 18000, 120, 'Cabello', owner_id),
    (belleza_id, 'Mechas', 'Según el largo.', 25000, 150, 'Cabello', owner_id),
    (belleza_id, 'Cejas', 'Depilación con hilo.', 4000, 20, 'Rostro', owner_id),
    (belleza_id, 'Pedicure', 'Esmalte tradicional.', 7000, 45, 'Uñas', owner_id),
    (belleza_id, 'Uñas en gel', 'Juego completo.', 14000, 90, 'Uñas', owner_id),
    (belleza_id, 'Peinado para evento', 'Recogido o ondas.', 12000, 60, 'Cabello', owner_id),
    (taller_id, 'Revisión de fuga', 'Diagnóstico en el valle central.', 8000, 40, 'Plomería', owner_id),
    (taller_id, 'Cambio de llave de chorro', 'Mano de obra. La llave se cobra aparte.', 10000, 45, 'Plomería', owner_id),
    (taller_id, 'Instalación de lámpara', 'Techo de tabla yeso o concreto.', 12000, 50, 'Electricidad', owner_id),
    (taller_id, 'Revisión de breaker', 'Sin cambio de piezas.', 9000, 40, 'Electricidad', owner_id),
    (taller_id, 'Destape de lavatorio', 'Visita en el valle central.', 11000, 45, 'Plomería', owner_id),
    (taller_id, 'Mantenimiento de ducha eléctrica', 'Limpieza y prueba.', 13000, 50, 'Electricidad', owner_id);

  insert into public.events (business_id, title, description, starts_at, ends_at, location_text, created_by) values
    (soda_id, 'Feria del casado', 'Tres casados del día a precio de feria y fresco de cortesía.', '2026-10-03 11:00:00-06', '2026-10-03 14:00:00-06', 'Soda El Parque, Avenida Central', owner_id),
    (soda_id, 'Tarde de chorreado', 'Café de la zona y repostería. Cupo limitado.', '2026-10-10 15:00:00-06', '2026-10-10 17:30:00-06', 'Soda El Parque, Avenida Central', owner_id),
    (soda_id, 'Desayuno de sábado', 'Gallo pinto, natilla y tortilla palmeada hasta agotar.', '2026-10-17 07:30:00-06', '2026-10-17 10:30:00-06', 'Soda El Parque, Avenida Central', owner_id),
    (farmacia_id, 'Jornada de presión', 'Toma de presión gratuita por la mañana.', '2026-10-06 08:00:00-06', '2026-10-06 11:00:00-06', 'Farmacia Central, Calle 2', owner_id),
    (farmacia_id, 'Charla de botiquín', 'Qué tener en casa para una semana de gripe.', '2026-10-14 17:00:00-06', '2026-10-14 18:00:00-06', 'Farmacia Central, Calle 2', owner_id),
    (ferreteria_id, 'Taller de pintura', 'Cómo preparar una pared antes de pintar. Trae ropa de trabajo.', '2026-10-08 09:00:00-06', '2026-10-08 11:00:00-06', 'Ferretería El Clavo, Escazú', owner_id),
    (ferreteria_id, 'Feria de herramientas', 'Descuento del local en martillos, cintas y focos LED.', '2026-10-18 08:00:00-06', '2026-10-18 16:00:00-06', 'Ferretería El Clavo, Escazú', owner_id),
    (pulperia_id, 'Canasta de la quincena', 'Apartamos arroz, frijoles, aceite y huevos el mismo día.', '2026-10-15 07:00:00-06', '2026-10-15 18:00:00-06', 'Pulpería Don Chepe, Heredia', owner_id),
    (pulperia_id, 'Mañana de recargas', 'Recargas sin espera de 7 a 9.', '2026-10-20 07:00:00-06', '2026-10-20 09:00:00-06', 'Pulpería Don Chepe, Heredia', owner_id),
    (belleza_id, 'Día de mechas', 'Cupos de mechas con cita previa esa tarde.', '2026-10-09 13:00:00-06', '2026-10-09 18:00:00-06', 'Belleza Luna, Cartago', owner_id),
    (belleza_id, 'Tarde de uñas', 'Manicure y esmalte tradicional, por orden de llegada.', '2026-10-16 14:00:00-06', '2026-10-16 18:00:00-06', 'Belleza Luna, Cartago', owner_id),
    (belleza_id, 'Peinados de graduación', 'Reservas para recogidos de esa semana.', '2026-10-24 10:00:00-06', '2026-10-24 17:00:00-06', 'Belleza Luna, Cartago', owner_id),
    (taller_id, 'Jornada de plomería', 'Destapes y cambio de empaques en Alajuela, con cita.', '2026-10-07 08:00:00-06', '2026-10-07 15:00:00-06', 'Taller El Tico, Alajuela', owner_id),
    (taller_id, 'Revisión eléctrica', 'Media mañana de revisiones de tomacorrientes, con cita.', '2026-10-21 08:00:00-06', '2026-10-21 12:00:00-06', 'Taller El Tico, Alajuela', owner_id);
end $$;
