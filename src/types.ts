export type SafetyTaskType =
  | "escalator_line"
  | "escalator_handrail"
  | "elevator_door"
  | "elevator_bell";

export interface SafetyTask {
  id: SafetyTaskType;
  title: string;
  category: "escalator" | "elevator";
  description: string;
  guideline: string;
  emoji: string;
  color: string;
  quizQuestion: string;
  quizOptions: string[];
  quizAnswerIndex: number;
  quizExplanation: string;
}

export interface Stamp {
  taskId: SafetyTaskType;
  completed: boolean;
  score: number;
  dateCompleted?: string;
  certId?: string;
}

export interface SafetyCertificate {
  id: string;
  userName: string;
  date: string;
  tasksCompleted: string[];
  score: number;
}
