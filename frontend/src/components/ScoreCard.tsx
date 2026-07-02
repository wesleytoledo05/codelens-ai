import { type FC, useEffect, useState } from "react";

type ScoreCardProps = {
  score: number;
  label?: string;
};

const getScoreColor = (score: number) => {
  if (score < 60) return "text-red-600";
  if (score < 80) return "text-yellow-500";
  return "text-green-600";
};

const getScoreLabel = (score: number) => {
  if (score < 60) return "Ruim";
  if (score < 80) return "Regular";
  if (score < 90) return "Bom";
  return "Excelente";
};

const getScoreBg = (score: number) => {
  if (score < 60) return "bg-red-100";
  if (score < 80) return "bg-yellow-100";
  return "bg-green-100";
};

export const ScoreCard: FC<ScoreCardProps> = ({ score, label }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setDisplayScore(Math.min(Math.round(increment * current), score));
      if (current >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [score]);

  return (
    <div
      className={`rounded-xl p-6 shadow-md sm:p-8 ${getScoreBg(score)}`}
    >
      <div className="text-center">
        <p className="mb-2 text-sm font-medium uppercase text-gray-500">
          {label || "Score Geral"}
        </p>
        <p className={`text-6xl font-bold ${getScoreColor(score)}`}>
          {displayScore}
        </p>
        <p className={`mt-2 text-lg font-semibold ${getScoreColor(score)}`}>
          {getScoreLabel(score)}
        </p>
      </div>
    </div>
  );
};
