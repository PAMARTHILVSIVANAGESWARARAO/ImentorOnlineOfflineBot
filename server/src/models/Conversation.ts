import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    title: { type: String, default: 'New Conversation' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
