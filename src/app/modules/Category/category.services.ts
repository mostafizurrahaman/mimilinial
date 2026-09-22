import httpStatus from "http-status";
import { Types, type PipelineStage } from "mongoose";
import type {
  TCreateCategoryPayloadType,
  TUpdateCategoryPayloadType,
  TGetAllCategoryQueryParamsType,
  TGetAllActiveCategoryQueryParamsType,
} from "./category.validations";
import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import { Category } from "./category.model";
import {
  categorySearchableFields,
  categorySortableFields,
} from "./category.constants";
import type { IUserDoc } from "../User";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Collection } from "../Collection";
import { createSlug, formatQuery, logger } from "@/app/utils";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import { deleteFileByUrl } from "@/app/utils/cloudinary/delete-file";
import type { ICategoryFiles } from "./category.interfaces";

// 1. CREATE CATEGORY
const createCategory = async (
  user: IUserDoc,
  payload: TCreateCategoryPayloadType,
  files?: ICategoryFiles,
) => {
  const {
    name,
    collectionId,
    description,
    isActive,
    metaTitle,
    metaDescription,
  } = payload;

  // ?? Check is collection exists
  const collection = await Collection.findById(collectionId);

  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  // ?? Generate slug
  const slug = createSlug(name);

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

  try {
    // ?? Create category
    const result = await Category.create({
      name: name.trim(),
      slug,
      collectionId,
      description: description?.trim(),
      metaTitle,
      metaDescription,
      isActive: isActive ?? true,
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
    name,
    collectionId,
    description,
    isActive,
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

    existingCategory.collectionId = existingColl._id;
  }

  // Duplicate validation and name changed:
  const categoryName = name !== undefined ? name : existingCategory.name;
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

  existingCategory.name = categoryName;
  existingCategory.slug = slug;

  if (isActive !== undefined) existingCategory.isActive = isActive;
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

  try {
    await existingCategory.save({ validateBeforeSave: true });

    if (oldUrls.length > 0) {
      Promise.all(oldUrls.map((url) => deleteFileByUrl(url))).catch((err) => {
        console.log(err);
      });
    }
  } catch (error) {
    if (newUrls.length > 0) {
      Promise.all(newUrls.map((url) => deleteFileByUrl(url))).catch((err) => {
        console.log(err);
      });
    }

    throw error;
  }
};

// 3. GET ALL CATEGORY
const getAllCategory = async (query: TGetAllCategoryQueryParamsType) => {
  const { collectionId, isActive, isCollectionActive } = query;
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, categorySortableFields);

  console.log({
    collectionId,
    isActive,
  });

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
              isActive: 1,
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
        _id: 0,
        categoryId: "$_id",
        name: "$name",
        slug: "$slug",
        icon: { $ifNull: ["$icon", null] },
        ogImage: { $ifNull: ["$ogImage", null] },
        description: {
          $ifNull: ["$description", null],
        },
        isActive: "$isActive",
        author: "$author",
        metaTitle: {
          $ifNull: ["$metaTitle", null],
        },
        metaDescription: {
          $ifNull: ["$metaDescription", null],
        },
        collectionId: "$collectionId",
        collectionName: "$collectionDetails.name",
        collectionSlug: "$collectionDetails.slug",
        collectionIcon: { $ifNull: ["$collectionDetails.icon", null] },
        isCollectionActive: "$collectionDetails.isActive",
        createdAt: "$createdAt",
        updatedAt: "$updatedAt",
      },
    },
  );

  if (isActive !== undefined) {
    conditions.$match["isActive"] = isActive;
  }

  if (isCollectionActive !== undefined) {
    conditions.$match["isCollectionActive"] = isCollectionActive;
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
const getAllActiveCategory = async (
  query: TGetAllActiveCategoryQueryParamsType,
) => {
  return await getAllCategory({
    isActive: true,
    isCollectionActive: true,
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

export const categoryServices = {
  createCategory,
  updateCategory,
  getAllCategory,
  getCategoryById,
  deleteCategoryById,
  getAllActiveCategory,
};
