const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const AWS = require('aws-sdk');
const session = require('express-session');
const { DateTime } = require('luxon');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SECRET_KEY || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const ALLOWED_USERS = [
  'prachiwadhwani1270@gmail.com',
  'tyagiaalind@gmail.com'
];

// Google OAuth client
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

// S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Verify token endpoint
app.post('/api/auth/verify-token', async (req, res) => {
  try {
    const token = req.body.token;

    // Verify the token with Google
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    // Check if user is allowed
    if (!ALLOWED_USERS.includes(email)) {
      return res.status(403).json({ error: 'Unauthorized user' });
    }

    // Store user in session
    req.session.user = {
      email: email,
      name: payload.name,
      picture: payload.picture
    };

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Token verification failed' });
  }
});

// Get current user
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// Save message to S3
app.post('/api/save-message', requireAuth, async (req, res) => {
  try {
    const message = (req.body.message || '').trim();

    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Create filename with timestamp
    const now = DateTime.now();
    const timestamp = now.toFormat('yyyyMMdd_HHmmss');
    const username = req.session.user.email.split('@')[0];
    const filename = `${username}_message_${timestamp}.txt`;

    // Save to S3
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filename,
      Body: message,
      ContentType: 'text/plain'
    };

    await s3.putObject(params).promise();

    res.json({
      success: true,
      message: `Message saved as ${filename}`,
      filename: filename
    });
  } catch (error) {
    console.error('S3 error:', error);
    res.status(500).json({ error: `Failed to save message: ${error.message}` });
  }
});

// Logout
app.get('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});