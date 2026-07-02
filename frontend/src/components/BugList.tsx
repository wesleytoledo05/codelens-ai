import { type FC } from "react";
import { AlertTriangle, AlertCircle, Info, Bug } from "lucide-react";
import type { BugHunterOutput } from "../types";

type BugListProps = {
  bugs: BugHunterOutput["bugs"];
};

const SEVERITY_CONFIG = {
  HIGH: {
    icon: AlertTriangle,
    colors: "bg-orange-100 text-orange-800 border-orange-200",
    iconColor: "text-orange-500",
  },
  MEDIUM: {
    icon: AlertCircle,
    colors: "bg-yellow-100 text-yellow-800 border-yellow-200",
    iconColor: "text-yellow-500",
  },
  LOW: {
    icon: Info,
    colors: "bg-green-100 text-green-800 border-green-200",
    iconColor: "text-green-500",
  },
};

export const BugList: FC<BugListProps> = ({ bugs }) => {
  if (bugs.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md sm:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bug className="mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-800">
            Caça-Bugs
          </h2>
          <p className="text-lg text-green-600">
            Nenhum bug encontrado
          </p>
        </div>
      </div>
    );
  }

  const grouped = bugs.reduce(
    (acc, bug) => {
      if (!acc[bug.file]) acc[bug.file] = [];
      acc[bug.file].push(bug);
      return acc;
    },
    {} as Record<string, typeof bugs>
  );

  return (
    <div className="rounded-xl bg-white p-4 shadow-md sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-indigo-100 p-2">
          <Bug className="h-6 w-6 text-indigo-600" />
        </div>
        <h2 className="flex-1 text-xl font-bold text-gray-800 sm:text-2xl">
          Caça-Bugs
        </h2>
        <span className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
          {bugs.length} {bugs.length === 1 ? "bug" : "bugs"}
        </span>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([file, fileBugs]) => (
          <div key={file}>
            <h3 className="mb-3 text-sm font-semibold text-gray-500">
              {file}
            </h3>
            <div className="space-y-3">
              {fileBugs.map((bug) => {
                const config = SEVERITY_CONFIG[bug.severity];
                const Icon = config.icon;
                return (
                  <div
                    key={bug.id}
                    className="rounded-lg border border-gray-200 p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-start gap-3">
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} />
                      <div className="flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.colors}`}
                          >
                            {bug.severity}
                          </span>
                          <span className="text-xs text-gray-400">
                            Linha {bug.line}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {bug.description}
                        </p>
                        {bug.suggestion && (
                          <p className="mt-2 text-xs text-gray-500">
                            <span className="font-medium">Sugestão:</span>{" "}
                            {bug.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
