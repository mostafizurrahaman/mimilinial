import multer from "multer";
import { multerFileFilter } from "./multer-file-filter";
import type { FileValidationConfig } from "../../interfaces/multer.types";


export const multerFactory = (config: FileValidationConfig) => {
   const { maxSizeInMB = 10 } = config;

   return multer({
      storage: multer.memoryStorage(),
      limits: {
         fileSize: maxSizeInMB * 1024 * 1024, // bytes
      },
      fileFilter: multerFileFilter(config),
   });
};
