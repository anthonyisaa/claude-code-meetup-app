-- Fix: matches UNIQUE constraint should include meetup_id
-- Without this, the same two users attending different meetups
-- would have their match scores collide on upsert.

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_user_a_user_b_key;
ALTER TABLE public.matches ADD CONSTRAINT matches_meetup_user_pair_key UNIQUE (meetup_id, user_a, user_b);
