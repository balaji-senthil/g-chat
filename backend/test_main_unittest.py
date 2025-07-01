import os
import tempfile
import json
import unittest
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
from app.threads.thread_service import threads, thread_messages

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


class BaseTestCase(unittest.TestCase):
    """Base test case that handles setup and teardown for all tests"""

    def setUp(self):
        """Setup before each test"""
        # Clear users, threads and uploaded files before each test
        users.clear()
        user_by_email.clear()
        uploaded_files.clear()
        threads.clear()
        thread_messages.clear()

        # Create uploads directory if it doesn't exist
        os.makedirs("uploads", exist_ok=True)

    def tearDown(self):
        """Clean up after each test"""
        # Clean up any uploaded files
        for filename in os.listdir("uploads"):
            file_path = os.path.join("uploads", filename)
            if os.path.isfile(file_path):
                os.remove(file_path)

    def authenticate_client(self):
        """Create an authenticated client and return it"""
        # Register a user
        register_response = client.post("/api/auth/register", json=TEST_USER)
        self.assertEqual(register_response.status_code, 200)

        # Login to get token
        login_data = {"username": TEST_USER["email"], "password": TEST_USER["password"]}
        response = client.post("/api/auth/token", data=login_data)
        self.assertEqual(response.status_code, 200)
        token = response.json()["access_token"]

        # Set authentication headers
        headers = {"Authorization": f"Bearer {token}"}
        return headers


class TestAuthentication(BaseTestCase):
    """Test authentication related endpoints"""

    def test_register_user(self):
        """Test user registration endpoint"""
        response = client.post("/api/auth/register", json=TEST_USER)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], TEST_USER["email"])
        self.assertEqual(data["name"], TEST_USER["name"])
        self.assertIn("user_id", data)

    def test_register_duplicate_email(self):
        """Test registering with an email that already exists"""
        # Register first user
        client.post("/api/auth/register", json=TEST_USER)

        # Try to register with same email
        response = client.post("/api/auth/register", json=TEST_USER)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Email already registered", response.json()["detail"])

    def test_login(self):
        """Test login endpoint"""
        # Register a user first
        client.post("/api/auth/register", json=TEST_USER)

        # Login
        login_data = {"username": TEST_USER["email"], "password": TEST_USER["password"]}
        response = client.post("/api/auth/token", data=login_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertIn("expires_at", data)

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        # Register a user first
        client.post("/api/auth/register", json=TEST_USER)

        # Login with wrong password
        login_data = {"username": TEST_USER["email"], "password": "wrong_password"}
        response = client.post("/api/auth/token", data=login_data)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Incorrect email or password", response.json()["detail"])

    def test_get_current_user(self):
        """Test getting current user info"""
        headers = self.authenticate_client()
        response = client.get("/api/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], TEST_USER["email"])
        self.assertEqual(data["name"], TEST_USER["name"])

    def test_access_protected_route_without_token(self):
        """Test accessing a protected route without authentication"""
        response = client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)
        self.assertIn("Not authenticated", response.json()["detail"])

    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "test_password"
        hashed = get_password_hash(password)
        self.assertNotEqual(hashed, password)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("wrong_password", hashed))


class TestChat(BaseTestCase):
    """Test chat related endpoints"""

    @patch("google.generativeai.GenerativeModel")
    def test_chat_endpoint(self, mock_model_class):
        """Test the main chat endpoint"""
        # Setup mock
        mock_model_instance = MagicMock()
        mock_model_class.return_value = mock_model_instance
        mock_chat_session = MagicMock()
        mock_model_instance.start_chat.return_value = mock_chat_session
        mock_chat_session.send_message.return_value = MOCK_AI_RESPONSE

        # Authenticate
        headers = self.authenticate_client()

        # Send chat request
        chat_data = {
            "messages": [{"role": "user", "content": "Hello, AI!"}],
            "model": "gemini-2.0-flash",
            "stream": False,
        }
        response = client.post("/api/chat", json=chat_data, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["role"], "assistant")
        self.assertEqual(data["content"], MOCK_AI_RESPONSE.text)

    @patch("google.generativeai.GenerativeModel")
    def test_chat_thread_creation(self, mock_model_class):
        """Test creating a new thread via the chat endpoint"""
        # Setup mock
        mock_model_instance = MagicMock()
        mock_model_class.return_value = mock_model_instance
        mock_chat_session = MagicMock()
        mock_model_instance.start_chat.return_value = mock_chat_session
        mock_chat_session.send_message.return_value = MOCK_AI_RESPONSE

        # Authenticate
        headers = self.authenticate_client()

        chat_data = {
            "messages": [{"role": "user", "content": "Create a new thread"}],
            "model": "gemini-2.0-flash",
            "thread_id": None,
            "stream": False,
            "file_ids": [],
        }
        response = client.post("/api/chat/thread", json=chat_data, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("thread_id", data)
        self.assertEqual(data["content"], MOCK_AI_RESPONSE.text)

    @patch("google.generativeai.GenerativeModel")
    def test_chat_in_existing_thread(self, mock_model_class):
        """Test sending a message in an existing thread"""
        # Setup mock
        mock_model_instance = MagicMock()
        mock_model_class.return_value = mock_model_instance
        mock_chat_session = MagicMock()
        mock_model_instance.start_chat.return_value = mock_chat_session
        mock_chat_session.send_message.return_value = MOCK_AI_RESPONSE

        # Authenticate
        headers = self.authenticate_client()

        # First create a thread
        thread_data = {"title": "Test Thread"}
        thread_response = client.post("/api/threads", json=thread_data, headers=headers)
        thread_id = thread_response.json()["thread_id"]

        # Send a message in the thread
        chat_data = {
            "messages": [{"role": "user", "content": "Message in existing thread"}],
            "model": "gemini-2.0-flash",
            "thread_id": thread_id,
            "stream": False,
            "file_ids": [],
        }
        response = client.post("/api/chat/thread", json=chat_data, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["thread_id"], thread_id)
        self.assertEqual(data["content"], MOCK_AI_RESPONSE.text)

        # Check that the message was added to the thread
        messages_response = client.get(
            f"/api/threads/{thread_id}/messages", headers=headers
        )
        self.assertEqual(messages_response.status_code, 200)
        messages = messages_response.json()
        self.assertEqual(len(messages), 2)  # User message and AI response
        self.assertEqual(messages[0]["role"], "user")
        self.assertEqual(messages[0]["content"], "Message in existing thread")
        self.assertEqual(messages[1]["role"], "assistant")


class TestThreadManagement(BaseTestCase):
    """Test thread management endpoints"""

    def test_create_thread(self):
        """Test creating a thread"""
        headers = self.authenticate_client()
        thread_data = {"title": "Test Thread"}
        response = client.post("/api/threads", json=thread_data, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["title"], "Test Thread")
        self.assertIn("thread_id", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

    def test_list_threads(self):
        """Test listing all threads"""
        headers = self.authenticate_client()

        # Create two threads
        thread1 = {"title": "Thread 1"}
        thread2 = {"title": "Thread 2"}
        client.post("/api/threads", json=thread1, headers=headers)
        client.post("/api/threads", json=thread2, headers=headers)

        # List the threads
        response = client.get("/api/threads", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        titles = [thread["title"] for thread in data]
        self.assertIn("Thread 1", titles)
        self.assertIn("Thread 2", titles)

    def test_get_thread(self):
        """Test getting a specific thread"""
        headers = self.authenticate_client()

        # Create a thread
        thread_data = {"title": "Specific Thread"}
        create_response = client.post("/api/threads", json=thread_data, headers=headers)
        thread_id = create_response.json()["thread_id"]

        # Get the thread
        response = client.get(f"/api/threads/{thread_id}", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["title"], "Specific Thread")
        self.assertEqual(data["thread_id"], thread_id)

    def test_update_thread(self):
        """Test updating a thread"""
        headers = self.authenticate_client()

        # Create a thread
        thread_data = {"title": "Original Title"}
        create_response = client.post("/api/threads", json=thread_data, headers=headers)
        thread_id = create_response.json()["thread_id"]

        # Update the thread
        update_data = {"title": "Updated Title"}
        response = client.put(
            f"/api/threads/{thread_id}", json=update_data, headers=headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["title"], "Updated Title")
        self.assertEqual(data["thread_id"], thread_id)

    def test_delete_thread(self):
        """Test deleting a thread"""
        headers = self.authenticate_client()

        # Create a thread
        thread_data = {"title": "Thread to Delete"}
        create_response = client.post("/api/threads", json=thread_data, headers=headers)
        thread_id = create_response.json()["thread_id"]

        # Delete the thread
        response = client.delete(f"/api/threads/{thread_id}", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn("deleted successfully", response.json()["message"])

        # Verify thread is deleted
        get_response = client.get(f"/api/threads/{thread_id}", headers=headers)
        self.assertEqual(get_response.status_code, 404)

    @patch("google.generativeai.GenerativeModel")
    def test_get_thread_messages(self, mock_model_class):
        """Test getting messages from a thread"""
        # Setup mock
        mock_model_instance = MagicMock()
        mock_model_class.return_value = mock_model_instance
        mock_chat_session = MagicMock()
        mock_model_instance.start_chat.return_value = mock_chat_session
        mock_chat_session.send_message.return_value = MOCK_AI_RESPONSE

        headers = self.authenticate_client()

        # Create a thread
        thread_data = {"title": "Message Thread"}
        create_response = client.post("/api/threads", json=thread_data, headers=headers)
        thread_id = create_response.json()["thread_id"]

        # Send a message in the thread
        chat_data = {
            "messages": [{"role": "user", "content": "Test message"}],
            "model": "gemini-2.0-flash",
            "thread_id": thread_id,
            "stream": False,
        }
        client.post("/api/chat/thread", json=chat_data, headers=headers)

        # Get the messages
        response = client.get(f"/api/threads/{thread_id}/messages", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)  # User message and AI response
        self.assertEqual(data[0]["content"], "Test message")
        self.assertEqual(data[0]["role"], "user")
        self.assertEqual(data[1]["role"], "assistant")


class TestFileUpload(BaseTestCase):
    """Test file upload endpoints"""

    def test_upload_file(self):
        """Test uploading a file"""
        headers = self.authenticate_client()

        # Create a temporary test file
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(TEST_FILE_CONTENT)
            tmp.flush()

            with open(tmp.name, "rb") as f:
                files = {"file": (TEST_FILENAME, f, "text/plain")}
                response = client.post("/api/upload", files=files, headers=headers)

        # Clean up the temporary file
        os.remove(tmp.name)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["filename"], TEST_FILENAME)
        self.assertIn("file_id", data)
        self.assertEqual(data["content_type"], "text/plain")

    def test_list_files(self):
        """Test listing uploaded files"""
        headers = self.authenticate_client()

        # Upload a file first
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(TEST_FILE_CONTENT)
            tmp.flush()

            with open(tmp.name, "rb") as f:
                files = {"file": (TEST_FILENAME, f, "text/plain")}
                client.post("/api/upload", files=files, headers=headers)

        # Clean up the temporary file
        os.remove(tmp.name)

        # List the files
        response = client.get("/api/files", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["filename"], TEST_FILENAME)

    def test_get_file_info(self):
        """Test getting file information"""
        headers = self.authenticate_client()

        # Upload a file first
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(TEST_FILE_CONTENT)
            tmp.flush()

            with open(tmp.name, "rb") as f:
                files = {"file": (TEST_FILENAME, f, "text/plain")}
                upload_response = client.post(
                    "/api/upload", files=files, headers=headers
                )

        # Clean up the temporary file
        os.remove(tmp.name)

        file_id = upload_response.json()["file_id"]

        # Get file info
        response = client.get(f"/api/files/{file_id}", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["filename"], TEST_FILENAME)
        self.assertEqual(data["file_id"], file_id)

    def test_delete_file(self):
        """Test deleting a file"""
        headers = self.authenticate_client()

        # Upload a file first
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(TEST_FILE_CONTENT)
            tmp.flush()

            with open(tmp.name, "rb") as f:
                files = {"file": (TEST_FILENAME, f, "text/plain")}
                upload_response = client.post(
                    "/api/upload", files=files, headers=headers
                )

        # Clean up the temporary file
        os.remove(tmp.name)

        file_id = upload_response.json()["file_id"]

        # Delete the file
        response = client.delete(f"/api/files/{file_id}", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn("deleted successfully", response.json()["message"])

        # Verify file is deleted
        get_response = client.get(f"/api/files/{file_id}", headers=headers)
        self.assertEqual(get_response.status_code, 404)

    def test_upload_invalid_file_type(self):
        """Test uploading a file with invalid extension"""
        headers = self.authenticate_client()

        # Create a temporary file with invalid extension
        with tempfile.NamedTemporaryFile(suffix=".invalid", delete=False) as tmp:
            tmp.write(b"Invalid file content")
            tmp.flush()

            with open(tmp.name, "rb") as f:
                files = {"file": ("invalid_file.invalid", f, "text/plain")}
                response = client.post("/api/upload", files=files, headers=headers)

        # Clean up the temporary file
        os.remove(tmp.name)

        self.assertEqual(response.status_code, 400)
        self.assertIn("File type not allowed", response.json()["detail"])


class TestRateLimiting(BaseTestCase):
    """Test rate limiting endpoints"""

    def test_get_rate_limits(self):
        """Test getting rate limit status"""
        headers = self.authenticate_client()
        response = client.get("/api/rate-limits", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("requests", data)
        self.assertIn("tokens", data)
        self.assertIn("limit", data["requests"])
        self.assertIn("used", data["requests"])
        self.assertIn("remaining", data["requests"])


class TestModels(BaseTestCase):
    """Test model endpoints"""

    def test_get_models(self):
        """Test getting available models"""
        response = client.get("/api/models")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("gemini-2.0-flash", data)
        self.assertIn("name", data["gemini-2.0-flash"])
        self.assertIn("description", data["gemini-2.0-flash"])


class TestHelperFunctions(BaseTestCase):
    """Test helper functions"""

    def test_password_hashing_and_verification(self):
        """Test password hashing and verification functions"""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        # Hash should be different from original
        self.assertNotEqual(hashed, password)

        # Verification should work
        self.assertTrue(verify_password(password, hashed))

        # Wrong password should fail
        self.assertFalse(verify_password("WrongPassword", hashed))


if __name__ == "__main__":
    unittest.main()
