import { type FC } from "react";
import { Loader2 } from "lucide-react";

type LoadingStateProps = {
  currentStage: string;
  currentAgent?: string;
};

const STAGE_PROGRESS: Record<string, number> = {
  init: 10,
  fetching: 20,
  analyzing: 40,
  security: 60,
  documenting: 80,
  reporting: 90,
  complete: 100,
};

export const LoadingState: FC<LoadingStateProps> = ({
  currentStage,
  currentAgent,
}) => {
  const progress = STAGE_PROGRESS[currentStage] ?? 50;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Skeleton blocks */}
        <div className="mb-8 space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status message */}
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <p className="text-center text-sm text-gray-600">
            {currentAgent
              ? `${currentAgent} analisando ${currentStage}...`
              : `Processando ${currentStage}...`}
          </p>
        </div>
      </div>
    </div>
  );
};
