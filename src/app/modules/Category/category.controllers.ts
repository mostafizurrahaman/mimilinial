import httpStatus from "http-status";
import { categoryServices } from "./category.services";
import { sendResponse, catchAsync, getUserFromRequest } from "../../utils";

// 1. CREATE CATEGORY
const createCategory = catchAsync(async (req, res) => {
   const iconFile = req.file;
   const user = await getUserFromRequest(req);
   const result = await categoryServices.createCategory(
      user,
      req.body,
      iconFile,
   );

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "The category created successfully!",
      data: result,
   });
});

// 2. UPDATE CATEGORY
const updateCategory = catchAsync(async (req, res) => {
   const iconFile = req.file;
   const categoryId = req.params.id as string;
   const result = await categoryServices.updateCategory(
      categoryId as string,
      req.body,
      iconFile,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The category updated successfully!",
      data: result,
   });
});

// 3. GET ALL CATEGORY
const getAllCategory = catchAsync(async (req, res) => {
   const result = await categoryServices.getAllCategory(req.validQuery);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "All categories retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});

const getAllActiveCategory = catchAsync(async (req, res) => {
   const result = await categoryServices.getAllActiveCategory(req.validQuery);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "All active categories retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});

// 4. GET CATEGORY BY ID
const getCategoryById = catchAsync(async (req, res) => {
   const result = await categoryServices.getCategoryById(
      req.params.id as string,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The category retrieved successfully!",
      data: result,
   });
});

// 5. DELETE CATEGORY BY ID
const deleteCategoryById = catchAsync(async (req, res) => {
   const result = await categoryServices.deleteCategoryById(
      req.params.id as string,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The category deleted successfully!",
      data: result,
   });
});

export const categoryControllers = {
   createCategory,
   updateCategory,
   getAllCategory,
   getCategoryById,
   deleteCategoryById,
   getAllActiveCategory,
};
