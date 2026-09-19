import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TCreateCollectionPayloadType,
   TUpdateCollectionPayloadType,
   TGetAllCollectionQueryParamsType,
} from "./collection.validations";
import { AppError, BadRequest, ConflictError } from "../../errors";
import { Collection } from "./collection.model";
import {
   collectionSearchableFields,
   collectionSortableFields,
} from "./collection.constants";
import type { IUserDoc } from "../User";
import { createSlug, formatQuery, logger } from "@/app/utils";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import { deleteFileByUrl } from "@/app/utils/cloudinary/delete-file";
import type { ICollectionFiles } from "./collection.interfaces";
import { deleteFilesByUrls } from "@/app/utils/cloudinary/delete-files";

// 1. CREATE COLLECTION
const createCollection = async (
   user: IUserDoc,
   payload: TCreateCollectionPayloadType,
   files: ICollectionFiles,
) => {
   const { name, description, metaTitle, metaDescription } = payload;

   // Generate slug & check uniqueness
   const slug = createSlug(name);
   const collectionExists = await Collection.findOne({ slug });

   if (collectionExists) {
      throw new ConflictError("Collection with the same name already exists.");
   }

   // Extract files safely
   const icon = files?.icon?.[0];
   const ogImage = files?.ogImage?.[0];

   const uploadedUrls: string[] = [];

   try {
      let iconUrl: string | null = null;
      let ogImageUrl: string | null = null;

      // Upload Icon
      if (icon) {
         const uploadedFile = await uploadFileIntoCloudinary(
            icon,
            File_FOLDER_NAME.ICON,
         );
         if (uploadedFile?.url) {
            iconUrl = uploadedFile.url;
            uploadedUrls.push(iconUrl);
         }
      }

      // Upload OG Image
      if (ogImage) {
         const uploadedFile = await uploadFileIntoCloudinary(
            ogImage,
            File_FOLDER_NAME.OG_IMAGE,
         );
         if (uploadedFile?.url) {
            ogImageUrl = uploadedFile.url;
            uploadedUrls.push(ogImageUrl);
         }
      }

      // Create Database Record
      const result = await Collection.create({
         name,
         slug,
         description: description!,
         metaTitle,
         metaDescription,
         icon: iconUrl,
         ogImage: ogImageUrl,
         author: user._id,
         isActive: true,
      });

      return result;
   } catch (error) {
      if (uploadedUrls.length > 0) {
         Promise.all(uploadedUrls.map((url) => deleteFileByUrl(url))).catch(
            (err) => console.log(err),
         );
      }
      throw error;
   }
};

// 2. UPDATE COLLECTION
const updateCollection = async (
   id: string,
   payload: TUpdateCollectionPayloadType,
   files: ICollectionFiles,
) => {
   // ?? Check is collection already exists ?:
   const existingCollection = await Collection.findById(id);
   if (!existingCollection) {
      throw new BadRequest("Collection not found.");
   }

   // ?? Check is name changed ?
   if (payload.name) {
      const slug = createSlug(payload.name);

      // Check is any collection exists with this slug?:
      const duplicateSlug = await Collection.findOne({
         _id: {
            $ne: existingCollection?._id,
         },
         slug,
      });

      if (duplicateSlug) {
         throw new ConflictError(
            "Collection with the same name already exists.",
         );
      }
      existingCollection.name = payload.name;
      existingCollection.slug = slug;
   }

   if (payload.isActive !== undefined)
      existingCollection.isActive = payload.isActive;

   if (payload.description !== undefined)
      existingCollection.description = payload.description!;

   if (payload.metaTitle !== undefined)
      existingCollection.metaTitle = payload.metaTitle;

   if (payload.metaDescription !== undefined)
      existingCollection.metaDescription = payload.metaDescription;

   const oldUrls: string[] = [];
   const newUrls: string[] = [];
   const iconFile = files?.icon?.[0];
   const ogImage = files?.ogImage?.[0];

   if (iconFile) {
      const uploadedFile = await uploadFileIntoCloudinary(
         iconFile,
         File_FOLDER_NAME.ICON,
      );
      // Added safety guard check
      if (uploadedFile?.secure_url) {
         if (existingCollection.icon) oldUrls.push(existingCollection.icon);
         existingCollection.icon = uploadedFile.secure_url as string;
         newUrls.push(uploadedFile.secure_url as string);
      }
   }

   if (ogImage) {
      const uploadedFile = await uploadFileIntoCloudinary(
         ogImage,
         File_FOLDER_NAME.OG_IMAGE,
      );
      // Added safety guard check
      if (uploadedFile?.secure_url) {
         if (existingCollection.ogImage)
            oldUrls.push(existingCollection.ogImage);
         existingCollection.ogImage = uploadedFile.secure_url as string;
         newUrls.push(uploadedFile.secure_url as string);
      }
   }

   try {
      await existingCollection.save({ validateBeforeSave: true });

      deleteFilesByUrls(oldUrls);
   } catch (error) {
      deleteFilesByUrls(newUrls);
      throw error;
   }

   return existingCollection;
};

// 3. GET ALL COLLECTION
const getAllCollection = async (query: TGetAllCollectionQueryParamsType) => {
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, collectionSortableFields);

   const pipeline: PipelineStage[] = [];

   if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate);

      pipeline.push({ $match: { createdAt: dateFilter } });
   }

   if (searchTerm) {
      pipeline.push({
         $match: {
            $or: collectionSearchableFields.map((field) => ({
               [field]: { $regex: searchTerm, $options: "i" },
            })),
         },
      });
   }

   pipeline.push({
      $project: {
         collectionId: "$_id",
         name: "$name",
         slug: "$slug",
         isActive: "$isActive",
         author: "$author",
         description: { $ifNull: ["$description", null] },
         icon: { $ifNull: ["$icon", null] },
         metaTitle: { $ifNull: ["$metaTitle", null] },
         metaDescription: { $ifNull: ["$metaDescription", null] },
         ogImage: { $ifNull: ["$ogImage", null] },
         createdAt: "$createdAt",
         updatedAt: "$updatedAt",
      },
   });

   pipeline.push({ $sort: { [sortBy]: sortOrder } });

   pipeline.push({
      $facet: {
         data: [{ $skip: skip }, { $limit: limit }],
         meta: [{ $count: "total" }],
      },
   });

   const aggregated = await Collection.aggregate(pipeline);

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

// 4. GET COLLECTION BY ID
const getCollectionById = async (id: string) => {
   const result = await Collection.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Collection not found");
   }

   return result;
};

// 5. DELETE COLLECTION BY ID
const deleteCollectionById = async (id: string) => {
   // TODO: Remove all the related collection data later.

   const result = await Collection.findOneAndDelete(
      { _id: id },
      {
         returnDocument: "after",
      },
   );

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Collection not found");
   }

   const oldUrls: string[] = [];

   if (result.icon) oldUrls.push(result.icon);
   if (result.ogImage) oldUrls.push(result.ogImage);

   if (oldUrls.length > 0) {
      await Promise.all(oldUrls.map((url) => deleteFileByUrl(url))).catch(
         (err) => console.error("Asset deletion failed:", err),
      );
   }

   return result;
};

export const collectionServices = {
   createCollection,
   updateCollection,
   getAllCollection,
   getCollectionById,
   deleteCollectionById,
};
