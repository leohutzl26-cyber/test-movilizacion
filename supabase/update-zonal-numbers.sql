-- Script de actualización para cambiar el prefijo Z/Z- por 7- en la columna zonal_number de la tabla vehicles
UPDATE vehicles
SET zonal_number = 
  CASE 
    WHEN zonal_number ~* '^z-?' THEN '7-' || regexp_replace(zonal_number, '^z-?', '', 'i')
    WHEN zonal_number ~ '^7-' THEN zonal_number
    ELSE '7-' || zonal_number
  END
WHERE zonal_number IS NOT NULL AND zonal_number != '';
