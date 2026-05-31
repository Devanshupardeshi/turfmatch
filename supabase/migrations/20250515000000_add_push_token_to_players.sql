-- Add push notification token columns to players table
-- This enables FCM-based push delivery to individual devices

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS push_token text,
ADD COLUMN IF NOT EXISTS push_token_platform text,
ADD COLUMN IF NOT EXISTS push_token_updated_at timestamptz;

-- Index for fast token lookups during broadcast sends
CREATE INDEX IF NOT EXISTS idx_players_push_token
ON public.players(push_token)
WHERE push_token IS NOT NULL;

-- Ensure RLS allows users to update their own token
-- (Already covered by existing player update policy, but verify)

COMMENT ON COLUMN public.players.push_token IS
  'FCM/APNS push token for this device. Null when notifications are disabled.';

COMMENT ON COLUMN public.players.push_token_platform IS
  'android | ios | web';
