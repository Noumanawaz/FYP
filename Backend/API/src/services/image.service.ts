import { AppError } from "@/middleware/error-handler";

interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: string;
    height: string;
    size: string;
    time: string;
    expiration: string;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

export class ImageService {
  private static readonly IMGBB_API_URL = "https://api.imgbb.com/1/upload";
  private static readonly IMGBB_API_KEY = process.env.IMGBB_API_KEY;

  /**
   * Upload image to imgBB
   * @param image - Base64 string, Buffer, or file path
   * @param name - Optional name for the image
   * @returns The uploaded image URL
   */
  static async uploadImage(image: string | Buffer, name?: string): Promise<string> {
    if (!this.IMGBB_API_KEY) {
      throw new AppError("IMGBB_API_KEY is not configured", 500);
    }

    try {
      // Use native FormData (Node.js 18+)
      const formData = new FormData();

      // Handle base64 string
      if (typeof image === "string") {
        // If it's a base64 string, add it directly
        if (image.startsWith("data:image")) {
          // Remove data:image/xxx;base64, prefix if present
          const base64Data = image.includes(",") ? image.split(",")[1] : image;
          formData.append("image", base64Data);
        } else {
          // Assume it's already base64 without prefix
          formData.append("image", image);
        }
      } else {
        // Handle Buffer - convert to base64
        const base64Image = image.toString("base64");
        formData.append("image", base64Image);
      }

      if (name) {
        formData.append("name", name);
      }

      const response = await fetch(`${this.IMGBB_API_URL}?key=${this.IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(`imgBB API error: ${response.statusText} - ${errorText}`, response.status);
      }

      const data = (await response.json()) as ImgBBResponse;

      if (!data.success || !data.data?.url) {
        throw new AppError("Failed to upload image to imgBB", 500);
      }

      return data.data.url;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Image upload failed: ${error.message}`, 500);
    }
  }

  /**
   * Upload multiple images to imgBB
   * @param images - Array of base64 strings or Buffers
   * @returns Array of uploaded image URLs
   */
  static async uploadMultipleImages(images: (string | Buffer)[]): Promise<string[]> {
    const uploadPromises = images.map((image, index) => this.uploadImage(image, `image_${index + 1}`));
    return Promise.all(uploadPromises);
  }

  /**
   * Convert file buffer to base64
   * @param buffer - File buffer
   * @returns Base64 string
   */
  static bufferToBase64(buffer: Buffer): string {
    return buffer.toString("base64");
  }
}
