import os
import pytest
import tempfile
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import jwt
from pathlib import Path

# Import the FastAPI app from app.main instead of main
from app.main import (
    app,
    get_password_hash,
    verify_password,
    users,
    user_by_email,
    uploaded_files,
)
from app.models.base import UserInDB  # Add import for UserInDB

# Create a test client
client = TestClient(app)

# Test user data
TEST_USER = {
    "email": "test@example.com",
    "name": "Test User",
    "password": "Password123!",
}

TEST_USER_2 = {
    "email": "test2@example.com",
    "name": "Another Test User",
    "password": "Password456!",
}

# Test file data for upload tests
TEST_FILE_CONTENT = b"This is test file content"
TEST_FILENAME = "test_file.txt"

# Mock response for Gemini AI
MOCK_AI_RESPONSE = MagicMock()
MOCK_AI_RESPONSE.text = "This is a mock AI response"


# Fixtures for test setup and teardown
@pytest.fixture(autouse=True)
def setup_and_teardown():
    """Setup and teardown for each test"""
    # Clear users, threads and uploaded files before each test
    users.clear()
    user_by_email.clear()
    uploaded_files.clear()

    # Also clear threads dictionary
    from app.main import threads, thread_messages

    threads.clear()
    thread_messages.clear()

    # Create uploads directory if it doesn't exist
    os.makedirs("uploads", exist_ok=True)

    # Run the test
    yield

    # Clean up any uploaded files
    for filename in os.listdir("uploads"):
        file_path = os.path.join("uploads", filename)
        if os.path.isfile(file_path):
            os.remove(file_path)


@pytest.fixture
def authenticated_client():
    """Create a test client with an authenticated user"""
    # Register a user
    register_response = client.post("/api/auth/register", json=TEST_USER)
    assert register_response.status_code == 200

    # Login to get token
    login_data = {"username": TEST_USER["email"], "password": TEST_USER["password"]}
    response = client.post("/api/auth/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Create a client with authentication headers
    auth_client = TestClient(app)
    auth_client.headers = {"Authorization": f"Bearer {token}"}

    return auth_client


@pytest.fixture
def mock_gemini():
    """Mock the Gemini AI model responses"""
    with patch("google.generativeai.GenerativeModel") as mock_model_class:
        mock_model_instance = MagicMock()
        mock_model_class.return_value = mock_model_instance

        mock_chat_session = MagicMock()
        mock_model_instance.start_chat.return_value = mock_chat_session
        mock_chat_session.send_message.return_value = MOCK_AI_RESPONSE

        yield mock_model_instance


@pytest.fixture
def test_file():
    """Create a temporary test file for upload tests"""
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(TEST_FILE_CONTENT)
        tmp.flush()
        yield {"file_path": tmp.name, "file_name": TEST_FILENAME}
    # Clean up the temporary file
    if os.path.exists(tmp.name):
        os.remove(tmp.name)


# Authentication Tests
class TestAuthentication:
    def test_register_user(self):
        """Test user registration endpoint"""
        response = client.post("/api/auth/register", json=TEST_USER)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER["email"]
        assert data["name"] == TEST_USER["name"]
        assert "user_id" in data

    def test_register_duplicate_email(self):
        """Test registering with an email that already exists"""
        # Register first user
        client.post("/api/auth/register", json=TEST_USER)

        # Try to register with same email
        response = client.post("/api/auth/register", json=TEST_USER)
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_login(self):
        """Test login endpoint"""
        # Register a user first
        client.post("/api/auth/register", json=TEST_USER)

        # Login
        login_data = {"username": TEST_USER["email"], "password": TEST_USER["password"]}
        response = client.post("/api/auth/token", data=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_at" in data

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        # Register a user first
        client.post("/api/auth/register", json=TEST_USER)

        # Login with wrong password
        login_data = {"username": TEST_USER["email"], "password": "wrong_password"}
        response = client.post("/api/auth/token", data=login_data)
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_get_current_user(self, authenticated_client):
        """Test getting current user info"""
        response = authenticated_client.get("/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER["email"]
        assert data["name"] == TEST_USER["name"]

    def test_access_protected_route_without_token(self):
        """Test accessing a protected route without authentication"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "test_password"
        hashed = get_password_hash(password)
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False


# Chat Tests
class TestChat:
    def test_chat_endpoint(self, authenticated_client, mock_gemini):
        """Test the main chat endpoint"""
        chat_data = {
            "messages": [{"role": "user", "content": "Hello, AI!"}],
            "model": "gemini-2.0-flash",
            "stream": False,
        }
        response = authenticated_client.post("/api/chat", json=chat_data)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "assistant"
        assert data["content"] == MOCK_AI_RESPONSE.text

    def test_chat_thread_creation(self, authenticated_client, mock_gemini):
        """Test creating a new thread via the chat endpoint"""
        chat_data = {
            "messages": [{"role": "user", "content": "Create a new thread"}],
            "model": "gemini-2.0-flash",
            "thread_id": None,
            "stream": False,
            "file_ids": [],
        }
        response = authenticated_client.post("/api/chat/thread", json=chat_data)
        assert response.status_code == 200
        data = response.json()
        assert "thread_id" in data
        assert data["content"] == MOCK_AI_RESPONSE.text

    def test_chat_in_existing_thread(self, authenticated_client, mock_gemini):
        """Test sending a message in an existing thread"""
        # First create a thread
        thread_data = {"title": "Test Thread"}
        thread_response = authenticated_client.post("/api/threads", json=thread_data)
        thread_id = thread_response.json()["thread_id"]

        # Send a message in the thread
        chat_data = {
            "messages": [{"role": "user", "content": "Message in existing thread"}],
            "model": "gemini-2.0-flash",
            "thread_id": thread_id,
            "stream": False,
            "file_ids": [],
        }
        response = authenticated_client.post("/api/chat/thread", json=chat_data)
        assert response.status_code == 200
        data = response.json()
        assert data["thread_id"] == thread_id
        assert data["content"] == MOCK_AI_RESPONSE.text

        # Check that the message was added to the thread
        messages_response = authenticated_client.get(
            f"/api/threads/{thread_id}/messages"
        )
        assert messages_response.status_code == 200
        messages = messages_response.json()
        assert len(messages) == 2  # User message and AI response
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "Message in existing thread"
        assert messages[1]["role"] == "assistant"


# Thread Management Tests
class TestThreadManagement:
    def test_create_thread(self, authenticated_client):
        """Test creating a thread"""
        thread_data = {"title": "Test Thread"}
        response = authenticated_client.post("/api/threads", json=thread_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Thread"
        assert "thread_id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_list_threads(self, authenticated_client):
        """Test listing all threads"""
        # Create two threads
        thread1 = {"title": "Thread 1"}
        thread2 = {"title": "Thread 2"}
        authenticated_client.post("/api/threads", json=thread1)
        authenticated_client.post("/api/threads", json=thread2)

        # List the threads
        response = authenticated_client.get("/api/threads")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        titles = [thread["title"] for thread in data]
        assert "Thread 1" in titles
        assert "Thread 2" in titles

    def test_get_thread(self, authenticated_client):
        """Test getting a specific thread"""
        # Create a thread
        thread_data = {"title": "Specific Thread"}
        create_response = authenticated_client.post("/api/threads", json=thread_data)
        thread_id = create_response.json()["thread_id"]

        # Get the thread
        response = authenticated_client.get(f"/api/threads/{thread_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Specific Thread"
        assert data["thread_id"] == thread_id

    def test_update_thread(self, authenticated_client):
        """Test updating a thread"""
        # Create a thread
        thread_data = {"title": "Original Title"}
        create_response = authenticated_client.post("/api/threads", json=thread_data)
        thread_id = create_response.json()["thread_id"]

        # Update the thread
        update_data = {"title": "Updated Title"}
        response = authenticated_client.put(
            f"/api/threads/{thread_id}", json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["thread_id"] == thread_id

    def test_delete_thread(self, authenticated_client):
        """Test deleting a thread"""
        # Create a thread
        thread_data = {"title": "Thread to Delete"}
        create_response = authenticated_client.post("/api/threads", json=thread_data)
        thread_id = create_response.json()["thread_id"]

        # Delete the thread
        response = authenticated_client.delete(f"/api/threads/{thread_id}")
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

        # Verify thread is deleted
        get_response = authenticated_client.get(f"/api/threads/{thread_id}")
        assert get_response.status_code == 404

    def test_get_thread_messages(self, authenticated_client, mock_gemini):
        """Test getting messages from a thread"""
        # Create a thread
        thread_data = {"title": "Message Thread"}
        create_response = authenticated_client.post("/api/threads", json=thread_data)
        thread_id = create_response.json()["thread_id"]

        # Send a message in the thread
        chat_data = {
            "messages": [{"role": "user", "content": "Test message"}],
            "model": "gemini-2.0-flash",
            "thread_id": thread_id,
            "stream": False,
        }
        authenticated_client.post("/api/chat/thread", json=chat_data)

        # Get the messages
        response = authenticated_client.get(f"/api/threads/{thread_id}/messages")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # User message and AI response
        assert data[0]["content"] == "Test message"
        assert data[0]["role"] == "user"
        assert data[1]["role"] == "assistant"


# File Upload Tests
class TestFileUpload:
    def test_upload_file(self, authenticated_client, test_file):
        """Test uploading a file"""
        with open(test_file["file_path"], "rb") as f:
            files = {"file": (test_file["file_name"], f, "text/plain")}
            response = authenticated_client.post("/api/upload", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == test_file["file_name"]
        assert "file_id" in data
        assert data["content_type"] == "text/plain"

    def test_list_files(self, authenticated_client, test_file):
        """Test listing uploaded files"""
        # Upload a file first
        with open(test_file["file_path"], "rb") as f:
            files = {"file": (test_file["file_name"], f, "text/plain")}
            authenticated_client.post("/api/upload", files=files)

        # List the files
        response = authenticated_client.get("/api/files")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["filename"] == test_file["file_name"]

    def test_get_file_info(self, authenticated_client, test_file):
        """Test getting file information"""
        # Upload a file first
        with open(test_file["file_path"], "rb") as f:
            files = {"file": (test_file["file_name"], f, "text/plain")}
            upload_response = authenticated_client.post("/api/upload", files=files)

        file_id = upload_response.json()["file_id"]

        # Get file info
        response = authenticated_client.get(f"/api/files/{file_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == test_file["file_name"]
        assert data["file_id"] == file_id

    def test_delete_file(self, authenticated_client, test_file):
        """Test deleting a file"""
        # Upload a file first
        with open(test_file["file_path"], "rb") as f:
            files = {"file": (test_file["file_name"], f, "text/plain")}
            upload_response = authenticated_client.post("/api/upload", files=files)

        file_id = upload_response.json()["file_id"]

        # Delete the file
        response = authenticated_client.delete(f"/api/files/{file_id}")
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

        # Verify file is deleted
        get_response = authenticated_client.get(f"/api/files/{file_id}")
        assert get_response.status_code == 404

    def test_upload_invalid_file_type(self, authenticated_client):
        """Test uploading a file with invalid extension"""
        # Create a temporary file with invalid extension
        with tempfile.NamedTemporaryFile(suffix=".invalid") as tmp:
            tmp.write(b"Invalid file content")
            tmp.flush()

            with open(tmp.name, "rb") as f:
                files = {"file": ("invalid_file.invalid", f, "text/plain")}
                response = authenticated_client.post("/api/upload", files=files)

            assert response.status_code == 400
            assert "File type not allowed" in response.json()["detail"]


# Rate Limiting Tests
class TestRateLimiting:
    def test_get_rate_limits(self, authenticated_client):
        """Test getting rate limit status"""
        response = authenticated_client.get("/api/rate-limits")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "tokens" in data
        assert "limit" in data["requests"]
        assert "used" in data["requests"]
        assert "remaining" in data["requests"]


# Model Tests
class TestModels:
    def test_get_models(self):
        """Test getting available models"""
        response = client.get("/api/models")
        assert response.status_code == 200
        data = response.json()
        assert "gemini-2.0-flash" in data
        assert "name" in data["gemini-2.0-flash"]
        assert "description" in data["gemini-2.0-flash"]


# Helper Functions Tests
class TestHelperFunctions:
    def test_password_hashing_and_verification(self):
        """Test password hashing and verification functions"""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        # Hash should be different from original
        assert hashed != password

        # Verification should work
        assert verify_password(password, hashed) is True

        # Wrong password should fail
        assert verify_password("WrongPassword", hashed) is False


if __name__ == "__main__":
    pytest.main(["-xvs", "test_main.py"])
