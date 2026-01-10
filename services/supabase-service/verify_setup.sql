-- Verification script to check if all functions were created successfully
SELECT 
  routine_name as function_name,
  routine_type,
  security_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'read_secret',
  'insert_secret', 
  'update_secret',
  'delete_secret',
  'list_secrets',
  'secret_exists',
  'get_secret_metadata',
  'get_table_list',
  'get_table_schema',
  'version'
)
ORDER BY routine_name;
