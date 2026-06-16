-- Función Trigger para sincronizar automáticamente el estado de los vehículos en la tabla vehicles
-- basado en la inserción, actualización y eliminación de traslados en la tabla trips.
-- Se remueve el campo updated_at de la actualización de vehicles ya que no existe en el esquema de producción.
CREATE OR REPLACE FUNCTION sync_vehicle_status_on_trip_change()
RETURNS TRIGGER AS $$
BEGIN
    -- CASO 1: ELIMINACIÓN DE UN TRASLADO (DELETE)
    -- Si el traslado eliminado tenía un vehículo asignado y estaba activo ('en_curso', 'asignado')
    IF TG_OP = 'DELETE' THEN
        IF OLD.vehicle_id IS NOT NULL AND OLD.status IN ('en_curso', 'asignado') THEN
            UPDATE vehicles
            SET status = 'disponible'
            WHERE id = OLD.vehicle_id AND status = 'en_curso';
        END IF;
        RETURN OLD;
    END IF;

    -- CASO 2: INSERCIÓN DE UN TRASLADO (INSERT)
    -- Si se inserta un viaje que ya inicia 'en_curso'
    IF TG_OP = 'INSERT' THEN
        IF NEW.vehicle_id IS NOT NULL AND NEW.status = 'en_curso' THEN
            UPDATE vehicles
            SET status = 'en_curso', mileage = COALESCE(NEW.start_mileage, mileage)
            WHERE id = NEW.vehicle_id AND status != 'en_curso';
        END IF;
        RETURN NEW;
    END IF;

    -- CASO 3: MODIFICACIÓN DE UN TRASLADO (UPDATE)
    IF TG_OP = 'UPDATE' THEN
        -- 3.1. Si el estado del viaje cambió a 'completado', 'cancelado' o 'pendiente' (liberado/desasignado/devuelto)
        IF OLD.status != NEW.status AND NEW.status IN ('completado', 'cancelado', 'pendiente') THEN
            -- Liberamos el vehículo actual
            IF NEW.vehicle_id IS NOT NULL THEN
                UPDATE vehicles
                SET status = 'disponible', 
                    mileage = CASE WHEN NEW.status = 'completado' AND NEW.end_mileage IS NOT NULL THEN NEW.end_mileage ELSE mileage END
                WHERE id = NEW.vehicle_id;
            END IF;
            -- Si además se cambió el vehículo asignado, liberamos también el viejo por seguridad
            IF OLD.vehicle_id IS NOT NULL AND OLD.vehicle_id != COALESCE(NEW.vehicle_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
                UPDATE vehicles
                SET status = 'disponible'
                WHERE id = OLD.vehicle_id;
            END IF;
            
        -- 3.2. Si el viaje pasó a 'en_curso' (inicio del traslado)
        ELSIF OLD.status != NEW.status AND NEW.status = 'en_curso' THEN
            IF NEW.vehicle_id IS NOT NULL THEN
                UPDATE vehicles
                SET status = 'en_curso', 
                    mileage = COALESCE(NEW.start_mileage, mileage)
                WHERE id = NEW.vehicle_id;
            END IF;

        -- 3.3. Si cambió el vehículo asociado al traslado sin cambiar de estado (edición / reasignación de ambulancia)
        ELSIF COALESCE(OLD.vehicle_id, '00000000-0000-0000-0000-000000000000'::uuid) != COALESCE(NEW.vehicle_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
            -- Liberamos el vehículo viejo
            IF OLD.vehicle_id IS NOT NULL THEN
                UPDATE vehicles
                SET status = 'disponible'
                WHERE id = OLD.vehicle_id;
            END IF;
            -- Si el viaje está en curso, marcamos el nuevo vehículo como en curso
            IF NEW.vehicle_id IS NOT NULL AND NEW.status = 'en_curso' THEN
                UPDATE vehicles
                SET status = 'en_curso', 
                    mileage = COALESCE(NEW.start_mileage, mileage)
                WHERE id = NEW.vehicle_id;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear el Trigger asociado a la tabla trips
DROP TRIGGER IF EXISTS trigger_sync_vehicle_status ON trips;
CREATE TRIGGER trigger_sync_vehicle_status
    AFTER INSERT OR UPDATE OR DELETE ON trips
    FOR EACH ROW EXECUTE FUNCTION sync_vehicle_status_on_trip_change();
