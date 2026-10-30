import { Document, Types } from 'mongoose';
import type { TMediaStatus } from './media.constants';

export interface IMediaReference {
  entityType: string;
  entityId: Types.ObjectId;
}

export interface IMedia {
  url: string; 
  publicId: string; 
  status: TMediaStatus;
  refCount: number;
  references: IMediaReference[];
  uploadedBy: Types.ObjectId;
}

export interface IMediaDoc extends Document, IMedia {}
