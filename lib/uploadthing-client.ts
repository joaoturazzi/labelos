import { generateReactHelpers } from "@uploadthing/react";
import type { AppFileRouter } from "./uploadthing";

export const { useUploadThing } = generateReactHelpers<AppFileRouter>();
