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
from typing import List, Dict, Any, Optional

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

# Model SDK imports
from openai import OpenAI
import google.generativeai

# PostgresSQL Setup 
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Chat(Base):
    __tablename__ = "chats"
    chat_id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    messages = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

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
    title: Optional[str] = Field(None)
    messages: Optional[List[Dict[str, Any]]] = Field(None)

class UserCreate(BaseModel):
    username: str
    email: EmailStr
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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Dependency
def get_db():
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

def generate_chat_response(chat_history: str, model: str = "gemini-2.5-pro-preview-05-06") -> Dict[str, str]:
    """
    Uses the configured LLM API (DeepSeek, OpenAI, Gemini) to generate a response.
    The 'model' parameter determines which model/API configuration to use.
    """
    api_key = None
    base_url = None
    effective_model = model # Default to gemini-2.5-pro-preview-05-06
    model_variant = model.lower()
    print(f"Generating response using model: {model} (variant for logic: {model_variant}) with {len(chat_history)} history messages.")

    # Prepare messages for API call, ensuring system prompt if necessary
    api_messages = []
    if not chat_history or chat_history[0].get("role") != "system":
        api_messages.append({"role": "system", "content": "You are a helpful assistant."})
    api_messages.extend(chat_history)

    # Determine provider and settings based on model_variant
    if model_variant.startswith("deepseek") or \
       model_variant.startswith("openai-") or \
       model_variant.startswith("gpt-") or \
       model_variant.startswith("o3-") or \
       model_variant.startswith("o1-") or \
       model_variant.startswith("o4-") or \
       model_variant.startswith("ollama-"):

        if model_variant.startswith("deepseek"):
            api_key = settings.DEEPSEEK_API_KEY
            base_url = settings.DEEPSEEK_BASE_URL.rstrip('/') + "/v1"
            effective_model = model_variant 
            print(f"Using DeepSeek: model={effective_model}, base_url={base_url}")
        elif model_variant.startswith("openai-") or model_variant.startswith("gpt-") or model_variant.startswith("o3-") or model_variant.startswith("o1-") or model_variant.startswith("o4-"):
            api_key = settings.OPENAI_API_KEY
            base_url = None 
            if model_variant == "openai-chat": # Specific alias
                effective_model = settings.OPENAI_MODEL
            else:
                effective_model = model_variant
            print(f"Using OpenAI: model={effective_model}")
        elif model_variant.startswith("ollama-"):
            api_key = "ollama"
            base_url = settings.OLLAMA_BASE_URL.rstrip('/') + "/v1"
            effective_model = model_variant.split("ollama-", 1)[1]
            print(f"Using Ollama: model={effective_model}, base_url={base_url}")

        if not api_key and not model_variant.startswith("ollama-"):
            print(f"API key not configured for model variant {model_variant}")
            raise HTTPException(status_code=500, detail=f"API key configuration error for {model_variant}.")

        try:
            if base_url:
                client = OpenAI(api_key=api_key, base_url=base_url)
            else: # OpenAI default
                client = OpenAI(api_key=api_key)
            
            print(f"Attempting API call to model: '{effective_model}' with history.")
            completion = client.chat.completions.create(
                model=effective_model,
                messages=api_messages, # Using full history
                max_tokens=settings.OPENAI_MAX_TOKENS,
                temperature=settings.OPENAI_TEMPERATURE,
                stream=False # Assuming False for now, frontend handles streaming from a non-streaming response
            )
            
            if not completion or not completion.choices:
                print(f"Invalid response from {model_variant} API (model: {effective_model}): {completion}")
                raise HTTPException(status_code=500, detail=f"LLM API ({model_variant}) returned invalid response structure.")
            try:
                message_content = completion.choices[0].message.content
            except AttributeError:
                print(f"Error accessing message content from {model_variant} (model: {effective_model}). Response choice: {completion.choices[0]}")
                raise HTTPException(status_code=500, detail=f"Failed to parse LLM API response content structure from {model_variant}.")
            except Exception as e_parse:
                print(f"Error parsing content from {model_variant} (model: {effective_model}): {str(e_parse)}")
                print(traceback.format_exc())
                raise HTTPException(status_code=500, detail=f"Failed to parse LLM API response content from {model_variant}.")
            
            if message_content is None:
                print(f"Empty (None) content from {model_variant} API (model: {effective_model}).")
                raise HTTPException(status_code=500, detail=f"LLM API ({model_variant}) returned no message content.")
            
            return {"response": message_content.strip()}

        except Exception as e_api_call:
            print(f"Error calling LLM API for {model_variant} (model: {effective_model}): {str(e_api_call)}")
            print(traceback.format_exc())
            if isinstance(e_api_call, HTTPException):
                 raise
            raise HTTPException(status_code=500, detail=f"Failed to call LLM API for {model_variant}: {str(e_api_call)}")

    elif model_variant.startswith("gemini"):
        print(f"Using Gemini: model={model} with {len(chat_history)} history messages.")
        try:
            google.generativeai.configure(api_key=settings.GEMINI_API_KEY)
            system_instruction = None
            processed_chat_history = []
            if chat_history and chat_history[0].get("role") == "system":
                system_instruction = chat_history[0].get("content")
                processed_chat_history = chat_history[1:] # Remove system prompt from history
            else:
                processed_chat_history = chat_history

            # Transform roles for Gemini: 'assistant' -> 'model'
            gemini_history_for_api = []
            for msg in processed_chat_history:
                role = msg.get("role")
                content = msg.get("content")
                if role == "assistant":
                    gemini_history_for_api.append({'role': 'model', 'parts': [{'text': content}]})
                elif role == "user":
                    gemini_history_for_api.append({'role': 'user', 'parts': [{'text': content}]})
                # Other roles (like system if not handled by system_instruction) are ignored for now
            
            gemini_model_instance = google.generativeai.GenerativeModel(
                model_name=model,
                system_instruction=system_instruction
            )
            
            gemini_response = gemini_model_instance.generate_content(gemini_history_for_api)

            if not gemini_response.candidates:
                try: 
                    block_reason = gemini_response.prompt_feedback.block_reason
                    block_message = f"Content blocked by Gemini ({model}) due to: {block_reason}."
                    if gemini_response.prompt_feedback.safety_ratings:
                         block_message += f" Safety ratings: {gemini_response.prompt_feedback.safety_ratings}"
                    print(block_message)
                    raise HTTPException(status_code=400, detail=block_message)
                except (AttributeError, IndexError): 
                    print(f"Gemini API ({model}) returned no candidates. Response: {gemini_response}")
                    raise HTTPException(status_code=500, detail=f"Gemini API ({model}) returned no response or content.")
            
            # Assuming there's at least one candidate and it has content parts
            if not gemini_response.candidates[0].content.parts:
                print(f"Gemini API ({model}) returned no content parts. Candidate: {gemini_response.candidates[0]}")
                raise HTTPException(status_code=500, detail=f"Gemini API ({model}) returned no content parts.")

            message_content = "".join(part.text for part in gemini_response.candidates[0].content.parts if hasattr(part, 'text'))
            
            if not message_content.strip(): # Check if content is empty after stripping whitespace
                print(f"Empty message content received from Gemini API ({model})")
                raise HTTPException(status_code=500, detail=f"Gemini API ({model}) returned an empty response.")

            return {"response": message_content.strip()}

        except ImportError:
            print(f"FATAL: google-generativeai library not installed. Needed for Gemini model: {model}.")
            raise HTTPException(status_code=501, detail=f"Gemini API library not installed on server (model: {model}).")
        except Exception as e_gemini:
            print(f"Error with Gemini API for model {model}: {str(e_gemini)}")
            print(traceback.format_exc())
            if isinstance(e_gemini, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=f"Failed to call Gemini API for model {model}: {str(e_gemini)}")
    else:
        print(f"Warning: Unrecognized model_variant '{model_variant}'. Check configuration or frontend request that led to this model name.")
        raise HTTPException(status_code=400, detail=f"Unsupported or unrecognized model_variant: {model}")
    
    # This line should ideally not be reached if all paths return or raise.
    raise HTTPException(status_code=500, detail="Internal server error in chat generation logic.")


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
    allow_origins=["*"],
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
    conversation_history = payload.get("messages") # Get full history for model context
    if not conversation_history:
        raise HTTPException(status_code=400, detail="Messages (conversation history) are required.")
    
    model_variant_from_payload = payload.get("model_variant", settings.LLM_PROVIDER)

    actual_model_to_use = model_variant_from_payload
    if model_variant_from_payload == "reasoner":
        # Map "reasoner" to "deepseek-reasoner" for now
        actual_model_to_use = "deepseek-reasoner"
        print(f"Info: Frontend requested 'reasoner', mapping to '{actual_model_to_use}'.")
    elif model_variant_from_payload == "normal":
        actual_model_to_use = settings.LLM_PROVIDER
        print(f"Info: Frontend requested 'normal', mapping to '{actual_model_to_use}'.")

    try:
        print(f"Debug - Received conversation history with {len(conversation_history)} messages, using actual model: '{actual_model_to_use}' for API call.")
        result = await run_in_threadpool(generate_chat_response, conversation_history, actual_model_to_use)
            
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate response (empty result).")
        return result
            
    except Exception as httpe:
        raise httpe
    except Exception as e: # Catch any other unexpected errors
        print(f"Unexpected error in /api/generate endpoint: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error in processing your request: {str(e)}"
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
async def update_chat(chat_id: str, chat_update: ChatUpdate, db: Session = Depends(get_db)):
    """
    Endpoint to update a chat's title and/or messages.
    If the chat doesn't exist, it returns 404.
    """
    try:
        db_chat = db.query(Chat).filter(Chat.chat_id == chat_id).first()
        if not db_chat:
            raise HTTPException(status_code=404, detail="Chat not found")

        updated = False
        if chat_update.title is not None: # Check if title is provided
            db_chat.title = chat_update.title
            updated = True
        
        if chat_update.messages is not None: # Check if messages are provided
            db_chat.messages = jsonable_encoder(chat_update.messages) # Ensure messages are properly encoded if they are complex
            updated = True

        if updated:
            db_chat.updated_at = datetime.datetime.utcnow() # Explicitly update timestamp
            db.commit()
            db.refresh(db_chat)
            return {"message": "Chat updated successfully", "chat": jsonable_encoder(db_chat)}
        else:
            return {"message": "No changes provided to update", "chat": jsonable_encoder(db_chat)}

    except HTTPException: # Re-raise HTTPExceptions
        raise
    except Exception as e:
        print(f"Error updating chat {chat_id}:", e)
        print(traceback.format_exc())
        db.rollback() # Rollback in case of other errors during DB operations
        raise HTTPException(status_code=500, detail=f"Error updating chat {chat_id}.")

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
    model_config = SettingsConfigDict(
        env_file='.env',
        extra='ignore'
        )
    
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
        validation_results = {}
        for field_name in self.__class__.model_fields:
            try:
                getattr(self, field_name)
                validation_results[field_name] = True
            except Exception:
                validation_results[field_name] = False
        return validation_results

# Initialize settings
try:
    settings = Settings()
except Exception as e:
    print(f"FATAL: Error initializing settings. Check .env file and Settings model: {e}")
    print(traceback.format_exc())
    raise RuntimeError(f"Failed to initialize application settings: {e}")

# Validate environment on startup
def validate_environment():
    results = settings.validate_environment()
    missing_vars = [var for var, status in results.items() if not status]
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    print("Environment validation successful!")
    return True 