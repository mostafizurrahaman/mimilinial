import slugify from "slugify";
import { slugify as bnSlugify,  } from "bn-translit";

export const createSlug = (text: string): string => {
   return slugify(text.replace(/-/g, ""), {
      lower: true,
      strict: true,
      trim: true,
   });
};

export const generateSlug = (text: string): string => {
   return bnSlugify(text);
};
