import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
  TCreateSubjectPayloadType,
  TUpdateSubjectPayloadType,
  TGetAllSubjectQueryParamsType,
  TGetAllPublishedSubjectQueryParamsType,
} from "./subject.validations";
import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import { Subject } from "./subject.model";
import {
  SUBJECT_STATUS,
  subjectProjections,
  subjectSearchableFields,
  subjectSortableFields,
} from "./subject.constants";
import type { IUserDoc } from "../User";
import type { ISubjectFiles } from "./subject.interfaces";
import { createSlug, formatQuery } from "@/app/utils";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import { deleteFilesByUrls } from "@/app/utils/cloudinary/delete-files";

// 1. CREATE SUBJECT
const createSubject = async (
  user: IUserDoc,
  payload: TCreateSubjectPayloadType,
  files: ISubjectFiles,
) => {
  const {
    nameBn,
    nameEn,
    code,
    colorCode,
    isFeatured,
    sortOrder,
    description,
    metaDescription,
    metaTitle,
  } = payload;

  //  Find is any subject already exists with this code?:
  const duplicateCode = await Subject.findOne({
    code,
  });

  if (duplicateCode) {
    throw new ConflictError("Already have a subject with this subject code.");
  }

  // Create Slug:
  const slug = createSlug(nameEn);
  const duplicateSlug = await Subject.findOne({
    slug,
  });
  if (duplicateSlug) {
    throw new ConflictError("Already have a subject with this slug.");
  }

  // Extract Files:
  const iconFile = files?.icon?.[0];
  const ogImageFile = files?.ogImage?.[0];

  const newUrls: string[] = [];
  let iconUrl: string | null = null;
  let ogImageUrl: string | null = null;

  try {
    if (iconFile) {
      const uploadedIcon = await uploadFileIntoCloudinary(
        iconFile,
        File_FOLDER_NAME.SUBJECT_ICON,
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

    console.log({
      iconUrl,
      ogImageUrl,
    });

    // Create the subject:
    const sub = await Subject.create({
      nameBn,
      nameEn,
      slug,
      code,
      colorCode,
      icon: iconUrl,
      description,
      sortOrder,
      isFeatured,
      status: SUBJECT_STATUS.DRAFT,
      metaTitle,
      metaDescription,
      ogImage: ogImageUrl,
      author: user?._id,
    });

    return sub;
  } catch (error) {
    deleteFilesByUrls(newUrls);

    throw error;
  }
};

// 2. UPDATE SUBJECT
const updateSubject = async (
  id: string,
  payload: TUpdateSubjectPayloadType,
  files: ISubjectFiles,
) => {
  // Check is subject exists:
  const subject = await Subject.findById(id);

  if (!subject) {
    throw new NotFoundError("Subject not found.");
  }

  // Check code changed:
  if (payload.code !== undefined && payload.code !== subject.code) {
    const duplicateCode = await Subject.findOne({
      _id: {
        $ne: subject._id,
      },
      code: payload.code,
    });
    if (duplicateCode) {
      throw new ConflictError("Already have a subject with this subject code.");
    }
  }

  let slug = subject.slug;
  // Check name changed:
  if (payload.nameEn !== undefined && payload.nameEn !== subject.nameEn) {
    const newSlug = createSlug(payload.nameEn);

    const duplicateSlug = await Subject.findOne({
      _id: {
        $ne: subject._id,
      },
      slug: newSlug,
    });

    if (duplicateSlug) {
      throw new ConflictError("Already have a subject with this name.");
    }

    slug = newSlug;
  }

  const updateData = Object.fromEntries(
    Object.entries(payload).filter((data) => data?.[1] !== undefined),
  );

  if (slug) {
    updateData.slug = slug;
  }

  // Get files:
  const iconFile = files?.icon?.[0];
  const ogImageFile = files?.ogImage?.[0];

  const newUrls: string[] = [];
  const oldUrls: string[] = [];

  try {
    if (iconFile) {
      const updatedIcon = await uploadFileIntoCloudinary(
        iconFile,
        File_FOLDER_NAME.SUBJECT_ICON,
      );

      if (updatedIcon?.secure_url) {
        if (subject.icon) oldUrls.push(subject.icon);
        newUrls.push(updatedIcon.secure_url);
        updateData.icon = updatedIcon.secure_url;
      }
    }

    if (ogImageFile) {
      const updatedOgImage = await uploadFileIntoCloudinary(
        ogImageFile,
        File_FOLDER_NAME.OG_IMAGE,
      );

      if (updatedOgImage?.secure_url) {
        if (subject.ogImage) oldUrls.push(subject.ogImage);
        newUrls.push(updatedOgImage.secure_url);
        updateData.ogImage = updatedOgImage.secure_url;
      }
    }

    const result = await Subject.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Failed to update subject");
    }

    deleteFilesByUrls(oldUrls);
    return result;
  } catch (error) {
    deleteFilesByUrls(newUrls);

    throw error;
  }
};

// 3. GET ALL SUBJECT
const getAllSubject = async (query: TGetAllSubjectQueryParamsType) => {
  const { isFeatured, status, projection } = query;
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, subjectSortableFields);

  const pipeline: PipelineStage[] = [];

  const matchStage: PipelineStage.Match = { $match: {} };

  if (status !== undefined) {
    matchStage.$match["status"] = status;
  }

  if (isFeatured !== undefined) {
    matchStage.$match["isFeatured"] = isFeatured;
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
        $or: subjectSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      },
    });
  }

  const fields = subjectProjections[projection as "list" | "details"];

  pipeline.push({
    $project: fields,
  });

  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await Subject.aggregate(pipeline);

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

// 3.1 Get active all subject:
const getAllPublishedSubject = async (
  query: TGetAllPublishedSubjectQueryParamsType,
) => {
  return getAllSubject({
    ...query,
    status: SUBJECT_STATUS.PUBLISHED,
  });
};

// 4. GET SUBJECT BY ID
const getSubjectById = async (id: string) => {
  const result = await Subject.findById(id);

  if (!result) {
    throw new NotFoundError("Subject not found");
  }

  // if (result.status !== SUBJECT_STATUS.PUBLISHED) {
  //   throw new BadRequest("The subject is not published.");
  // }

  return result;
};

// 4.1 Get Subject by slug:
const getSubjectBySlug = async (slug: string) => {
  console.log({ slug });
  const result = await Subject.findOne({ slug });

  if (!result) {
    throw new NotFoundError("Subject not found");
  }

  // if (result.status !== SUBJECT_STATUS.PUBLISHED) {
  //   throw new BadRequest("The subject is not published.");
  // }
  return result;
};

// 5. DELETE SUBJECT BY ID
const deleteSubjectById = async (id: string) => {
  const result = await Subject.findOneAndDelete({ _id: id });

  if (!result) {
    throw new NotFoundError("Subject not found");
  }

  const urls = [];

  if (result.icon) urls.push(result.icon);
  if (result.ogImage) urls.push(result.ogImage);

  deleteFilesByUrls(urls);

  return result;
};

// 6. Mark As Published:
const markAsPublished = async (id: string) => {
  const subject = await Subject.findById(id);

  if (!subject) {
    throw new NotFoundError("Subject not found.");
  }

  if (subject.status === SUBJECT_STATUS.ARCHIVED) {
    throw new BadRequest("You cannot publish an archived subject.");
  }

  if (subject.status === SUBJECT_STATUS.PUBLISHED) {
    throw new BadRequest("This subject has already been published.");
  }

  subject.status = SUBJECT_STATUS.PUBLISHED;
  subject.publishedAt = new Date();

  await subject.save({ validateBeforeSave: true });

  return subject;
};

// 7. Mark As Archived:
const markAsArchived = async (id: string) => {
  const subject = await Subject.findById(id);

  if (!subject) {
    throw new NotFoundError("Subject not found.");
  }

  if (subject.status === SUBJECT_STATUS.DRAFT) {
    throw new BadRequest("You cannot archive a drafted subject.");
  }

  if (subject.status === SUBJECT_STATUS.ARCHIVED) {
    throw new BadRequest("This subject has already been archived.");
  }

  subject.status = SUBJECT_STATUS.ARCHIVED;
  subject.isFeatured = false;
  subject.archivedAt = new Date();

  await subject.save({ validateBeforeSave: true });

  return subject;
};

// 8. Toggle Featured
const toggleFeatured = async (id: string) => {
  const subject = await Subject.findById(id);

  // Subject not found
  if (!subject) {
    throw new NotFoundError("Subject not found.");
  }

  // Draft subject cannot be featured
  if (subject.status === SUBJECT_STATUS.DRAFT && subject.isFeatured === false) {
    throw new BadRequest("You cannot feature a draft subject.");
  }

  // Archived subject cannot be toggled
  if (subject.status === SUBJECT_STATUS.ARCHIVED) {
    throw new BadRequest("You cannot toggle featured for an archived subject.");
  }

  subject.isFeatured = !subject.isFeatured;

  await subject.save({ validateBeforeSave: true });

  return {
    message: subject?.isFeatured
      ? "Subject has been marked as featured."
      : "Subject has been removed from featured.",
  };
};

export const subjectServices = {
  createSubject,
  updateSubject,
  getAllSubject,
  getSubjectById,
  getSubjectBySlug,
  deleteSubjectById,
  getAllPublishedSubject,
  markAsPublished,
  markAsArchived,
  toggleFeatured,
};
