import httpStatus from "http-status";
import { collectionServices } from "./collection.services";
import { sendResponse, catchAsync, getUserFromRequest } from "../../utils";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import type { ICollectionFiles } from "./collection.interfaces";

// 1. CREATE COLLECTION
const createCollection = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const files = req.files as unknown as ICollectionFiles;
   const result = await collectionServices.createCollection(
      user,
      req.body,
      files,
   );

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "The collection created successfully!",
      data: result,
   });
});

// 2. UPDATE COLLECTION
const updateCollection = catchAsync(async (req, res) => {
   const files = req.files as unknown as ICollectionFiles;
   const result = await collectionServices.updateCollection(
      req.params.id as string,
      req.body,
      files,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The collection updated successfully!",
      data: result,
   });
});

// 3. GET ALL COLLECTION
const getAllCollection = catchAsync(async (req, res) => {
   const result = await collectionServices.getAllCollection(req.validQuery);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The collection retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});
// 3.1. GET ALL COLLECTION
const getAllPublishedCollection = catchAsync(async (req, res) => {
   const result = await collectionServices.getAllPublishedCollections(
      req.validQuery,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "All published collection are retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});

// 4. GET COLLECTION BY ID
const getCollectionById = catchAsync(async (req, res) => {
   const result = await collectionServices.getCollectionById(
      req.params.id as string,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The collection retrieved successfully!",
      data: result,
   });
});

// 5. DELETE COLLECTION BY ID
const deleteCollectionById = catchAsync(async (req, res) => {
   const result = await collectionServices.deleteCollectionById(
      req.params.id as string,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The collection deleted successfully!",
      data: result,
   });
});

// 6. Mark as Published
const markAsPublished = catchAsync(async (req, res) => {
   const result = await collectionServices.markAsPublished(
      req.params.id as string,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Collection published successfully.",
      data: result,
   });
});

// 7. Mark as Archived
const markAsArchived = catchAsync(async (req, res) => {
   const result = await collectionServices.markAsArchived(
      req.params.id as string,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Collection archived successfully.",
      data: result,
   });
});

export const collectionControllers = {
   createCollection,
   updateCollection,
   getAllCollection,
   getCollectionById,
   deleteCollectionById,
   getAllPublishedCollection,
   markAsPublished,
   markAsArchived,
};
