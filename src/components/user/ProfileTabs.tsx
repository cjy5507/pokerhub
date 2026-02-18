'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Eye, Heart, MessageSquare } from 'lucide-react';

type Post = {
  id: string;
  title: string;
  boardSlug: string;
  createdAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

type PokerHand = {
  id: string;
  gameType: string;
  stakes: string;
  result: string;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
};

type ProfileTabsProps = {
  userId: string;
  recentPosts: Post[];
  recentHands: PokerHand[];
};

export function ProfileTabs({ userId, recentPosts, recentHands }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'hands'>('posts');

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === 'posts'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            게시글 ({recentPosts.length})
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('hands')}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === 'hands'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            핸드 히스토리 ({recentHands.length})
            {activeTab === 'hands' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {recentPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              작성한 게시글이 없습니다
            </div>
          ) : (
            recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${post.boardSlug}/${post.id}`}
                className="block bg-surface border border-border rounded-lg p-4 hover:border-primary transition-colors"
              >
                <h3 className="font-medium mb-2">{post.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {format(new Date(post.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {post.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {post.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {post.commentCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'hands' && (
        <div className="space-y-4">
          {recentHands.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              공유한 핸드가 없습니다
            </div>
          ) : (
            recentHands.map((hand) => (
              <Link
                key={hand.id}
                href={`/hands/${hand.id}`}
                className="block bg-surface border border-border rounded-lg p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{hand.gameType.toUpperCase()}</span>
                    <span className="text-muted-foreground">{hand.stakes}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      hand.result === 'win'
                        ? 'bg-success/20 text-success'
                        : hand.result === 'loss'
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {hand.result === 'win' ? '승리' : hand.result === 'loss' ? '패배' : '무승부'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {format(new Date(hand.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {hand.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {hand.commentCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
