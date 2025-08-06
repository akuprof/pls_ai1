-- Create the anomalies table to store detected anomalies
CREATE TABLE IF NOT EXISTS public.anomalies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tripsheet_id UUID NOT NULL REFERENCES public.tripsheets(id) ON DELETE CASCADE,
    anomaly_type TEXT NOT NULL,
    description TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_anomalies_tripsheet_id ON public.anomalies(tripsheet_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON public.anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON public.anomalies(is_resolved);

-- Function to check for anomalies after a tripsheet is inserted or updated
CREATE OR REPLACE FUNCTION public.check_tripsheet_anomalies()
RETURNS TRIGGER AS $$
DECLARE
    v_anomaly_description TEXT;
    v_anomaly_type TEXT;
    v_driver_name TEXT;
BEGIN
    -- Get driver name for better anomaly description
    SELECT name INTO v_driver_name FROM public.drivers WHERE id = NEW.driver_id;

    -- Anomaly 1: Fuel > 15kg in a single shift
    IF NEW.fuel_kg IS NOT NULL AND NEW.fuel_kg > 15 THEN
        v_anomaly_type := 'Fuel > 15kg';
        v_anomaly_description := 'Driver ' || COALESCE(v_driver_name, 'Unknown') || ', Trip on ' || NEW.trip_date || ', Fuel: ' || NEW.fuel_kg || ' KG. Exceeds 15kg limit.';

        INSERT INTO public.anomalies (tripsheet_id, anomaly_type, description)
        VALUES (NEW.id, v_anomaly_type, v_anomaly_description);
    END IF;

    -- Anomaly 2: End KM is less than Start KM (data integrity check)
    IF NEW.end_km < NEW.start_km THEN
        v_anomaly_type := 'Invalid KM Entry';
        v_anomaly_description := 'Driver ' || COALESCE(v_driver_name, 'Unknown') || ', Trip on ' || NEW.trip_date || '. End KM (' || NEW.end_km || ') is less than Start KM (' || NEW.start_km || ').';

        INSERT INTO public.anomalies (tripsheet_id, anomaly_type, description)
        VALUES (NEW.id, v_anomaly_type, v_anomaly_description);
    END IF;

    -- Anomaly 3: Unusually high distance (more than 200km in a single shift)
    IF (NEW.end_km - NEW.start_km) > 200 THEN
        v_anomaly_type := 'High Distance';
        v_anomaly_description := 'Driver ' || COALESCE(v_driver_name, 'Unknown') || ', Trip on ' || NEW.trip_date || '. Distance: ' || (NEW.end_km - NEW.start_km) || ' KM. Exceeds 200km limit.';

        INSERT INTO public.anomalies (tripsheet_id, anomaly_type, description)
        VALUES (NEW.id, v_anomaly_type, v_anomaly_description);
    END IF;

    -- Anomaly 4: Zero distance (start_km equals end_km)
    IF NEW.start_km = NEW.end_km THEN
        v_anomaly_type := 'Zero Distance';
        v_anomaly_description := 'Driver ' || COALESCE(v_driver_name, 'Unknown') || ', Trip on ' || NEW.trip_date || '. Start and End KM are the same (' || NEW.start_km || ').';

        INSERT INTO public.anomalies (tripsheet_id, anomaly_type, description)
        VALUES (NEW.id, v_anomaly_type, v_anomaly_description);
    END IF;

    -- Anomaly 5: Negative fuel consumption (if fuel_kg is provided but seems unrealistic)
    IF NEW.fuel_kg IS NOT NULL AND NEW.fuel_kg < 0 THEN
        v_anomaly_type := 'Negative Fuel';
        v_anomaly_description := 'Driver ' || COALESCE(v_driver_name, 'Unknown') || ', Trip on ' || NEW.trip_date || '. Fuel: ' || NEW.fuel_kg || ' KG. Negative fuel consumption.';

        INSERT INTO public.anomalies (tripsheet_id, anomaly_type, description)
        VALUES (NEW.id, v_anomaly_type, v_anomaly_description);
    END IF;

    -- Anomaly 6: Unusually high fuel consumption (more than 1kg per 10km)
    IF NEW.fuel_kg IS NOT NULL AND (NEW.end_km - NEW.start_km) > 0 THEN
        DECLARE
            v_distance_km NUMERIC := NEW.end_km - NEW.start_km;
            v_fuel_per_km NUMERIC := NEW.fuel_kg / v_distance_km;
        BEGIN
            IF v_fuel_per_km > 0.1 THEN -- More than 0.1kg per km
                v_anomaly_type := 'High Fuel Consumption';
                v_anomaly_description := 'Driver ' || COALESCE(v_driver_name, 'Unknown') || ', Trip on ' || NEW.trip_date || '. Fuel consumption: ' || ROUND(v_fuel_per_km, 3) || ' KG/KM. Exceeds 0.1 KG/KM threshold.';

                INSERT INTO public.anomalies (tripsheet_id, anomaly_type, description)
                VALUES (NEW.id, v_anomaly_type, v_anomaly_description);
            END IF;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically check for anomalies on tripsheet insert/update
DROP TRIGGER IF EXISTS trigger_check_tripsheet_anomalies ON public.tripsheets;
CREATE TRIGGER trigger_check_tripsheet_anomalies
    AFTER INSERT OR UPDATE ON public.tripsheets
    FOR EACH ROW
    EXECUTE FUNCTION public.check_tripsheet_anomalies();

-- Function to resolve anomalies
CREATE OR REPLACE FUNCTION public.resolve_anomaly(
    p_anomaly_id UUID,
    p_resolved_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.anomalies 
    SET 
        is_resolved = TRUE,
        resolved_by = p_resolved_by,
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_anomaly_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get anomalies with trip details
CREATE OR REPLACE FUNCTION public.get_anomalies(
    p_is_resolved BOOLEAN DEFAULT NULL,
    p_anomaly_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    tripsheet_id UUID,
    anomaly_type TEXT,
    description TEXT,
    is_resolved BOOLEAN,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    trip_date DATE,
    driver_name TEXT,
    route TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.tripsheet_id,
        a.anomaly_type,
        a.description,
        a.is_resolved,
        a.resolved_by,
        a.resolved_at,
        a.created_at,
        t.trip_date,
        d.name as driver_name,
        t.route
    FROM public.anomalies a
    JOIN public.tripsheets t ON a.tripsheet_id = t.id
    LEFT JOIN public.drivers d ON t.driver_id = d.id
    WHERE (p_is_resolved IS NULL OR a.is_resolved = p_is_resolved)
      AND (p_anomaly_type IS NULL OR a.anomaly_type = p_anomaly_type)
    ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) on the anomalies table
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the anomalies table
CREATE POLICY "Users can view anomalies" ON public.anomalies
    FOR SELECT USING (true);

CREATE POLICY "Users can update anomalies" ON public.anomalies
    FOR UPDATE USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.anomalies TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_anomaly(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_anomalies(BOOLEAN, TEXT) TO authenticated; 