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
from typing import List, Dict, Any, Optional, AsyncGenerator, Callable

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
from functools import lru_cache
from fastapi.responses import StreamingResponse

# SQLAlchemy imports
from sqlalchemy import create_engine, Column, BigInteger, String, DateTime
from sqlalchemy.types import JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Model SDK imports
from openai import OpenAI
import google.generativeai
import httpx
import json
import asyncio

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

# Potentially unused function - to be removed
# def generate_chat_response(chat_history: str, model: str = "gemini-2.5-pro-preview-05-06") -> Dict[str, str]:
#     ...

# Potentially unused function - to be removed
# def generate_reasoning_response(prompt: str) -> Dict[str, str]:
#     ...

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
    messages_history = payload.get("messages", [])
    model_variant = payload.get("model_variant", "normal") # or "reasoner"

    if not messages_history:
        raise HTTPException(status_code=400, detail="No messages provided")

    settings = get_settings()
    # Determine which LLM provider to use based on settings or model_variant
    # For simplicity, using LLM_PROVIDER from settings directly here.
    # You might have more complex logic if model_variant implies a different provider.
    llm_function = llm_provider_actions.get(settings.LLM_PROVIDER)

    if not llm_function:
        print(f"Error: LLM provider '{settings.LLM_PROVIDER}' not found in llm_provider_actions.")
        raise HTTPException(status_code=500, detail=f"Invalid LLM provider configured: {settings.LLM_PROVIDER}")
    
    print(f"[generate_response] Using LLM provider: {settings.LLM_PROVIDER} for chat generation.")

    # Prepare messages for the LLM (current history)
    # System prompts can be added here or handled within the LLM functions if needed
    # For example, if model_variant == "reasoner", prepend a reasoning system prompt.
    current_llm_payload = messages_history
    if model_variant == "reasoner" and settings.LLM_PROVIDER == "deepseek-chat": # Example specific to deepseek reasoner
         current_llm_payload = [
            {"role": "system", "content": "You are a helpful AI assistant. Your goal is to assist the user with their tasks by thinking step by step. Please output your thoughts in <think></think> XML tags and then provide the final answer to the user."},
        ] + messages_history
    elif model_variant == "reasoner": # Generic reasoner prompt if not deepseek
        current_llm_payload = [
            {"role": "system", "content": "Think step-by-step. Use <think></think> tags for your thoughts."},
        ] + messages_history

    try:
        # Call the selected LLM function for a streaming response
        response_generator = await llm_function(
            messages=current_llm_payload, 
            settings=settings, 
            stream=True # Always stream for chat responses
            # max_tokens and temperature can be passed if needed, or use defaults in provider functions
        )

        async def event_stream():
            async for content_part in response_generator:
                if content_part:
                    # For SSE, each part should be prefixed with "data: " and suffixed with "\n\n"
                    # However, FastAPI's StreamingResponse handles this if you yield strings directly.
                    # If the LLM function already formats for SSE, ensure no double formatting.
                    # Here, assuming content_part is just the text content.
                    yield content_part # FastAPI wraps this in "data: ...\n\n" if client accepts text/event-stream
                await asyncio.sleep(0.01) # Small sleep to allow other tasks, adjust as needed
            # Optionally, signal end of stream if your client expects it and LLM doesn't send [DONE]
            # yield "data: [DONE]\n\n" 

        return StreamingResponse(event_stream(), media_type="text/event-stream") # Ensure correct media type
    
    except httpx.HTTPStatusError as e:
        print(f"LLM service HTTP error for provider {settings.LLM_PROVIDER}: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"LLM service error: {e.response.text}")
    except Exception as e:
        print(f"Error generating response from provider {settings.LLM_PROVIDER}: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

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

@app.post("/api/chats/{chat_id}/summarize-title")
async def summarize_chat_title(chat_id: str, db: Session = Depends(get_db)):
    db_chat = db.query(Chat).filter(Chat.chat_id == chat_id).first()
    if not db_chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if not db_chat.messages or len(db_chat.messages) < 1: # Need at least one message to summarize
        raise HTTPException(status_code=400, detail="Not enough messages to summarize title")

    # Prepare messages for the LLM. Format might need adjustment based on LLM.
    # We'll take the first few messages for brevity, or all if they are few.
    # Max 4 messages (2 exchanges) for summary should be enough context.
    messages_for_summary = db_chat.messages[:4] 
    
    formatted_messages_for_llm = []
    for msg in messages_for_summary:
        original_content = msg['content']
        # Strip <think>...</think> blocks for summarization
        content_for_summary = re.sub(r"<think>.*?<\/think>", "", original_content, flags=re.DOTALL).strip()
        # If stripping think blocks results in empty content, skip or use original (though unlikely for user messages)
        if not content_for_summary and msg['role'] == 'user': # Keep original if user message becomes empty
            content_for_summary = original_content
        elif not content_for_summary: # Skip if assistant message becomes empty (or very short)
            continue
        
        formatted_messages_for_llm.append({"role": msg['role'], "content": content_for_summary})

    # Add a system message to guide the LLM
    system_prompt = {
        "role": "system", 
        "content": "Create a short, concise chat title of 1-4 words that summarizes the core topic or purpose of this conversation. The title should be clear, descriptive, and relevant to the main subject being discussed. Do not include any other text, just provide the title text with no quotes or other formatting."
    }
    title_generation_payload = [system_prompt] + formatted_messages_for_llm

    try:
        settings = get_settings()
        
        # Try primary provider first
        primary_provider = settings.LLM_PROVIDER
        fallback_providers = ["deepseek-chat", "openai"] 
        
        # Remove the primary provider from fallbacks if it's already in the list
        if primary_provider in fallback_providers:
            fallback_providers.remove(primary_provider)
            
        # Combine the lists with primary first, then fallbacks
        provider_order = [primary_provider] + fallback_providers
        
        # Try each provider until one succeeds
        new_title_raw = None
        for provider in provider_order:
            llm_function = llm_provider_actions.get(provider)
            if not llm_function:
                print(f"Warning: LLM provider '{provider}' not found in llm_provider_actions, skipping.")
                continue
                
            try:
                print(f"Attempting title generation with provider: {provider}")
                # Call the selected LLM function for summarization (non-streaming)
                new_title_raw = await llm_function(
                    messages=title_generation_payload, 
                    settings=settings, 
                    stream=False, 
                    max_tokens=20,  # Short title
                    temperature=0.5  # Moderately creative but not too random
                )
                
                # If we got a valid title, break the loop
                if isinstance(new_title_raw, str) and new_title_raw.strip():
                    print(f"Successfully generated title with provider: {provider}")
                    break
                else:
                    print(f"Provider {provider} returned empty or invalid title, trying next provider.")
            except Exception as e:
                print(f"Error using provider {provider} for title generation: {e}")
                # Continue to the next provider
                
        # If all providers failed, use a default
        if not new_title_raw or not isinstance(new_title_raw, str) or not new_title_raw.strip():
            print(f"All providers failed to generate a title for chat {chat_id}. Using default.")
            new_title_raw = "New Chat"
        
        # Clean and format the title
        new_title = re.sub(r'[*_`~#]', '', new_title_raw.strip())
        new_title = new_title.replace('"', '').replace("'", "")

        words = new_title.split()
        if len(words) > 5: # If more than 5 words, take the first 5
            new_title = " ".join(words[:5])
        elif len(words) < 1: # If it somehow became empty after split (e.g. all spaces)
            new_title = "New Chat"
        # If 1-5 words, use as is. The prompt asks for 3-5, so this covers it.

        db_chat.title = new_title
        db_chat.updated_at = datetime.datetime.utcnow()
        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)

        return {"chat_id": chat_id, "title": new_title}

    except httpx.HTTPStatusError as e:
        print(f"HTTP error during title summarization LLM call for chat {chat_id}: {e.response.text}")
        # Use a fallback title instead of raising 500 for LLM operational errors
        db_chat.title = "Chat (Title Gen Error)"
        db_chat.updated_at = datetime.datetime.utcnow()
        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)
        # Return a 200 with the fallback title to avoid breaking the client flow, but log the error.
        return {"chat_id": chat_id, "title": db_chat.title, "error": "LLM service error during title generation."}
    except Exception as e:
        print(f"Error summarizing title for chat {chat_id}: {e}")
        # Fallback title if summarization fails critically
        db_chat.title = "Chat (Summary Failed)"
        db_chat.updated_at = datetime.datetime.utcnow()
        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)
        # Return a 200 with the fallback title
        return {"chat_id": chat_id, "title": db_chat.title, "error": f"Failed to summarize chat title: {str(e)}"}

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

# Endpoint for user login
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
    OPENAI_MODEL: str = Field("o4-mini-2025-04-16", description="OpenAI model name")
    OPENAI_TEMPERATURE: float = Field(0.7, description="OpenAI temperature")
    OPENAI_MAX_TOKENS: int = Field(2000, description="OpenAI max tokens")
    OPENAI_EMBEDDING_MODEL: str = Field("text-embedding-ada-002", description="OpenAI embedding model")
    
    # DeepSeek
    DEEPSEEK_API_KEY: str = Field(..., description="DeepSeek API key")
    DEEPSEEK_BASE_URL: str = Field("https://api.deepseek.com", description="DeepSeek base URL")
    
    # Ollama
    OLLAMA_BASE_URL: str = Field("http://localhost:11434", description="Ollama base URL")
    
    # LLM Provider
    LLM_PROVIDER: str = Field("o4-mini-2025-04-16", description="LLM provider selection")

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

@lru_cache()
def get_settings():
    # Loads and validates environment settings
    settings_instance = Settings()
    validation_results = settings_instance.validate_environment() 
    for setting_name, is_valid in validation_results.items():
        if not is_valid:
            print(f"Warning: Environment variable for '{setting_name}' is missing or invalid.")
            raise ValueError(f"Critical environment variable '{setting_name}' is missing or invalid.")
    return settings_instance 

# Make an LLM request
async def _make_llm_request(client: httpx.AsyncClient, url: str, headers: Dict[str, str], payload: Dict[str, Any], stream: bool) -> Any:
    response = await client.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status() # Will raise an exception for 4XX/5XX responses
    if stream:
        # For streaming, the caller will handle the async generator
        return response # Or yield from it if this function becomes an async gen itself
    else:
        return response.json() # For non-streaming, return JSON

async def generate_chat_response_from_messages_deepseek(
    messages: List[Dict[str, Any]], 
    settings: Settings, 
    stream: bool = True, # Control streaming
    max_tokens: Optional[int] = None, 
    temperature: Optional[float] = None
) -> AsyncGenerator[str, None] | str: # Return type depends on stream
    async with httpx.AsyncClient(base_url=settings.DEEPSEEK_BASE_URL, follow_redirects=True) as client:
        api_payload = {
            "model": "deepseek-chat", 
            "messages": messages,
            "max_tokens": max_tokens or settings.OPENAI_MAX_TOKENS, # Using OpenAI as a general default
            "temperature": temperature or settings.OPENAI_TEMPERATURE,
            "stream": stream
        }
        print(f"[DeepSeek] Called with model: {api_payload['model']}")
        headers = {"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        
        response_data = await _make_llm_request(client, "/chat/completions", headers, api_payload, stream)

        if stream:
            async def stream_generator():
                # Assuming response_data is the httpx.Response object for streaming
                buffer = ""
                async for raw_chunk in response_data.aiter_bytes():
                    if not raw_chunk:
                        continue
                    buffer += raw_chunk.decode('utf-8', errors='replace')
                    
                    # Process complete SSE events in the buffer
                    while '\n\n' in buffer:
                        event_end_index = buffer.find('\n\n')
                        event_str = buffer[:event_end_index]
                        buffer = buffer[event_end_index + 2:] # Skip the two newlines
                        
                        content_to_yield = ""
                        for line in event_str.split('\n'):
                            line = line.strip()
                            if line.startswith('data: '):
                                json_str = line[len('data: '):].strip()
                                if json_str == "[DONE]":
                                    yield "" # Signal end of stream if needed, or just return
                                    return
                                try:
                                    json_data = json.loads(json_str)
                                    delta_content = json_data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                                    if delta_content:
                                        content_to_yield += delta_content
                                except json.JSONDecodeError:
                                    # print(f"DeepSeek stream: Skipping non-JSON line: {json_str}")
                                    pass # Ignore malformed JSON or other non-data lines
                        if content_to_yield:
                            yield content_to_yield
                
                # Process any remaining buffer content after stream ends (if any partial event)
                if buffer.strip(): # If there's anything left that wasn't a full event
                    # This part is tricky for SSE; usually, events are complete or not sent.
                    # For simplicity, we'll assume any remaining valid data lines are processed if possible
                    # or ignored if they don't form a complete event.
                    # print(f"DeepSeek stream: Remaining buffer: {buffer}")
                    pass

            return stream_generator()
        else:
            # Non-streaming: response_data is already parsed JSON from _make_llm_request
            return response_data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()

async def generate_chat_response_from_messages_openai(
    messages: List[Dict[str, Any]], 
    settings: Settings, 
    stream: bool = True, 
    max_tokens: Optional[int] = None, 
    temperature: Optional[float] = None
) -> AsyncGenerator[str, None] | str:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    model_name = settings.OPENAI_MODEL
    print(f"[OpenAI] Called with model: {model_name}")

    # OpenAI API expects messages in a specific format, ensure it matches
    # [{ "role": "user", "content": "hello"}, ...]
    # The input `messages` should already be in this format.

    if stream:
        async def stream_generator():
            response_stream = await asyncio.to_thread( # Run blocking SDK call in a thread
                client.chat.completions.create,
                model=model_name,
                messages=messages,
                temperature=temperature or settings.OPENAI_TEMPERATURE,
                max_tokens=max_tokens or settings.OPENAI_MAX_TOKENS,
                stream=True
            )
            for chunk in response_stream:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        return stream_generator()
    else:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model_name,
            messages=messages,
            temperature=temperature or settings.OPENAI_TEMPERATURE,
            max_tokens=max_tokens or settings.OPENAI_MAX_TOKENS,
            stream=False
        )
        return response.choices[0].message.content.strip() if response.choices and response.choices[0].message else ""

async def generate_chat_response_from_messages_gemini(
    messages: List[Dict[str, Any]], 
    settings: Settings, 
    stream: bool = True, 
    max_tokens: Optional[int] = None, 
    temperature: Optional[float] = None
) -> AsyncGenerator[str, None] | str:
    google.generativeai.configure(api_key=settings.GEMINI_API_KEY)
    
    # Extract system message if present
    system_instruction_content = None
    formatted_messages = []
    
    # First pass: find system message
    for msg in messages:
        if msg.get("role") == "system":
            system_instruction_content = msg.get("content")
            break
    
    # Second pass: format remaining messages
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")
        
        if role == "system":
            continue
        elif role == "assistant":
            formatted_messages.append({'role': 'model', 'parts': [content]})
        elif role == "user":
            formatted_messages.append({'role': 'user', 'parts': [content]})
    
    # If we have no messages but have a system instruction, create a user message
    if not formatted_messages and system_instruction_content:
        formatted_messages.append({'role': 'user', 'parts': [f"Please follow these instructions: {system_instruction_content}"]})
    
    # Create the model with system instruction
    model = google.generativeai.GenerativeModel(
        'gemini-2.5-pro-preview-05-06',
        system_instruction=system_instruction_content
    )
    print(f"[Gemini] Called with model: gemini-2.5-pro-preview-05-06")

    generation_config = google.generativeai.types.GenerationConfig(
        candidate_count=1,
        temperature=temperature if temperature is not None else 0.7, # Default Gemini temperature
        max_output_tokens=max_tokens or 2048  # Use provided max_tokens or default
    )

    if stream:
        async def stream_generator():
            try:
                response_stream = await asyncio.to_thread(
                    model.generate_content,
                    formatted_messages,
                    generation_config=generation_config,
                    stream=True
                )
                for chunk in response_stream:
                    if hasattr(chunk, 'text') and chunk.text: # Check if chunk.text exists and is not None/empty
                        yield chunk.text
                    elif not hasattr(chunk, 'text'):
                        print(f"Gemini stream: Chunk without .text encountered: {chunk}")
                        pass
            except Exception as e:
                print(f"Gemini stream error: {e}")
                yield ""
        return stream_generator()
    else:
        try:
            response_object = await asyncio.to_thread(
                model.generate_content,
                formatted_messages,
                generation_config=generation_config,
                stream=False
            )

            if response_object and response_object.candidates:
                candidate = response_object.candidates[0]
                # Check for safety ratings and block reason before trying to access parts
                # Normal finish reasons are STOP or MAX_TOKENS.
                # Others (like SAFETY, OTHER, UNKNOWN, UNCALCULATED) indicate a problem.
                if candidate.finish_reason.name not in ("STOP", "MAX_TOKENS"):
                    print(f"Gemini non-stream: Candidate finished with non-normal reason '{candidate.finish_reason.name}'.")
                    if response_object.prompt_feedback:
                        print(f"Gemini non-stream: Prompt Feedback: {response_object.prompt_feedback}")
                    return "" # Return empty if not a normal finish, triggering fallback in summarizer

                if candidate.content and candidate.content.parts:
                    text_content = "".join(part.text for part in candidate.content.parts if hasattr(part, 'text'))
                    return text_content.strip()
                else:
                    # Candidate exists, but no content.parts (e.g. finish_reason was normal but parts are empty for some reason)
                    print(f"Gemini non-stream: Candidate has no content parts despite normal finish. Candidate: {candidate}")
                    if response_object.prompt_feedback:
                        print(f"Gemini non-stream: Prompt Feedback: {response_object.prompt_feedback}")
                    return ""
            else: # No candidates
                print(f"Gemini non-stream: No candidates found.")
                if response_object and response_object.prompt_feedback: # Check if response_object itself is not None
                    print(f"Gemini non-stream: Prompt Feedback: {response_object.prompt_feedback}")
                return ""
        except Exception as e:
            print(f"Gemini non-stream error: {e}")
            return ""


# Define the llm_provider_actions dictionary
llm_provider_actions: Dict[str, Callable[..., AsyncGenerator[str, None] | str]] = {
    "deepseek-chat": generate_chat_response_from_messages_deepseek,
    "openai": generate_chat_response_from_messages_openai,
    "gemini-2.5-pro-preview-05-06": generate_chat_response_from_messages_gemini,
} 