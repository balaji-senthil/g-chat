#!/usr/bin/env python3
"""
Migration script to move from local PostgreSQL to Supabase
This script will help you migrate your database schema and data.
"""

import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent / "app"))

from sqlalchemy import create_engine, text
from app.database.database import Base
from app.models.user import User
from app.models.chat import Thread, Conversation


def get_database_engines():
    """Get database engines for both local and Supabase databases."""

    # Local database URL (existing)
    local_db_url = os.getenv(
        "LOCAL_DATABASE_URL",
        "postgresql://dev:bsenpg@localhost:5432/ai_chat_app",
    )

    # Supabase database URL (you need to set this)
    supabase_db_url = os.getenv("SUPABASE_DATABASE_URL")

    if not supabase_db_url:
        print("❌ ERROR: SUPABASE_DATABASE_URL environment variable not set!")
        print("Please set it to your Supabase connection string:")
        print(
            "export SUPABASE_DATABASE_URL='postgresql://postgres:bsen%40PG%40123@db.etomtnjazerepvpuqcut.supabase.co:5432/postgres'"
        )
        sys.exit(1)

    try:
        local_engine = create_engine(local_db_url)
        supabase_engine = create_engine(supabase_db_url)
        return local_engine, supabase_engine
    except Exception as e:
        print(f"❌ Error connecting to databases: {e}")
        sys.exit(1)


def test_connections(local_engine, supabase_engine):
    """Test connections to both databases."""
    print("🔍 Testing database connections...")

    try:
        with local_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Local database connection successful")
    except Exception as e:
        print(f"❌ Local database connection failed: {e}")
        return False

    try:
        with supabase_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Supabase database connection successful")
    except Exception as e:
        print(f"❌ Supabase database connection failed: {e}")
        return False

    return True


def create_schema_on_supabase(supabase_engine):
    """Create the database schema on Supabase."""
    print("🏗️  Creating database schema on Supabase...")

    try:
        # Create all tables
        Base.metadata.create_all(bind=supabase_engine)
        print("✅ Database schema created successfully on Supabase")
        return True
    except Exception as e:
        print(f"❌ Error creating schema: {e}")
        return False


def migrate_data(local_engine, supabase_engine):
    """Migrate data from local to Supabase."""
    print("📦 Migrating data from local to Supabase...")

    from sqlalchemy.orm import sessionmaker

    LocalSession = sessionmaker(bind=local_engine)
    SupabaseSession = sessionmaker(bind=supabase_engine)

    local_session = LocalSession()
    supabase_session = SupabaseSession()

    try:
        # Migrate users
        print("  📄 Migrating users...")
        users = local_session.query(User).all()
        for user in users:
            # Check if user already exists
            existing = supabase_session.query(User).filter_by(id=user.id).first()
            if not existing:
                supabase_session.merge(user)
        supabase_session.commit()
        print(f"  ✅ Migrated {len(users)} users")

        # Migrate threads
        print("  📄 Migrating threads...")
        threads = local_session.query(Thread).all()
        for thread in threads:
            existing = supabase_session.query(Thread).filter_by(id=thread.id).first()
            if not existing:
                supabase_session.merge(thread)
        supabase_session.commit()
        print(f"  ✅ Migrated {len(threads)} threads")

        # Migrate conversations
        print("  📄 Migrating conversations...")
        conversations = local_session.query(Conversation).all()
        for conversation in conversations:
            existing = (
                supabase_session.query(Conversation)
                .filter_by(id=conversation.id)
                .first()
            )
            if not existing:
                supabase_session.merge(conversation)
        supabase_session.commit()
        print(f"  ✅ Migrated {len(conversations)} conversations")

        print("✅ Data migration completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Error during data migration: {e}")
        supabase_session.rollback()
        return False
    finally:
        local_session.close()
        supabase_session.close()


def verify_migration(local_engine, supabase_engine):
    """Verify that the migration was successful."""
    print("🔍 Verifying migration...")

    from sqlalchemy.orm import sessionmaker

    LocalSession = sessionmaker(bind=local_engine)
    SupabaseSession = sessionmaker(bind=supabase_engine)

    local_session = LocalSession()
    supabase_session = SupabaseSession()

    try:
        # Count records in each table
        local_users = local_session.query(User).count()
        local_threads = local_session.query(Thread).count()
        local_conversations = local_session.query(Conversation).count()

        supabase_users = supabase_session.query(User).count()
        supabase_threads = supabase_session.query(Thread).count()
        supabase_conversations = supabase_session.query(Conversation).count()

        print(f"📊 Migration Verification:")
        print(f"  Users: Local {local_users} → Supabase {supabase_users}")
        print(f"  Threads: Local {local_threads} → Supabase {supabase_threads}")
        print(
            f"  Conversations: Local {local_conversations} → Supabase {supabase_conversations}"
        )

        if (
            local_users == supabase_users
            and local_threads == supabase_threads
            and local_conversations == supabase_conversations
        ):
            print("✅ Migration verification successful!")
            return True
        else:
            print("⚠️  Record counts don't match. Please investigate.")
            return False

    except Exception as e:
        print(f"❌ Error during verification: {e}")
        return False
    finally:
        local_session.close()
        supabase_session.close()


def main():
    """Main migration function."""
    print("🚀 Starting migration from local PostgreSQL to Supabase")
    print("=" * 60)

    # Get database engines
    local_engine, supabase_engine = get_database_engines()

    # Test connections
    if not test_connections(local_engine, supabase_engine):
        sys.exit(1)

    # Create schema on Supabase
    if not create_schema_on_supabase(supabase_engine):
        sys.exit(1)

    # Migrate data
    if not migrate_data(local_engine, supabase_engine):
        sys.exit(1)

    # Verify migration
    if not verify_migration(local_engine, supabase_engine):
        sys.exit(1)

    print("=" * 60)
    print("🎉 Migration completed successfully!")
    print("\nNext steps:")
    print("1. Update your .env file to use the Supabase DATABASE_URL")
    print("2. Test your application with the new database")
    print("3. Update your deployment configuration if needed")


if __name__ == "__main__":
    main()
