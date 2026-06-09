import mongoose, { Schema, Document } from 'mongoose';

export interface IScrapedPage extends Document {
  sessionId: mongoose.Types.ObjectId;
  url: string;
  method: 'cheerio' | 'puppeteer';
  title: string;
  description: string;
  text: string;
  images: Array<{ src: string; alt: string }>;
  scrapedAt: Date;
}

const ScrapedPageSchema: Schema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'ResearchSession', required: true, index: true },
    url: { type: String, required: true },
    method: { type: String, enum: ['cheerio', 'puppeteer'], required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    text: { type: String, default: '' },
    images: [
      {
        src: { type: String },
        alt: { type: String }
      }
    ]
  },
  {
    timestamps: { createdAt: 'scrapedAt', updatedAt: false }
  }
);

export default mongoose.model<IScrapedPage>('ScrapedPage', ScrapedPageSchema);
