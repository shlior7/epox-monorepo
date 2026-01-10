-- Install pgTAP extension for database unit testing
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Grant usage to test user
GRANT USAGE ON SCHEMA public TO test;
