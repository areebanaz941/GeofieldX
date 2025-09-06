import mongoose from "mongoose";

let cachedBucket: mongoose.mongo.GridFSBucket | null = null;

function ensureBucket(): mongoose.mongo.GridFSBucket {
  if (cachedBucket) return cachedBucket;
  const connection = mongoose.connection;
  if (!connection || !connection.db) {
    throw new Error("MongoDB is not connected. Ensure setupDatabase() has run before using GridFS.");
  }
  cachedBucket = new mongoose.mongo.GridFSBucket(connection.db, { bucketName: "images" });
  return cachedBucket;
}

export async function uploadBufferToGridFS(buffer: Buffer, filename: string, contentType?: string): Promise<string> {
  const bucket = ensureBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: contentType || "application/octet-stream",
      metadata: { filename },
    });
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => {
      resolve(uploadStream.id.toString());
    });
    uploadStream.end(buffer);
  });
}

export function openGridFSDownloadStream(id: string) {
  const bucket = ensureBucket();
  const objectId = new mongoose.Types.ObjectId(id);
  return bucket.openDownloadStream(objectId);
}

export async function getGridFSFileInfo(id: string): Promise<any | null> {
  const bucket = ensureBucket();
  const objectId = new mongoose.Types.ObjectId(id);
  const cursor = bucket.find({ _id: objectId });
  const files = await cursor.toArray();
  return files[0] || null;
}

export async function deleteGridFSFile(id: string): Promise<void> {
  const bucket = ensureBucket();
  const objectId = new mongoose.Types.ObjectId(id);
  await bucket.delete(objectId);
}

