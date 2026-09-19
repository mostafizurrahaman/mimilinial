import httpStatus from "http-status";
import { Types, type PipelineStage } from "mongoose";
import type {
   TCreateTrackPayloadType,
   TUpdateTrackPayloadType,
   TGetAllTrackQueryParamsType,
   TGetAllActiveTrackQueryParamsType,
} from "./track.validations";
import { AppError, ConflictError, NotFoundError } from "../../errors";
import { Track } from "./track.model";
import { trackSearchableFields, trackSortableFields } from "./track.constants";
import type { IUserDoc } from "../User";
import { createSlug, formatQuery } from "@/app/utils";
import { Category } from "../Category";

// 1. CREATE TRACK
const createTrack = async (
   user: IUserDoc,
   payload: TCreateTrackPayloadType,
) => {
   const { category, name, description, isActive, metaTitle, metaDescription } =
      payload;

   // Check is category exists:
   const existingCategory = await Category.findById(category);
   if (!existingCategory) {
      throw new NotFoundError("Category not found.");
   }

   // create slug:
   const slug = createSlug(name);

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
      name,
      slug,
      description,
      metaTitle,
      metaDescription,
      isActive,
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

   const { category, name, isActive, description, metaTitle, metaDescription } =
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

      targetCategoryId = existingCategory._id;
   }

   // Name and slug duplication check:
   const updatedName = name !== undefined ? name?.trim() : existingTrack.name;
   const slug = createSlug(updatedName);

   //  Check any duplicate exists:
   const duplicateTrack = await Track.findOne({
      _id: {
         $ne: existingTrack._id,
      },
      category: targetCategoryId,
      slug,
   });

   console.log(duplicateTrack);

   if (duplicateTrack) {
      throw new ConflictError(
         "A track with this name already exists in this category.",
      );
   }

   existingTrack.name = updatedName;
   existingTrack.category = targetCategoryId;
   existingTrack.slug = slug;

   // Check isActive changed:
   if (isActive !== undefined) existingTrack.isActive = isActive;

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
   const { category, isActive, isCategoryActive } = query;
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
                  $project: {
                     _id: 1,
                     name: 1,
                     isActive: 1,
                     icon: 1,
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
      {
         $project: {
            _id: 0,
            trackId: "$_id",
            categoryId: "$categoryDetails._id",
            name: "$name",
            description: { $ifNull: ["$description", null] },
            metaTitle: { $ifNull: ["$metaTitle", null] },
            metaDescription: { $ifNull: ["$metaDescription", null] },
            isActive: "$isActive",
            author: "$author",
            categoryName: "$categoryDetails.name",
            isCategoryActive: "$categoryDetails.isActive",
            categoryIcon: { $ifNull: ["$categoryDetails.icon", null] },
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
         },
      },
   );

   const matchStage: PipelineStage.Match = {
      $match: {},
   };

   if (isActive !== undefined) {
      matchStage.$match["isActive"] = isActive;
   }

   if (isCategoryActive !== undefined) {
      matchStage.$match["isCategoryActive"] = isCategoryActive;
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

const getAllActiveTracks = async (query: TGetAllActiveTrackQueryParamsType) => {
   return getAllTrack({
      ...query,
      isActive: true,
      isCategoryActive: true,
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

export const trackServices = {
   createTrack,
   updateTrack,
   getAllTrack,
   getTrackById,
   deleteTrackById,
   getAllActiveTracks,
};
