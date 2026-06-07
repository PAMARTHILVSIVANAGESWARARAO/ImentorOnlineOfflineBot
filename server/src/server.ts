import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chatRoutes from './routes/chat.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = Number(process.env.BACKEND_PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/imdb';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api', chatRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'imentor-chat-backend' });
});

// Start
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB at:', MONGO_URI);

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`);
      console.log(`   Use "adb reverse tcp:${PORT} tcp:${PORT}" for real device access`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Kill the existing process first:`);
        console.error(`   npx kill-port ${PORT}`);
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });
