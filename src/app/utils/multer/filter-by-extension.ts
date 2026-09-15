import type {
   FileCategory,
   FileExtension,
   FileValidationConfig,
} from "../../interfaces/multer.types";
import httpStatus from "http-status";
import { FILE_CATEGORY_MAP } from "./constant";
import { AppError } from "../../errors";

export const isFileExtensionAllowed = (
   filename: string,
   config: FileValidationConfig,
) => {
   const extension = filename.split(".").pop()?.toLowerCase();

   if (!extension) return false;

   const categoryExtensions: FileExtension[] = [];

   if (
      config?.category &&
      Array.isArray(config?.category) &&
      config?.category?.length > 0
   ) {
      config?.category?.map((category) => {
         const extensions = FILE_CATEGORY_MAP?.[category!];

         categoryExtensions.push(...extensions);
      });
   }

   if (config?.category && !Array.isArray(config?.category)) {
      const extensions = FILE_CATEGORY_MAP?.[config.category!];
      categoryExtensions.push(...extensions);
   }

   const allowedExtensions: readonly FileExtension[] =
      config.allowedExtensions ?? (config?.category ? categoryExtensions : []);

   if (!allowedExtensions.length) {
      throw new AppError(
         httpStatus.BAD_REQUEST,
         "File filter config is invalid: no extensions defined",
      );
   }

   return allowedExtensions.includes(extension as FileExtension);
};
