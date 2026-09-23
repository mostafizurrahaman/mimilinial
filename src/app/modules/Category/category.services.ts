import httpStatus from "http-status";
import mongoose, { Types, type PipelineStage } from "mongoose";
import type {
  TCreateCategoryPayloadType,
  TUpdateCategoryPayloadType,
  TGetAllCategoryQueryParamsType,
  TGetAllPublishedCategoryQueryParamsType,
} from "./category.validations";
import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import { Category } from "./category.model";
import {
  categoryProjection,
  categoryProjectionValues,
  categorySearchableFields,
  categorySortableFields,
  categoryStatus,
} from "./category.constants";
import type { IUserDoc } from "../User";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Collection, COLLECTION_STATUS } from "../Collection";
import { createSlug, formatQuery, logger } from "@/app/utils";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import { deleteFileByUrl } from "@/app/utils/cloudinary/delete-file";
import type { ICategoryFiles } from "./category.interfaces";
import { deleteFilesByUrls } from "@/app/utils/cloudinary/delete-files";
import { Track, trackStatus } from "../Track";

// 1. CREATE CATEGORY
const createCategory = async (
  user: IUserDoc,
  payload: TCreateCategoryPayloadType,
  files?: ICategoryFiles,
) => {
  const {
    nameBn,
    nameEn,
    collectionId,
    description,
    metaTitle,
    metaDescription,
  } = payload;

  // ?? Check is collection exists
  const collection = await Collection.findById(collectionId);

  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  if (collection.status !== COLLECTION_STATUS.PUBLISHED) {
    throw new BadRequest(
      "Category can only be created under a published collection.",
    );
  }

  // ?? Generate slug
  const slug = createSlug(nameEn);

  // ?? Check duplicate slug
  const existingSlug = await Category.findOne({
    collectionId,
    slug,
  });

  if (existingSlug) {
    throw new ConflictError("Category with this slug already exists");
  }

  // New Files:
  const iconFile = files?.icon?.[0];
  const ogImageFile = files?.ogImage?.[0];

  // ?? Upload icon
  const newUrls: string[] = [];
  let iconUrl: string | null = null;
  let ogImageUrl: string | null = null;

  try {
    if (iconFile) {
      const uploadedIcon = await uploadFileIntoCloudinary(
        iconFile,
        File_FOLDER_NAME.CATEGORY_ICON,
      );

      if (uploadedIcon?.secure_url) {
        newUrls.push(uploadedIcon.secure_url);
        iconUrl = uploadedIcon.secure_url;
      }
    }

    if (ogImageFile) {
      const uploadedOgImage = await uploadFileIntoCloudinary(
        ogImageFile,
        File_FOLDER_NAME.OG_IMAGE,
      );

      if (uploadedOgImage?.secure_url) {
        newUrls.push(uploadedOgImage.secure_url);
        ogImageUrl = uploadedOgImage.secure_url;
      }
    }

    // ?? Create category
    const result = await Category.create({
      nameBn: nameBn.trim(),
      nameEn: nameEn?.trim(),
      slug,
      collectionId,
      description: description?.trim(),
      metaTitle,
      metaDescription,
      status: categoryStatus.DRAFT,
      icon: iconUrl,
      ogImage: ogImageUrl,
      author: user?._id,
    });

    return result;
  } catch (error) {
    if (newUrls.length > 0) {
      Promise.all(newUrls.map((url) => deleteFileByUrl(url))).catch((err) => {
        console.log(err);
      });
    }

    throw error;
  }
};

// 2. UPDATE CATEGORY
const updateCategory = async (
  id: string,
  payload: TUpdateCategoryPayloadType,
  files?: ICategoryFiles,
) => {
  // ?? Check category exists
  const existingCategory = await Category.findById(id);

  if (!existingCategory) {
    throw new NotFoundError("Category not found");
  }

  const {
    nameBn,
    nameEn,
    collectionId,
    description,
    metaTitle,
    metaDescription,
  } = payload;

  // Do Collection Validation:
  if (
    collectionId &&
    collectionId?.toString() !== existingCategory.collectionId?.toString()
  ) {
    // Check is collection exists:
    const existingColl = await Collection.findById(collectionId);

    if (!existingColl) {
      throw new NotFoundError("Collection not found.");
    }

    if (existingColl.status !== COLLECTION_STATUS.PUBLISHED) {
      throw new BadRequest(
        "Category can only be created under a published collection.",
      );
    }

    existingCategory.collectionId = existingColl._id;
  }

  // Duplicate validation and name changed:
  const categoryName = nameEn !== undefined ? nameEn : existingCategory.nameEn;
  const slug = createSlug(categoryName);

  const duplicateSlug = await Category.findOne({
    _id: {
      $ne: existingCategory._id,
    },
    collectionId: existingCategory.collectionId,
    slug,
  });

  if (duplicateSlug) {
    throw new ConflictError(
      "The category exists with this same name under this collection.",
    );
  }

  existingCategory.nameEn = categoryName;
  existingCategory.slug = slug;
  if (nameBn !== undefined) existingCategory.nameBn = nameBn;
  if (description !== undefined) existingCategory.description = description;
  if (metaTitle !== undefined) existingCategory.metaTitle = metaTitle;
  if (metaDescription !== undefined)
    existingCategory.metaDescription = metaDescription;

  // New Files :
  const iconFile = files?.icon?.[0];
  const ogImageFile = files?.ogImage?.[0];

  // Upload file:
  const oldUrls: string[] = [];
  const newUrls: string[] = [];

  try {
    if (iconFile) {
      const uploadedIcon = await uploadFileIntoCloudinary(
        iconFile,
        File_FOLDER_NAME.CATEGORY_ICON,
      );

      if (uploadedIcon?.secure_url) {
        if (existingCategory.icon) oldUrls.push(existingCategory.icon);
        existingCategory.icon = uploadedIcon?.secure_url as string;
        newUrls.push(uploadedIcon.secure_url);
      }
    }

    if (ogImageFile) {
      const uploadedOgImage = await uploadFileIntoCloudinary(
        ogImageFile,
        File_FOLDER_NAME.OG_IMAGE,
      );

      if (uploadedOgImage?.secure_url) {
        if (existingCategory.ogImage) oldUrls.push(existingCategory.ogImage);
        existingCategory.ogImage = uploadedOgImage?.secure_url as string;
        newUrls.push(uploadedOgImage.secure_url);
      }
    }

    await existingCategory.save({ validateBeforeSave: true });

    deleteFilesByUrls(oldUrls);
  } catch (error) {
    deleteFilesByUrls(newUrls);

    throw error;
  }
};

// 3. GET ALL CATEGORY
const getAllCategory = async (query: TGetAllCategoryQueryParamsType) => {
  const { collectionId, status, collectionStatus, projection } = query;
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, categorySortableFields);

  const pipeline: PipelineStage[] = [];

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  const conditions: PipelineStage.Match = {
    $match: {},
  };

  if (collectionId) {
    conditions.$match["collectionId"] = new Types.ObjectId(collectionId);
  }

  pipeline.push(
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
              name: 1,
              slug: 1,
              icon: 1,
              status: 1,
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
  );

  const categoryProjectionFields =
    categoryProjection?.[
      (projection as "list" | "details" | "options") || "details"
    ];

  pipeline.push({
    $project: categoryProjectionFields,
  });

  if (status !== undefined) {
    conditions.$match["status"] = status;
  }

  if (collectionStatus !== undefined) {
    conditions.$match["collectionStatus"] = collectionStatus;
  }

  pipeline.push(conditions);

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: categorySearchableFields.map((field) => ({
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

  const aggregated = await Category.aggregate(pipeline);

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

// 3.1 GET ALL ACTIVE CATEGORY:
const getAllPublishedCategory = async (
  query: TGetAllPublishedCategoryQueryParamsType,
) => {
  return await getAllCategory({
    status: categoryStatus.PUBLISHED,
    collectionStatus: COLLECTION_STATUS.PUBLISHED,
    ...query,
  });
};

// 4. GET CATEGORY BY ID
const getCategoryById = async (id: string) => {
  const result = await Category.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return result;
};

// 5. DELETE CATEGORY BY ID
const deleteCategoryById = async (id: string) => {
  const result = await Category.findOneAndDelete({ _id: id });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  const oldImageUrls: string[] = [];

  if (result.icon) oldImageUrls.push(result.icon);
  if (result.ogImage) oldImageUrls.push(result.ogImage);

  if (oldImageUrls?.length > 0) {
    Promise.all(oldImageUrls.map((url) => deleteFileByUrl(url))).catch(
      (err) => {
        console.log(err);
      },
    );
  }

  return result;
};

// 6. Mark As Published:
const markAsPublished = async (id: string) => {
  console.log(id);
  // 1. Get category :
  const category = await Category.findById(id);
  if (!category) {
    throw new NotFoundError("Category not found.");
  }

  // 2. Get Collection:
  const collection = await Collection.findById(category?.collectionId);

  if (!collection) {
    throw new NotFoundError("Collection not found.");
  }

  // 3. Check collection status:
  if (collection.status !== COLLECTION_STATUS.PUBLISHED) {
    throw new BadRequest(
      `Cannot publish category because the collection status is ${collection.status}. The collection must be published first.`,
    );
  }

  // 4. Check the category is archived?:
  if (category.status === categoryStatus.ARCHIVED) {
    throw new BadRequest("You cannot publish an archived category.");
  }

  // 5. Check the category is already published:
  if (category.status === categoryStatus.PUBLISHED) {
    throw new BadRequest("This category has already been published.");
  }

  // 6. Publish the category:
  category.status = categoryStatus.PUBLISHED;
  category.publishedAt = new Date();

  await category.save({
    validateBeforeSave: true,
  });

  return category;
};

// 7. Mark as Archived:
const markAsArchived = async (id: string) => {
  // 1. Get category :
  const category = await Category.findById(id);
  if (!category) {
    throw new NotFoundError("Category not found.");
  }

  // 2. Check this category is in draft status:
  if (category.status === categoryStatus.DRAFT) {
    throw new BadRequest("You cannot archived a drafted category.");
  }

  // 3. Check this is category already archived?:
  if (category.status === categoryStatus.ARCHIVED) {
    throw new BadRequest("This category has already been archived.");
  }

  // 4. Archiving......
  category.status = categoryStatus.ARCHIVED;
  category.archivedAt = new Date();

  // 5. Find Track under this category:
  const tracks = await Track.find({
    category: category?._id,
    status: {
      $in: [trackStatus.DRAFT, trackStatus.PUBLISHED],
    },
  })
    .select({
      _id: 1,
    })
    .lean();

  // 6. Get Track ids:
  const trackIds = tracks?.map((item) => item?._id).filter(Boolean);

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    // 1. Update the category
    await category.save({
      session: mongoSession,
    });

    // 2. Move all draft and published tracked to archived:
    await Track.updateMany(
      {
        _id: {
          $in: trackIds,
        },
      },
      {
        $set: {
          status: trackStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      },
      {
        session: mongoSession,
      },
    );

    await mongoSession.commitTransaction();
  } catch (err) {
    await mongoSession.abortTransaction();
    throw err;
  } finally {
    await mongoSession.endSession();
  }
};
export const categoryServices = {
  createCategory,
  updateCategory,
  getAllCategory,
  getCategoryById,
  deleteCategoryById,
  getAllPublishedCategory,
  markAsPublished,
  markAsArchived,
};
