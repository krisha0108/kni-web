import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Helper function to upload image from buffer
export async function uploadImage(
  fileBuffer: Buffer,
  folder: string,
  options?: {
    transformation?: any;
    public_id?: string;
  }
): Promise<{ url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `kni-super-app/${folder}`,
        resource_type: "image",
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        } else {
          reject(new Error("Upload failed"));
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// Helper function to delete image
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
}

// Helper function to upload a video from buffer (e.g. candidate intro videos)
export async function uploadVideo(
  fileBuffer: Buffer,
  folder: string,
  options?: {
    public_id?: string;
  }
): Promise<{ url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `kni-super-app/${folder}`,
        resource_type: "video",
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        } else {
          reject(new Error("Upload failed"));
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// Helper function to delete a video
export async function deleteVideo(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (error) {
    console.error("Error deleting video from Cloudinary:", error);
    throw error;
  }
}
