-- KAN-461. An emit run can replay only part of its dry run (owner, 2026-11-18):
-- 'safe' = not-a-place rows and duplicates with the identical name (sampled
-- 15/15 and 25/25 right); 'all' = every decision. NULL on dry runs.
ALTER TABLE landmark_cleanup_run ADD COLUMN emit_filter TEXT;
