-- Allow INSERT/UPDATE/DELETE through service_sql bridge.
-- SELECT paths stay wrapped as subqueries; writes with RETURNING use a CTE;
-- writes without RETURNING execute directly and return [].
CREATE OR REPLACE FUNCTION public.service_sql(q text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  dynamic_sql text;
  qtrim text;
BEGIN
  qtrim := ltrim(q, E' \t\n\r');
  IF lower(qtrim) ~ '^(insert|update|delete|with)(\s|\()' THEN
    IF lower(qtrim) ~ '\mreturning\M' THEN
      dynamic_sql :=
        'WITH __celerity_rows AS (' || q || ')
         SELECT COALESCE(jsonb_agg(to_jsonb(__celerity_rows)), ''[]''::jsonb)
         FROM __celerity_rows';
      EXECUTE dynamic_sql INTO result;
    ELSE
      EXECUTE q;
      result := '[]'::jsonb;
    END IF;
  ELSE
    dynamic_sql :=
      'SELECT COALESCE(jsonb_agg(t.row), ''[]''::jsonb)
       FROM (SELECT to_jsonb(s) AS row FROM (' || q || ') s) t';
    EXECUTE dynamic_sql INTO result;
  END IF;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'service_sql failed: % | sql=%', SQLERRM, q;
END;
$function$;
