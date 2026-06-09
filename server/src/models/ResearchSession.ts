import mongoose, { Schema, Document } from 'mongoose';

export interface IResearchSession extends Document {
  topic: string;
  sites: string[];
  inputUrls: string[];
  relevantUrls: string[];
  createdAt: Date;
}

const ResearchSessionSchema: Schema = new Schema(
  {
    topic: { type: String, required: true },
    sites: [{ type: String }],
    inputUrls: [{ type: String }],
    relevantUrls: [{ type: String }],
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export default mongoose.model<IResearchSession>('ResearchSession', ResearchSessionSchema);
