/**
 * Extracts all Cloudinary image URLs from an array of HTML strings (or a single string).
 * Checks both 'src' and 'srcset' attributes inside <img> tags.
 * Returns a single flat array of unique URLs.
 */
export function extractCloudinaryImages(
  contents?: (string | null | undefined)[] | string | null,
): string[] {
  // 1. Normalize input into an array to handle both single strings and arrays of strings
  const contentArray = Array.isArray(contents) ? contents : [contents];

  const imageUrls = new Set<string>();

  const imgRegex = /<img\b[^>]*>/gi;
  const srcRegex = /\bsrc\s*=\s*["']([^"']+)["']/i;
  const srcsetRegex = /\bsrcset\s*=\s*["']([^"']+)["']/i;

  // Helper function to validate if a URL is a valid Cloudinary image URL
  const isCloudinaryUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);

      return (
        parsedUrl.protocol === "https:" &&
        parsedUrl.hostname === "res.cloudinary.com" &&
        // Check for standard Cloudinary structure: /cloud_name/image/upload/...
        /^\/[^/]+\/image\/upload\//.test(parsedUrl.pathname)
      );
    } catch {
      // Return false if URL parsing fails
      return false;
    }
  };

  // 2. Iterate through each HTML string in the array
  for (const html of contentArray) {
    // Skip empty, null, or non-string values
    if (!html || typeof html !== "string") continue;

    const imgTags = html.match(imgRegex) || [];

    for (const imgTag of imgTags) {
      // 3. Extract URL from the 'src' attribute
      const srcMatch = imgTag.match(srcRegex);
      if (srcMatch && srcMatch[1]) {
        const srcUrl = srcMatch[1].trim();

        if (isCloudinaryUrl(srcUrl)) {
          imageUrls.add(srcUrl);
        }
      }

      // 4. Extract URLs from the 'srcset' attribute
      const srcsetMatch = imgTag.match(srcsetRegex);
      if (srcsetMatch && srcsetMatch[1]) {
        const urls = srcsetMatch[1]
          .split(",")
          .map((item) => item.trim().split(/\s+/)[0]); // Remove size descriptors (e.g., 2x, 1024w)

        for (const url of urls) {
          if (url && isCloudinaryUrl(url)) {
            imageUrls.add(url);
          }
        }
      }
    }
  }

  // 5. Convert the Set to an Array to return only unique URLs
  return Array.from(imageUrls);
}
