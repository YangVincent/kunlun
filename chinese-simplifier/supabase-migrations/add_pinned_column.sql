-- Add pinned column to highlighted_words table
ALTER TABLE highlighted_words
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- Index for efficient sorting (pinned first)
CREATE INDEX IF NOT EXISTS idx_highlighted_words_pinned ON highlighted_words(user_id, pinned DESC);
