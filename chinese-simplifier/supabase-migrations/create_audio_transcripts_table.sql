-- Create table for storing audio transcripts
CREATE TABLE IF NOT EXISTS audio_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash TEXT UNIQUE NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  transcript JSONB NOT NULL,
  language_code TEXT,
  language_probability DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on file_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_audio_transcripts_file_hash ON audio_transcripts(file_hash);

-- Create index on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_audio_transcripts_created_at ON audio_transcripts(created_at);

-- Add comment
COMMENT ON TABLE audio_transcripts IS 'Stores cached transcripts from ElevenLabs API to avoid duplicate API calls';
COMMENT ON COLUMN audio_transcripts.file_hash IS 'SHA-256 hash of the audio file for deduplication';
COMMENT ON COLUMN audio_transcripts.transcript IS 'Full transcript JSON with words and timestamps from ElevenLabs';
