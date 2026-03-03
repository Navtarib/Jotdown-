# Jotdown! 📝

A lightning-fast, secure, and intuitive note-taking application built with React, Vite, Tailwind CSS, and Supabase.

## Features
- ✨ Real-time synchronization
- 🔐 Secure Google Authentication (Supabase)
- 🌓 Dark/Light Mode support
- 📱 Fully responsive design
- 📥 PDF Export for notes

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd notes
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Supabase credentials (see `.env.example`):
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment on Vercel
1. Push your code to GitHub.
2. Connect your GitHub repository to [Vercel](https://vercel.com).
3. Add Environment Variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Vercel will automatically detect Vite and deploy your app.

## License
Created by Navtech (Naveed Ahmed).
