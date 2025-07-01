from app.database.database import engine
from app.database.database import Base
from app.models.user import User
from app.models.chat import Thread, Conversation


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
