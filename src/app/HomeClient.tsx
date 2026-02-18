'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ThumbsUp, Eye, Users, Gift } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/time';

interface PostData {
  id: string;
  title: string;
  boardSlug: string;
  author: string;
  authorId: string;
  level: number;
  views: number;
  likes: number;
  createdAt: string;
}

interface HomeClientProps {
  recentPosts: PostData[];
  strategyPosts: PostData[];
  handPosts: PostData[];
  hotPosts: PostData[];
}

export function HomeClient({ recentPosts, strategyPosts, handPosts, hotPosts }: HomeClientProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'strategy' | 'hands' | 'hot'>('recent');

  const tabContent = {
    recent: recentPosts,
    strategy: strategyPosts,
    hands: handPosts,
  };

  const currentPosts = activeTab === 'hot' ? hotPosts : tabContent[activeTab as 'recent' | 'strategy' | 'hands'];

  return (
    <div className="space-y-3 pb-20 lg:pb-8">
      {/* Mobile Top Bar - Pill Buttons */}
      <section className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 -mx-4 pb-2">
          <Link
            href="/attendance"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#333] rounded-full text-xs text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#666] transition-colors whitespace-nowrap"
          >
            <Gift className="w-3 h-3" />
            <span>출석체크</span>
          </Link>
          <Link
            href="/users/online"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#333] rounded-full text-xs text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#666] transition-colors whitespace-nowrap"
          >
            <Users className="w-3 h-3" />
            <span>접속자 142명</span>
          </Link>
          <Link
            href="/poker"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#333] rounded-full text-xs text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#666] transition-colors whitespace-nowrap"
          >
            <span>포인트포커</span>
          </Link>
        </div>
      </section>

      {/* Notice Banner */}
      <section className="bg-[#1e1e1e] border border-[#333] rounded px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-[#c9a227] font-semibold text-xs">공지</span>
          <Link
            href="/board/notice"
            className="flex-1 text-[#e0e0e0] hover:text-[#c9a227] transition-colors truncate text-sm"
          >
            2024 PokerHub 토너먼트 시즌 오픈 안내
          </Link>
        </div>
      </section>

      {/* Tab Bar */}
      <section>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-[#333] -mx-4 px-4">
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'recent'
                ? 'text-[#c9a227] border-[#c9a227]'
                : 'text-[#a0a0a0] border-transparent'
            }`}
          >
            자유게시판
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'strategy'
                ? 'text-[#c9a227] border-[#c9a227]'
                : 'text-[#a0a0a0] border-transparent'
            }`}
          >
            전략게시판
          </button>
          <button
            onClick={() => setActiveTab('hands')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'hands'
                ? 'text-[#c9a227] border-[#c9a227]'
                : 'text-[#a0a0a0] border-transparent'
            }`}
          >
            핸드공유
          </button>
          <button
            onClick={() => setActiveTab('hot')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'hot'
                ? 'text-[#c9a227] border-[#c9a227]'
                : 'text-[#a0a0a0] border-transparent'
            }`}
          >
            HOT
          </button>
        </div>

        {/* Post Feed */}
        <div className="bg-[#1e1e1e] border border-[#333] border-t-0 rounded-b">
          {/* Desktop Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-[#333] text-xs font-medium text-[#a0a0a0]">
            <div className="col-span-6">제목</div>
            <div className="col-span-2">작성자</div>
            <div className="col-span-1 text-center">조회</div>
            <div className="col-span-1 text-center">좋아요</div>
            <div className="col-span-2 text-center">작성일</div>
          </div>

          {/* Mobile Card Layout / Desktop Table Layout */}
          <div className="divide-y divide-[#333]">
            {currentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${post.boardSlug}/${post.id}`}
                className="block lg:grid lg:grid-cols-12 lg:gap-4 px-4 py-3 hover:bg-[#2a2a2a] transition-colors"
              >
                {/* Mobile: Card Layout */}
                <div className="lg:hidden space-y-2">
                  {/* Title */}
                  <h3 className="text-sm font-medium text-[#e0e0e0] line-clamp-2 leading-relaxed">
                    {post.title}
                  </h3>

                  {/* Meta Row */}
                  <div className="flex items-center justify-between text-xs text-[#888]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#a0a0a0]">{post.author}</span>
                      <span className="text-[10px]">Lv.{post.level}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{post.views}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{post.likes}</span>
                      </div>
                      <span>{formatRelativeTime(post.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop: Table Layout */}
                <div className="hidden lg:contents">
                  {/* Title */}
                  <div className="col-span-6 flex items-center">
                    <h3 className="text-sm text-[#e0e0e0] hover:text-[#c9a227] transition-colors truncate">
                      {post.title}
                    </h3>
                  </div>

                  {/* Author */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className="text-xs text-[#a0a0a0]">{post.author}</span>
                    <span className="text-[10px] text-[#888]">Lv.{post.level}</span>
                  </div>

                  {/* Views */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-xs text-[#888]">{post.views}</span>
                  </div>

                  {/* Likes */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-xs text-[#888]">{post.likes}</span>
                  </div>

                  {/* Time */}
                  <div className="col-span-2 flex items-center justify-center">
                    <span className="text-xs text-[#888]">{formatRelativeTime(post.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
