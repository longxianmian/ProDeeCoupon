-- enlarge columns to prevent varchar overflow seen in logs (value too long for type character varying(100))
ALTER TABLE pkce_sessions
  ALTER COLUMN state TYPE varchar(128),
  ALTER COLUMN code_verifier TYPE varchar(256),
  ALTER COLUMN nonce TYPE varchar(128);

-- return_path can be longer in deep-link scenarios inside LINE WebView
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pkce_sessions' AND column_name='return_path' AND data_type='character varying'
  ) THEN
    ALTER TABLE pkce_sessions ALTER COLUMN return_path TYPE text;
  END IF;
END $$;

-- index for quick lookup by state
CREATE INDEX IF NOT EXISTS idx_pkce_sessions_state ON pkce_sessions(state);
