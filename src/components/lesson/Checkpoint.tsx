import React, { useState } from 'react';
import type { CheckpointQuestion } from '../../types/curriculum';
import { CheckmarkCircle02Icon, Cancel01Icon } from 'hugeicons-react';
import { renderRichText } from '../../utils/formatContent';
import { useSettings } from '../../context/SettingsContext';

interface CheckpointProps {
  checkpoints: CheckpointQuestion[];
}

export const Checkpoint: React.FC<CheckpointProps> = ({ checkpoints }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const { settings } = useSettings();

  if (!checkpoints || checkpoints.length === 0) return null;

  const handleSelectOption = (checkpointId: string, optionIdx: number) => {
    if (selectedAnswers[checkpointId] !== undefined) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [checkpointId]: optionIdx,
    }));
  };

  return (
    <div className="checkpoint-section">
      <span className="lesson-section-label">Check yourself</span>

      <div className="checkpoint-list">
        {checkpoints.map((chk) => {
          const selectedIdx = selectedAnswers[chk.id];
          const isAnswered = selectedIdx !== undefined;
          const isCorrect = isAnswered && selectedIdx === chk.correctIndex;

          return (
            <div key={chk.id} className="checkpoint-item">
              <div className="checkpoint-question">
                <span>{renderRichText(chk.question)}</span>
              </div>

              <div className="checkpoint-options">
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
                      className={`checkpoint-option ${optionState}`}
                      onClick={() => handleSelectOption(chk.id, optIdx)}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + optIdx)}</span>
                      <span className="option-text">{renderRichText(opt)}</span>

                      {isAnswered && optIdx === chk.correctIndex && (
                        <CheckmarkCircle02Icon size={15} color="#16A34A" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                      {isAnswered && optIdx === selectedIdx && optIdx !== chk.correctIndex && (
                        <Cancel01Icon size={15} color="#DC2626" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswered && settings.learning.instantQuizFeedback && (
                <div className={`checkpoint-explanation ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <span className="explanation-verdict">{isCorrect ? 'Correct.' : 'Not quite.'}</span>
                  {renderRichText(chk.explanation)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

