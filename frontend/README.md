# AI Chat Application

A modern, feature-rich AI chat application built with React and Material UI. This application provides a seamless interface for interacting with AI models, managing conversations, and organizing chat threads.

![AI Chat App](https://via.placeholder.com/800x400?text=AI+Chat+Application)

## 🚀 Live Demo

**MVP Demo:** [https://yourusername.github.io/ai-chat-app/](https://yourusername.github.io/ai-chat-app/)

*Note: The live demo runs frontend-only. For full functionality, you'll need to deploy the backend separately.*

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser

### Quick Start (Frontend Only)

1. Clone the repository:

    ```bash
    git clone <repository-url>
    cd ai-chat-app
    ```
2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory:

    ```bash
    cp env.example .env
    # Edit .env with your configuration
    ```

4. Start the development server:

    ```bash
    npm run dev
    ```

5. Open your browser and navigate to `http://localhost:5173`

### Full Stack Development

1. Follow steps 1-3 above

2. Set up the backend:
    ```bash
    cd backend
    # Follow backend setup instructions
    ```

3. Start both frontend and backend:
    ```bash
    npm run start
    ```

## 📦 Deployment

### GitHub Pages (Frontend MVP)

The app is automatically deployed to GitHub Pages when you push to the main branch.

**Prerequisites:**
1. Enable GitHub Pages in your repository settings
2. Set source to "GitHub Actions"

**Manual Deployment:**
```bash
# Build and deploy manually
npm run build
npm run deploy
```

**Environment Variables for Production:**
Since GitHub Pages only serves static files, set these in your build environment:
- `VITE_API_URL`: Your deployed backend URL
- `VITE_DEFAULT_MODEL`: Default AI model
- `VITE_ENABLE_HISTORY`: Enable chat history
- `VITE_ENABLE_MODEL_SELECTION`: Enable model selection

**GitHub Actions:**
The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:
- Runs tests
- Builds the app
- Deploys to GitHub Pages automatically

### Backend Deployment

For a complete deployment, you'll need to deploy the FastAPI backend separately:

**Options:**
- **Heroku**: Easy deployment with Procfile
- **Railway**: Modern deployment platform
- **AWS/GCP/Azure**: Cloud platforms
- **VPS**: Self-hosted solutions

**Environment Setup:**
The backend requires its own environment variables. See `backend/requirements.txt` for dependencies.

## 🛠️ Technical Architecture

### Project Structure
```
src/
├── components/     # React components
├── context/       # Context providers
├── services/      # API and utility services
├── hooks/         # Custom React hooks
├── assets/        # Static assets
└── App.jsx        # Main application component
```

### Key Components
- `ChatWindow`: Main chat interface
- `InputArea`: Message input and controls
- `ThreadList`: Thread management sidebar
- `Header`: Navigation and user controls

### State Management
- Theme management via `ThemeContext`
- Chat state via `ChatContext`
- Thread management via `ThreadContext`
- Authentication via `AuthContext`

## 🔒 Security

- Protected routes for authenticated users
- Secure API communication
- Rate limiting implementation
- User session management
- Data encryption
- **Automatic 401 error handling and session management**

### Authentication & Session Management

The application includes robust authentication and session management features:

#### Automatic Logout on Token Expiration
- **Global 401 Error Handling**: All API calls are monitored for 401 (Unauthorized) responses
- **Automatic Logout**: When a 401 error is detected, the user is automatically logged out
- **Session Expiration Notifications**: Users receive clear notifications when their session expires
- **Seamless Redirect**: Users are redirected to the login page with error context

#### Implementation Details
- **Centralized Error Handler**: All API responses pass through a centralized error handler in `apiService.js`
- **Global Logout Callback**: The `AuthContext` registers a global callback that's triggered on 401 errors
- **Token Validation**: Periodic checks for token expiration with automatic cleanup
- **Notification System**: User-friendly notifications for session expiration events

```javascript
// Example: How 401 errors are handled
const handleApiResponse = async (response, errorContext) => {
  if (!response.ok) {
    if (response.status === 401) {
      // Trigger global logout
      if (globalLogoutCallback) {
        globalLogoutCallback()
      }
      throw new Error('Session expired. Please log in again.')
    }
    throw new Error(`${errorContext} failed: ${response.status}`)
  }
  return response
}
```

#### Security Benefits
- **Prevents unauthorized access** when tokens expire
- **Protects sensitive data** by immediately clearing authentication state
- **Improves user experience** with clear feedback and automatic handling
- **Reduces security vulnerabilities** by ensuring expired sessions are handled properly

## 🎨 Customization

### Theme Configuration
The application supports both light and dark themes. Theme preferences are persisted in local storage.

### API Configuration
Configure API endpoints and models in the `apiService.js` file:
```javascript
export const config = {
  API_URL: import.meta.env.VITE_API_URL,
  DEFAULT_MODEL: import.meta.env.VITE_DEFAULT_MODEL,
  ENABLE_HISTORY: true,
  // ... other configurations
}
```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🧪 Testing

Run tests using:
```bash
npm test
# or
yarn test
```

## 📈 Performance

- Optimized rendering with React.memo
- Efficient state management
- Lazy loading of components
- Message streaming for real-time responses

## 🔮 Future Enhancements

- File upload support
- Code highlighting
- Image generation
- Voice input/output
- Advanced thread management
- Custom themes
- Plugin system
- Progressive web app support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Material UI for the beautiful components
- All contributors who have helped shape this project


---

Made with ❤️ by Balaji Senthilkumar

# AI Chat App Frontend

A modern React-based chat application with AI integration.

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment

The app will automatically deploy to GitHub Pages when you push to the `main` or `develop` branch. The deployment workflow is configured in `.github/workflows/deploy.yml`.

### Manual Deployment

To deploy manually using gh-pages:

```bash
npm run build
npm run deploy
```

### Configuration

1. **Environment Variables**: Update `.env.production` with your production backend URL:
   ```
   VITE_API_URL=https://your-backend-domain.com/api
   ```

2. **Repository Settings**: 
   - Go to your GitHub repository settings
   - Navigate to Pages section
   - Set Source to "GitHub Actions"

3. **Base URL**: The app is configured to work with the repository name `/g-chat/`. If you rename the repository, update:
   - `base` in `vite.config.js`
   - `basename` in `src/App.jsx`

### Local Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Features

- ✅ Client-side routing support for GitHub Pages
- ✅ Automatic deployment via GitHub Actions
- ✅ Production environment configuration
- ✅ SPA (Single Page Application) routing
- ✅ Responsive Material-UI design

### Deployment URL

Once deployed, your app will be available at:
`https://balaji-senthil.github.io/g-chat/`

### Troubleshooting

1. **404 on page refresh**: The `404.html` file handles client-side routing for GitHub Pages
2. **Build failures**: Check that all environment variables are set correctly
3. **API connection**: Ensure your backend URL in `.env.production` is correct and accessible