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

// 1. CREATE COLLECTION
const createCollection = async (
   user: IUserDoc,
   payload: TCreateCollectionPayloadType,
   icon: TMulterFile,
) => {
   const { name, description } = payload;

   // ?? Generate slug:
   const slug = createSlug(name);

   // ?? Find any collection exists with same name?:

   const collection = await Collection.findOne({
      slug,
   });

   if (collection) {
      throw new ConflictError("Collection with the same name already exists.");
   }

   // ?? Upload the collection icon image:
   let iconUrl: string | null = null;
   if (icon) {
      const uploadedFile = await uploadFileIntoCloudinary(
         icon,
         File_FOLDER_NAME.ICON,
      );

      iconUrl = uploadedFile?.url as string;
   }

   try {
      const result = await Collection.create({
         name,
         slug,
         description: description!,
         icon: iconUrl,
         author: user._id,
         isActive: true,
      });

      return result;
   } catch (error) {
      if (iconUrl) {
         deleteFileByUrl(iconUrl).catch(() =>
            logger.error("Failed to delete uploaded collection icon", error),
         );
      }

      throw error;
   }
};

// 2. UPDATE COLLECTION
const updateCollection = async (
   id: string,
   payload: TUpdateCollectionPayloadType,
   iconFile: TMulterFile,
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

   //  Check is any file is there :
   let newUrl: string | null = null;
   const oldUrl = existingCollection?.icon as string;
   if (iconFile) {
      const uploadedFile = await uploadFileIntoCloudinary(
         iconFile,
         File_FOLDER_NAME.ICON,
      );

      newUrl = uploadedFile?.url as string;
      existingCollection.icon = uploadedFile?.url as string;
   }

   try {
      await existingCollection.save({ validateBeforeSave: true });

      if (newUrl && oldUrl) {
         deleteFileByUrl(oldUrl).catch((err) =>
            logger.error("Failed to delete old url ", err.message),
         );
      }
   } catch (error) {
      if (newUrl) {
         deleteFileByUrl(newUrl).catch((err) =>
            logger.error("Failed to delete new url ", err.message),
         );
      }
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

   deleteFileByUrl(result.icon as string).catch((err) =>
      logger.info("Failed to delete icon url:", err.message),
   );

   return result;
};

export const collectionServices = {
   createCollection,
   updateCollection,
   getAllCollection,
   getCollectionById,
   deleteCollectionById,
};
