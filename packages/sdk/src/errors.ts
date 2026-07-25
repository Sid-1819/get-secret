import type { NoteErrorCode } from "./types.js";

export type NoteErrorBody = {
  code?: NoteErrorCode;
  message?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: NoteErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function parseErrorBody(text: string): NoteErrorBody | undefined {
  try {
    return JSON.parse(text) as NoteErrorBody;
  } catch {
    return undefined;
  }
}
