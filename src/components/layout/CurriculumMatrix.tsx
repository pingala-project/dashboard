import React, { useRef } from 'react';
import type { Course } from '../../types/curriculum';

interface MatrixSection {
  id: string;
  category: string;
  items: {
    id: string;
    title: string;
    courseId?: string;
    topicId?: string;
  }[];
}

const DEFAULT_SECTIONS: MatrixSection[] = [
  {
    id: 'foundations',
    category: 'Foundations',
    items: [
      { id: 'math-ai', title: 'Mathematics & Linear Algebra', courseId: 'math-ai' },
      { id: 'topic-vector-spaces', title: 'Vector Spaces & Geometry', courseId: 'math-ai', topicId: 'topic-vector-spaces' },
      { id: 'topic-matrix-decomp', title: 'Matrix Decompositions & SVD', courseId: 'math-ai', topicId: 'topic-matrix-decomp' },
      { id: 'python-tensors', title: 'Tensor Computing in Python', courseId: 'python-tensors' },
      { id: 'topic-probability', title: 'Bayesian Probability & Priors', courseId: 'math-ai' },
    ],
  },
  {
    id: 'core-ml',
    category: 'Machine Learning',
    items: [
      { id: 'classical-ml', title: 'Statistical Learning Theory', courseId: 'classical-ml' },
      { id: 'topic-lin-reg', title: 'Linear & Logistic Models', courseId: 'classical-ml' },
      { id: 'topic-trees', title: 'Gradient Boosted Trees', courseId: 'classical-ml' },
      { id: 'topic-svm', title: 'Support Vector Machines', courseId: 'classical-ml' },
      { id: 'topic-pca', title: 'PCA & Dimensionality Reduction', courseId: 'classical-ml' },
    ],
  },
  {
    id: 'deep-learning',
    category: 'Deep Learning',
    items: [
      { id: 'deep-learning', title: 'Neural Network Architectures', courseId: 'deep-learning' },
      { id: 'topic-backprop', title: 'Backpropagation Engine', courseId: 'deep-learning', topicId: 'topic-backprop' },
      { id: 'topic-cnn', title: 'Vision & Convolutions', courseId: 'deep-learning' },
      { id: 'topic-optimizers', title: 'AdamW & Gradient Dynamics', courseId: 'deep-learning' },
      { id: 'topic-regularization', title: 'Normalization & Dropout', courseId: 'deep-learning' },
    ],
  },
  {
    id: 'transformers-llms',
    category: 'Transformers & LLMs',
    items: [
      { id: 'transformers-llms', title: 'Transformer Foundations', courseId: 'transformers-llms' },
      { id: 'topic-self-attention', title: 'Self-Attention Mechanics', courseId: 'transformers-llms', topicId: 'topic-self-attention' },
      { id: 'topic-rope', title: 'Rotary Position Embeddings', courseId: 'transformers-llms' },
      { id: 'topic-lora', title: 'PEFT & LoRA Fine-Tuning', courseId: 'transformers-llms' },
      { id: 'topic-alignment', title: 'DPO & RLHF Alignment', courseId: 'transformers-llms' },
    ],
  },
  {
    id: 'agents-systems',
    category: 'AI Agents & Systems',
    items: [
      { id: 'agents-systems', title: 'Autonomous Agent Architecture', courseId: 'agents-systems' },
      { id: 'topic-react-agents', title: 'ReAct Loops & Tool Calling', courseId: 'agents-systems', topicId: 'topic-react-agents' },
      { id: 'topic-rag', title: 'Hybrid RAG & Vector Stores', courseId: 'agents-systems' },
      { id: 'topic-vllm', title: 'PagedAttention & vLLM Serving', courseId: 'agents-systems' },
      { id: 'topic-swarms', title: 'Multi-Agent Orchestration', courseId: 'agents-systems' },
    ],
  },
];

interface CurriculumMatrixProps {
  courses?: Course[];
  onSelectCourse: (courseId: string) => void;
  onSelectTopic?: (courseId: string, topicId: string) => void;
}

export const CurriculumMatrix: React.FC<CurriculumMatrixProps> = ({
  onSelectCourse,
  onSelectTopic,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleItemClick = (item: MatrixSection['items'][0]) => {
    if (item.courseId && item.topicId && onSelectTopic) {
      onSelectTopic(item.courseId, item.topicId);
    } else if (item.courseId) {
      onSelectCourse(item.courseId);
    }
  };

  return (
    <div className="curriculum-matrix-wrapper">
      <div className="curriculum-matrix-scroll" ref={scrollRef}>
        {DEFAULT_SECTIONS.map((section) => (
          <div key={section.id} className="curriculum-matrix-col">
            <span className="matrix-col-category">{section.category}</span>
            <div className="matrix-col-items">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className="matrix-col-item-btn"
                  onClick={() => handleItemClick(item)}
                  title={`Explore ${item.title}`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
