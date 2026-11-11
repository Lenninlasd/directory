-- Spec 002 Q-9, AC-7.3: invented businesses for dev only, never run in prod (migrate.ts refuses --seed outside dev).
-- One statement (plan P-11). Fixed ids, so running it again updates the same rows.
-- Cases: inactive row (AC-1.2), invalid and missing numbers (AC-2.3, EC-5), long name and location (EC-4),
-- same created_at with names differing only in accents or case (EC-6), both store types.
-- Websites and hours (add-business-hours-and-website, design D-8). Websites use example.com only.
--   Websites: https (1, 5, 8), uppercase host and trailing slash (6), http, returned as null (2), missing (others).
--   Hours: typical week with Sunday closed (1), two ranges a day (2), closes before it opens, returned as [] (4),
--   missing (5, 9), the same every day (6), two days with a close at midnight (7), weekdays only (8).
INSERT INTO businesses (id, name, category, location_summary, has_physical_store, whatsapp_number, is_active, created_at, website_url, opening_hours)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Panadería Doña Rosa', 'Panadería', 'Calle 98 con Carrera 52, frente al parque', TRUE, '+57 300 123 4567', TRUE, '2026-10-01T10:00:00Z',
    'https://example.com/panaderia',
    '[{"dayOfWeek":1,"opens":"06:00","closes":"19:00"},{"dayOfWeek":2,"opens":"06:00","closes":"19:00"},{"dayOfWeek":3,"opens":"06:00","closes":"19:00"},{"dayOfWeek":4,"opens":"06:00","closes":"19:00"},{"dayOfWeek":5,"opens":"06:00","closes":"19:00"},{"dayOfWeek":6,"opens":"06:00","closes":"14:00"}]'),
  ('00000000-0000-4000-8000-000000000002', 'Ferretería El Tornillo', 'Ferretería', 'Local 3, Centro Comercial Alameda', TRUE, '+57 (300) 555-0101', TRUE, '2026-10-05T09:30:00Z',
    'http://example.com/ferreteria',
    '[{"dayOfWeek":1,"opens":"14:00","closes":"18:00"},{"dayOfWeek":1,"opens":"08:00","closes":"12:00"},{"dayOfWeek":2,"opens":"08:00","closes":"12:00"},{"dayOfWeek":2,"opens":"14:00","closes":"18:00"},{"dayOfWeek":3,"opens":"08:00","closes":"12:00"},{"dayOfWeek":3,"opens":"14:00","closes":"18:00"},{"dayOfWeek":4,"opens":"08:00","closes":"12:00"},{"dayOfWeek":4,"opens":"14:00","closes":"18:00"},{"dayOfWeek":5,"opens":"08:00","closes":"12:00"},{"dayOfWeek":5,"opens":"14:00","closes":"18:00"},{"dayOfWeek":6,"opens":"08:00","closes":"13:00"}]'),
  ('00000000-0000-4000-8000-000000000003', 'Lavandería Burbujas', 'Lavandería', 'Carrera 51 #96-20', TRUE, '573004445566', FALSE, '2026-10-10T08:00:00Z',
    NULL, NULL),
  ('00000000-0000-4000-8000-000000000004', 'Uñas y Estilo Caro', 'Belleza', 'Servicio a domicilio en el conjunto', FALSE, '0300 123', TRUE, '2026-10-03T14:00:00Z',
    NULL,
    '[{"dayOfWeek":2,"opens":"09:00","closes":"17:00"},{"dayOfWeek":3,"opens":"18:00","closes":"09:00"}]'),
  ('00000000-0000-4000-8000-000000000005', 'Tutorías de Matemáticas', 'Educación', 'Clases a domicilio en Alameda del Río', FALSE, NULL, TRUE, '2026-10-02T16:00:00Z',
    'https://example.com/tutorias',
    NULL),
  ('00000000-0000-4000-8000-000000000006', 'Distribuidora de Productos Naturales, Orgánicos y Artesanales de la Costa Caribe Hermanos Rodríguez Pertuz', 'Alimentos', 'Bodega en la Carrera 52 entre Calles 96 y 98, al lado de la estación de servicio, con entregas a domicilio en todas las torres del conjunto', TRUE, '573107778899', TRUE, '2026-09-20T12:00:00Z',
    'https://EXAMPLE.com/productos-naturales/',
    '[{"dayOfWeek":1,"opens":"07:00","closes":"21:00"},{"dayOfWeek":2,"opens":"07:00","closes":"21:00"},{"dayOfWeek":3,"opens":"07:00","closes":"21:00"},{"dayOfWeek":4,"opens":"07:00","closes":"21:00"},{"dayOfWeek":5,"opens":"07:00","closes":"21:00"},{"dayOfWeek":6,"opens":"07:00","closes":"21:00"},{"dayOfWeek":7,"opens":"07:00","closes":"21:00"}]'),
  ('00000000-0000-4000-8000-000000000007', 'Arepas La Mona', 'Comida', 'Puesto en la entrada del conjunto', TRUE, '573001239876', TRUE, '2026-10-04T15:00:00Z',
    NULL,
    '[{"dayOfWeek":6,"opens":"11:00","closes":"12:00"},{"dayOfWeek":6,"opens":"16:00","closes":"24:00"},{"dayOfWeek":7,"opens":"11:00","closes":"12:00"},{"dayOfWeek":7,"opens":"16:00","closes":"24:00"}]'),
  ('00000000-0000-4000-8000-000000000008', 'Café del Río', 'Cafetería', 'Torre 2, primer piso', TRUE, '573015550202', TRUE, '2026-10-04T15:00:00Z',
    'https://example.com/cafe-del-rio',
    '[{"dayOfWeek":1,"opens":"07:00","closes":"18:00"},{"dayOfWeek":2,"opens":"07:00","closes":"18:00"},{"dayOfWeek":3,"opens":"07:00","closes":"18:00"},{"dayOfWeek":4,"opens":"07:00","closes":"18:00"},{"dayOfWeek":5,"opens":"07:00","closes":"18:00"}]'),
  ('00000000-0000-4000-8000-000000000009', 'cafe del rio', 'Cafetería', 'Pedidos por WhatsApp, entrega en portería', FALSE, '573015550303', TRUE, '2026-10-04T15:00:00Z',
    NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  location_summary = EXCLUDED.location_summary,
  has_physical_store = EXCLUDED.has_physical_store,
  whatsapp_number = EXCLUDED.whatsapp_number,
  is_active = EXCLUDED.is_active,
  created_at = EXCLUDED.created_at,
  website_url = EXCLUDED.website_url,
  opening_hours = EXCLUDED.opening_hours;
