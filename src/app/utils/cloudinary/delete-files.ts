import { deleteFileByUrl } from "./delete-file";

export const deleteFilesByUrls = async (urls: string[]) => {
   if (!urls?.length) return;

   try {
      await Promise.all(urls.map((url) => deleteFileByUrl(url)));
   } catch (error) {
      console.log("Failed to delete files:", error);
   }
};
