import { describe, it, expect } from 'vitest';
import {
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  createCommentSchema,
  togglePostLikeSchema,
  toggleBookmarkSchema,
  toggleCommentLikeSchema,
  reportPostSchema,
  getPostsSchema,
} from '@/lib/validations/board';
import { createTestUUID } from '../helpers/mocks';

// ==================== createPostSchema ====================

describe('createPostSchema', () => {
  const validBase = {
    boardId: createTestUUID(),
    title: '테스트 게시글 제목',
    content: '게시글 내용입니다.',
  };

  it('accepts a fully valid input', () => {
    const result = createPostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('applies default false for isPinned and isFeatured when omitted', () => {
    const result = createPostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPinned).toBe(false);
      expect(result.data.isFeatured).toBe(false);
    }
  });

  it('accepts optional fields when provided', () => {
    const result = createPostSchema.safeParse({
      ...validBase,
      contentHtml: '<p>내용</p>',
      isPinned: true,
      isFeatured: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentHtml).toBe('<p>내용</p>');
      expect(result.data.isPinned).toBe(true);
      expect(result.data.isFeatured).toBe(true);
    }
  });

  it('fails when title is missing', () => {
    const { title, ...noTitle } = validBase;
    const result = createPostSchema.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it('fails when title is an empty string', () => {
    const result = createPostSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('제목을 입력해주세요');
    }
  });

  it('fails when title exceeds 200 characters', () => {
    const result = createPostSchema.safeParse({
      ...validBase,
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('제목은 200자를 초과할 수 없습니다');
    }
  });

  it('accepts title exactly at 200 characters', () => {
    const result = createPostSchema.safeParse({
      ...validBase,
      title: 'a'.repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it('fails when boardId is not a UUID', () => {
    const result = createPostSchema.safeParse({ ...validBase, boardId: 'not-a-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('유효하지 않은 게시판입니다');
    }
  });

  it('fails when boardId is missing', () => {
    const { boardId, ...noBoardId } = validBase;
    const result = createPostSchema.safeParse(noBoardId);
    expect(result.success).toBe(false);
  });

  it('fails when content is empty', () => {
    const result = createPostSchema.safeParse({ ...validBase, content: '' });
    expect(result.success).toBe(false);
  });
});

// ==================== updatePostSchema ====================

describe('updatePostSchema', () => {
  const validBase = {
    postId: createTestUUID(),
  };

  it('accepts a valid input with postId only (all other fields optional)', () => {
    const result = updatePostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('accepts all optional fields when provided', () => {
    const result = updatePostSchema.safeParse({
      postId: createTestUUID(),
      title: '수정된 제목',
      content: '수정된 내용',
      contentHtml: '<p>수정된 내용</p>',
      status: 'draft',
    });
    expect(result.success).toBe(true);
  });

  it('fails when postId is not a UUID', () => {
    const result = updatePostSchema.safeParse({ postId: 'bad-id' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('유효하지 않은 게시물입니다');
    }
  });

  it('fails when postId is missing', () => {
    const result = updatePostSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when title is provided but empty', () => {
    const result = updatePostSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
  });

  it('fails when title exceeds 200 characters', () => {
    const result = updatePostSchema.safeParse({
      ...validBase,
      title: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('fails when status is an invalid enum value', () => {
    const result = updatePostSchema.safeParse({ ...validBase, status: 'archived' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid status enum values', () => {
    const validStatuses = ['published', 'draft', 'hidden', 'deleted'] as const;
    for (const status of validStatuses) {
      const result = updatePostSchema.safeParse({ ...validBase, status });
      expect(result.success).toBe(true);
    }
  });
});

// ==================== deletePostSchema ====================

describe('deletePostSchema', () => {
  it('accepts a valid UUID postId', () => {
    const result = deletePostSchema.safeParse({ postId: createTestUUID() });
    expect(result.success).toBe(true);
  });

  it('fails when postId is not a UUID', () => {
    const result = deletePostSchema.safeParse({ postId: 'invalid-id' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('유효하지 않은 게시물입니다');
    }
  });

  it('fails when postId is missing', () => {
    const result = deletePostSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when postId is an empty string', () => {
    const result = deletePostSchema.safeParse({ postId: '' });
    expect(result.success).toBe(false);
  });
});

// ==================== createCommentSchema ====================

describe('createCommentSchema', () => {
  const validBase = {
    postId: createTestUUID(),
    content: '좋은 게시글이네요!',
  };

  it('accepts valid input without parentId', () => {
    const result = createCommentSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with a parentId UUID (nested reply)', () => {
    const result = createCommentSchema.safeParse({
      ...validBase,
      parentId: createTestUUID(),
    });
    expect(result.success).toBe(true);
  });

  it('parentId is optional and can be omitted', () => {
    const result = createCommentSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBeUndefined();
    }
  });

  it('fails when content is empty', () => {
    const result = createCommentSchema.safeParse({ ...validBase, content: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('댓글 내용을 입력해주세요');
    }
  });

  it('fails when content exceeds 2000 characters', () => {
    const result = createCommentSchema.safeParse({
      ...validBase,
      content: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('댓글은 2000자를 초과할 수 없습니다');
    }
  });

  it('accepts content exactly at 2000 characters', () => {
    const result = createCommentSchema.safeParse({
      ...validBase,
      content: 'a'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it('fails when postId is not a UUID', () => {
    const result = createCommentSchema.safeParse({ ...validBase, postId: 'bad' });
    expect(result.success).toBe(false);
  });

  it('fails when parentId is provided but not a UUID', () => {
    const result = createCommentSchema.safeParse({
      ...validBase,
      parentId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

// ==================== togglePostLikeSchema ====================

describe('togglePostLikeSchema', () => {
  it('accepts a valid UUID postId', () => {
    const result = togglePostLikeSchema.safeParse({ postId: createTestUUID() });
    expect(result.success).toBe(true);
  });

  it('fails when postId is not a UUID', () => {
    const result = togglePostLikeSchema.safeParse({ postId: 'not-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('유효하지 않은 게시물입니다');
    }
  });

  it('fails when postId is missing', () => {
    const result = togglePostLikeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ==================== toggleBookmarkSchema ====================

describe('toggleBookmarkSchema', () => {
  it('accepts a valid UUID postId', () => {
    const result = toggleBookmarkSchema.safeParse({ postId: createTestUUID() });
    expect(result.success).toBe(true);
  });

  it('fails when postId is not a UUID', () => {
    const result = toggleBookmarkSchema.safeParse({ postId: 'bad-id' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('유효하지 않은 게시물입니다');
    }
  });

  it('fails when postId is missing', () => {
    const result = toggleBookmarkSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ==================== toggleCommentLikeSchema ====================

describe('toggleCommentLikeSchema', () => {
  it('accepts a valid UUID commentId', () => {
    const result = toggleCommentLikeSchema.safeParse({ commentId: createTestUUID() });
    expect(result.success).toBe(true);
  });

  it('fails when commentId is not a UUID', () => {
    const result = toggleCommentLikeSchema.safeParse({ commentId: 'bad-id' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('유효하지 않은 댓글입니다');
    }
  });

  it('fails when commentId is missing', () => {
    const result = toggleCommentLikeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ==================== reportPostSchema ====================

describe('reportPostSchema', () => {
  const validBase = {
    postId: createTestUUID(),
    reason: '스팸 게시물입니다. 삭제 요청합니다.',
  };

  it('accepts a valid input', () => {
    const result = reportPostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('fails when reason is shorter than 10 characters', () => {
    const result = reportPostSchema.safeParse({ ...validBase, reason: '스팸임' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('신고 사유는 최소 10자 이상 입력해주세요');
    }
  });

  it('accepts reason exactly at 10 characters', () => {
    const result = reportPostSchema.safeParse({
      ...validBase,
      reason: 'a'.repeat(10),
    });
    expect(result.success).toBe(true);
  });

  it('fails when reason exceeds 500 characters', () => {
    const result = reportPostSchema.safeParse({
      ...validBase,
      reason: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('신고 사유는 500자를 초과할 수 없습니다');
    }
  });

  it('accepts reason exactly at 500 characters', () => {
    const result = reportPostSchema.safeParse({
      ...validBase,
      reason: 'a'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('fails when postId is not a UUID', () => {
    const result = reportPostSchema.safeParse({ ...validBase, postId: 'bad' });
    expect(result.success).toBe(false);
  });

  it('fails when reason is missing', () => {
    const { reason, ...noReason } = validBase;
    const result = reportPostSchema.safeParse(noReason);
    expect(result.success).toBe(false);
  });
});

// ==================== getPostsSchema ====================

describe('getPostsSchema', () => {
  const validBase = {
    boardSlug: 'free',
  };

  it('accepts valid input with only boardSlug (defaults applied)', () => {
    const result = getPostsSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('applies default page=1 when omitted', () => {
    const result = getPostsSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it('applies default limit=20 when omitted', () => {
    const result = getPostsSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('applies default sort="latest" when omitted', () => {
    const result = getPostsSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe('latest');
    }
  });

  it('accepts all valid sort enum values', () => {
    const validSorts = ['latest', 'popular', 'comments', 'views'] as const;
    for (const sort of validSorts) {
      const result = getPostsSchema.safeParse({ ...validBase, sort });
      expect(result.success).toBe(true);
    }
  });

  it('fails when sort is an invalid value', () => {
    const result = getPostsSchema.safeParse({ ...validBase, sort: 'trending' });
    expect(result.success).toBe(false);
  });

  it('fails when boardSlug is an empty string', () => {
    const result = getPostsSchema.safeParse({ boardSlug: '' });
    expect(result.success).toBe(false);
  });

  it('fails when boardSlug is missing', () => {
    const result = getPostsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts page and limit overrides', () => {
    const result = getPostsSchema.safeParse({ ...validBase, page: 3, limit: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('fails when limit exceeds 100', () => {
    const result = getPostsSchema.safeParse({ ...validBase, limit: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts all valid searchTarget enum values', () => {
    const validTargets = ['title', 'content', 'title_content', 'author'] as const;
    for (const searchTarget of validTargets) {
      const result = getPostsSchema.safeParse({
        ...validBase,
        search: '검색어',
        searchTarget,
      });
      expect(result.success).toBe(true);
    }
  });

  it('searchTarget is optional and can be omitted', () => {
    const result = getPostsSchema.safeParse({ ...validBase, search: '검색어' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.searchTarget).toBeUndefined();
    }
  });

  it('fails when page is less than 1', () => {
    const result = getPostsSchema.safeParse({ ...validBase, page: 0 });
    expect(result.success).toBe(false);
  });

  it('fails when limit is less than 1', () => {
    const result = getPostsSchema.safeParse({ ...validBase, limit: 0 });
    expect(result.success).toBe(false);
  });
});
