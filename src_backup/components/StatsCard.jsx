import { BarChart2, TrendingUp, Target, BookOpen } from 'lucide-react';

export default function StatsCard({ stats }) {
  if (!stats) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <p className="text-muted-foreground text-center">No data yet. Start quizzing!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4" />
          Your Performance
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">Accuracy</span>
            <span className="text-lg font-bold text-primary">{Math.round(stats.accuracy)}%</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">Questions Attempted</span>
            <span className="text-lg font-bold">{stats.totalAttempts}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">Correct</span>
            <span className="text-lg font-bold text-green-500">{stats.correctAttempts}</span>
          </div>
        </div>
      </div>

      {stats.subjectStats && Object.keys(stats.subjectStats).length > 0 && (
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Subject Breakdown
          </h3>
          
          <div className="space-y-3">
            {Object.entries(stats.subjectStats).map(([subject, data]) => {
              const accuracy = data.attempts > 0 ? (data.correct / data.attempts) * 100 : 0;
              return (
                <div key={subject}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{subject}</span>
                    <span className="font-medium">{Math.round(accuracy)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(accuracy, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}