# Supabase Setup for Audio Transcripts

## Step 1: Run the Migration

Go to your Supabase dashboard:
1. Navigate to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase-migrations/create_audio_transcripts_table.sql`
6. Click **Run** or press Cmd/Ctrl + Enter

## Step 2: Verify the Table

In the Supabase dashboard:
1. Click **Table Editor** in the left sidebar
2. You should see a new table called `audio_transcripts`
3. Verify it has these columns:
   - id (uuid)
   - file_hash (text)
   - file_name (text)
   - file_size (int8)
   - transcript (jsonb)
   - language_code (text)
   - language_probability (numeric)
   - created_at (timestamptz)
   - updated_at (timestamptz)

## Step 3: Set Row Level Security (Optional but Recommended)

If you want to enable RLS for security:

```sql
-- Enable RLS
ALTER TABLE audio_transcripts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read transcripts (they're cached publicly)
CREATE POLICY "Allow public read access" ON audio_transcripts
  FOR SELECT USING (true);

-- Allow server to insert/update (requires service role key on backend)
CREATE POLICY "Allow server insert" ON audio_transcripts
  FOR INSERT WITH CHECK (true);
```

## Step 4: Get Your ElevenLabs API Key

1. Go to https://elevenlabs.io/app/settings/api-keys
2. Create a new API key
3. Copy it to your `.env` file as `ELEVENLABS_API_KEY`

## Environment Variables Needed

Make sure your `.env` file has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

The service role key is needed on the backend to bypass RLS.
