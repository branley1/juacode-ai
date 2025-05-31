# JuaCode AI Assistant

JuaCode AI is a modern AI chat application built with Next.js that integrates multiple AI providers including OpenAI (o4-mini), Deepseek (chat and reasoner models), and Google Gemini (2.5-pro).

[![Netlify Status](https://api.netlify.com/api/v1/badges/d72b0fd0-c106-49d8-aa94-9eea18ebacc6/deploy-status)](https://app.netlify.com/projects/juacode/deploys)

## Tech Stack

- **Frontend & Backend:** Next.js 15+ with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **AI Providers:** 
  - OpenAI (o4-mini-2025-04-16)
  - Deepseek (deepseek-chat, deepseek-reasoner)
  - Google Gemini (gemini-2.5-pro-preview-05-06)
- **Authentication:** JWT with bcrypt
- **Deployment:** Netlify
- **Styling:** CSS with responsive design

## Project Structure

```
juacode-ai/
├── juacode-nextjs-app/          # Main Next.js application
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── api/             # API routes
│   │   │   │   ├── generate/    # AI chat generation
│   │   │   │   ├── chats/       # Chat management
│   │   │   │   └── users/       # User authentication
│   │   │   ├── chat/            # Chat interface pages
│   │   │   ├── login/           # Authentication pages
│   │   │   └── profile/         # User profile pages
│   │   ├── components/          # React components
│   │   │   ├── ChatInterface/   # Main chat UI
│   │   │   ├── ChatMessage/     # Message display
│   │   │   ├── InputArea/       # Message input
│   │   │   └── Sidebar/         # Navigation sidebar
│   │   ├── lib/                 # Utility libraries
│   │   └── utils/               # Helper functions
│   ├── prisma/                  # Database schema
│   └── public/                  # Static assets
├── package.json                 # Root package configuration
├── netlify.toml                 # Deployment configuration
└── README.md                    # This file
```

## Setup

### Prerequisites
- Node.js 18.18.0 or higher
- PostgreSQL database
- API keys for AI providers (OpenAI, Deepseek, Google Gemini)

### Environment Variables
Create a `.env.local` file in the `juacode-nextjs-app/` directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/juacode_db"

# AI Provider API Keys
OPENAI_API_KEY="your_openai_api_key"
DEEPSEEK_API_KEY="your_deepseek_api_key"
GEMINI_API_KEY="your_gemini_api_key"

# Model Configuration (optional)
OPENAI_MODEL="o4-mini-2025-04-16"
GEMINI_MODEL="gemini-2.5-pro-preview-05-06"

# JWT Secret
JWT_SECRET="your_jwt_secret_key"
```

### Installation & Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/branley1/juacode-ai
   cd juacode-ai
   ```

2. **Install dependencies:**
   ```bash
   # Install root dependencies
   npm install
   
   # Install Next.js app dependencies
   cd juacode-nextjs-app
   npm install
   ```

3. **Set up the database:**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations (if any)
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   # From the juacode-nextjs-app directory
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## Features

- **Multi-Provider AI Chat:** Switch between OpenAI, Deepseek, and Gemini models
- **Reasoning Mode:** Special reasoning models for complex problem-solving (Deepseek)
- **Real-time Streaming:** Server-sent events for live chat responses
- **User Authentication:** Secure JWT-based auth with password hashing
- **Responsive Design:** Mobile-friendly interface with modern UI
- **Chat History:** Persistent chat sessions with database storage
- **Syntax Highlighting:** Code block rendering with copy functionality

## Deployment

The application is configured for deployment on Netlify:

```bash
# Build for production
npm run build

# Start production server locally
npm start
```

## Usage

Users can:
- Choose between different AI models (OpenAI, Deepseek, Gemini)
- Select regular or reasoning modes (where available)
- Engage in real-time conversations with streaming responses
- View formatted responses with code highlighting
- Manage chat history and user profiles

Here's JuaCode AI in action (users can choose between `regular` and `reasoning` models when using Deepseek-r1 or o3-mini):

https://github.com/user-attachments/assets/9b466254-2d59-46a2-acec-e54d976b5d5e

## Contributing

Feel free to dive into the codebase for more detailed insights and potential contributions!

## License

[View License](LICENSE)
