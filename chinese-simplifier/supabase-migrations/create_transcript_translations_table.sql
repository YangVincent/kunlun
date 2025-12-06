-- Drop the old phrase_translations table (we'll use a better architecture)
DROP TABLE IF EXISTS phrase_translations;

-- Create table for storing complete transcript translations by audio hash
CREATE TABLE IF NOT EXISTS transcript_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_hash TEXT UNIQUE NOT NULL,
  translations JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on audio_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_transcript_translations_hash ON transcript_translations(audio_hash);

-- Add comments
COMMENT ON TABLE transcript_translations IS 'Cached phrase translations for entire audio transcripts, keyed by audio file hash';
COMMENT ON COLUMN transcript_translations.audio_hash IS 'SHA-256 hash of the audio file (same as transcript cache)';
COMMENT ON COLUMN transcript_translations.translations IS 'JSON object mapping Chinese phrases to their English definitions';
