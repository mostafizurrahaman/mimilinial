import { Document, Types } from 'mongoose';
import type { TMediaStatus } from './media.constants';

export interface IMedia {
  url: string; 
  publicId: string; 
  status: TMediaStatus
  uploadedBy: Types.ObjectId
}

export interface IMediaDoc extends Document, IMedia {}
