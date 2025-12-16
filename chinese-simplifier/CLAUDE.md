# Claude Code Instructions

## Development Workflow

1. **Always test in browser before committing** - Don't commit code changes without the user verifying they work in a real browser first. Vite HMR and curl tests are not sufficient.

2. **Restart PM2 after changes** - After modifying frontend or backend code, restart the relevant PM2 process:
   ```bash
   pm2 restart chinese-frontend chinese-backend && pm2 save
   ```

## Project Structure

- Frontend: Vite + React (port 9876)
- Backend: Express.js (port 3001)
- Database: Supabase (PostgreSQL)

## PM2 Processes

- `chinese-frontend` - Vite dev server
- `chinese-backend` - Express API server

## Key Files

- `src/supabaseClient.js` - Supabase client singleton
- `src/AuthContext.jsx` - Authentication state management
- `src/textStorage.js` - IndexedDB for /simplifier and /reader persistence
- `src/audioStorage.js` - IndexedDB for /listen audio persistence
- `server.js` - Backend API endpoints
