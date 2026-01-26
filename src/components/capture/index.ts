// Demo-ready capture components
export { SimpleCaptureUI } from './SimpleCaptureUI';
export { ZoneChecklist } from './ZoneChecklist';
export { SimpleHint } from './SimpleHint';
export { EndOfPieceCheck } from './EndOfPieceCheck';
export { OneQuestionQueue, useQuestionQueue } from './OneQuestionQueue';
export { applySmartDefaults, inferEdlType, inferCaptureMode, getContextualHint } from './SmartDefaults';
export { DemoReadyCapture } from './DemoReadyCapture';

// Gamification components
export { PieceProgress } from './PieceProgress';
export { GlobalEDLProgress } from './GlobalEDLProgress';
export { PositiveFeedback, usePositiveFeedback } from './PositiveFeedback';
export { CaptureToDoList } from './CaptureToDoList';
export { SessionSummary } from './SessionSummary';

// Speed & robustness components
export { LivePartialResults, LiveTranscriptOverlay, VisionDetectionToast } from './LivePartialResults';
export { RecoveryPrompt } from './RecoveryPrompt';
export { AIStepsChecklist } from './AIStepsChecklist';

// Original capture wizard
export { CaptureWizard, type CaptureData, type EDLType, type CaptureMode } from './CaptureWizard';
