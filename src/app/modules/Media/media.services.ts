import httpStatus from "http-status";
import type { PipelineStage, Types } from "mongoose";
import type {
  TCreateMediaPayloadType,
  TUpdateMediaPayloadType,
  TGetAllMediaQueryParamsType,
} from "./media.validations";
import { AppError, BadRequest } from "../../errors";
import { Media } from "./media.model";
import { MEDIA_STATUS, mediaSearchableFields } from "./media.constants";
import type { IUser } from "../User";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import {
  deleteFileByUrl,
  getPublicId,
} from "@/app/utils/cloudinary/delete-file";
import moment from "moment";
import { logger } from "@/app/utils";
import { deleteFilesByUrls } from "@/app/utils/cloudinary/delete-files";

// 1. CREATE MEDIA
const createMedia = async (userId: Types.ObjectId, file: TMulterFile) => {
  // Check  is file exists ?:
  if (!file) {
    throw new BadRequest("Image file is  required.");
  }

  const uploadedFile = await uploadFileIntoCloudinary(
    file,
    File_FOLDER_NAME.MEDIA,
  );

  if (!uploadedFile?.secure_url) {
    throw new BadRequest("Failed to upload image.");
  }

  try {
    // Saved media:
    const savedMedia = await Media.create({
      url: uploadedFile?.secure_url,
      publicId: uploadedFile.public_id,
      status: MEDIA_STATUS.UNATTACHED,
      uploadedBy: userId,
    });

    if (!savedMedia) {
      throw new BadRequest("Failed to save media.");
    }

    return savedMedia;
  } catch (error) {
    deleteFileByUrl(uploadedFile.secure_url).catch((err) => console.log(err));
    throw error;
  }
};

// 2. Attach images by urls:
const attachImages = async (urls: string[]) => {
  // public Ids
  const publicIds = urls.map((url) => getPublicId(url)).filter(Boolean);

  // validate public Ids:
  if (publicIds?.length < 1) {
    throw new BadRequest("No. public id found for url.");
  }

  await Media.updateMany(
    {
      publicId: {
        $in: publicIds,
      },
    },
    {
      $set: {
        status: MEDIA_STATUS.ATTACHED,
      },
    },
    {
      runValidators: true,
    },
  );
};

// 3. Unattach images urls:
const unattachImages = async (urls: string[]) => {
  // public Ids
  const publicIds = urls.map((url) => getPublicId(url)).filter(Boolean);

  // validate public Ids:
  if (publicIds?.length < 1) {
    throw new BadRequest("No. public id found for url.");
  }

  await Media.updateMany(
    {
      publicId: {
        $in: publicIds,
      },
    },
    {
      $set: {
        status: MEDIA_STATUS.UNATTACHED,
      },
    },
    {
      runValidators: true,
    },
  );
};

// 4. Delete unattached images via corn job (24  hour time frame) per day 100:
const removeOrphanedImages = async () => {
  const now = moment();
  const twentyFourHourAgo = now.clone().subtract(1, "day")?.toDate();

  // Find first 100 orphaned images:
  const orphanedImages = await Media.find({
    status: MEDIA_STATUS.UNATTACHED,
    createdAt: {
      $lte: twentyFourHourAgo,
    },
  })
    .select({
      _id: 1,
      url: 1,
    })
    .limit(100)
    .lean();

  if (!orphanedImages?.length) {
    logger.info("No orphaned images found at =>", now.toLocaleString());
    return;
  }

  // Get all images urls:
  const imagesUrls = orphanedImages.map((img) => img.url).filter(Boolean);
  const imageIds = orphanedImages.map((img) => img._id).filter(Boolean);

  logger.info(`Found ${imageIds.length} orphaned images. Cleaning up...`);

  await deleteFilesByUrls(imagesUrls);

  const deleteResult = await Media.deleteMany({
    _id: {
      $in: imageIds,
    },
  });

  logger.info(
    `Successfully removed ${deleteResult.deletedCount} orphaned images.`,
  );
};

// 2. UPDATE MEDIA
const updateMedia = async (id: string, payload: TUpdateMediaPayloadType) => {
  const result = await Media.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Media not found");
  }

  return result;
};

// 3. GET ALL MEDIA
const getAllMedia = async (query: TGetAllMediaQueryParamsType) => {
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, mediaSortableFields);

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
        $or: mediaSearchableFields.map((field) => ({
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

  const aggregated = await Media.aggregate(pipeline);

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

// 4. GET MEDIA BY ID
const getMediaById = async (id: string) => {
  const result = await Media.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Media not found");
  }

  return result;
};

// 5. DELETE MEDIA BY ID
const deleteMediaById = async (id: string) => {
  const result = await Media.findOneAndDelete({ _id: id });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Media not found");
  }

  return result;
};

export const mediaServices = {
  createMedia,
  updateMedia,
  getAllMedia,
  getMediaById,
  deleteMediaById,
};
