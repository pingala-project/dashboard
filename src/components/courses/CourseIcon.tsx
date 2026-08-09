import React from 'react';
import { 
  MathIcon, 
  AiChipIcon, 
  Analytics01Icon, 
  AiBrain01Icon, 
  AiMagicIcon, 
  Robot01Icon, 
  Book02Icon 
} from 'hugeicons-react';

interface CourseIconProps {
  courseId: string;
  size?: number;
  color?: string;
  className?: string;
}

export const CourseIcon: React.FC<CourseIconProps> = ({ 
  courseId, 
  size = 28, 
  color = 'currentColor',
  className 
}) => {
  switch (courseId) {
    case 'math-ai':
      return <MathIcon size={size} color={color} className={className} />;
    case 'python-tensors':
      return <AiChipIcon size={size} color={color} className={className} />;
    case 'classical-ml':
      return <Analytics01Icon size={size} color={color} className={className} />;
    case 'deep-learning':
      return <AiBrain01Icon size={size} color={color} className={className} />;
    case 'transformers-llms':
      return <AiMagicIcon size={size} color={color} className={className} />;
    case 'agents-systems':
      return <Robot01Icon size={size} color={color} className={className} />;
    default:
      return <Book02Icon size={size} color={color} className={className} />;
  }
};
