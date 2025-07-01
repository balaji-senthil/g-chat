"""
Main entry point for the FastAPI application.
This file serves as the entry point for running the application.
"""

from app.main import app

if __name__ == "__main__":
    import uvicorn
    from app.config.settings import HOST, PORT, DEBUG

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=DEBUG)
