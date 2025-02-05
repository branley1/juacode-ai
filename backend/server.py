"""
This file implements a FastAPI backend to replace the Node/Express server.
Endpoints:
  - POST /api/generate: Generates the chat response using a pre-configured LLM Agent.
  - POST /api/chats: Saves a new chat record to a PostgreSQL database.
  - PUT /api/chats/{chat_id}: Updates the title for a chat record.
  - POST /api/users/register: Registers a new user.
This example uses SQLAlchemy for persistence with PostgreSQL.
You can set DATABASE_URL in your environment (e.g., postgresql://user:password@localhost/db_name).
If you prefer MongoDB, you could swap out the persistence layer.
"""

import os
import traceback
import datetime
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, EmailStr, field_validator
from starlette.concurrency import run_in_threadpool  # To run blocking calls without blocking event loop
from contextlib import asynccontextmanager
from passlib.hash import bcrypt
from fastapi.middleware.cors import CORSMiddleware
from auth import create_access_token
import re

# SQLAlchemy imports
from sqlalchemy import create_engine, Column, BigInteger, String, DateTime
from sqlalchemy.types import JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# PostgresSQL Setup 
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Chat(Base):
    __tablename__ = "chats"
    # We use the client's chat_id (generated from Date.now()) as primary key
    chat_id = Column(BigInteger, primary_key=True, index=True)
    title = Column(String, nullable=False)
    messages = Column(JSON, nullable=False)  # Stores messages as a JSON object (PostgreSQL JSON/JSONB)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# New: User Model 
class User(Base):
    __tablename__ = "users"
    id = Column(BigInteger, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# Pydantic Schemas 
class ChatCreate(BaseModel):
    chat_id: int
    title: str
    messages: List[Dict[str, Any]]

class ChatUpdate(BaseModel):
    title: str

# New: Pydantic Schemas for Users 
class UserCreate(BaseModel):
    username: str
    email: EmailStr    # Validates email format automatically
    password: str

    @field_validator("password")
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must include at least one uppercase letter")
        if not re.search(r"[0-9]", value):
            raise ValueError("Password must include at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValueError("Password must include at least one special character")
        return value

# New: Schema for user login
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Dependency
def get_db():
    """Provides a database session to endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Agent Setup
try:
    from praisonaiagents import Agent
except ImportError:
    raise ImportError("Please install praisonaiagents to use the agent functionality.")

def init_agent():
    """
    Initializes LLM Agent with selectable API provider.
    """
    try:
        # Choose the LLM provider ("deepseek" or "openai")
        llm_provider = os.getenv("LLM_PROVIDER", "deepseek").lower()
        
        if llm_provider == "openai":
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set for OpenAI provider.")
            config = {
                "vector_store": {
                    "provider": "chroma",
                    "config": {
                        "collection_name": "praison",
                        "path": ".praison"
                    }
                },
                "llm": {
                    "provider": "openai",
                    "config": {
                        "model": os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
                        "api_key": openai_api_key,
                        "temperature": float(os.getenv("OPENAI_TEMPERATURE", "0.7")),
                        "max_tokens": int(os.getenv("OPENAI_MAX_TOKENS", "2000"))
                    }
                },
                "embedder": {
                    "provider": "openai",
                    "config": {
                        "model": os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002"),
                        "api_key": openai_api_key,
                        "embedding_dims": 1536
                    }
                },
            }
        else:  # default to deepseek (using ollama)
            config = {
                "vector_store": {
                    "provider": "chroma",
                    "config": {
                        "collection_name": "praison",
                        "path": ".praison"
                    }
                },
                "llm": {
                    "provider": "ollama",
                    "config": {
                        "model": "deepseek-r1:latest",
                        "temperature": 0,
                        "max_tokens": 8000,
                        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                    }
                },
                "embedder": {
                    "provider": "ollama",
                    "config": {
                        "model": "nomic-embed-text:latest",
                        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                        "embedding_dims": 1536
                    }
                },
            }
        
        pdf_path = os.path.join(os.path.dirname(__file__), "kag-research-paper.pdf")
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        agent = Agent(
            name="Knowledge Agent",
            instructions="You answer questions based on the provided knowledge.",
            knowledge=[pdf_path],
            knowledge_config=config,
            user_id="user1",
            llm="deepseek-r1" if llm_provider == "deepseek" else "openai"
        )
        print("Agent initialized successfully")
        return agent

    except Exception as e:
        print(f"Agent initialization error: {e}")
        print(traceback.format_exc())
        raise

def generate_reasoning_response(prompt: str) -> Dict[str, str]:
    """
    Uses the DeepSeek Reasoner API (via OpenAI SDK) to generate a response
    that includes both the reasoning chain-of-thought and final answer.
    """
    import openai
    # Set API key and base URL from environment variables
    openai.api_key = os.getenv("DEEPSEEK_API_KEY")
    openai.api_base = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    messages = [
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": prompt}
    ]
    response = openai.ChatCompletion.create(
        model="deepseek-reasoner",
        messages=messages,
        stream=False
    )
    reasoning = response.choices[0].message.get("reasoning_content", "")
    content = response.choices[0].message.get("content", "")
    return {"reasoning": reasoning, "content": content}

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    global agent
    try:
        agent = init_agent()
    except Exception as e:
        raise RuntimeError("Failed to initialize agent") from e
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify your frontend origin(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints
@app.post("/api/generate")
async def generate_response(payload: Dict[str, Any]):
    """
    Endpoint to generate a response.
    Expects JSON of form: {"prompt": "your question", "model_variant": "normal" or "reasoner"}
    Calls the agent (or the reasoning API) and returns the generated response.
    """
    prompt = payload.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")
    try:
        print("Debug - Received prompt:", prompt)
        
        # Always use DeepSeek API
        result = await run_in_threadpool(generate_reasoning_response, prompt)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate response")
            
        # For normal mode, just return the content without reasoning
        if payload.get("model_variant") != "reasoner":
            return {"response": result["content"]}
            
        return result
            
    except Exception as e:
        print("Error generating response:", e)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Error generating response: {str(e)}"
        )

@app.post("/api/chats")
async def create_chat(chat: ChatCreate, db: Session = Depends(get_db)):
    """
    Endpoint to save a new chat record.
    Persists the chat record (chat_id, title, messages) in the database.
    """
    try:
        # Convert Pydantic model to dict (JSON serializable)
        chat_data = chat.model_dump()
        new_chat = Chat(**chat_data)
        db.add(new_chat)
        db.commit()
        db.refresh(new_chat)
        return {"message": "Chat saved successfully", "chat": jsonable_encoder(new_chat)}
    except Exception as e:
        print("Error saving chat:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error saving chat.")

@app.put("/api/chats/{chat_id}")
async def update_chat_title(chat_id: int, chat_update: ChatUpdate, db: Session = Depends(get_db)):
    """
    Endpoint to update a chat title.
    Looks up the chat by chat_id and updates the title.
    """
    try:
        db_chat = db.query(Chat).filter(Chat.chat_id == chat_id).first()
        if not db_chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        db_chat.title = chat_update.title
        db.commit()
        db.refresh(db_chat)
        return {"message": "Chat title updated successfully", "chat": jsonable_encoder(db_chat)}
    except Exception as e:
        print("Error updating chat title:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error updating chat title.")

@app.post("/api/users/register")
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Endpoint to register a new user.
    Hashes the password and stores user details in the database.
    """
    # Hash password using passlib's bcrypt implementation
    hashed_password = bcrypt.hash(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
        return {"message": "User registered successfully", "user": jsonable_encoder(new_user)}
    except Exception as e:
        db.rollback()
        print("Error registering user:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="User registration failed.")

# New: Endpoint for user login
@app.post("/api/users/login")
async def login_user(user: UserLogin, db: Session = Depends(get_db)):
    """
    Endpoint to log in a user.
    Verifies email exists and that the password is correct.
    If successful, returns a JWT access token.
    """
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not bcrypt.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token (JWT)
    access_token = create_access_token(data={"sub": db_user.email, "id": db_user.id})
    return {"access_token": access_token, "token_type": "bearer"}

# Run the Application
if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000 (or adjust as needed)
    uvicorn.run(app, host="0.0.0.0", port=8000) 