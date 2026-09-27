import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TCreatePassagePayloadType,
   TUpdatePassagePayloadType,
   TGetAllPassageQueryParamsType,
} from "./passage.validations";
import {
   AppError,
   BadRequest,
   ConflictError,
   NotFoundError,
} from "../../errors";
import { Passage } from "./passage.model";
import {
   PASSAGE_STATUS,
   passageSearchableFields,
   passageSortableFields,
} from "./passage.constants";
import { createSlug, formatQuery } from "@/app/utils";
import type { IUserDoc } from "../User";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import type { IPassageFile } from "./passage.interfaces";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import { deleteFilesByUrls } from "@/app/utils/cloudinary/delete-files";
import { object } from "zod";

// 1. CREATE PASSAGE
const createPassage = async (
   user: IUserDoc,
   payload: TCreatePassagePayloadType,
   files: IPassageFile,
) => {
   const { titleBn, titleEn, bodyEn, bodyBn, metaDescription, metaTitle } =
      payload;

   // Generate slug:
   const slug = createSlug(titleEn);

   const existingPassage = await Passage.findOne({
      slug,
   });

   if (existingPassage) {
      throw new ConflictError("A passage already exists with this slug.");
   }

   // Upload Image:
   const mediaFile = files?.image?.[0];
   const ogImageFile = files?.ogImage?.[0];

   // Uploaded Files:
   const newUrls: string[] = [];
   let mediaUrl: string | null = null;
   let ogImageUrl: string | null = null;

   try {
      if (mediaFile) {
         const uploadedMedia = await uploadFileIntoCloudinary(
            mediaFile,
            File_FOLDER_NAME.PASSAGE_MEDIA,
         );

         if (uploadedMedia?.secure_url) {
            newUrls.push(uploadedMedia.secure_url);
            mediaUrl = uploadedMedia.secure_url as string;
         }
      }

      if (ogImageFile) {
         const uploadedOgImage = await uploadFileIntoCloudinary(
            ogImageFile,
            File_FOLDER_NAME.OG_IMAGE,
         );

         if (uploadedOgImage?.secure_url) {
            newUrls.push(uploadedOgImage.secure_url);
            ogImageUrl = uploadedOgImage.secure_url as string;
         }
      }

      const result = await Passage.create({
         titleBn,
         titleEn,
         slug,
         bodyBn,
         bodyEn,
         metaTitle,
         metaDescription,
         status: PASSAGE_STATUS.DRAFT,
         mediaUrl: mediaUrl,
         ogImage: ogImageUrl,
         author: user?._id,
      });

      return result;
   } catch (error) {
      await deleteFilesByUrls(newUrls);

      throw error;
   }
};

// 2. UPDATE PASSAGE
const updatePassage = async (
   id: string,
   payload: TUpdatePassagePayloadType,
   files: IPassageFile,
) => {
   const existingPassage = await Passage.findById(id);
   if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
   }

   let slug = existingPassage.slug;

   if (
      payload.titleEn !== undefined &&
      payload.titleEn !== existingPassage.titleEn
   ) {
      slug = createSlug(payload.titleEn);

      const duplicateSlug = await Passage.findOne({
         _id: {
            $ne: existingPassage?._id,
         },
         slug,
      });

      if (!duplicateSlug) {
         throw new ConflictError("Already have a passage with this slug.");
      }
   }

   const mediaFile = files?.image?.[0];
   const ogImageFile = files?.ogImage?.[0];

   const oldUrls: string[] = [];
   const newUrls: string[] = [];

   let mediaUrl: string = existingPassage?.mediaUrl as string;
   let ogImageUrl: string = existingPassage?.ogImage as string;

   try {
      if (mediaFile) {
         const uploadedFile = await uploadFileIntoCloudinary(
            mediaFile,
            File_FOLDER_NAME.PASSAGE_MEDIA,
         );

         if (uploadedFile?.secure_url) {
            if (existingPassage.mediaUrl)
               oldUrls.push(existingPassage.mediaUrl);

            newUrls.push(uploadedFile.secure_url);
            mediaUrl = uploadedFile.secure_url;
         }
      }

      if (ogImageFile) {
         const uploadedOgFile = await uploadFileIntoCloudinary(
            ogImageFile,
            File_FOLDER_NAME.PASSAGE_MEDIA,
         );

         if (uploadedOgFile?.secure_url) {
            if (existingPassage.ogImage) oldUrls.push(existingPassage.ogImage);

            newUrls.push(uploadedOgFile.secure_url);
            ogImageUrl = uploadedOgFile.secure_url;
         }
      }

      const updatedData = Object.fromEntries(
         Object.entries(payload).filter((field) => field?.[1] !== undefined),
      );

      if (slug) updatedData.slug = slug;
      if (mediaUrl) updatedData.mediaUrl = mediaUrl;
      if (ogImageUrl) updatedData.ogImageUrl = ogImageUrl;

      const result = await Passage.findOneAndUpdate(
         { _id: id },
         { $set: updatedData },
         { new: true },
      );

      if (!result) {
         throw new AppError(httpStatus.NOT_FOUND, "Passage not found");
      }

      await deleteFilesByUrls(oldUrls);

      return result;
   } catch (error) {
      await deleteFilesByUrls(newUrls);
      throw error;
   }
};

// 3. GET ALL PASSAGE
const getAllPassage = async (query: TGetAllPassageQueryParamsType) => {
   const { status } = query;
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, passageSortableFields);

   const pipeline: PipelineStage[] = [];

   const matchStage: PipelineStage.Match = { $match: {} };

   if (status !== undefined) {
      matchStage.$match["status"] = status;
   }

   pipeline.push(matchStage);

   if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate);

      pipeline.push({ $match: { createdAt: dateFilter } });
   }

   if (searchTerm) {
      pipeline.push({
         $match: {
            $or: passageSearchableFields.map((field) => ({
               [field]: { $regex: searchTerm, $options: "i" },
            })),
         },
      });
   }

   pipeline.push({ $sort: { [sortBy]: sortOrder } });

   pipeline.push({
      $facet: {
         data: [{ $skip: skip }, { $limit: limit }],
         meta: [{ $count: "total" }],
      },
   });

   const aggregated = await Passage.aggregate(pipeline);

   const data = aggregated?.[0]?.data || [];
   const total = aggregated?.[0]?.meta?.[0]?.total || 0;

   return {
      data,
      meta: {
         page,
         limit,
         total,
         totalPages: Math.ceil(total / limit) || 1,
      },
   };
};

// 4. GET PASSAGE BY ID
const getPassageById = async (id: string) => {
   const result = await Passage.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Passage not found");
   }

   return result;
};

// 5. DELETE PASSAGE BY ID
const deletePassageById = async (id: string) => {
   const result = await Passage.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Passage not found");
   }

   return result;
};

export const passageServices = {
   createPassage,
   updatePassage,
   getAllPassage,
   getPassageById,
   deletePassageById,
};
