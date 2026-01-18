-- Migration: Add LISTEN/NOTIFY trigger for generation_job table
-- This enables instant job pickup without polling

-- Function to notify when a new job is inserted
CREATE OR REPLACE FUNCTION notify_new_generation_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify on the 'new_generation_job' channel with the job ID
  PERFORM pg_notify('new_generation_job', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that fires after INSERT on generation_job
DROP TRIGGER IF EXISTS generation_job_insert_notify ON generation_job;
CREATE TRIGGER generation_job_insert_notify
  AFTER INSERT ON generation_job
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_generation_job();

-- Also notify when a job is scheduled for retry (status changes back to pending)
CREATE OR REPLACE FUNCTION notify_job_retry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status changed TO 'pending' (retry scenario)
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    PERFORM pg_notify('new_generation_job', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generation_job_retry_notify ON generation_job;
CREATE TRIGGER generation_job_retry_notify
  AFTER UPDATE ON generation_job
  FOR EACH ROW
  EXECUTE FUNCTION notify_job_retry();

