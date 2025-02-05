import pytest
from server import validate_environment
from pydantic_settings import BaseSettings

def test_environment_variables():
    """Test that all required environment variables are present"""
    try:
        validate_environment()
        assert True
    except ValueError as e:
        pytest.fail(f"Environment validation failed: {str(e)}")

def test_settings_values():
    """Test that environment variables have correct types and values"""
    settings = BaseSettings()
    
    assert isinstance(settings.OPENAI_TEMPERATURE, float)
    assert isinstance(settings.OPENAI_MAX_TOKENS, int)
    assert isinstance(settings.JWT_EXPIRATION_MINUTES, int)
    assert settings.DEEPSEEK_BASE_URL.startswith("http")
    assert settings.OLLAMA_BASE_URL.startswith("http") 