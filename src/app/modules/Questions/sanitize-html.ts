import sanitizeHtml from "sanitize-html";

export const sanitizeHtmlContent = (dirtyHtml: string): string => {
  if (!dirtyHtml) return "";

  return sanitizeHtml(dirtyHtml, {
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "s",
      "sub",
      "sup",
      "p",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
      "blockquote",
      "span",
      "img",
    ],
    allowedAttributes: {
      img: ["src", "alt", "width", "height"],
      span: ["class", "style"], // গণিত/সংকেতের ক্লাসের জন্য
      p: ["style"],
    },
    allowedSchemes: ["http", "https", "data"],
  }).trim();
};
