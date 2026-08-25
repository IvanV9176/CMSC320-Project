import { useEffect, useRef } from 'react';
import '../styles/Login.css';

function Login({ onLoginSuccess }) {
  const googleButtonRef = useRef(null);

  useEffect(() => {
    window.google?.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });

    if (googleButtonRef.current) {
      window.google?.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: 'outline',
          size: 'large',
          width: '320'
        }
      );
    }
  }, []);

  async function handleCredentialResponse(response) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token: response.credential })
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}`);
        return;
      }

      const data = await res.json();
      onLoginSuccess(data.user);
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>📝 Message Saver</h1>
        <p className="subtitle">Save your thoughts securely to the cloud</p>
        <div className="google-signin">
          <div ref={googleButtonRef}></div>
        </div>
      </div>
    </div>
  );
}

export default Login;