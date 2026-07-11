import { z } from "zod";
import { GovConPriority, GovConTaskStatus } from "@prisma/client";
import { optionalDate, optionalNullableText, stringArray } from "@/lib/validation/common";

/** A single checklist item stored in `GovConTask.checklistJson`. */
export const checklistItemSchema = z.object({
  text: z.string().trim().min(1).max(500),
  done: z.coerce.boolean().default(false),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

const taskBase = z.object({
  title: z.string().trim().min(1, "Title is required").max(300).optional(),
  description: optionalNullableText,
  opportunityId: optionalNullableText,
  proposalId: optionalNullableText,
  assigneeId: optionalNullableText,
  priority: z.nativeEnum(GovConPriority).optional(),
  status: z.nativeEnum(GovConTaskStatus).optional(),
  startDate: optionalDate,
  dueAt: optionalDate,
  tags: stringArray.optional(),
  watchers: stringArray.optional(),
  checklist: z.array(checklistItemSchema).optional(),
});

export const createTaskSchema = taskBase.extend({
  title: z.string().trim().min(1, "Title is required").max(300),
});

export const updateTaskSchema = taskBase.extend({
  /** Optimistic concurrency guard — the version the client last read. */
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

export const changeTaskStatusSchema = z.object({
  status: z.nativeEnum(GovConTaskStatus),
});

export const taskFilterSchema = z.object({
  opportunityId: z.string().optional(),
  status: z.nativeEnum(GovConTaskStatus).optional(),
  assigneeId: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;
