-- Clean slate: Drop old tables
DROP TABLE IF EXISTS transcript_translations;
DROP TABLE IF EXISTS sentence_translations;
DROP TABLE IF EXISTS phrase_translations;

-- Create unified text analysis table
-- This stores all analysis for Chinese text: phrases, definitions, sentence translations
CREATE TABLE IF NOT EXISTS text_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash TEXT UNIQUE NOT NULL,
  segmented_phrases JSONB,
  phrase_definitions JSONB,
  sentence_translations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on text_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_text_analysis_hash ON text_analysis(text_hash);

-- Add comments
COMMENT ON TABLE text_analysis IS 'Unified analysis cache for Chinese text - phrases, definitions, and translations keyed by text hash';
COMMENT ON COLUMN text_analysis.text_hash IS 'SHA-256 hash of the Chinese text content';
COMMENT ON COLUMN text_analysis.segmented_phrases IS 'Array of segmented phrases from the text';
COMMENT ON COLUMN text_analysis.phrase_definitions IS 'JSON object mapping phrases to their definitions';
COMMENT ON COLUMN text_analysis.sentence_translations IS 'JSON object mapping sentences to their English translations';
