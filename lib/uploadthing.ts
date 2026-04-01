import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  audioUploader: f({
    audio: { maxFileSize: "128MB", maxFileCount: 1 },
    "blob": { maxFileSize: "128MB", maxFileCount: 1 },
  })
    .onUploadComplete(async ({ file }) => {
      console.log("[UploadThing] Audio:", file.name, file.size);
      return { url: file.url, key: file.key, name: file.name };
    }),

  coverUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, key: file.key };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof uploadRouter;
