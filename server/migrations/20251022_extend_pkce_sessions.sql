-- 扩容避免 varchar(100) 溢出导致 state/PKCE 落库失败
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pkce_sessions' AND column_name='state' AND character_maximum_length < 128
  ) THEN
    ALTER TABLE pkce_sessions ALTER COLUMN state TYPE varchar(128);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pkce_sessions' AND column_name='code_verifier' AND character_maximum_length < 256
  ) THEN
    ALTER TABLE pkce_sessions ALTER COLUMN code_verifier TYPE varchar(256);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pkce_sessions' AND column_name='nonce' AND character_maximum_length < 128
  ) THEN
    ALTER TABLE pkce_sessions ALTER COLUMN nonce TYPE varchar(128);
  END IF;

  BEGIN
    ALTER TABLE pkce_sessions ALTER COLUMN return_path TYPE text;
  EXCEPTION WHEN others THEN
    -- 已是 text 时跳过
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_pkce_sessions_state ON pkce_sessions(state);
