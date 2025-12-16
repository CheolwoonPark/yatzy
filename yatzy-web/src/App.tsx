// Created by Cheolwoon Park
import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import './style.css';

type CategoryKey =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'threeOfKind'
  | 'fourOfKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'chance'
  | 'yacht';

type ScoreValue = number | '';

type Scores = Record<CategoryKey, ScoreValue>;

interface Player {
  id: number;
  name: string;
  scores: Scores;
}

interface PlayerTotals {
  playerId: number;
  upperSubtotal: number;
  bonus: number;
  lowerTotal: number;
  grandTotal: number;
}

interface WinnerState {
  winnerIds: number[];
  maxScore: number;
  snapshotKey: string;
}

interface Category {
  key: CategoryKey;
  label: string;
  section: 'upper' | 'lower';
  hint?: string;
}

const CATEGORIES: Category[] = [
  { key: 'ones', label: '1', section: 'upper', hint: '1만 합산' },
  { key: 'twos', label: '2', section: 'upper', hint: '2만 합산' },
  { key: 'threes', label: '3', section: 'upper', hint: '3만 합산' },
  { key: 'fours', label: '4', section: 'upper', hint: '4만 합산' },
  { key: 'fives', label: '5', section: 'upper', hint: '5만 합산' },
  { key: 'sixes', label: '6', section: 'upper', hint: '6만 합산' },
  { key: 'threeOfKind', label: '트리플', section: 'lower', hint: '같은 눈 3개 + 전체 합' },
  { key: 'fourOfKind', label: '포카드', section: 'lower', hint: '같은 눈 4개 + 전체 합' },
  { key: 'fullHouse', label: '풀하우스', section: 'lower', hint: '3+2 조합 (보통 25점)' },
  { key: 'smallStraight', label: '스몰 스트레이트', section: 'lower', hint: '4개 연속 (보통 30점)' },
  { key: 'largeStraight', label: '라지 스트레이트', section: 'lower', hint: '5개 연속 (보통 40점)' },
  { key: 'chance', label: '찬스', section: 'lower', hint: '전체 합' },
  { key: 'yacht', label: '요트', section: 'lower', hint: '같은 눈 5개 (보통 50점)' }
];

const INITIAL_SCORES: Scores = {
  ones: '',
  twos: '',
  threes: '',
  fours: '',
  fives: '',
  sixes: '',
  threeOfKind: '',
  fourOfKind: '',
  fullHouse: '',
  smallStraight: '',
  largeStraight: '',
  chance: '',
  yacht: ''
};

function calculateUpperSubtotal(scores: Scores): number {
  return (
    (scores.ones || 0) +
    (scores.twos || 0) +
    (scores.threes || 0) +
    (scores.fours || 0) +
    (scores.fives || 0) +
    (scores.sixes || 0)
  );
}

function calculateLowerTotal(scores: Scores): number {
  return (
    (scores.threeOfKind || 0) +
    (scores.fourOfKind || 0) +
    (scores.fullHouse || 0) +
    (scores.smallStraight || 0) +
    (scores.largeStraight || 0) +
    (scores.chance || 0) +
    (scores.yacht || 0)
  );
}

function calculateBonus(upperSubtotal: number): number {
  return upperSubtotal >= 63 ? 35 : 0;
}

function createInitialPlayer(id: number, index: number): Player {
  return {
    id,
    name: `플레이어 ${index + 1}`,
    scores: { ...INITIAL_SCORES }
  };
}

interface ScoreBoardProps {
  players: Player[];
  totalsByPlayer: PlayerTotals[];
  onScoreChange: (playerId: number, categoryKey: CategoryKey, rawValue: string) => void;
  onNameChange: (playerId: number, name: string) => void;
  onRemovePlayer: (playerId: number) => void;
}

// Desktop scoreboard UI created by Cheolwoon Park
const DesktopScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  totalsByPlayer,
  onScoreChange,
  onNameChange,
  onRemovePlayer
}) => {
  const getTotalsForPlayer = (playerId: number) =>
    totalsByPlayer.find(t => t.playerId === playerId)!;

  return (
    <div className="board-scroll">
      <table className="score-table">
        <thead>
          <tr>
            <th className="category-col">카테고리</th>
            {players.map(player => (
              <th key={player.id} className="player-col">
                <div className="player-header">
                  <input
                    className="player-name-input"
                    value={player.name}
                    onChange={e => onNameChange(player.id, e.target.value)}
                  />
                  {players.length > 1 && (
                    <button
                      type="button"
                      className="remove-player-button"
                      onClick={() => onRemovePlayer(player.id)}
                      aria-label={`${player.name} 제거`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="section-row">
            <td colSpan={players.length + 1}>상단 (숫자 합)</td>
          </tr>
          {CATEGORIES.filter(c => c.section === 'upper').map(category => (
            <tr key={category.key}>
              <td className="category-cell">
                <div className="category-main">
                  <span className="category-label">{category.label}</span>
                </div>
                {category.hint && <div className="category-hint">{category.hint}</div>}
              </td>
              {players.map(player => {
                const value = player.scores[category.key];
                return (
                  <td key={player.id} className="score-cell">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="score-input"
                      value={value === '' ? '' : value}
                      onChange={e =>
                        onScoreChange(player.id, category.key, e.target.value)
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}

          <tr className="summary-row">
            <td className="category-cell">
              <div className="category-main">
                <span className="category-label">상단 합계</span>
              </div>
              <div className="category-hint">1~6 합</div>
            </td>
            {players.map(player => {
              const totals = getTotalsForPlayer(player.id);
              return (
                <td key={player.id} className="summary-value-cell">
                  {totals.upperSubtotal}
                </td>
              );
            })}
          </tr>

          <tr className="summary-row">
            <td className="category-cell">
              <div className="category-main">
                <span className="category-label">보너스</span>
              </div>
              <div className="category-hint">상단 합계 63점 이상일 때 +35점</div>
            </td>
            {players.map(player => {
              const totals = getTotalsForPlayer(player.id);
              return (
                <td key={player.id} className="summary-value-cell">
                  {totals.bonus}
                </td>
              );
            })}
          </tr>

          <tr className="section-row">
            <td colSpan={players.length + 1}>하단 (조합 점수)</td>
          </tr>
          {CATEGORIES.filter(c => c.section === 'lower').map(category => (
            <tr key={category.key}>
              <td className="category-cell">
                <div className="category-main">
                  <span className="category-label">{category.label}</span>
                </div>
                {category.hint && <div className="category-hint">{category.hint}</div>}
              </td>
              {players.map(player => {
                const value = player.scores[category.key];
                return (
                  <td key={player.id} className="score-cell">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="score-input"
                      value={value === '' ? '' : value}
                      onChange={e =>
                        onScoreChange(player.id, category.key, e.target.value)
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}

          <tr className="summary-row">
            <td className="category-cell">
              <div className="category-main">
                <span className="category-label">하단 합계</span>
              </div>
            </td>
            {players.map(player => {
              const totals = getTotalsForPlayer(player.id);
              return (
                <td key={player.id} className="summary-value-cell">
                  {totals.lowerTotal}
                </td>
              );
            })}
          </tr>

          <tr className="grand-total-row">
            <td className="category-cell">
              <div className="category-main">
                <span className="category-label">총점</span>
              </div>
            </td>
            {players.map(player => {
              const totals = getTotalsForPlayer(player.id);
              return (
                <td key={player.id} className="grand-total-value">
                  {totals.grandTotal}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Mobile-friendly scoreboard UI created by Cheolwoon Park
const MobileScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  totalsByPlayer,
  onScoreChange,
  onNameChange,
  onRemovePlayer
}) => {
  const getTotalsForPlayer = (playerId: number) =>
    totalsByPlayer.find(t => t.playerId === playerId)!;

  return (
    <div className="mobile-board">
      {players.map(player => {
        const totals = getTotalsForPlayer(player.id);
        return (
          <section key={player.id} className="mobile-player-card">
            <header className="mobile-player-header">
              <input
                className="player-name-input"
                value={player.name}
                onChange={e => onNameChange(player.id, e.target.value)}
              />
              {players.length > 1 && (
                <button
                  type="button"
                  className="remove-player-button"
                  onClick={() => onRemovePlayer(player.id)}
                  aria-label={`${player.name} 제거`}
                >
                  ×
                </button>
              )}
            </header>

            <div className="mobile-section">
              <div className="mobile-section-title">상단 (숫자 합)</div>
              {CATEGORIES.filter(c => c.section === 'upper').map(category => {
                const value = player.scores[category.key];
                return (
                  <div key={category.key} className="mobile-row">
                    <div className="mobile-row-label">
                      <span className="category-label">{category.label}</span>
                      {category.hint && (
                        <span className="category-hint">{category.hint}</span>
                      )}
                    </div>
                    <div className="mobile-row-input">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="score-input"
                        value={value === '' ? '' : value}
                        onChange={e =>
                          onScoreChange(player.id, category.key, e.target.value)
                        }
                      />
                    </div>
                  </div>
                );
              })}

              <div className="mobile-summary">
                <div className="mobile-summary-row">
                  <span className="summary-label">상단 합계</span>
                  <span className="summary-value">{totals.upperSubtotal}</span>
                </div>
                <div className="mobile-summary-row">
                  <span className="summary-label">보너스</span>
                  <span className="summary-value">{totals.bonus}</span>
                </div>
                <div className="mobile-bonus-hint">
                  상단 합계가 63점 이상이면 +35점이 자동으로 더해집니다.
                </div>
              </div>
            </div>

            <div className="mobile-section">
              <div className="mobile-section-title">하단 (조합 점수)</div>
              {CATEGORIES.filter(c => c.section === 'lower').map(category => {
                const value = player.scores[category.key];
                return (
                  <div key={category.key} className="mobile-row">
                    <div className="mobile-row-label">
                      <span className="category-label">{category.label}</span>
                      {category.hint && (
                        <span className="category-hint">{category.hint}</span>
                      )}
                    </div>
                    <div className="mobile-row-input">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="score-input"
                        value={value === '' ? '' : value}
                        onChange={e =>
                          onScoreChange(player.id, category.key, e.target.value)
                        }
                      />
                    </div>
                  </div>
                );
              })}

              <div className="mobile-summary">
                <div className="mobile-summary-row">
                  <span className="summary-label">하단 합계</span>
                  <span className="summary-value">{totals.lowerTotal}</span>
                </div>
                <div className="mobile-total-row">
                  <span className="summary-label">총점</span>
                  <span className="mobile-total-value">{totals.grandTotal}</span>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

// Root Yacht score board app created by Cheolwoon Park
export const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([createInitialPlayer(1, 0)]);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 640;
  });
  const [winnerState, setWinnerState] = useState<WinnerState | null>(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const boardRef = useRef<HTMLDivElement | null>(null);

  const handleScoreChange = (
    playerId: number,
    categoryKey: CategoryKey,
    rawValue: string
  ) => {
    setPlayers(prev =>
      prev.map(player => {
        if (player.id !== playerId) return player;

        const trimmed = rawValue.trim();
        let value: ScoreValue = '';

        if (trimmed !== '') {
          const parsed = Number(trimmed);
          if (!Number.isNaN(parsed) && parsed >= 0) {
            value = parsed;
          }
        }

        return {
          ...player,
          scores: {
            ...player.scores,
            [categoryKey]: value
          }
        };
      })
    );
  };

  const handleNameChange = (playerId: number, name: string) => {
    setPlayers(prev =>
      prev.map(player =>
        player.id === playerId
          ? {
              ...player,
              name
            }
          : player
      )
    );
  };

  const handleAddPlayer = () => {
    setPlayers(prev => {
      if (prev.length >= 4) return prev;
      const nextIndex = prev.length;
      const nextId = prev.reduce((max, p) => Math.max(max, p.id), 0) + 1;
      return [...prev, createInitialPlayer(nextId, nextIndex)];
    });
  };

  const handleRemovePlayer = (playerId: number) => {
    setPlayers(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(p => p.id !== playerId);
    });
  };

  const handleResetScores = () => {
    setPlayers(prev =>
      prev.map(player => ({
        ...player,
        scores: { ...INITIAL_SCORES }
      }))
    );
    setWinnerState(null);
    setIsWinnerModalOpen(false);
  };

  const handleCaptureAndShare = async () => {
    const boardElement = boardRef.current;
    if (!boardElement) return;

    try {
      const canvas = await html2canvas(boardElement, {
        backgroundColor: '#f4f5fb',
        scale: window.devicePixelRatio > 1 ? 2 : 1
      });

      const fileName = `yatzy-score-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.png`;

      const tryDownload = () => {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      if (navigator.canShare && navigator.share) {
        const blob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(b => resolve(b), 'image/png')
        );
        if (!blob) {
          tryDownload();
          return;
        }

        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Yacht Score Board',
            text: '요트다이스 점수판을 공유합니다.'
          });
          return;
        }
      }

      tryDownload();
    } catch {
      // 캡처 실패 시는 조용히 무시
    }
  };

  const totalsByPlayer: PlayerTotals[] = useMemo(
    () =>
      players.map(player => {
        const upperSubtotal = calculateUpperSubtotal(player.scores);
        const bonus = calculateBonus(upperSubtotal);
        const lowerTotal = calculateLowerTotal(player.scores);
        const grandTotal = upperSubtotal + bonus + lowerTotal;

        return {
          playerId: player.id,
          upperSubtotal,
          bonus,
          lowerTotal,
          grandTotal
        };
      }),
    [players]
  );

  const snapshotKey = useMemo(
    () =>
      JSON.stringify(
        players.map(player => ({
          id: player.id,
          scores: player.scores
        }))
      ),
    [players]
  );

  useEffect(() => {
    if (!players.length) return;

    const allFilled = players.every(player =>
      Object.values(player.scores).every(value => value !== '')
    );

    if (!allFilled) {
      setWinnerState(null);
      setIsWinnerModalOpen(false);
      return;
    }

    if (winnerState && winnerState.snapshotKey === snapshotKey) {
      return;
    }

    let maxScore = -Infinity;
    totalsByPlayer.forEach(t => {
      if (t.grandTotal > maxScore) {
        maxScore = t.grandTotal;
      }
    });

    if (!Number.isFinite(maxScore)) return;

    const winnerIds: number[] = totalsByPlayer
      .filter(t => t.grandTotal === maxScore)
      .map(t => t.playerId);

    if (!winnerIds.length) return;

    setWinnerState({ winnerIds, maxScore, snapshotKey });
    setIsWinnerModalOpen(true);
  }, [players, totalsByPlayer, winnerState, snapshotKey]);

  const winnerPlayers =
    winnerState?.winnerIds.map(id => players.find(p => p.id === id)).filter(Boolean) ??
    [];

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1 className="app-title">요트다이스 점수판</h1>
          <p className="app-subtitle">
            실제 주사위를 굴린 뒤, 결과 점수만 이 페이지에 입력해 보세요.
          </p>
        </div>
        <div className="app-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleAddPlayer}
            disabled={players.length >= 4}
          >
            플레이어 추가
          </button>
          <button type="button" className="ghost-button" onClick={handleResetScores}>
            점수 전부 지우기
          </button>
          <button
            type="button"
            className="ghost-button secondary-button"
            onClick={handleCaptureAndShare}
          >
            이미지로 저장/공유
          </button>
        </div>
      </header>

      <main className="board-container">
        <section className="board-card" ref={boardRef}>
          {isMobile ? (
            <>
              <MobileScoreBoard
                players={players}
                totalsByPlayer={totalsByPlayer}
                onScoreChange={handleScoreChange}
                onNameChange={handleNameChange}
                onRemovePlayer={handleRemovePlayer}
              />
              <p className="helper-text">
                위에서 아래로 스크롤하면서 한 사람씩 점수를 입력해 보세요.
              </p>
            </>
          ) : (
            <>
              <DesktopScoreBoard
                players={players}
                totalsByPlayer={totalsByPlayer}
                onScoreChange={handleScoreChange}
                onNameChange={handleNameChange}
                onRemovePlayer={handleRemovePlayer}
              />
              <p className="helper-text">
                점수 입력은 자유롭게 할 수 있습니다. 필요하다면 집/모임 규칙에 맞춰 점수 기준만
                바꿔서 사용하세요.
              </p>
            </>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <div>PC · 태블릿 · 모바일에서 모두 사용 가능합니다.</div>
        <div className="app-credit">Designed and built by Cheolwoon Park.</div>
      </footer>

      {isWinnerModalOpen && winnerState && winnerPlayers.length > 0 && (
        <div className="winner-overlay">
          <div className="winner-confetti winner-confetti-1" />
          <div className="winner-confetti winner-confetti-2" />
          <div className="winner-confetti winner-confetti-3" />
          <div className="winner-modal">
            <div className="winner-badge">WINNER</div>
            <h2 className="winner-title">
              {winnerPlayers.length === 1 ? '축하합니다!' : '공동 1등입니다!'}
            </h2>
            <p className="winner-names">
              {winnerPlayers.map(p => p!.name).join(' · ')}
            </p>
            <p className="winner-score">최종 점수: {winnerState.maxScore}점</p>
            <div className="winner-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsWinnerModalOpen(false)}
              >
                닫기
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleResetScores}
              >
                새 게임 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


