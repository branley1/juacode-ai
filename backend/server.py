"""
This file implements a FastAPI backend to replace the Node/Express server.
Endpoints:
  - POST /api/generate: Generates the chat response using a pre-configured LLM Agent.
  - POST /api/chats: Saves a new chat record to a PostgreSQL database.
  - PUT /api/chats/{chat_id}: Updates the title for a chat record.
  - POST /api/users/register: Registers a new user.
"""

import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

import traceback
import datetime
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, EmailStr, field_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
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
    chat_id = Column(String, primary_key=True, index=True)
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
    chat_id: str
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
# try:
#     from praisonaiagents import Agent
# except ImportError:
#     raise ImportError("Please install praisonaiagents to use the agent functionality.")

def generate_chat_response(prompt: str, model: str = "deepseek-chat") -> Dict[str, str]:
    """
    Uses the DeepSeek Chat API to generate a response.
    """
    import os
    import openai
    from fastapi import HTTPException  
    
    # Set API key and base URL from environment variables
    openai.api_key = os.getenv("DEEPSEEK_API_KEY")
    openai.api_base = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=messages,
            max_tokens=4096,
            temperature=0.7,
            stream=False,
            frequency_penalty=0,
            presence_penalty=0,
            top_p=1
        )
    except Exception as e:
        # Log error details then raise an HTTPException so the error can be gracefully handled
        print("Error calling OpenAI API:", str(e))
        raise HTTPException(status_code=500, detail="Failed to call OpenAI API")
    
    # Validate the response structure before accessing message content
    if not response or "choices" not in response or not response.choices:
        print("Invalid response structure from OpenAI API:", response)
        raise HTTPException(status_code=500, detail="OpenAI API returned an invalid response")
    
    # Access the response content safely
    try:
        message_content = response.choices[0].message.content
    except Exception as e:
        print("Error accessing message content:", str(e))
        raise HTTPException(status_code=500, detail="Failed to parse OpenAI API response")
    
    if not message_content:
        print("Empty message content received from OpenAI API")
        raise HTTPException(status_code=500, detail="OpenAI API returned an empty response")
    
    return {"response": message_content}

def generate_reasoning_response(prompt: str) -> Dict[str, str]:
    """
    Uses the DeepSeek Reasoner API to generate a response with reasoning.
    """
    return generate_chat_response(prompt, model="deepseek-reasoner")

@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_environment()
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
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
    """
    prompt = payload.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")
    
    try:
        print("Debug - Received prompt:", prompt)
        model_variant = payload.get("model_variant", "normal")
        
        if model_variant == "reasoner":
            result = await run_in_threadpool(generate_reasoning_response, prompt)
        else:
            result = await run_in_threadpool(generate_chat_response, prompt)
            
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate response")
            
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
async def update_chat_title(chat_id: str, chat_update: ChatUpdate, db: Session = Depends(get_db)):
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

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env')
    
    # Database
    DATABASE_URL: str = Field(..., description="Database connection URL")
    
    # OpenAI
    OPENAI_API_KEY: str = Field(..., description="OpenAI API key")
    OPENAI_MODEL: str = Field("o3-mini-2025-01-31", description="OpenAI model name")
    OPENAI_TEMPERATURE: float = Field(0.7, description="OpenAI temperature")
    OPENAI_MAX_TOKENS: int = Field(2000, description="OpenAI max tokens")
    OPENAI_EMBEDDING_MODEL: str = Field("text-embedding-ada-002", description="OpenAI embedding model")
    
    # DeepSeek
    DEEPSEEK_API_KEY: str = Field(..., description="DeepSeek API key")
    DEEPSEEK_BASE_URL: str = Field("https://api.deepseek.com", description="DeepSeek base URL")
    
    # Ollama
    OLLAMA_BASE_URL: str = Field("http://localhost:11434", description="Ollama base URL")
    
    # LLM Provider
    LLM_PROVIDER: str = Field("deepseek-chat", description="LLM provider selection")

    # Gemini
    GEMINI_API_KEY: str = Field(..., description="Gemini API key")
    
    # JWT
    JWT_SECRET_KEY: str = Field(..., description="JWT secret key")
    JWT_ALGORITHM: str = Field("HS256", description="JWT algorithm")
    JWT_EXPIRATION_MINUTES: int = Field(30, description="JWT expiration in minutes")

    def validate_environment(self) -> dict[str, bool]:
        """Validates all environment variables and returns status"""
        validation_results = {}
        for field_name in self.__class__.model_fields:
            try:
                getattr(self, field_name)
                validation_results[field_name] = True
            except Exception:
                validation_results[field_name] = False
        return validation_results

# Initialize settings
settings = Settings()

# Validate environment on startup
def validate_environment():
    """Validates all environment variables on startup"""
    results = settings.validate_environment()
    missing_vars = [var for var, status in results.items() if not status]
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    print("Environment validation successful!")
    return True 