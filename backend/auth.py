import jwt
import datetime
import os

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_secret_key_here")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 30

def create_access_token(data: dict, expires_delta: datetime.timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt 