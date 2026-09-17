import slugify from "slugify";

export const createSlug = (text: string): string => {
   return slugify(text.replace(/-/g, ""), {
      lower: true,
      strict: true,
      trim: true,
   });
};
