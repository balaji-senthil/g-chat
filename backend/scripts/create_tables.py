import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.init_db import init_db
from app.database.database import engine
from app.models.user import User
from app.models.chat import Thread, Conversation


def create_tables():
    print("Creating database tables...")
    init_db()
    print("Database tables created successfully!")


if __name__ == "__main__":
    create_tables()
