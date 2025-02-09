# JuaCode AI Frontend

This is the frontend for JuaCode AI Coding Assitant. The app is built with React and provides an easy-to-use interface for chatting with various AI models, viewing chat history, and managing conversation titles. It integrates with the backend API for generating responses and saving chat data.

## Features

- **Chat Interface:** Send and receive messages using a clean, responsive chat UI.
- **Chat History:** Chats are saved locally and synced with the backend.
- **Auto-Save Title:** Chat titles are automatically updated on the backend as you edit.
- **Responsive Design:** The interface works well across different screen sizes.
- **Components:** Modular components include:
  - **ChatInterface:** The main chat area.
  - **ChatMessage:** Displays individual messages.
  - **InputArea:** The text input field for sending messages.
  - **Sidebar:** An optional panel for additional options.

## Getting Started

### Prerequisites

- Node.js (preferably the LTS version)
- npm (or yarn) as your package manager

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/branley1/juacode-ai.git
   cd frontend
   ```

2. **Install Dependencies**

   Using npm:

   ```bash
   npm install
   ```

   Or using yarn:

   ```bash
   yarn
   ```

### Running the Application

To start the development server, run:
```bash
npm start
```

Or with yarn:
```bash
yarn start
```

The app will be available in your browser at [http://localhost:3000](http://localhost:3000).

### Building for Production

To create a production build, run:
```bash
npm run build
```
Or with yarn:
```bash
yarn build
```

This will generate a `build` folder with optimized assets to deploy.

## Project Structure

- **public/**  
  Static assets and the base HTML file.

- **src/**  
  - **assets/**: Contains images and other static files.
  - **components/**: Contains React components such as:
    - **ChatInterface/**: Main component handling chats, including auto-saving titles, displaying messages, and interacting with the backend.
    - **ChatMessage/**: Displays individual messages.
    - **InputArea/**: Handles user message input and triggers responses.
    - **Sidebar/**: Optional sidebar for additional features.
    - **ErrorBoundary/**: Catches runtime errors in the UI to prevent the whole app from crashing, displaying a fallback UI instead.
    - **MobileDetector/**: Detects and handles mobile-specific layouts or behavior.
    - **ThoughtBlock/**: (Optional) Displays extra information or context, for instance, to show the AI’s thought process. Customize as needed.
  - **App.js:** Main app component.
  - **index.js:** Entry point for the React application.

## API Integration

The frontend communicates with the backend through the following endpoints:

- **POST /api/chats:** Creates a new chat record.
- **PUT /api/chats/{chat_id}:** Updates a chat title automatically.
- **POST /api/generate:** Generates a chat response (used indirectly via message simulation in the app).

Make sure the backend server is running and accessible for full functionality.

## Customization

To change styling or behavior:

- Update CSS files under `src/components/ChatInterface/` or other component folders.
- Adjust component state or logic in the respective React component files.

## Troubleshooting

- **Chat Not Saving:** Ensure the backend server is running correctly. Check your network console for API errors.
- **Local Storage Issues:** If your chat history isn’t loading as expected, try clearing your browser’s local storage.
- ** UI Bugs:** If components don’t display as expected, inspect the browser console for JavaScript errors and verify the component props.

## Contributing

Feel free to open issues if you encounter problems or want to suggest improvements. Pull requests are welcome!

## License

MIT License

## Contact

For any questions or feature requests, you can open an issue on GitHub or reach out to me directly at mmasi.branley@gmail.com.
