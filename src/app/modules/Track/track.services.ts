import httpStatus from "http-status";
import { Types, type PipelineStage } from "mongoose";
import type {
   TCreateTrackPayloadType,
   TUpdateTrackPayloadType,
   TGetAllTrackQueryParamsType,
   TGetAllActiveTrackQueryParamsType,
} from "./track.validations";
import {
   AppError,
   BadRequest,
   ConflictError,
   NotFoundError,
} from "../../errors";
import { Track } from "./track.model";
import {
   trackProjection,
   trackSearchableFields,
   trackSortableFields,
   trackStatus,
} from "./track.constants";
import type { IUserDoc } from "../User";
import { createSlug, formatQuery } from "@/app/utils";
import { Category, categoryStatus } from "../Category";
import { Collection, COLLECTION_STATUS } from "../Collection";

// 1. CREATE TRACK
const createTrack = async (
   user: IUserDoc,
   payload: TCreateTrackPayloadType,
) => {
   const { category, nameBn, nameEn, description, metaTitle, metaDescription } =
      payload;

   // Check is category exists:
   const existingCategory = await Category.findById(category);
   if (!existingCategory) {
      throw new NotFoundError("Category not found.");
   }

   // Check is category in publish status:
   if (existingCategory.status !== categoryStatus.PUBLISHED) {
      throw new BadRequest(
         "Track can only be created under a published category.",
      );
   }

   // Check is collection is published:
   const existingCollection = await Collection.findById(
      existingCategory.collectionId,
   );
   if (!existingCollection) {
      throw new NotFoundError("Category not found.");
   }

   // Check is category in publish status:
   if (existingCollection.status !== COLLECTION_STATUS.PUBLISHED) {
      throw new BadRequest(
         "Track can only be created under a published collection's categories.",
      );
   }

   // create slug:
   const slug = createSlug(nameEn);

   // Check any track exists with this slug:
   const duplicateTrack = await Track.findOne({
      category: existingCategory._id,
      slug,
   });

   if (duplicateTrack) {
      throw new ConflictError(
         "A track with this name already exists in this category.",
      );
   }

   const result = await Track.create({
      category: existingCategory._id,
      nameEn,
      nameBn,
      slug,
      description,
      metaTitle,
      metaDescription,
      status: trackStatus.DRAFT,
      author: user?._id,
   });

   return result;
};

// 2. UPDATE TRACK
const updateTrack = async (id: string, payload: TUpdateTrackPayloadType) => {
   // Check is track exists with this ID:
   const existingTrack = await Track.findById(id);

   if (!existingTrack) {
      throw new NotFoundError("Track not found.");
   }

   const { category, nameEn, nameBn, description, metaTitle, metaDescription } =
      payload;

   // Check is category changed and new category exists:
   let targetCategoryId = existingTrack.category;
   if (
      category !== undefined &&
      existingTrack.category?.toString() !== category?.toString()
   ) {
      //  check is category exists:
      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
         throw new NotFoundError("Category not found.");
      }

      if (existingCategory.status !== categoryStatus.PUBLISHED) {
         throw new BadRequest(
            "Track can only be updated under a published category.",
         );
      }

      // check existing collection
      const existingCollection = await Collection.findById(
         existingCategory.collectionId,
      );
      if (!existingCollection) {
         throw new NotFoundError("Collection not found.");
      }

      if (existingCollection.status !== COLLECTION_STATUS.PUBLISHED) {
         throw new BadRequest(
            "A track can only be updated under a published collection's categories.",
         );
      }

      targetCategoryId = existingCategory._id;
   }

   // Name and slug duplication check:
   const updatedName =
      nameEn !== undefined ? nameEn?.trim() : existingTrack.nameEn;
   const slug = createSlug(updatedName);

   //  Check any duplicate exists:
   const duplicateTrack = await Track.findOne({
      _id: {
         $ne: existingTrack._id,
      },
      category: targetCategoryId,
      slug,
   });

   if (duplicateTrack) {
      throw new ConflictError(
         "A track with this name already exists in this category.",
      );
   }

   existingTrack.nameEn = updatedName;
   existingTrack.category = targetCategoryId;
   existingTrack.slug = slug;

   // Check isActive changed:
   if (nameBn !== undefined) existingTrack.nameBn = nameBn;

   // If description changed:
   if (description !== undefined) existingTrack.description = description;

   if (metaTitle !== undefined) existingTrack.metaTitle = metaTitle;
   if (metaDescription !== undefined)
      existingTrack.metaDescription = metaDescription;

   await existingTrack.save({ validateBeforeSave: true });

   return existingTrack;
};

// 3. GET ALL TRACK
const getAllTrack = async (query: TGetAllTrackQueryParamsType) => {
   const { category, status, categoryStatus, collectionStatus, projection } =
      query;
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, trackSortableFields);

   const pipeline: PipelineStage[] = [];

   if (category) {
      pipeline.push({
         $match: {
            category: new Types.ObjectId(category),
         },
      });
   }

   pipeline.push(
      {
         $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDetails",
            pipeline: [
               {
                  $lookup: {
                     from: "collections",
                     localField: "collectionId",
                     foreignField: "_id",
                     as: "collectionDetails",
                     pipeline: [
                        {
                           $project: {
                              _id: 0,
                              status: 1,
                              nameBn: 1,
                              nameEn: 1,
                           },
                        },
                     ],
                  },
               },
               {
                  $unwind: {
                     path: "$collectionDetails",
                     preserveNullAndEmptyArrays: true,
                  },
               },
               {
                  $project: {
                     _id: 1,
                     nameEn: 1,
                     nameBn: 1,
                     status: 1,
                     icon: 1,
                     collectionId: "$collectionId",
                     collectionStatus: "$collectionDetails.status",
                     collectionNameEn: "$collectionDetails.nameEn",
                     collectionNameBn: "$collectionDetails.nameBn",
                  },
               },
            ],
         },
      },
      {
         $unwind: {
            path: "$categoryDetails",
            preserveNullAndEmptyArrays: true,
         },
      },
   );

   const projectionFields =
      trackProjection[
         (projection as "options" | "list" | "details") || "details"
      ];

   pipeline.push({
      $project: projectionFields,
   });

   const matchStage: PipelineStage.Match = {
      $match: {},
   };

   if (status !== undefined) {
      matchStage.$match["status"] = status;
   }

   if (categoryStatus !== undefined) {
      matchStage.$match["categoryStatus"] = categoryStatus;
   }

   if (collectionStatus !== undefined) {
      matchStage.$match["collectionStatus"] = collectionStatus;
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
            $or: trackSearchableFields.map((field) => ({
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

   const aggregated = await Track.aggregate(pipeline);

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

const getAllPublishedTracks = async (
   query: TGetAllActiveTrackQueryParamsType,
) => {
   return getAllTrack({
      ...query,
      status: trackStatus.PUBLISHED,
      categoryStatus: categoryStatus.PUBLISHED,
      collectionStatus: COLLECTION_STATUS.PUBLISHED,
   });
};

// 4. GET TRACK BY ID
const getTrackById = async (id: string) => {
   const result = await Track.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Track not found");
   }

   return result;
};

// 5. DELETE TRACK BY ID
const deleteTrackById = async (id: string) => {
   const result = await Track.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Track not found");
   }

   return result;
};

// 6. Mark as Published:
const markAsPublished = async (id: string) => {
   const track = await Track.findById(id);

   if (!track) {
      throw new NotFoundError("Track not found.");
   }

   // Is category exists?:
   const category = await Category.findById(track.category);
   if (!category) {
      throw new NotFoundError("Category not found.");
   }

   if (category.status !== categoryStatus.PUBLISHED) {
      throw new BadRequest("The category is not published yet.");
   }

   // check existing collection
   const collection = await Collection.findById(category.collectionId);
   if (!collection) {
      throw new NotFoundError("Collection not found.");
   }

   if (collection.status !== COLLECTION_STATUS.PUBLISHED) {
      throw new BadRequest(
         "Track can only be published under a published collection's categories.",
      );
   }

   if (track.status === trackStatus.ARCHIVED) {
      throw new BadRequest("You cannot publish an archived track.");
   }

   if (track.status === trackStatus.PUBLISHED) {
      throw new BadRequest("This track has already been published.");
   }

   track.status = trackStatus.PUBLISHED;
   track.publishedAt = new Date();

   await track.save({ validateBeforeSave: true });

   return track;
};

// 7. Mark as Archived:
const markAsArchived = async (id: string) => {
   const track = await Track.findById(id);

   if (!track) {
      throw new NotFoundError("Track not found.");
   }

   if (track.status === trackStatus.DRAFT) {
      throw new BadRequest("You cannot archive a drafted track.");
   }

   if (track.status === trackStatus.ARCHIVED) {
      throw new BadRequest("This track has already been archived.");
   }

   track.status = trackStatus.ARCHIVED;
   track.archivedAt = new Date();

   await track.save({ validateBeforeSave: true });

   return track;
};

export const trackServices = {
   createTrack,
   updateTrack,
   getAllTrack,
   getTrackById,
   deleteTrackById,
   getAllPublishedTracks,
   markAsPublished,
   markAsArchived,
};
