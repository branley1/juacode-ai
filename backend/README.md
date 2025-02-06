# JuaCode Backend API

## Overview

This is a FastAPI backend server implementation for JuaCode AI. It provides endpoints for:
- **Chat Generation**: Generate responses using DeepSeek/OpenAI/(coming soon: Gemini).
- **Chat Persistence**: Save and update chat records.
- **User Management**: Register and log in users with JWT authentication.

The application uses:
- **FastAPI** for building the web server.
- **SQLAlchemy** for ORM and database operations.
- **PostgreSQL** (or SQLite for development) as the database.
- **JWT** for secure user authentication.
- **DeepSeek-r1/OpenAI 03-mini/Gemini 2.0-flash** for generating chat responses.

## Features

- **Chat Generation**
  - **Endpoint:** `POST /api/generate`
  - Generates a chat response using the configured LLM agent.
- **Chat Persistence**
  - **Create Chat:** `POST /api/chats`
  - **Update Chat Title:** `PUT /api/chats/{chat_id}`
- **User Management**
  - **Register:** `POST /api/users/register`
  - **Login:** `POST /api/users/login`

## Prerequisites

- Python 3.10 or later
- PostgreSQL (preferred) or SQLite (for testing/development)
- Virtual environment (recommended)

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/branley1/juacode-ai.git
   cd juacode-ai/backend
   ```

2. **Create and Activate a Virtual Environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

  ```env
PostgresSQL connection
DATABASE_URL=postgresql://<username>:<password>@localhost/<database_name>

DeepSeek API
DEEPSEEK_API_KEY=<your_deepseek_api_key>
DEEPSEEK_BASE_URL=https://api.deepseek.com

Ollama API
OLLAMA_BASE_URL=http://localhost:11434

JWT configuration
JWT_SECRET_KEY=<your_jwt_secret_key>

OpenAI configuration
OPENAI_API_KEY=<your_openai_api_key>
```

The application validates required environment variables on startup. If any are missing, it will throw an error.

### Database Setup

The backend uses SQLAlchemy to create tables automatically on startup:

```python
Base.metadata.create_all(bind=engine)
```

Ensure your PostgreSQL database (or SQLite file) is accessible based on the `DATABASE_URL` provided.

## Running the Server

To start the server in development mode with hot-reloading:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```


The API will be available at [http://localhost:8000](http://localhost:8000).

## API Endpoints

### Generate Chat Response

- **Method:** POST
- **Route:** `/api/generate`
- **Description:** Generates a chat response using DeepSeek/OpenAI.
- **Payload Example:**
  ```json
  {
    "prompt": "What is RAG?",
    "model_variant": "chat" // Alternatively, "reasoner"
  }
  ```
- **Response:**
  ```json
  {
    "response": "The generated chat response."
  }
  ```

### Create New Chat

- **Method:** POST
- **Route:** `/api/chats`
- **Description:** Saves a new chat record (with a unique `chat_id`, title, and messages) to the database.
- **Payload Example:**
  ```json
  {
    "chat_id": "1633024800000-1234",
    "title": "New Chat",
    "messages": [
      { "role": "user", "content": "Hello" },
      { "role": "assistant", "content": "Hi there!" }
    ]
  }
  ```
- **Response:** Confirmation with the saved chat record.

### Update Chat Title

- **Method:** PUT
- **Route:** `/api/chats/{chat_id}`
- **Description:** Updates the title of an existing chat.
- **Payload Example:**
  ```json
  {
    "title": "Updated Chat Title"
  }
  ```
- **Response:** Confirmation with the updated chat record.

### User Registration

- **Method:** POST
- **Route:** `/api/users/register`
- **Description:** Registers a new user after validating the email and password complexity.
- **Payload Example:**
  ```json
  {
    "username": "newuser",
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response:** Confirmation with user details.

### User Login

- **Method:** POST
- **Route:** `/api/users/login`
- **Description:** Logs in an existing user and returns a JWT access token.
- **Payload Example:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "jwt_token_string",
    "token_type": "bearer"
  }
  ```

## Additional Configuration

- **CORS:** Configured (in `server.py`) to allow all origins. Adjust `allow_origins` for production.
- **Security:** Passwords are hashed using bcrypt. JWT tokens ensure secure user sessions. Be sure to use a strong `JWT_SECRET_KEY`.

## Troubleshooting

- **Missing Environment Variables:** The app checks for all required settings on startup. Make sure your `.env` file is complete.
- **Database Schema Changes:** If you change column types or add tables, consider using a migration tool such as Alembic.
- **Logging:** Error messages and traceback details are printed to the console—check logs if something doesn’t work as expected.

## Running Tests

If tests exist in the repository, run them with:

```bash
pytest
```


## License

MIT License

## Contact

For support or contributions, please contact me (Branley Mmasi) via email.


















