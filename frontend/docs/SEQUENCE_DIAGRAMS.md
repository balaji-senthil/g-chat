# API Sequence Diagrams

Below are sequence diagrams for each implemented API route, showing the flow from frontend to backend and database/AI as appropriate.

---

## Authentication

### `/api/auth/register` (User Registration)
```mermaid
sequenceDiagram
    participant User
    participant RegisterForm (React)
    participant BackendAPI (POST /api/auth/register)
    participant Database

    User->>RegisterForm: Fill registration form & submit
    RegisterForm->>BackendAPI: POST /api/auth/register {email, password, ...}
    BackendAPI->>Database: Check if email exists
    Database-->>BackendAPI: Email not found
    BackendAPI->>Database: Create new user
    Database-->>BackendAPI: User created
    BackendAPI-->>RegisterForm: Return user info (no password)
    RegisterForm-->>User: Redirect to login or chat
```

### `/api/auth/token` (Login)
```mermaid
sequenceDiagram
    participant User
    participant LoginForm (React)
    participant BackendAPI (POST /api/auth/token)
    participant Database

    User->>LoginForm: Enter email & password, submit
    LoginForm->>BackendAPI: POST /api/auth/token {email, password}
    BackendAPI->>Database: Fetch user by email
    Database-->>BackendAPI: Return user record
    BackendAPI->>BackendAPI: Verify password
    BackendAPI->>BackendAPI: Generate JWT token
    BackendAPI-->>LoginForm: Return JWT token
    LoginForm-->>User: Store token, redirect to chat
```

### `/api/auth/me` (Get Current User)
```mermaid
sequenceDiagram
    participant Frontend
    participant BackendAPI (GET /api/auth/me)
    participant Database

    Frontend->>BackendAPI: GET /api/auth/me (with JWT)
    BackendAPI->>Database: Fetch user by token
    Database-->>BackendAPI: Return user info
    BackendAPI-->>Frontend: Return user info
```

---

## Chat

### `/api/chat` (Send Message)
```mermaid
sequenceDiagram
    participant User
    participant InputArea (React)
    participant ChatContext (React)
    participant BackendAPI (POST /api/chat)
    participant AIModel (Gemini/OpenAI)
    participant Database
    participant ChatWindow (React)

    User->>InputArea: Type message & send
    InputArea->>ChatContext: sendMessage()
    ChatContext->>BackendAPI: POST /api/chat {messages, model, ...}
    BackendAPI->>Database: Save user message
    BackendAPI->>AIModel: Send message context
    AIModel-->>BackendAPI: Return AI response
    BackendAPI->>Database: Save AI response
    BackendAPI-->>ChatContext: Return {userMsg, aiMsg}
    ChatContext-->>ChatWindow: Update messages
    ChatWindow-->>User: Display chat
```

### `/api/chat/thread` (Chat with Thread Context)
```mermaid
sequenceDiagram
    participant User
    participant InputArea (React)
    participant ChatContext (React)
    participant BackendAPI (POST /api/chat/thread)
    participant ThreadService
    participant AIModel (Gemini/OpenAI)
    participant Database
    participant ChatWindow (React)

    User->>InputArea: Type message & send
    InputArea->>ChatContext: sendMessageToThread()
    ChatContext->>BackendAPI: POST /api/chat/thread {message, thread_id, ...}
    BackendAPI->>ThreadService: Get thread context
    ThreadService->>Database: Fetch thread messages
    Database-->>ThreadService: Return thread history
    ThreadService-->>BackendAPI: Return context
    BackendAPI->>AIModel: Send message + thread context
    AIModel-->>BackendAPI: Return AI response
    BackendAPI->>Database: Save user message & AI response to thread
    BackendAPI-->>ChatContext: Return {userMsg, aiMsg}
    ChatContext-->>ChatWindow: Update messages
    ChatWindow-->>User: Display chat
```

---

## Threads

### `/api/threads` (Create Thread)
```mermaid
sequenceDiagram
    participant User
    participant Sidebar (React)
    participant BackendAPI (POST /api/threads)
    participant Database

    User->>Sidebar: Click "New Thread"
    Sidebar->>BackendAPI: POST /api/threads {title}
    BackendAPI->>Database: Create thread
    Database-->>BackendAPI: Thread created
    BackendAPI-->>Sidebar: Return thread info
    Sidebar-->>User: Show new thread
```

### `/api/threads` (List Threads)
```mermaid
sequenceDiagram
    participant Sidebar (React)
    participant BackendAPI (GET /api/threads)
    participant Database

    Sidebar->>BackendAPI: GET /api/threads
    BackendAPI->>Database: Fetch threads for user
    Database-->>BackendAPI: Return threads
    BackendAPI-->>Sidebar: Return threads
    Sidebar-->>User: Display thread list
```

### `/api/threads/{id}` (Get Thread Messages)
```mermaid
sequenceDiagram
    participant User
    participant ChatWindow (React)
    participant BackendAPI (GET /api/threads/{id})
    participant Database

    User->>ChatWindow: Select thread
    ChatWindow->>BackendAPI: GET /api/threads/{id}
    BackendAPI->>Database: Fetch thread messages
    Database-->>BackendAPI: Return messages
    BackendAPI-->>ChatWindow: Return thread messages
    ChatWindow-->>User: Display thread conversation
```

### `/api/threads/{id}` (Update Thread Title)
```mermaid
sequenceDiagram
    participant User
    participant Sidebar (React)
    participant BackendAPI (PUT /api/threads/{id})
    participant Database

    User->>Sidebar: Click "Rename Thread", enter new title
    Sidebar->>BackendAPI: PUT /api/threads/{id} {title: newTitle}
    BackendAPI->>Database: Update thread title
    Database-->>BackendAPI: Confirm update
    BackendAPI-->>Sidebar: Return updated thread
    Sidebar-->>User: Show updated thread title
```

### `/api/threads/{id}` (Delete Thread)
```mermaid
sequenceDiagram
    participant User
    participant Sidebar (React)
    participant BackendAPI (DELETE /api/threads/{id})
    participant Database

    User->>Sidebar: Click "Delete Thread"
    Sidebar->>BackendAPI: DELETE /api/threads/{id}
    BackendAPI->>Database: Delete thread
    Database-->>BackendAPI: Confirm deletion
    BackendAPI-->>Sidebar: Return success
    Sidebar-->>User: Remove thread from UI
```

---

## Models

### `/api/models` (List Available AI Models)
```mermaid
sequenceDiagram
    participant ModelSelector (React)
    participant BackendAPI (GET /api/models)

    ModelSelector->>BackendAPI: GET /api/models
    BackendAPI-->>ModelSelector: Return model list
    ModelSelector-->>User: Show model options
```

---

## Rate Limits

### `/api/rate-limits` (Get Rate Limit Status)
```mermaid
sequenceDiagram
    participant Frontend
    participant BackendAPI (GET /api/rate-limits)
    participant RateLimiter

    Frontend->>BackendAPI: GET /api/rate-limits
    BackendAPI->>RateLimiter: Get current status
    RateLimiter-->>BackendAPI: Return usage stats
    BackendAPI-->>Frontend: Return rate limit status
    Frontend-->>User: Display usage info
```

---

> **Note:**  
> - File upload/management routes are not yet implemented
> - Thread editing functionality is not yet implemented
> - You can view these diagrams rendered in [Mermaid Live Editor](https://mermaid.live/) or in markdown viewers that support Mermaid (e.g., GitHub, VS Code with Mermaid plugin) 