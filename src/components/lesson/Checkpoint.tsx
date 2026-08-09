import React, { useState } from 'react';
import type { CheckpointQuestion } from '../../types/curriculum';
import { CheckmarkCircle02Icon, Cancel01Icon, HelpCircleIcon } from 'hugeicons-react';
import { renderRichText } from '../../utils/formatContent';

interface CheckpointProps {
  checkpoints: CheckpointQuestion[];
}

export const Checkpoint: React.FC<CheckpointProps> = ({ checkpoints }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  if (!checkpoints || checkpoints.length === 0) return null;

  const handleSelectOption = (checkpointId: string, optionIdx: number) => {
    if (selectedAnswers[checkpointId] !== undefined) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [checkpointId]: optionIdx,
    }));
  };

  return (
    <div className="editorial-checkpoint-section">
      <div className="checkpoint-section-header">
        <div className="checkpoint-header-left">
          <HelpCircleIcon size={18} color="#0F172A" />
          <h3 className="checkpoint-main-title">Concept Verification</h3>
        </div>
        <span className="checkpoint-badge">Self-Assessment</span>
      </div>

      <div className="checkpoint-cards-list">
        {checkpoints.map((chk, qIdx) => {
          const selectedIdx = selectedAnswers[chk.id];
          const isAnswered = selectedIdx !== undefined;
          const isCorrect = isAnswered && selectedIdx === chk.correctIndex;

          return (
            <div key={chk.id} className="editorial-checkpoint-card">
              <div className="checkpoint-question-title">
                <span className="question-num">{qIdx + 1}.</span>
                <span>{renderRichText(chk.question)}</span>
              </div>

              <div className="checkpoint-options-grid">
                {chk.options.map((opt, optIdx) => {
                  let optionState = '';
                  if (isAnswered) {
                    if (optIdx === chk.correctIndex) {
                      optionState = 'state-correct';
                    } else if (optIdx === selectedIdx) {
                      optionState = 'state-incorrect';
                    } else {
                      optionState = 'state-dimmed';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isAnswered}
                      className={`checkpoint-option-item ${optionState}`}
                      onClick={() => handleSelectOption(chk.id, optIdx)}
                    >
                      <span className="option-letter-tag">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="option-text">{renderRichText(opt)}</span>
                      
                      {isAnswered && optIdx === chk.correctIndex && (
                        <CheckmarkCircle02Icon size={16} color="#16A34A" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                      {isAnswered && optIdx === selectedIdx && optIdx !== chk.correctIndex && (
                        <Cancel01Icon size={16} color="#DC2626" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className={`checkpoint-feedback-box ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="feedback-status-line">
                    {isCorrect ? (
                      <>
                        <CheckmarkCircle02Icon size={16} color="#16A34A" />
                        <span style={{ fontWeight: 600, color: '#166534' }}>Correct Analysis</span>
                      </>
                    ) : (
                      <>
                        <Cancel01Icon size={16} color="#DC2626" />
                        <span style={{ fontWeight: 600, color: '#991B1B' }}>Incorrect Selection</span>
                      </>
                    )}
                  </div>
                  <p className="feedback-explanation-text">{renderRichText(chk.explanation)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
