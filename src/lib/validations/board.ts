import { z } from 'zod';

// ==================== POST VALIDATIONS ====================

export const createPostSchema = z.object({
  boardId: z.string().uuid('유효하지 않은 게시판입니다'),
  title: z
    .string()
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자를 초과할 수 없습니다'),
  content: z.string().min(1, '내용을 입력해주세요'),
  contentHtml: z.string().optional(),
  isPinned: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
});

export const updatePostSchema = z.object({
  postId: z.string().uuid('유효하지 않은 게시물입니다'),
  title: z
    .string()
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자를 초과할 수 없습니다')
    .optional(),
  content: z.string().min(1, '내용을 입력해주세요').optional(),
  contentHtml: z.string().optional(),
  status: z.enum(['published', 'draft', 'hidden', 'deleted']).optional(),
});

export const deletePostSchema = z.object({
  postId: z.string().uuid('유효하지 않은 게시물입니다'),
});

// ==================== COMMENT VALIDATIONS ====================

export const createCommentSchema = z.object({
  postId: z.string().uuid('유효하지 않은 게시물입니다'),
  content: z
    .string()
    .min(1, '댓글 내용을 입력해주세요')
    .max(2000, '댓글은 2000자를 초과할 수 없습니다'),
  parentId: z.string().uuid().optional(),
});

export const toggleCommentLikeSchema = z.object({
  commentId: z.string().uuid('유효하지 않은 댓글입니다'),
});

// ==================== INTERACTION VALIDATIONS ====================

export const togglePostLikeSchema = z.object({
  postId: z.string().uuid('유효하지 않은 게시물입니다'),
});

export const toggleBookmarkSchema = z.object({
  postId: z.string().uuid('유효하지 않은 게시물입니다'),
});

export const reportPostSchema = z.object({
  postId: z.string().uuid('유효하지 않은 게시물입니다'),
  reason: z
    .string()
    .min(10, '신고 사유는 최소 10자 이상 입력해주세요')
    .max(500, '신고 사유는 500자를 초과할 수 없습니다'),
});

// ==================== QUERY VALIDATIONS ====================

export const getPostsSchema = z.object({
  boardSlug: z.string().min(1, '게시판을 선택해주세요'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.enum(['latest', 'popular', 'comments', 'views']).default('latest'),
  search: z.string().optional(),
  searchTarget: z.enum(['title', 'content', 'title_content', 'author']).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ToggleCommentLikeInput = z.infer<typeof toggleCommentLikeSchema>;
export type TogglePostLikeInput = z.infer<typeof togglePostLikeSchema>;
export type ToggleBookmarkInput = z.infer<typeof toggleBookmarkSchema>;
export type ReportPostInput = z.infer<typeof reportPostSchema>;
export type GetPostsInput = z.infer<typeof getPostsSchema>;
