import { useState, useEffect, useRef } from 'react';
import '../styles/Dashboard.css';

function Dashboard({ user, onLogout, darkMode, onToggleTheme }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversation, setConversation] = useState([]);
  const [savedMessages, setSavedMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const messages = JSON.parse(localStorage.getItem('savedMessages') || '[]');
    setSavedMessages(messages);
    
    // Load conversation from localStorage
    const conv = JSON.parse(localStorage.getItem('conversation') || '[]');
    setConversation(conv);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }

    // Add user message to conversation
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    localStorage.setItem('conversation', JSON.stringify(updatedConversation));

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/save-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save message');
      }

      const data = await response.json();
      
      // Add bot response
      const botMessage = {
        id: Date.now() + 1,
        text: `Message received ✓ Saved as: ${data.filename.split('_message_')[1]}`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      
      const finalConversation = [...updatedConversation, botMessage];
      setConversation(finalConversation);
      localStorage.setItem('conversation', JSON.stringify(finalConversation));
      
      // Add to saved messages
      const newMessage = {
        id: Date.now(),
        text: message,
        filename: data.filename,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
      const updatedMessages = [newMessage, ...savedMessages].slice(0, 20);
      setSavedMessages(updatedMessages);
      localStorage.setItem('savedMessages', JSON.stringify(updatedMessages));

      setMessage('');
    } catch (err) {
      setError(err.message);
      
      // Add error message to conversation
      const errorMessage = {
        id: Date.now() + 1,
        text: `Error: ${err.message}`,
        sender: 'error',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      const errorConversation = [...updatedConversation, errorMessage];
      setConversation(errorConversation);
      localStorage.setItem('conversation', JSON.stringify(errorConversation));
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = (id) => {
    const updatedMessages = savedMessages.filter(msg => msg.id !== id);
    setSavedMessages(updatedMessages);
    localStorage.setItem('savedMessages', JSON.stringify(updatedMessages));
  };

  const clearConversation = () => {
    setConversation([]);
    localStorage.setItem('conversation', JSON.stringify([]));
  };

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={clearConversation}>
            <span className="icon">+</span>
            New chat
          </button>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section">
            <h3>Recent</h3>
            <div className="message-list">
              {savedMessages.slice(0, 10).map(msg => (
                <div key={msg.id} className="sidebar-item">
                  <span className="item-text">{msg.text.substring(0, 30)}...</span>
                  <button 
                    className="delete-icon"
                    onClick={() => deleteMessage(msg.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="theme-toggle-btn" onClick={onToggleTheme} title="Toggle theme">
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          <div className="user-section">
            <div className="user-avatar">
              {user?.picture ? (
                <img src={user.picture} alt={user?.name} />
              ) : (
                <span>{user?.name?.[0] || 'U'}</span>
              )}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            ← Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <div className="mobile-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <span className="title">Message Saver</span>
          <button className="theme-toggle-mobile" onClick={onToggleTheme}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="content-area">
          {/* Chat Messages */}
          <div className="chat-messages">
            {conversation.length === 0 ? (
              <div className="welcome-section">
                <h1>What would you like to save?</h1>
                <p>Write your thoughts and save them securely to the cloud</p>
              </div>
            ) : (
              <div className="messages-container">
                {conversation.map(msg => (
                  <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                    <div className="bubble-content">
                      <p>{msg.text}</p>
                      <span className="bubble-time">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Input Form */}
          <form className="message-form" onSubmit={handleSave}>
            <div className="input-wrapper">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind? Type something..."
                rows="1"
                className="message-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSave(e);
                  }
                }}
              />
              <button
                type="submit"
                className="send-btn"
                disabled={loading || !message.trim()}
                title="Send message"
              >
                {loading ? '⏳' : '↑'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default Dashboard;