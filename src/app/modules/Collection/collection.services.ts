import httpStatus from "http-status";
import type {
   TCreateCollectionPayloadType,
   TUpdateCollectionPayloadType,
   TGetAllCollectionQueryParamsType,
} from "./collection.validations";
import { AppError, BadRequest, ConflictError } from "../../errors";
import { db } from "@/app/db";
import { collections, type IUser } from "@/app/db/schemas";
import {
   eq,
   ne,
   and,
   or,
   ilike,
   gte,
   lte,
   asc,
   desc,
   count,
   SQL,
} from "drizzle-orm";
import { createSlug, formatQuery, logger } from "@/app/utils";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import { deleteFileByUrl } from "@/app/utils/cloudinary/delete-file";

// 1. CREATE COLLECTION
const createCollection = async (
   user: IUser,
   payload: TCreateCollectionPayloadType,
   icon: TMulterFile,
) => {
   const { name } = payload;

   // ?? Generate slug:
   const slug = createSlug(name);

   // ?? Check if collection with same slug exists:
   const existing = await db.query.collections.findFirst({
      where: { slug },
   });

   if (existing) {
      throw new ConflictError("Collection with the same name already exists.");
   }

   // ?? Upload icon image:
   let iconUrl: string | null = null;
   if (icon) {
      const uploadedFile = await uploadFileIntoCloudinary(
         icon,
         File_FOLDER_NAME.ICON,
      );
      iconUrl = uploadedFile?.url as string;
   }

   try {
      const [result] = await db
         .insert(collections)
         .values({
            name,
            slug,
            icon: iconUrl,
            authorId: user.id,
            isActive: true,
         })
         .returning();

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
   const existingCollection = await db.query.collections.findFirst({
      where: { id },
   });

   if (!existingCollection) {
      throw new BadRequest("Collection not found.");
   }

   const updateData: Partial<typeof collections.$inferInsert> = {};

   if (payload.name) {
      const slug = createSlug(payload.name);

      // Check for duplicate slug (exclude current)
      const duplicateSlug = await db.query.collections.findFirst({
         where: { id: { ne: id }, slug },
      });

      if (duplicateSlug) {
         throw new ConflictError(
            "Collection with the same name already exists.",
         );
      }

      updateData.name = payload.name;
      updateData.slug = slug;
   }

   if (payload.isActive !== undefined) {
      updateData.isActive = payload.isActive;
   }

   let newUrl: string | null = null;
   const oldUrl = existingCollection?.icon as string | null;

   if (iconFile) {
      const uploadedFile = await uploadFileIntoCloudinary(
         iconFile,
         File_FOLDER_NAME.ICON,
      );
      newUrl = uploadedFile?.url as string;
      updateData.icon = newUrl;
   }

   try {
      const [updated] = await db
         .update(collections)
         .set(updateData)
         .where(eq(collections.id, id))
         .returning();

      if (newUrl && oldUrl) {
         deleteFileByUrl(oldUrl).catch((err) =>
            logger.error("Failed to delete old url ", err.message),
         );
      }

      return updated;
   } catch (error) {
      if (newUrl) {
         deleteFileByUrl(newUrl).catch((err) =>
            logger.error("Failed to delete new url ", err.message),
         );
      }
      throw error;
   }
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
   } = formatQuery(query, ["createdAt", "updatedAt", "name"]);

   const conditions: (SQL | undefined)[] = [];

   if (fromDate)
      conditions.push(gte(collections.createdAt, new Date(fromDate)));
   if (toDate) conditions.push(lte(collections.createdAt, new Date(toDate)));

   if (searchTerm) {
      conditions.push(
         or(
            ilike(collections.name, `%${searchTerm}%`),
            ilike(collections.slug, `%${searchTerm}%`),
         ),
      );
   }

   const whereClause =
      conditions.length > 0
         ? and(...(conditions.filter(Boolean) as SQL[]))
         : undefined;
   const direction: "asc" | "desc" = sortOrder === 1 ? "asc" : "desc";

   const orderBy =
      sortBy === "name"
         ? { name: direction }
         : sortBy === "updatedAt"
           ? { updatedAt: direction }
           : { createdAt: direction };

   const [data, [countResult]] = await Promise.all([
      db.query.collections.findMany({
         where: whereClause ? { RAW: whereClause } : undefined,
         orderBy,
         limit,
         offset: skip,
      }),
      db.select({ total: count() }).from(collections).where(whereClause),
   ]);

   const total = countResult?.total ?? 0;

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
   const result = await db.query.collections.findFirst({
      where: { id },
   });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Collection not found");
   }

   return result;
};

// 5. DELETE COLLECTION BY ID
const deleteCollectionById = async (id: string) => {
   const [result] = await db
      .delete(collections)
      .where(eq(collections.id, id))
      .returning();

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Collection not found");
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
