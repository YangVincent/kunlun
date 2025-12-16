-- Table for tracking user's highlighted/clicked words
CREATE TABLE IF NOT EXISTS highlighted_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  pinyin TEXT,
  definition TEXT,
  highlight_count INTEGER DEFAULT 1,
  timestamps TIMESTAMPTZ[] DEFAULT ARRAY[NOW()],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one entry per word
  UNIQUE(user_id, word)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_highlighted_words_user_id ON highlighted_words(user_id);

-- Index for sorting by count (most highlighted words)
CREATE INDEX IF NOT EXISTS idx_highlighted_words_count ON highlighted_words(user_id, highlight_count DESC);

-- Enable Row Level Security
ALTER TABLE highlighted_words ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own highlighted words
CREATE POLICY "Users can view own highlighted words"
  ON highlighted_words FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own highlighted words
CREATE POLICY "Users can insert own highlighted words"
  ON highlighted_words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own highlighted words
CREATE POLICY "Users can update own highlighted words"
  ON highlighted_words FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own highlighted words
CREATE POLICY "Users can delete own highlighted words"
  ON highlighted_words FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE highlighted_words IS 'Tracks words/phrases that users have clicked on for definitions';
COMMENT ON COLUMN highlighted_words.user_id IS 'Reference to auth.users';
COMMENT ON COLUMN highlighted_words.word IS 'The Chinese word or phrase';
COMMENT ON COLUMN highlighted_words.pinyin IS 'Pinyin romanization';
COMMENT ON COLUMN highlighted_words.definition IS 'English definition';
COMMENT ON COLUMN highlighted_words.highlight_count IS 'Number of times this word was highlighted';
COMMENT ON COLUMN highlighted_words.timestamps IS 'Array of timestamps for each highlight event';
