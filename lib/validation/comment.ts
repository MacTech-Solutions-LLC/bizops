import { z } from "zod";
import { optionalNullableText } from "@/lib/validation/common";

export const createCommentSchema = z
  .object({
    body: z.string().trim().min(1, "Comment cannot be empty").max(10_000),
    opportunityId: optionalNullableText,
    taskId: optionalNullableText,
    entityType: optionalNullableText,
    entityId: optionalNullableText,
    parentCommentId: optionalNullableText,
    /** Explicit list of mentioned Hub user ids (in addition to @[name](id) parsing). */
    mentionedUserIds: z
      .union([z.array(z.string()), z.string(), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null) return undefined;
        if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean);
        return v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }),
  })
  .refine(
    (v) => Boolean(v.opportunityId || v.taskId || (v.entityType && v.entityId)),
    { message: "A comment must target an opportunity, a task, or an entity.", path: ["entityId"] },
  );

export const commentTargetSchema = z
  .object({
    opportunityId: z.string().optional(),
    taskId: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
  })
  .refine(
    (v) => Boolean(v.opportunityId || v.taskId || (v.entityType && v.entityId)),
    { message: "A target is required.", path: ["entityId"] },
  );

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CommentTarget = z.infer<typeof commentTargetSchema>;
