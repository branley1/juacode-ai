// frontend/src/ErrorBoundary.js
import { Component } from 'react';
import './ErrorBoundary.css';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Chat Error:', error, errorInfo);
  }
  
  // Update render output
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h3>Chat Connection Lost</h3>
          <p>We're having trouble connecting to the chat service. Error details:</p>
          <pre className="error-details">{this.state.error.message}</pre>
          <button onClick={() => window.location.reload()}>
            <FontAwesomeIcon icon={faSyncAlt} />
            Refresh Chat
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}