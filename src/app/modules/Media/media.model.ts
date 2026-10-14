import { Schema, model } from "mongoose";
import type { IMediaDoc } from "./media.interfaces";
import { MEDIA_STATUS, MEDIA_STATUS_VALUES } from "./media.constants";

const mediaSchema = new Schema<IMediaDoc>(
   {
      url: { type: String },
      publicId: {
         type: String, 
         unique: true,
         index: true,
      }, 
      status: {
         type: String, 
         enum: MEDIA_STATUS_VALUES, 
         default: MEDIA_STATUS.ATTACHED,
         index:true
      }, 
      uploadedBy: {
         type: Schema.Types.ObjectId,
         ref:"User", 
         required:true
      }
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const Media = model<IMediaDoc>("Media", mediaSchema);
