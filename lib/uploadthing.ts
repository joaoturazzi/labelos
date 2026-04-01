import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  audioUploader: f({
    audio: { maxFileSize: "64MB", maxFileCount: 1 },
    "blob": { maxFileSize: "64MB", maxFileCount: 1 },
  })
    .onUploadComplete(async ({ file }) => {
      console.log("Upload complete:", file.url);
      return { url: file.url, key: file.key };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof uploadRouter;
