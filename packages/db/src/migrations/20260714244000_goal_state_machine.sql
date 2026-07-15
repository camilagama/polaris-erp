CREATE OR REPLACE FUNCTION public.enforce_goal_state_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" IN ('completed', 'expired') AND NEW."status" <> OLD."status" THEN
    RAISE EXCEPTION 'Completed and expired goals are terminal';
  END IF;

  IF OLD."status" = 'archived' AND NEW."status" NOT IN ('archived', 'active') THEN
    RAISE EXCEPTION 'Archived goals may only remain archived or return to active';
  END IF;

  IF OLD."status" = 'active' AND NEW."status" NOT IN ('active', 'completed', 'expired', 'archived') THEN
    RAISE EXCEPTION 'Active goals may only complete, expire, or archive';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "goals_state_transition_guard" ON "goals";--> statement-breakpoint
CREATE TRIGGER "goals_state_transition_guard"
BEFORE UPDATE OF "status" ON "goals"
FOR EACH ROW
EXECUTE FUNCTION public.enforce_goal_state_transition();--> statement-breakpoint
DROP POLICY IF EXISTS "goals_internal_goal_resolution_access" ON "goals";--> statement-breakpoint
CREATE POLICY "goals_internal_goal_resolution_access" ON "goals" AS PERMISSIVE FOR ALL
USING (current_setting('app.internal_job', true) = 'goal_resolution')
WITH CHECK (current_setting('app.internal_job', true) = 'goal_resolution');--> statement-breakpoint
DROP POLICY IF EXISTS "audit_events_goal_resolution_insert" ON "audit_events";--> statement-breakpoint
CREATE POLICY "audit_events_goal_resolution_insert" ON "audit_events" AS PERMISSIVE FOR INSERT
WITH CHECK (current_setting('app.internal_job', true) = 'goal_resolution');
