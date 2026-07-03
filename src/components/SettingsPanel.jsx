import { useState } from 'react';
import { X, Sliders, Clock, Target, Layers } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';

export default function SettingsPanel({ settings, onSave, onClose, subjects }) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleDistributionChange = (subject, value) => {
    const newDistribution = { ...localSettings.distribution, [subject]: value };
    // Normalize to 100%
    const total = Object.values(newDistribution).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      const factor = 100 / total;
      Object.keys(newDistribution).forEach(key => {
        newDistribution[key] = Math.round(newDistribution[key] * factor);
      });
    }
    setLocalSettings({ ...localSettings, distribution: newDistribution });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Quiz Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Number of Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Questions per test
              </label>
              <span className="text-lg font-bold text-primary">{localSettings.numQuestions}</span>
            </div>
            <Slider.Root
              className="relative flex items-center w-full h-5"
              value={[localSettings.numQuestions]}
              onValueChange={([value]) => setLocalSettings({ ...localSettings, numQuestions: value })}
              min={10}
              max={200}
              step={5}
            >
              <Slider.Track className="bg-muted relative flex-1 h-2 rounded-full">
                <Slider.Range className="absolute bg-primary h-full rounded-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-primary rounded-full shadow-lg ring-2 ring-primary/20" />
            </Slider.Root>
          </div>

          {/* Time Limit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Limit (minutes)
              </label>
              <span className="text-lg font-bold text-primary">{localSettings.timeLimit}</span>
            </div>
            <Slider.Root
              className="relative flex items-center w-full h-5"
              value={[localSettings.timeLimit]}
              onValueChange={([value]) => setLocalSettings({ ...localSettings, timeLimit: value })}
              min={5}
              max={60}
              step={5}
            >
              <Slider.Track className="bg-muted relative flex-1 h-2 rounded-full">
                <Slider.Range className="absolute bg-primary h-full rounded-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-primary rounded-full shadow-lg ring-2 ring-primary/20" />
            </Slider.Root>
          </div>

          {/* Focus Mode */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Focus on Weak Subjects
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Prioritize questions you've struggled with
              </p>
            </div>
            <Switch.Root
              className="w-11 h-6 bg-muted rounded-full relative data-[state=checked]:bg-primary transition-colors"
              checked={localSettings.focusMode}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, focusMode: checked })}
            >
              <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform data-[state=checked]:translate-x-5 translate-x-0.5" />
            </Switch.Root>
          </div>

          {/* Subject Distribution */}
          <div>
            <label className="text-sm font-medium block mb-3">Subject Distribution</label>
            <div className="space-y-4">
              {subjects.map((subject) => (
                <div key={subject}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{subject}</span>
                    <span className="font-medium">{localSettings.distribution[subject] || 0}%</span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center w-full h-5"
                    value={[localSettings.distribution[subject] || 0]}
                    onValueChange={([value]) => handleDistributionChange(subject, value)}
                    min={0}
                    max={100}
                    step={5}
                  >
                    <Slider.Track className="bg-muted relative flex-1 h-2 rounded-full">
                      <Slider.Range className="absolute bg-primary h-full rounded-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 bg-primary rounded-full shadow-lg ring-2 ring-primary/20" />
                  </Slider.Root>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Adjust sliders to control question distribution per subject (total must equal 100%)
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(localSettings)}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}