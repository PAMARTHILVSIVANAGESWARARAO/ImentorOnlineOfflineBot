import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionChat extends Document {
  sessionId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SessionChatSchema: Schema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'ResearchSession', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false }
  }
);

export default mongoose.model<ISessionChat>('SessionChat', SessionChatSchema);
