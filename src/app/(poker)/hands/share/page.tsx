'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, GameType, TableSize, Position, Street, ActionType } from '@/types/poker';
import { CardSelector } from '@/components/poker/CardSelector';
import { InlineCards } from '@/components/poker/CardRenderer';
import { TableVisualizer, PlayerSeat } from '@/components/poker/TableVisualizer';
import { createHand } from '../../actions';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';

const POSITIONS_6MAX: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
const POSITIONS_9MAX: Position[] = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

const TAGS = ['블러프', '밸류', '폴드', '쿨러', '배드빗', '블라인드디펜스', '3벳팟', '멀티웨이', '숏스택', '딥스택'];

interface ActionInput {
  position: Position;
  action: ActionType;
  amount?: number;
}

const ACTION_TYPES: ActionType[] = ['fold', 'check', 'call', 'bet', 'raise', 'all-in'];
const ACTION_LABELS: Record<ActionType, string> = {
  fold: '폴드',
  check: '체크',
  call: '콜',
  bet: '벳',
  raise: '레이즈',
  'all-in': '올인',
};
const AMOUNT_REQUIRED: ActionType[] = ['bet', 'raise', 'all-in'];

interface ActionInputStepProps {
  positions: Position[];
  flopCards: Card[];
  turnCard: Card[];
  riverCard: Card[];
  preflopActions: ActionInput[];
  setPreflopActions: (v: ActionInput[]) => void;
  flopActions: ActionInput[];
  setFlopActions: (v: ActionInput[]) => void;
  turnActions: ActionInput[];
  setTurnActions: (v: ActionInput[]) => void;
  riverActions: ActionInput[];
  setRiverActions: (v: ActionInput[]) => void;
}

function StreetActionPanel({
  actions,
  setActions,
  positions,
}: {
  actions: ActionInput[];
  setActions: (v: ActionInput[]) => void;
  positions: Position[];
}) {
  const [position, setPosition] = useState<Position>(positions[0]);
  const [actionType, setActionType] = useState<ActionType>('fold');
  const [amount, setAmount] = useState('');

  const needsAmount = AMOUNT_REQUIRED.includes(actionType);

  function addAction() {
    const entry: ActionInput = { position, action: actionType };
    if (needsAmount && amount) entry.amount = Number(amount);
    setActions([...actions, entry]);
    setAmount('');
  }

  function removeAction(idx: number) {
    setActions(actions.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* Recorded actions list */}
      {actions.length > 0 && (
        <div className="space-y-1">
          {actions.map((a, i) => (
            <div key={i} className="flex items-center justify-between bg-op-elevated rounded-lg px-3 py-2 text-sm">
              <span className="text-op-text">
                <span className="font-semibold text-op-gold">{a.position}</span>
                <span className="mx-1 text-op-text-secondary">—</span>
                <span>{ACTION_LABELS[a.action]}</span>
                {a.amount != null && (
                  <span className="ml-1 text-op-text-secondary">{a.amount.toLocaleString()}</span>
                )}
              </span>
              <button
                onClick={() => removeAction(i)}
                className="ml-2 text-op-text-muted hover:text-red-400 transition-colors font-bold leading-none"
                aria-label="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add action form */}
      <div className="bg-op-elevated border border-op-border rounded-lg p-3 space-y-3">
        {/* Position dropdown */}
        <div>
          <label className="block text-xs text-op-text-secondary mb-1">포지션</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
            className="w-full px-3 py-2 bg-op-surface border border-op-border rounded-lg text-op-text text-sm focus:border-op-gold focus:outline-none"
          >
            {positions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Action type buttons */}
        <div>
          <label className="block text-xs text-op-text-secondary mb-1">액션</label>
          <div className="flex flex-wrap gap-1.5">
            {ACTION_TYPES.map((a) => (
              <button
                key={a}
                onClick={() => setActionType(a)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  actionType === a
                    ? 'bg-op-gold text-black'
                    : 'bg-op-surface border border-op-border text-op-text hover:border-op-gold'
                )}
              >
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* Amount input (conditional) */}
        {needsAmount && (
          <div>
            <label className="block text-xs text-op-text-secondary mb-1">금액</label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-op-surface border border-op-border rounded-lg text-op-text text-sm focus:border-op-gold focus:outline-none"
            />
          </div>
        )}

        {/* Add button */}
        <button
          onClick={addAction}
          disabled={needsAmount && !amount}
          className="w-full py-2 rounded-lg text-sm font-semibold bg-op-gold text-black hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          추가
        </button>
      </div>
    </div>
  );
}

function ActionInputStep({
  positions,
  flopCards,
  turnCard,
  riverCard,
  preflopActions,
  setPreflopActions,
  flopActions,
  setFlopActions,
  turnActions,
  setTurnActions,
  riverActions,
  setRiverActions,
}: ActionInputStepProps) {
  const streets = [
    { key: 'preflop', label: '프리플랍', always: true },
    { key: 'flop',    label: '플랍',     always: flopCards.length === 3 },
    { key: 'turn',    label: '턴',       always: turnCard.length === 1 },
    { key: 'river',   label: '리버',     always: riverCard.length === 1 },
  ].filter((s) => s.always);

  const [activeStreet, setActiveStreet] = useState<string>(streets[0].key);

  const actionMap: Record<string, { actions: ActionInput[]; setActions: (v: ActionInput[]) => void }> = {
    preflop: { actions: preflopActions, setActions: setPreflopActions },
    flop:    { actions: flopActions,    setActions: setFlopActions },
    turn:    { actions: turnActions,    setActions: setTurnActions },
    river:   { actions: riverActions,   setActions: setRiverActions },
  };

  const current = actionMap[activeStreet];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">액션 추가 (선택사항)</h2>
      <p className="text-sm text-op-text-secondary">각 스트릿별로 액션을 기록하세요</p>

      {/* Street tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {streets.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveStreet(s.key)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeStreet === s.key
                ? 'bg-op-gold text-black'
                : 'bg-op-elevated border border-op-border text-op-text hover:border-op-gold'
            )}
          >
            {s.label}
            {actionMap[s.key].actions.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({actionMap[s.key].actions.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Active street panel */}
      <StreetActionPanel
        key={activeStreet}
        actions={current.actions}
        setActions={current.setActions}
        positions={positions}
      />
    </div>
  );
}

export default function ShareHandPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Game info
  const [gameType, setGameType] = useState<GameType>('cash');
  const [tableSize, setTableSize] = useState<TableSize>('6max');
  const [stakes, setStakes] = useState('1/2');

  // Step 2: Hero position
  const [heroPosition, setHeroPosition] = useState<Position | null>(null);

  // Step 3: Hero cards
  const [heroCards, setHeroCards] = useState<Card[]>([]);

  // Step 4: Board cards
  const [flopCards, setFlopCards] = useState<Card[]>([]);
  const [turnCard, setTurnCard] = useState<Card[]>([]);
  const [riverCard, setRiverCard] = useState<Card[]>([]);

  // Step 5: Actions
  const [preflopActions, setPreflopActions] = useState<ActionInput[]>([]);
  const [flopActions, setFlopActions] = useState<ActionInput[]>([]);
  const [turnActions, setTurnActions] = useState<ActionInput[]>([]);
  const [riverActions, setRiverActions] = useState<ActionInput[]>([]);

  // Step 5.5: Result
  const [result, setResult] = useState<'won' | 'lost' | 'split'>('won');

  // Step 6: Analysis notes
  const [notes, setNotes] = useState('');

  // Step 7: Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const positions = tableSize === '6max' ? POSITIONS_6MAX : POSITIONS_9MAX;
  const allSelectedCards = [...heroCards, ...flopCards, ...turnCard, ...riverCard];

  const canProceed = () => {
    if (step === 1) return stakes.length > 0;
    if (step === 2) return heroPosition !== null;
    if (step === 3) return heroCards.length === 2;
    return true;
  };

  const handleSubmit = async () => {
    if (!heroPosition) return;

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('gameType', gameType);
    formData.append('tableSize', tableSize);
    formData.append('stakes', stakes);
    formData.append('heroPosition', heroPosition);
    formData.append('heroCards', JSON.stringify(heroCards));
    formData.append('boardFlop', JSON.stringify(flopCards));
    formData.append('boardTurn', JSON.stringify(turnCard));
    formData.append('boardRiver', JSON.stringify(riverCard));
    formData.append('preflopActions', JSON.stringify(preflopActions));
    formData.append('flopActions', JSON.stringify(flopActions));
    formData.append('turnActions', JSON.stringify(turnActions));
    formData.append('riverActions', JSON.stringify(riverActions));
    formData.append('result', result);
    formData.append('notes', notes);
    formData.append('tags', JSON.stringify(selectedTags));

    try {
      const result = await createHand(formData);
      if (result.success) {
        router.push(`/hands/${result.handId}`);
      }
    } catch (error) {
      console.error('Failed to create hand:', error);
      alert('핸드 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build preview data
  const previewSeats: PlayerSeat[] = positions.map(pos => ({
    position: pos,
    stack: 200,
    isHero: pos === heroPosition,
    isActive: false,
  }));

  const communityCards = [
    ...flopCards.map(c => c),
    ...turnCard.map(c => c),
    ...riverCard.map(c => c),
  ].join(' ');

  return (
    <div className="min-h-screen bg-op-bg text-op-text">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-op-surface border-b border-op-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-op-text-secondary hover:text-op-text transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>취소</span>
          </button>
          <h1 className="text-lg font-bold text-op-gold">핸드 공유하기</h1>
          <div className="w-16" />
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-op-elevated">
          <div
            className="h-full bg-op-gold transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Step 1: Game Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">게임 정보</h2>

                <div>
                  <label className="block text-sm text-op-text-secondary mb-2">게임 타입</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGameType('cash')}
                      className={cn(
                        'py-3 rounded-lg font-medium transition-all',
                        gameType === 'cash'
                          ? 'bg-op-gold text-black'
                          : 'bg-op-elevated text-op-text-secondary hover:bg-op-elevated'
                      )}
                    >
                      캐시 게임
                    </button>
                    <button
                      onClick={() => setGameType('tournament')}
                      className={cn(
                        'py-3 rounded-lg font-medium transition-all',
                        gameType === 'tournament'
                          ? 'bg-op-gold text-black'
                          : 'bg-op-elevated text-op-text-secondary hover:bg-op-elevated'
                      )}
                    >
                      토너먼트
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-op-text-secondary mb-2">테이블 사이즈</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTableSize('6max')}
                      className={cn(
                        'py-3 rounded-lg font-medium transition-all',
                        tableSize === '6max'
                          ? 'bg-op-gold text-black'
                          : 'bg-op-elevated text-op-text-secondary hover:bg-op-elevated'
                      )}
                    >
                      6-Max
                    </button>
                    <button
                      onClick={() => setTableSize('9max')}
                      className={cn(
                        'py-3 rounded-lg font-medium transition-all',
                        tableSize === '9max'
                          ? 'bg-op-gold text-black'
                          : 'bg-op-elevated text-op-text-secondary hover:bg-op-elevated'
                      )}
                    >
                      9-Max
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-op-text-secondary mb-2">스테이크</label>
                  <input
                    type="text"
                    value={stakes}
                    onChange={(e) => setStakes(e.target.value)}
                    placeholder="예: 1/2, 2/5, 5/10"
                    className="w-full px-4 py-3 bg-op-elevated border border-op-border rounded-lg text-op-text placeholder:text-op-text-muted focus:border-op-gold focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Hero Position */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">히어로 포지션 선택</h2>
                <p className="text-sm text-op-text-secondary">당신이 앉은 위치를 선택하세요</p>

                <div className="grid grid-cols-3 gap-2">
                  {positions.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setHeroPosition(pos)}
                      className={cn(
                        'py-4 rounded-lg font-bold transition-all',
                        heroPosition === pos
                          ? 'bg-op-gold text-black shadow-[0_0_12px_rgba(201,162,39,0.4)]'
                          : 'bg-op-elevated text-op-text-secondary hover:bg-op-elevated'
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Hero Cards */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">히어로 카드</h2>
                <p className="text-sm text-op-text-secondary">당신의 홀 카드 2장을 선택하세요</p>

                {heroCards.length > 0 && (
                  <div className="flex justify-center">
                    <InlineCards notation={heroCards.join(' ')} size="lg" />
                  </div>
                )}

                <CardSelector
                  selectedCards={heroCards}
                  disabledCards={allSelectedCards.filter(c => !heroCards.includes(c))}
                  maxSelect={2}
                  onSelect={setHeroCards}
                />
              </div>
            )}

            {/* Step 4: Board Cards */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">보드 카드 (선택사항)</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-op-text-secondary mb-2">플랍 (3장)</label>
                    {flopCards.length > 0 && (
                      <div className="flex justify-center mb-2">
                        <InlineCards notation={flopCards.join(' ')} size="md" />
                      </div>
                    )}
                    <CardSelector
                      selectedCards={flopCards}
                      disabledCards={allSelectedCards.filter(c => !flopCards.includes(c))}
                      maxSelect={3}
                      onSelect={setFlopCards}
                    />
                  </div>

                  {flopCards.length === 3 && (
                    <div>
                      <label className="block text-sm text-op-text-secondary mb-2">턴 (1장)</label>
                      {turnCard.length > 0 && (
                        <div className="flex justify-center mb-2">
                          <InlineCards notation={turnCard.join(' ')} size="md" />
                        </div>
                      )}
                      <CardSelector
                        selectedCards={turnCard}
                        disabledCards={allSelectedCards.filter(c => !turnCard.includes(c))}
                        maxSelect={1}
                        onSelect={setTurnCard}
                      />
                    </div>
                  )}

                  {turnCard.length === 1 && (
                    <div>
                      <label className="block text-sm text-op-text-secondary mb-2">리버 (1장)</label>
                      {riverCard.length > 0 && (
                        <div className="flex justify-center mb-2">
                          <InlineCards notation={riverCard.join(' ')} size="md" />
                        </div>
                      )}
                      <CardSelector
                        selectedCards={riverCard}
                        disabledCards={allSelectedCards.filter(c => !riverCard.includes(c))}
                        maxSelect={1}
                        onSelect={setRiverCard}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Actions */}
            {step === 5 && (
              <ActionInputStep
                positions={positions}
                flopCards={flopCards}
                turnCard={turnCard}
                riverCard={riverCard}
                preflopActions={preflopActions}
                setPreflopActions={setPreflopActions}
                flopActions={flopActions}
                setFlopActions={setFlopActions}
                turnActions={turnActions}
                setTurnActions={setTurnActions}
                riverActions={riverActions}
                setRiverActions={setRiverActions}
              />
            )}

            {/* Step 6: Analysis Notes */}
            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">분석 노트</h2>
                <p className="text-sm text-op-text-secondary">
                  이 핸드에서 궁금한 점이나 생각을 적어주세요
                </p>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="예: 플랍에서 체크레이즈가 맞을까요? 턴에서 폴드해야 했을까요?"
                  rows={6}
                  className="w-full px-4 py-3 bg-op-elevated border border-op-border rounded-lg text-op-text placeholder:text-op-text-muted focus:border-op-gold focus:outline-none resize-none"
                />
              </div>
            )}

            {/* Step 7: Tags */}
            {step === 7 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">태그 선택</h2>
                <p className="text-sm text-op-text-secondary">이 핸드와 관련된 태그를 선택하세요</p>

                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-op-gold text-black'
                            : 'bg-op-elevated text-op-text-secondary hover:bg-op-elevated border border-op-border'
                        )}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="lg:sticky lg:top-20 h-fit">
            <div className="bg-op-surface rounded-lg p-4 border border-op-border">
              <h3 className="text-sm font-bold text-op-text-secondary mb-4">미리보기</h3>

              {heroPosition && (
                <TableVisualizer
                  seats={previewSeats}
                  communityCards={communityCards || undefined}
                  maxSeats={tableSize === '6max' ? 6 : 9}
                />
              )}

              {heroCards.length === 2 && (
                <div className="mt-4 flex justify-center">
                  <div className="text-center">
                    <div className="text-xs text-op-text-secondary mb-1">히어로 카드</div>
                    <InlineCards notation={heroCards.join(' ')} size="md" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-op-surface border-t border-op-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className={cn(
              'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
              step === 1
                ? 'bg-op-elevated text-op-text-muted cursor-not-allowed'
                : 'bg-op-elevated text-op-text hover:bg-op-elevated'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            이전
          </button>

          <div className="text-sm text-op-text-secondary">
            {step} / 7
          </div>

          {step < 7 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className={cn(
                'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
                canProceed()
                  ? 'bg-op-gold text-black hover:bg-op-gold-hover'
                  : 'bg-op-elevated text-op-text-muted cursor-not-allowed'
              )}
            >
              다음
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className={cn(
                'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
                canProceed() && !isSubmitting
                  ? 'bg-op-gold text-black hover:bg-op-gold-hover'
                  : 'bg-op-elevated text-op-text-muted cursor-not-allowed'
              )}
            >
              {isSubmitting ? '저장 중...' : '핸드 공유'}
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
