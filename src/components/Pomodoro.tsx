import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Flame, Trees, CloudRain, Waves, BellRing, Trophy, Coffee } from "lucide-react";
import { Task } from "../types";

interface PomodoroProps {
  tasks: Task[];
  onIncrementPomodoro: (taskId: string) => void;
  onLogSession: (durationMinutes: number, taskTitle?: string) => void;
}

type TimerMode = "focus" | "shortBreak" | "longBreak";

export default function Pomodoro({ tasks, onIncrementPomodoro, onLogSession }: PomodoroProps) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [duration, setDuration] = useState(25 * 60); // seconds
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [ambientSound, setAmbientSound] = useState<"none" | "drone" | "rain" | "waves">("none");
  const [isMuted, setIsMuted] = useState(false);

  // Audio nodes references
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ oscillator?: OscillatorNode; filter?: BiquadFilterNode; gain?: GainNode }[]>([]);

  // Presets mapping
  const presets: Record<TimerMode, number> = {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  useEffect(() => {
    setTimeLeft(presets[mode]);
    setDuration(presets[mode]);
    setIsRunning(false);
  }, [mode]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isRunning, timeLeft]);

  // Handle ambient sound changes
  useEffect(() => {
    if (isRunning && ambientSound !== "none") {
      startAmbientAudio();
    } else {
      stopAmbientAudio();
    }
    return () => stopAmbientAudio();
  }, [isRunning, ambientSound]);

  // Handle Mute changes
  useEffect(() => {
    if (isMuted) {
      stopAmbientAudio();
    } else if (isRunning && ambientSound !== "none") {
      startAmbientAudio();
    }
  }, [isMuted]);

  // Initialize Audio Context on demand
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Synthesize beautiful Zen Bowl Bell chime
  const playChime = () => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Base sine wave for deep bell hum
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(293.66, now); // D4 note
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(587.33, now); // D5 harmonic

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 4.1);
      osc2.stop(now + 4.1);
    } catch (e) {
      console.error("Failed to play synthesized bell chime", e);
    }
  };

  // Synthesize soft procedural noise / ambient focus drone
  const startAmbientAudio = () => {
    if (isMuted) return;
    try {
      stopAmbientAudio();
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      if (ambientSound === "drone") {
        // Deep meditative drone
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(65.41, now); // C2

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(150, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 2); // soft entry

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        ambientNodesRef.current.push({ oscillator: osc, filter, gain });
      } else if (ambientSound === "rain") {
        // Procedural soft brown noise simulating rain
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // Amplify brown noise
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        // Pack into similar structure
        ambientNodesRef.current.push({ oscillator: noise as any, filter, gain });
      } else if (ambientSound === "waves") {
        // Procedural shoreline ocean waves using slow LFO filtering
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(400, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        // LFO to modulate gain/frequency slowly
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.08, now); // slow cycle
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(150, now);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        noise.start();
        lfo.start();

        ambientNodesRef.current.push({ oscillator: noise as any, filter, gain });
        ambientNodesRef.current.push({ oscillator: lfo });
      }
    } catch (e) {
      console.warn("Could not construct procedural ambient synthesis:", e);
    }
  };

  const stopAmbientAudio = () => {
    ambientNodesRef.current.forEach((nodes) => {
      try {
        if (nodes.oscillator) nodes.oscillator.stop();
      } catch (e) {}
    });
    ambientNodesRef.current = [];
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    playChime();
    stopAmbientAudio();

    const activeTask = tasks.find((t) => t.id === selectedTaskId);
    const logTitle = activeTask ? activeTask.title : `${mode === "focus" ? "Focus" : "Break"} Session`;

    if (mode === "focus") {
      if (selectedTaskId) {
        onIncrementPomodoro(selectedTaskId);
      }
      onLogSession(Math.round(presets.focus / 60), logTitle);
      alert(`🎉 Wonderful job! You completed your ${presets.focus / 60}-minute Focus Pomodoro! Time to take a short rest.`);
      setMode("shortBreak");
    } else {
      onLogSession(Math.round(presets[mode] / 60), `${mode === "shortBreak" ? "Short Break" : "Long Break"}`);
      alert(`⏰ Break is over! Ready to focus again? Let's crush our goals.`);
      setMode("focus");
    }
  };

  const toggleTimer = () => {
    // Touch / user interaction unlocks browser audio context safely
    getAudioContext();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(presets[mode]);
    stopAmbientAudio();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // SVG progress variables
  const progressRatio = timeLeft / duration;
  const strokeDashoffset = 283 * (1 - progressRatio);

  return (
    <div id="pomodoro_widget" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between h-full relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl" />

      {/* Header */}
      <div className="flex justify-between items-center z-10">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            Focus Portal
            {mode === "focus" ? (
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <span className="flex h-2.5 w-2.5 rounded-full bg-sky-400" />
            )}
          </h3>
          <p className="text-xs text-slate-400">Zen study timer with spatial audio</p>
        </div>
        <button
          id="mute_btn"
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2 rounded-xl transition-all ${
            isMuted ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-slate-800 text-slate-300 hover:text-slate-100"
          }`}
          title={isMuted ? "Unmute Timer Chimes" : "Mute Timer Chimes"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Modes Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/60 my-5 z-10">
        {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((m) => (
          <button
            key={m}
            id={`mode_tab_${m}`}
            onClick={() => setMode(m)}
            className={`py-2 text-xs font-medium rounded-xl transition-all capitalize ${
              mode === m
                ? m === "focus"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-sky-600 text-white shadow-lg shadow-sky-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m === "focus" ? "Focus" : m === "shortBreak" ? "Short Break" : "Long Break"}
          </button>
        ))}
      </div>

      {/* Main Timer Display */}
      <div className="flex flex-col items-center justify-center my-4 relative z-10">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Background Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="88" cy="88" r="75" className="stroke-slate-800 fill-none" strokeWidth="6" />
            <circle
              cx="88"
              cy="88"
              r="75"
              className={`fill-none transition-all duration-300 ${
                mode === "focus" ? "stroke-indigo-500" : "stroke-sky-400"
              }`}
              strokeWidth="8"
              strokeDasharray="471"
              strokeDashoffset={471 * (1 - progressRatio)}
              strokeLinecap="round"
            />
          </svg>

          {/* Time text overlay */}
          <div className="absolute text-center">
            <span className="text-4xl font-mono font-bold tracking-tight text-white block">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
              {mode === "focus" ? "Focus Session" : "Rest Window"}
            </span>
          </div>
        </div>
      </div>

      {/* Linked Task Selector */}
      {mode === "focus" && (
        <div className="mb-4 z-10">
          <label className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
            Link to Study Task
          </label>
          <select
            id="linked_task_select"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="">-- General Study Session (No Task) --</option>
            {tasks
              .filter((t) => !t.completed)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.subject}] {t.title}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Ambient Sound Controller */}
      <div className="mb-5 z-10">
        <label className="text-[11px] uppercase tracking-wider text-slate-400 block mb-2 font-medium">
          Focus Soundscaping
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            id="ambient_none"
            onClick={() => setAmbientSound("none")}
            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
              ambientSound === "none"
                ? "bg-slate-800 text-white border-slate-700"
                : "bg-slate-950/60 text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            <VolumeX className="w-4 h-4" />
            <span className="text-[9px]">Silence</span>
          </button>
          <button
            id="ambient_drone"
            onClick={() => setAmbientSound("drone")}
            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
              ambientSound === "drone"
                ? "bg-slate-800 text-white border-slate-700"
                : "bg-slate-950/60 text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            <Flame className="w-4 h-4" />
            <span className="text-[9px]">Drone</span>
          </button>
          <button
            id="ambient_rain"
            onClick={() => setAmbientSound("rain")}
            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
              ambientSound === "rain"
                ? "bg-slate-800 text-white border-slate-700"
                : "bg-slate-950/60 text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            <CloudRain className="w-4 h-4" />
            <span className="text-[9px]">Rain</span>
          </button>
          <button
            id="ambient_waves"
            onClick={() => setAmbientSound("waves")}
            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
              ambientSound === "waves"
                ? "bg-slate-800 text-white border-slate-700"
                : "bg-slate-950/60 text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            <Waves className="w-4 h-4" />
            <span className="text-[9px]">Waves</span>
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 z-10">
        <button
          id="play_pause_timer_btn"
          onClick={toggleTimer}
          className={`flex-1 py-3 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
            isRunning
              ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              : mode === "focus"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10"
                : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/10"
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? "Pause Session" : "Start Focus"}
        </button>

        <button
          id="reset_timer_btn"
          onClick={resetTimer}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
