import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  Calendar as CalendarIcon,
  History as HistoryIcon,
  BookOpen,
  Pill,
  Info,
  Play,
  CheckCircle,
  Droplet,
  Check,
  Stethoscope,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Upload,
  RefreshCw,
  HelpCircle,
  Shield,
  Heart,
  Bell
} from 'lucide-react';
import './App.css';

// Helper functions for date formatting and math
function getTodayDateStr() {
  const d = new Date();
  return formatDateStr(d);
}

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLong(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Web Audio API Synthesizer Chime
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    const now = audioCtx.currentTime;
    
    // Premium soft chime: double note (D5 followed by A5)
    osc.frequency.setValueAtTime(587.33, now); // D5
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    
    osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain.gain.setValueAtTime(0.08, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    
    osc.start(now);
    osc.stop(now + 0.6);
  } catch (err) {
    console.error("Audio Context error:", err);
  }
}

// Timeline simulation engine
function calculateTimeline(startDateStr, logs, totalDays = 185) {
  if (!startDateStr) return [];
  
  const schedule = [];
  const start = parseDateStr(startDateStr);
  const todayStr = getTodayDateStr();
  const today = parseDateStr(todayStr);
  
  let currentDate = new Date(start);
  
  // State variables for cycle logic simulation
  let phase = 1; // 1: Priming 10d, 2: Pause, 3: Active cycle (21d), 4: Pause, 5: Active cycle...
  let phaseDay = 1;
  let activePeriodStartDate = null;
  
  // Collect all logged period dates
  const loggedPeriods = Object.keys(logs)
    .filter(d => logs[d] && logs[d].period)
    .map(d => parseDateStr(d))
    .sort((a, b) => a - b);
  
  for (let d = 0; d < totalDays; d++) {
    const dateStr = formatDateStr(currentDate);
    
    // Check if period is logged on this day
    const hasActualPeriod = logs[dateStr]?.period === true;
    
    let expectedPills = [];
    let phaseName = "";
    let phaseBadge = "";
    let isPause = false;
    
    // Menstruation active range check (5 days from logged start date)
    let isPeriodDay = false;
    const matchingPeriodStart = loggedPeriods.find(p => {
      const diffTime = currentDate - p;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 5;
    });
    if (matchingPeriodStart || hasActualPeriod) {
      isPeriodDay = true;
    }
    
    // State machine logic
    if (phase === 1) {
      phaseName = "Initial Priming Phase";
      phaseBadge = "Phase 1";
      expectedPills = ['morning', 'evening'];
      isPause = false;
      
      if (phaseDay >= 10) {
        phase = 2;
        phaseDay = 1;
        activePeriodStartDate = null;
      } else {
        phaseDay++;
      }
    } else if (phase % 2 === 0) {
      // Pause Phase (Pause 5 days and wait for period Day 3 to start next cycle)
      const pauseNum = phase / 2;
      phaseName = `Withdrawal Pause & Wait ${pauseNum}`;
      phaseBadge = `Pause ${pauseNum}`;
      expectedPills = [];
      isPause = true;
      
      // Look for a period logged in this pause window (on or after pause start date)
      if (!activePeriodStartDate) {
        const pauseStartDate = new Date(currentDate);
        pauseStartDate.setDate(pauseStartDate.getDate() - (phaseDay - 1));
        
        const periodInThisPause = loggedPeriods.find(p => p >= pauseStartDate && p <= currentDate);
        if (periodInThisPause) {
          activePeriodStartDate = new Date(periodInThisPause);
        }
      }
      
      // Transition on the 3rd day of the period
      if (activePeriodStartDate) {
        const restartDate = new Date(activePeriodStartDate);
        restartDate.setDate(restartDate.getDate() + 2); // 3rd day = start + 2 days
        
        if (currentDate >= restartDate) {
          phase = phase + 1;
          phaseDay = 1;
          activePeriodStartDate = null;
          
          // Re-evaluate current date under new phase
          d--;
          currentDate.setDate(currentDate.getDate() - 1);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
      } else {
        // If no period logged, project default 5-day pause
        if (phaseDay > 5) {
          phase = phase + 1;
          phaseDay = 1;
          
          d--;
          currentDate.setDate(currentDate.getDate() - 1);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
      }
      phaseDay++;
    } else {
      // Active 21-day Night-only Cycle
      const cycleNum = Math.floor(phase / 2);
      phaseName = `Active Regulation Cycle ${cycleNum}`;
      phaseBadge = `Cycle ${cycleNum}`;
      expectedPills = ['night'];
      isPause = false;
      
      if (phaseDay >= 21) {
        phase = phase + 1;
        phaseDay = 1;
        activePeriodStartDate = null;
      } else {
        phaseDay++;
      }
    }
    
    const dayLog = logs[dateStr] || { morning: false, evening: false, night: false, period: false };
    
    let isFullyTaken = true;
    let isAnyMissed = false;
    let isAnyPillExpected = expectedPills.length > 0;
    
    expectedPills.forEach(pill => {
      if (dayLog[pill]) {
        // pill is taken
      } else {
        isFullyTaken = false;
        if (currentDate < today) {
          isAnyMissed = true;
        }
      }
    });
    
    schedule.push({
      dateStr: dateStr,
      date: new Date(currentDate),
      phase: phase,
      phaseDay: phaseDay - 1,
      phaseName: phaseName,
      phaseBadge: phaseBadge,
      expectedPills: expectedPills,
      takenPills: expectedPills.filter(p => dayLog[p]),
      isPause: isPause,
      isPeriodDay: isPeriodDay,
      isForecast: currentDate > today,
      isToday: dateStr === todayStr,
      isFullyTaken: isFullyTaken,
      isAnyMissed: isAnyMissed,
      isAnyPillExpected: isAnyPillExpected,
      logEntry: dayLog
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return schedule;
}

export default function App() {
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem('bebo_start_date') || null;
  });
  
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('bebo_logs');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  
  const fileInputRef = useRef(null);
  
  const [reminderSettings, setReminderSettings] = useState(() => {
    const saved = localStorage.getItem('bebo_reminder_settings');
    const defaults = {
      enabled: false,
      audioEnabled: true,
      morningTime: '08:00',
      eveningTime: '20:00',
      nightTime: '21:00',
      twilioEnabled: false,
      twilioSid: '',
      twilioToken: '',
      twilioFrom: '',
      twilioTo: '',
      twilioType: 'whatsapp'
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  
  const [lastFiredReminders, setLastFiredReminders] = useState(() => {
    const saved = localStorage.getItem('bebo_last_fired_reminders');
    return saved ? JSON.parse(saved) : {};
  });

  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('bebo_reminder_settings', JSON.stringify(reminderSettings));
  }, [reminderSettings]);

  useEffect(() => {
    localStorage.setItem('bebo_last_fired_reminders', JSON.stringify(lastFiredReminders));
  }, [lastFiredReminders]);

  // Clean up old fired reminders from previous days
  useEffect(() => {
    setLastFiredReminders(prev => {
      const cleaned = {};
      const today = getTodayDateStr();
      Object.keys(prev).forEach(key => {
        if (key.startsWith(today)) {
          cleaned[key] = prev[key];
        }
      });
      return cleaned;
    });
  }, []);
  useEffect(() => {
    if (startDate) {
      localStorage.setItem('bebo_start_date', startDate);
    } else {
      localStorage.removeItem('bebo_start_date');
    }
  }, [startDate]);
  
  useEffect(() => {
    localStorage.setItem('bebo_logs', JSON.stringify(logs));
  }, [logs]);
  
  // Memoized Timeline
  const timeline = useMemo(() => {
    return calculateTimeline(startDate, logs);
  }, [startDate, logs]);
  
  const todayStr = getTodayDateStr();
  const todayItem = useMemo(() => {
    return timeline.find(d => d.dateStr === todayStr);
  }, [timeline, todayStr]);



  const sendTwilioSMS = async (message, customSettings = null) => {
    const sid = customSettings?.twilioSid || reminderSettings.twilioSid;
    const token = customSettings?.twilioToken || reminderSettings.twilioToken;
    const from = customSettings?.twilioFrom || reminderSettings.twilioFrom;
    const to = customSettings?.twilioTo || reminderSettings.twilioTo;
    const type = customSettings?.twilioType || reminderSettings.twilioType;
    
    if (!sid || !token || !from || !to) {
      console.warn("Twilio configuration parameters missing.");
      return false;
    }
    
    const url = 'http://localhost:3001/api/send-sms';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountSid: sid,
          authToken: token,
          from: from,
          to: to,
          message: message,
          type: type
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Local proxy Twilio API returned error status:", response.status, errorData);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Failed to make request to local Twilio proxy:", err);
      return false;
    }
  };

  // Background Reminder Engine
  useEffect(() => {
    if (!startDate || (!reminderSettings.enabled && !reminderSettings.twilioEnabled) || !todayItem) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const currentDateStr = todayStr;
      
      const expectedPills = todayItem.expectedPills;
      
      expectedPills.forEach(pill => {
        const isTaken = todayItem.logEntry[pill] === true;
        if (isTaken) return;
        
        let reminderTime = '';
        if (pill === 'morning') reminderTime = reminderSettings.morningTime;
        else if (pill === 'evening') reminderTime = reminderSettings.eveningTime;
        else if (pill === 'night') reminderTime = reminderSettings.nightTime;
        
        if (!reminderTime) return;
        
        const reminderKey = `${currentDateStr}-${pill}`;
        if (currentTimeStr >= reminderTime && !lastFiredReminders[reminderKey]) {
          let firedAny = false;
          const pillLabel = pill.charAt(0).toUpperCase() + pill.slice(1);
          
          if (reminderSettings.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification("Bebo Medication Reminder", {
              body: `It's time to take your ${pillLabel} Pill! (${reminderTime})`,
            });
            firedAny = true;
          }
          
          if (reminderSettings.twilioEnabled && reminderSettings.twilioSid && reminderSettings.twilioToken && reminderSettings.twilioFrom && reminderSettings.twilioTo) {
            sendTwilioSMS(`Bebo Reminder: It's time to take your ${pillLabel} Pill! (${reminderTime})`);
            firedAny = true;
          }
          
          if (firedAny) {
            if (reminderSettings.audioEnabled) {
              playChime();
            }
            
            setLastFiredReminders(prev => ({
              ...prev,
              [reminderKey]: true
            }));
          }
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [startDate, reminderSettings, todayItem, todayStr, lastFiredReminders]);
  
  // Memoized Streak Count
  const streak = useMemo(() => {
    if (!timeline.length) return 0;
    const todayIdx = timeline.findIndex(d => d.dateStr === todayStr);
    if (todayIdx === -1) return 0;
    
    let startIdx = todayIdx;
    const currentDayItem = timeline[todayIdx];
    
    if (currentDayItem.isAnyPillExpected && !currentDayItem.isFullyTaken) {
      startIdx = todayIdx - 1;
    }
    
    let streakCount = 0;
    for (let i = startIdx; i >= 0; i--) {
      const item = timeline[i];
      if (item.isPause) continue;
      if (item.isAnyPillExpected) {
        if (item.isFullyTaken) {
          streakCount++;
        } else {
          break;
        }
      }
    }
    return streakCount;
  }, [timeline, todayStr]);
  
  // Memoized Contraceptive Cover evaluation
  const shieldData = useMemo(() => {
    if (!timeline.length) return { status: 'Inactive', class: 'inactive', advice: 'Setup your timeline to start tracking.' };
    const todayIdx = timeline.findIndex(d => d.dateStr === todayStr);
    if (todayIdx === -1) return { status: 'Inactive', class: 'inactive', advice: 'Setup your timeline to start tracking.' };
    
    const currentDayItem = timeline[todayIdx];
    
    if (currentDayItem.phase === 1) {
      return {
        status: 'Priming',
        class: 'warning',
        advice: 'Phase 1 is the priming cycle. Full contraceptive cover will begin with Cycle 1 (Phase 3).'
      };
    }
    
    let missedInLast7Days = false;
    let activePillDaysChecked = 0;
    let checkIdx = todayIdx - 1;
    
    while (checkIdx >= 0 && activePillDaysChecked < 7) {
      const item = timeline[checkIdx];
      if (item.isAnyPillExpected) {
        activePillDaysChecked++;
        if (!item.isFullyTaken) {
          missedInLast7Days = true;
          break;
        }
      }
      checkIdx--;
    }
    
    if (missedInLast7Days) {
      return {
        status: 'Caution',
        class: 'warning',
        advice: 'Pill missed in the last 7 days! Contraceptive cover is reduced. Use backup protection (condoms) for 7 days.'
      };
    }
    
    return {
      status: 'Active',
      class: 'active',
      advice: 'Contraception is active. Take your pill daily at the same time to maintain protection.'
    };
  }, [timeline, todayStr]);
  
  // Doctor Countdown calculation
  const docRevisitData = useMemo(() => {
    if (!startDate) return { daysLeft: 0, targetStr: '', urgent: false, progress: 0 };
    const start = parseDateStr(startDate);
    const target = addDays(start, 30);
    const today = parseDateStr(todayStr);
    
    const diffTime = target - today;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const ratio = Math.max(0, Math.min(1, daysLeft / 30));
    const strokeOffset = 282.7 * (1 - ratio);
    
    return {
      daysLeft: daysLeft,
      targetStr: formatDateLong(target),
      urgent: daysLeft < 0,
      strokeOffset: strokeOffset
    };
  }, [startDate, todayStr]);
  
  // Actions handlers
  const handleStartTracking = (e) => {
    e.preventDefault();
    const dateInput = e.target.elements.startDateInput.value;
    if (dateInput) {
      setStartDate(dateInput);
      setLogs({});
      setActiveTab('dashboard');
    }
  };
  
  const handleLoadDemoData = () => {
    const today = new Date();
    const start = addDays(today, -11);
    const startStr = formatDateStr(start);
    
    const demoLogs = {};
    for (let i = 0; i < 10; i++) {
      const dStr = formatDateStr(addDays(start, i));
      demoLogs[dStr] = {
        morning: true,
        evening: true,
        night: false,
        period: false
      };
    }
    demoLogs[formatDateStr(addDays(start, 10))] = {
      morning: false,
      evening: false,
      night: false,
      period: false
    };
    demoLogs[formatDateStr(today)] = {
      morning: false,
      evening: false,
      night: false,
      period: false
    };
    
    setStartDate(startStr);
    setLogs(demoLogs);
    setActiveTab('dashboard');
  };
  
  const handleResetApp = () => {
    if (confirm("Are you sure you want to reset all tracking data? This cannot be undone.")) {
      setStartDate(null);
      setLogs({});
      setReminderSettings({
        enabled: false,
        audioEnabled: true,
        morningTime: '08:00',
        eveningTime: '20:00',
        nightTime: '21:00'
      });
      setLastFiredReminders({});
      setActiveTab('dashboard');
      localStorage.removeItem('bebo_start_date');
      localStorage.removeItem('bebo_logs');
      localStorage.removeItem('bebo_reminder_settings');
      localStorage.removeItem('bebo_last_fired_reminders');
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  };

  const handleToggleReminders = async () => {
    if (!reminderSettings.enabled) {
      const permission = await handleRequestNotificationPermission();
      if (permission === 'granted') {
        setReminderSettings(prev => ({ ...prev, enabled: true }));
      } else {
        alert("Browser notifications permission is required to send alerts. Please enable them in your browser settings.");
      }
    } else {
      setReminderSettings(prev => ({ ...prev, enabled: false }));
    }
  };

  const handleTestReminder = () => {
    if (reminderSettings.audioEnabled) {
      playChime();
    }
    
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        new Notification("Bebo Reminder Test", {
          body: "This is a test notification from Bebo Pill & Cycle Companion. It works!",
        });
      } else {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          if (permission === 'granted') {
            new Notification("Bebo Reminder Test", {
              body: "This is a test notification from Bebo Pill & Cycle Companion. It works!",
            });
          } else {
            alert("Notification permission is not granted. Please grant permission to see notifications.");
          }
        });
      }
    } else {
      alert("Notifications are not supported in this browser.");
    }
  };
  
  const handleTogglePill = (dateStr, pill) => {
    setLogs(prev => {
      const current = prev[dateStr] || { morning: false, evening: false, night: false, period: false };
      return {
        ...prev,
        [dateStr]: {
          ...current,
          [pill]: !current[pill]
        }
      };
    });
  };
  
  const handleLogPeriodToday = () => {
    const inputDate = prompt("Enter the date your period started (YYYY-MM-DD):", todayStr);
    if (!inputDate) return;
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      alert("Please enter date in YYYY-MM-DD format.");
      return;
    }
    
    setLogs(prev => {
      const current = prev[inputDate] || { morning: false, evening: false, night: false, period: false };
      return {
        ...prev,
        [inputDate]: {
          ...current,
          period: true
        }
      };
    });
  };
  
  const handleTogglePeriodLog = (dateStr) => {
    setLogs(prev => {
      const current = prev[dateStr] || { morning: false, evening: false, night: false, period: false };
      return {
        ...prev,
        [dateStr]: {
          ...current,
          period: !current[period]
        }
      };
    });
  };
  
  const handleSetPeriodLogExplicit = (dateStr, val) => {
    setLogs(prev => {
      const current = prev[dateStr] || { morning: false, evening: false, night: false, period: false };
      return {
        ...prev,
        [dateStr]: {
          ...current,
          period: val
        }
      };
    });
  };
  
  // Backup tools
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ startDate, logs }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bebo_pill_tracker_backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
  
  const handleImportTrigger = () => {
    fileInputRef.current.click();
  };
  
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.startDate && parsed.logs) {
          setStartDate(parsed.startDate);
          setLogs(parsed.logs);
          alert("Data imported successfully!");
        } else {
          alert("Invalid file format. Import failed.");
        }
      } catch (err) {
        alert("Error reading file. Make sure it is a valid Bebo backup file.");
      }
    };
    reader.readAsText(file);
  };
  
  // Calendar Render Helpers
  const calendarDays = useMemo(() => {
    const month = currentCalendarDate.getMonth();
    const year = currentCalendarDate.getFullYear();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateItem = new Date(year, month, day);
      const dateStr = formatDateStr(currentDateItem);
      const node = timeline.find(d => d.dateStr === dateStr);
      days.push({
        empty: false,
        day: day,
        dateStr: dateStr,
        node: node
      });
    }
    return days;
  }, [currentCalendarDate, timeline]);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  
  // Historical Log List
  const historicalDays = useMemo(() => {
    const today = parseDateStr(todayStr);
    return timeline
      .filter(d => !d.isForecast && d.date <= today)
      .reverse();
  }, [timeline, todayStr]);
  
  // Set default details day if timeline changes and selectedDetails is active
  const updatedSelectedDayDetails = useMemo(() => {
    if (!selectedDayDetails) return null;
    return timeline.find(d => d.dateStr === selectedDayDetails.dateStr) || null;
  }, [timeline, selectedDayDetails]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <div className="logo-icon">
            <Sparkles />
          </div>
          <div className="logo-text">
            <h1>Bebo</h1>
            <span>Pill & Cycle Companion</span>
          </div>
        </div>
        
        {startDate && (
          <div className={`status-shield-badge id-contraceptive-shield ${shieldData.class}`}>
            <div className="shield-icon">
              <ShieldCheck />
            </div>
            <div className="shield-text">
              <span className="shield-label">Contraception</span>
              <span className="shield-status">{shieldData.status}</span>
            </div>
          </div>
        )}

        {startDate && (
          <nav className="app-nav">
            <button 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setSelectedDayDetails(null); }}
            >
              <LayoutDashboard /> Dashboard
            </button>
            <button 
              className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => { setActiveTab('calendar'); setSelectedDayDetails(null); }}
            >
              <CalendarIcon /> Calendar
            </button>
            <button 
              className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => { setActiveTab('history'); setSelectedDayDetails(null); }}
            >
              <HistoryIcon /> Logs & Edit
            </button>
            <button 
              className={`nav-btn ${activeTab === 'reminders' ? 'active' : ''}`}
              onClick={() => { setActiveTab('reminders'); setSelectedDayDetails(null); }}
            >
              <Bell /> Reminders
            </button>
            <button 
              className={`nav-btn ${activeTab === 'guide' ? 'active' : ''}`}
              onClick={() => { setActiveTab('guide'); setSelectedDayDetails(null); }}
            >
              <BookOpen /> Regimen Guide
            </button>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="app-main">
        {!startDate ? (
          /* SCREEN 1: Setup Screen */
          <section className="screen-section">
            <div className="setup-card">
              <div className="setup-header">
                <div className="setup-logo-large">
                  <Pill />
                </div>
                <h2>Welcome to Bebo</h2>
                <p>Your personalized 6-month tracker for contraceptive and menstrual cycle regulation.</p>
              </div>
              
              <div className="setup-body">
                <div className="info-alert">
                  <Info />
                  <div>
                    <strong>Regimen Summary:</strong>
                    <ul>
                      <li><strong>Phase 1:</strong> 10 days (morning & evening, after food)</li>
                      <li><strong>Phase 2:</strong> 5-day pause (periods will arrive)</li>
                      <li><strong>Phase 3+:</strong> Start on <strong>Day 3 of Period</strong> for 21 days (night only), pause 5 days, repeat for 6 months.</li>
                    </ul>
                  </div>
                </div>

                <form onSubmit={handleStartTracking} className="setup-form">
                  <div className="form-group">
                    <label htmlFor="startDateInput">When did you start (or plan to start) Day 1?</label>
                    <input 
                      type="date" 
                      id="startDateInput" 
                      name="startDateInput" 
                      defaultValue={todayStr} 
                      required 
                    />
                  </div>
                  
                  <div className="setup-actions">
                    <button type="submit" className="btn btn-primary btn-block">
                      <Play /> Start Tracking
                    </button>
                    <button 
                      type="button" 
                      onClick={handleLoadDemoData} 
                      className="btn btn-secondary btn-block"
                    >
                      <Sparkles /> Load Demo Data (Day 12 State)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* SCREEN 2: Dashboard Tab */}
            {activeTab === 'dashboard' && todayItem && (
              <section className="screen-section">
                <div className="dashboard-grid">
                  
                  {/* Left Column */}
                  <div className="grid-col main-col">
                    
                    {/* Phase Progress Card */}
                    <div className="phase-banner">
                      <div className="phase-badge">{todayItem.phaseBadge}</div>
                      <h2>{todayItem.phaseName}</h2>
                      
                      <p>
                        {todayItem.isPause 
                          ? "Medication paused. Period is expected in this window."
                          : `Active tracking. Required Dosage: ${todayItem.expectedPills.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' & ')}`
                        }
                      </p>
                      
                      {/* Progress Bar */}
                      {(() => {
                        const currentPhaseDays = timeline.filter(d => d.phase === todayItem.phase);
                        const totalDaysInPhase = currentPhaseDays.length;
                        const currentDayIndex = currentPhaseDays.findIndex(d => d.dateStr === todayItem.dateStr) + 1;
                        const progressPercent = totalDaysInPhase > 0 ? (currentDayIndex / totalDaysInPhase) * 100 : 0;
                        
                        return (
                          <div className="progress-container">
                            <div className="progress-bar-wrapper">
                              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <span className="progress-text">Day {currentDayIndex} of {totalDaysInPhase}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Today's Checklist Card */}
                    <div className="dashboard-card checklist-card">
                      <div className="card-header">
                        <h3>
                          <CheckCircle className="text-accent" />
                          Today's Dosage Checklist
                        </h3>
                        <span className="date-today">{formatDateLong(todayItem.date)}</span>
                      </div>
                      
                      <div className="card-body">
                        <div className="dosage-instruction">
                          Take with food as directed.
                        </div>

                        <div className="checklist-items">
                          {todayItem.isPause ? (
                            <div className="info-alert" style={{ marginBottom: 0 }}>
                              <Info />
                              <div>
                                <strong>No pills scheduled for today.</strong> Enjoy your rest day! Make sure to log the start of your period when it arrives.
                              </div>
                            </div>
                          ) : (
                            todayItem.expectedPills.map(pill => {
                              const isTaken = todayItem.logEntry[pill] === true;
                              const displayLabel = pill.charAt(0).toUpperCase() + pill.slice(1) + " Pill";
                              const displaySub = todayItem.phase === 1 ? "After Food (Morning & Evening cycle)" : "After Food (Night only cycle)";
                              const displayTime = pill === 'morning' ? '8:00 AM' : (pill === 'evening' ? '8:00 PM' : '9:00 PM');
                              
                              return (
                                <div 
                                  key={pill}
                                  className={`checklist-item ${isTaken ? 'checked' : ''}`}
                                  onClick={() => handleTogglePill(todayItem.dateStr, pill)}
                                >
                                  <div className="checkbox-left">
                                    <div className="checkbox-custom">
                                      <Check />
                                    </div>
                                    <div className="checkbox-label">
                                      <span>{displayLabel}</span>
                                      <small>{displaySub}</small>
                                    </div>
                                  </div>
                                  <div className="badge-time">{displayTime}</div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="streak-indicator">
                          <Sparkles />
                          <span>{streak} Day Streak! {streak > 0 ? 'Keep it up!' : 'Start logging to build your streak.'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Period Logging Card */}
                    {(() => {
                      const isNearPause = todayItem.isPause || timeline.slice(Math.max(0, timeline.indexOf(todayItem) - 5), timeline.indexOf(todayItem)).some(d => d.isPause);
                      if (!isNearPause) return null;
                      
                      const currentPauseDays = timeline.filter(d => d.phase === todayItem.phase || (!todayItem.isPause && d.phase === todayItem.phase - 1));
                      const loggedPeriodDay = currentPauseDays.find(d => d.logEntry.period === true);
                      
                      return (
                        <div className="dashboard-card period-card highlight-card">
                          <div className="card-body period-card-body">
                            <div className="period-icon-wrapper">
                              <Droplet />
                            </div>
                            <div className="period-info">
                              <h4>Menstruation Update</h4>
                              {loggedPeriodDay ? (
                                <>
                                  <p>
                                    Period logged successfully. Your next cycle is calculated to start on Day 3 of your period: <strong>{formatDateLong(addDays(loggedPeriodDay.date, 2))}</strong>
                                  </p>
                                  <div className="period-actions">
                                    <span className="logged-period-status">
                                      <CheckCircle /> Logged: Started on {formatDateLong(loggedPeriodDay.date)}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p>During this pause, periods are expected. Have you started bleeding? Log it below to schedule your next cycle.</p>
                                  <div className="period-actions">
                                    <button className="btn btn-accent btn-sm" onClick={handleLogPeriodToday}>
                                      <Check /> Yes, Period Started
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column (Sidebar) */}
                  <div className="grid-col sidebar-col">
                    {/* Doctor Countdown Card */}
                    <div className="dashboard-card doc-card">
                      <div className="card-body text-center">
                        <div className="doc-avatar">
                          <Stethoscope />
                        </div>
                        <h3>Doctor Revisit Countdown</h3>
                        <p className="doc-subtitle">Schedule a consultation after 1 month of taking pills.</p>
                        
                        <div className="countdown-circle">
                          <svg className="countdown-svg" viewBox="0 0 100 100">
                            <circle className="countdown-bg" cx="50" cy="50" r="45"></circle>
                            <circle 
                              className="countdown-progress" 
                              cx="50" 
                              cy="50" 
                              r="45" 
                              strokeDasharray="282.7" 
                              strokeDashoffset={docRevisitData.strokeOffset}
                            ></circle>
                          </svg>
                          <div className="countdown-number">
                            <span>{docRevisitData.daysLeft < 0 ? "Due" : docRevisitData.daysLeft}</span>
                            <small>{docRevisitData.daysLeft < 0 ? "Now" : "Days Left"}</small>
                          </div>
                        </div>
                        
                        <p className="doc-target-date">Revisit Date: <strong>{docRevisitData.targetStr}</strong></p>
                        {docRevisitData.urgent && (
                          <div className="urgent-badge">
                            <AlertTriangle /> Time to schedule appointment!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Safety Panel Card */}
                    <div className="dashboard-card info-card">
                      <div className="card-header">
                        <h3>
                          <Info className="text-info" />
                          Safety Guidelines
                        </h3>
                      </div>
                      <div className="card-body">
                        <div className="guideline-item">
                          <div className="guideline-icon text-success">
                            <Shield />
                          </div>
                          <div className="guideline-content">
                            <h5>Contraceptive Cover</h5>
                            <p>{shieldData.advice}</p>
                          </div>
                        </div>
                        <div className="guideline-item">
                          <div className="guideline-icon text-warning">
                            <Clock />
                          </div>
                          <div className="guideline-content">
                            <h5>Timing Matters</h5>
                            <p>Try to take your dose at the same time each day (e.g., Morning: 8 AM, Evening/Night: 9 PM).</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SCREEN 3: Calendar Tab */}
            {activeTab === 'calendar' && (
              <section className="screen-section">
                <div className="calendar-wrapper">
                  <div className="calendar-header-bar">
                    <h2>Interactive Schedule Calendar</h2>
                    <div className="calendar-controls">
                      <button className="btn btn-icon btn-secondary" onClick={handlePrevMonth}><ChevronLeft /></button>
                      <h3>{monthNames[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}</h3>
                      <button className="btn btn-icon btn-secondary" onClick={handleNextMonth}><ChevronRight /></button>
                    </div>
                  </div>

                  {/* Calendar Legends */}
                  <div className="calendar-legends">
                    <div className="legend-item"><span className="legend-dot phase-1"></span> Phase 1 (Morning & Evening)</div>
                    <div className="legend-item"><span className="legend-dot phase-3"></span> Phase 3+ (Night Only)</div>
                    <div className="legend-item"><span className="legend-dot phase-pause"></span> Pause / Waiting for Period</div>
                    <div className="legend-item"><span className="legend-dot phase-period"></span> Period Day</div>
                    <div className="legend-item"><span className="legend-dot icon-taken"><Check style={{width: 8, height: 8}} /></span> Taken</div>
                    <div className="legend-item"><span className="legend-dot icon-missed"><X style={{width: 8, height: 8}} /></span> Missed</div>
                  </div>

                  {/* Grid */}
                  <div className="calendar-grid">
                    <div className="day-name">Sun</div>
                    <div className="day-name">Mon</div>
                    <div className="day-name">Tue</div>
                    <div className="day-name">Wed</div>
                    <div className="day-name">Thu</div>
                    <div className="day-name">Fri</div>
                    <div className="day-name">Sat</div>
                    <div className="days-container">
                      {calendarDays.map((cell, idx) => {
                        if (cell.empty) {
                          return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
                        }
                        
                        const { node, day } = cell;
                        let classes = "calendar-day";
                        
                        if (node) {
                          if (node.isPeriodDay) classes += " phase-period";
                          else if (node.phase === 1) classes += " phase-1";
                          else if (node.isPause) classes += " phase-pause";
                          else classes += " phase-3";
                          
                          if (node.isForecast) classes += " forecast";
                          if (node.isToday) classes += " today";
                        }
                        
                        return (
                          <div 
                            key={cell.dateStr}
                            className={classes}
                            onClick={() => { if (node) setSelectedDayDetails(node); }}
                          >
                            {node && !node.isPause && !node.isForecast && (
                              <div className={`day-completion-icon ${node.isFullyTaken ? 'taken' : (node.isAnyMissed ? 'missed' : '')}`}>
                                {node.isFullyTaken ? <Check /> : (node.isAnyMissed ? <X /> : null)}
                              </div>
                            )}
                            <span className="day-number">{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Day details panel */}
                  {updatedSelectedDayDetails && (
                    <div className="day-details-panel">
                      <div className="panel-header">
                        <h4>{formatDateLong(updatedSelectedDayDetails.date)}</h4>
                        <button className="btn-close" onClick={() => setSelectedDayDetails(null)}><X /></button>
                      </div>
                      <div className="panel-body">
                        <p><strong>Status:</strong> {updatedSelectedDayDetails.phaseName} (Day {updatedSelectedDayDetails.phaseDay + 1})</p>
                        {updatedSelectedDayDetails.isPause ? (
                          <p><strong>Dosage:</strong> Medication paused.</p>
                        ) : (
                          <>
                            <p><strong>Expected Dosage:</strong> {updatedSelectedDayDetails.expectedPills.map(p => p.toUpperCase()).join(' & ')}</p>
                            <p><strong>Taken:</strong> {updatedSelectedDayDetails.takenPills.length > 0 ? updatedSelectedDayDetails.takenPills.map(p => p.toUpperCase()).join(' & ') : 'None'}</p>
                          </>
                        )}
                        {updatedSelectedDayDetails.isPeriodDay && (
                          <p className="text-danger"><strong>Menstruation:</strong> Active Period logged on this day.</p>
                        )}
                        
                        {!updatedSelectedDayDetails.isForecast && (
                          <div className="details-actions">
                            {!updatedSelectedDayDetails.isPause && updatedSelectedDayDetails.expectedPills.map(pill => {
                              const isTaken = updatedSelectedDayDetails.logEntry[pill] === true;
                              return (
                                <button 
                                  key={pill}
                                  className={`btn btn-sm ${isTaken ? 'btn-danger' : 'btn-primary'}`}
                                  onClick={() => handleTogglePill(updatedSelectedDayDetails.dateStr, pill)}
                                >
                                  {isTaken ? `Mark ${pill.toUpperCase()} Missed` : `Mark ${pill.toUpperCase()} Taken`}
                                </button>
                              );
                            })}
                            <button 
                              className="btn btn-sm btn-accent"
                              onClick={() => handleSetPeriodLogExplicit(updatedSelectedDayDetails.dateStr, !updatedSelectedDayDetails.logEntry.period)}
                            >
                              {updatedSelectedDayDetails.logEntry.period ? "Remove Period Log" : "Log Period Start"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SCREEN 4: Logs List */}
            {activeTab === 'history' && (
              <section className="screen-section">
                <div className="card-container">
                  <div className="dashboard-card">
                    <div className="card-header justify-between">
                      <h3>
                        <HistoryIcon className="text-accent" />
                        Full Log History
                      </h3>
                      <div className="card-actions">
                        <button className="btn btn-secondary btn-sm" onClick={handleExportData}>
                          <Download /> Export Data
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleImportTrigger}>
                          <Upload /> Import Data
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".json"
                          onChange={handleImportFile}
                        />
                        <button className="btn btn-danger btn-sm" onClick={handleResetApp}>
                          <RefreshCw /> Reset App
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      <p className="history-intro">Below is the complete record of your 6-month cycle. You can manually adjust any day's taken/missed status or toggle periods if you logged them incorrectly.</p>
                      
                      <div className="table-responsive">
                        <table className="history-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Phase / Day</th>
                              <th>Expected Dosage</th>
                              <th>Status Log</th>
                              <th>Period?</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historicalDays.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="text-center">No history logs generated yet. Keep tracking!</td>
                              </tr>
                            ) : (
                              historicalDays.map(day => (
                                <tr key={day.dateStr}>
                                  <td><strong>{formatDateLong(day.date)}</strong></td>
                                  <td>{day.phaseBadge} (Day {day.phaseDay + 1})</td>
                                  <td>{day.isPause ? 'Pause (None)' : day.expectedPills.map(p => p.toUpperCase()).join(' + ')}</td>
                                  <td>
                                    {day.isPause ? (
                                      <span className="pill-badge pause">Pause</span>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {day.expectedPills.map(pill => {
                                          const isTaken = day.logEntry[pill] === true;
                                          return (
                                            <button
                                              key={pill}
                                              className={`btn btn-sm ${isTaken ? 'btn-primary' : 'btn-secondary'}`}
                                              style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                                              onClick={() => handleTogglePill(day.dateStr, pill)}
                                              title={`Click to mark ${pill} as ${isTaken ? 'missed' : 'taken'}`}
                                            >
                                              {isTaken ? `✓ ${pill.toUpperCase()}` : `✗ ${pill.toUpperCase()}`}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <label className="checkbox-container">
                                      <input 
                                        type="checkbox" 
                                        checked={day.logEntry.period === true} 
                                        onChange={() => handleSetPeriodLogExplicit(day.dateStr, !day.logEntry.period)}
                                      />
                                      <span className="checkbox-checkmark"></span>
                                      {day.logEntry.period ? (
                                        <span className="text-danger font-semibold">Active Period</span>
                                      ) : (
                                        <span className="text-dim">No</span>
                                      )}
                                    </label>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SCREEN 5: Reminders & Alerts Configuration */}
            {activeTab === 'reminders' && (
              <section className="screen-section">
                <div className="reminders-container">
                  <div className="dashboard-card reminders-settings-card">
                    <div className="card-header justify-between">
                      <h3>
                        <Bell className="text-accent" />
                        Reminders & Alerts Configuration
                      </h3>
                      <div className="notification-status-badge">
                        <span className="text-muted" style={{ marginRight: '6px' }}>Status:</span>
                        {notificationPermission === 'granted' ? (
                          <span className="badge-status success">Push Enabled</span>
                        ) : notificationPermission === 'denied' ? (
                          <span className="badge-status danger">Push Blocked</span>
                        ) : (
                          <span className="badge-status warning">Push Setup Required</span>
                        )}
                      </div>
                    </div>

                    <div className="card-body">
                      <p className="reminders-intro">
                        Set up custom times to receive daily reminders for your scheduled contraceptive doses. You can configure native browser alerts, audible sounds, or Twilio SMS & WhatsApp alerts directly to your phone.
                      </p>

                      <div className="settings-grid">
                        {/* Reminders Enable Toggle */}
                        <div className="settings-row toggle-row">
                          <div className="setting-description">
                            <h4>System Push Notifications</h4>
                            <p>Receive desktop/mobile browser alerts when your pill is due.</p>
                          </div>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={reminderSettings.enabled} 
                              onChange={handleToggleReminders} 
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>

                        {/* Audio Chime Toggle */}
                        <div className="settings-row toggle-row">
                          <div className="setting-description">
                            <h4>Audible Chime Alert</h4>
                            <p>Play a gentle synthesizer chime sound when a reminder triggers.</p>
                          </div>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={reminderSettings.audioEnabled} 
                              onChange={(e) => setReminderSettings(prev => ({ ...prev, audioEnabled: e.target.checked }))} 
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>



                        {/* Twilio Toggle */}
                        <div className="settings-row toggle-row">
                          <div className="setting-description">
                            <h4>Twilio SMS & WhatsApp Alerts</h4>
                            <p>Send reminders directly to your phone via Twilio SMS or WhatsApp.</p>
                          </div>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={reminderSettings.twilioEnabled} 
                              onChange={(e) => setReminderSettings(prev => ({ ...prev, twilioEnabled: e.target.checked }))} 
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>

                        {/* Twilio Credentials Card */}
                        {reminderSettings.twilioEnabled && (
                          <div className="twilio-config-panel">
                            <h4>Twilio Settings</h4>
                            
                            {/* Type selector */}
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Notification Channel</label>
                              <div style={{ display: 'flex', gap: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input 
                                    type="radio" 
                                    name="twilioType" 
                                    value="sms" 
                                    checked={reminderSettings.twilioType === 'sms'} 
                                    onChange={(e) => setReminderSettings(prev => ({ ...prev, twilioType: e.target.value }))}
                                  />
                                  <span>SMS Text Message</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input 
                                    type="radio" 
                                    name="twilioType" 
                                    value="whatsapp" 
                                    checked={reminderSettings.twilioType === 'whatsapp'} 
                                    onChange={(e) => setReminderSettings(prev => ({ ...prev, twilioType: e.target.value }))}
                                  />
                                  <span style={{ color: '#25d366', fontWeight: '600' }}>WhatsApp Message</span>
                                </label>
                              </div>
                            </div>

                            <div className="form-group-row">
                              <div className="form-group">
                                <label htmlFor="twilioSid">Twilio Account SID</label>
                                <input 
                                  type="text" 
                                  id="twilioSid" 
                                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                                  value={reminderSettings.twilioSid} 
                                  onChange={(e) => setReminderSettings(prev => ({ ...prev, twilioSid: e.target.value }))}
                                  className="styled-text-input"
                                />
                              </div>
                              <div className="form-group">
                                <label htmlFor="twilioToken">Twilio Auth Token</label>
                                <input 
                                  type="password" 
                                  id="twilioToken" 
                                  placeholder="Enter Twilio Auth Token"
                                  value={reminderSettings.twilioToken} 
                                  onChange={(e) => setReminderSettings(prev => ({ ...prev, twilioToken: e.target.value }))}
                                  className="styled-text-input"
                                />
                              </div>
                            </div>

                            <div className="form-group-row">
                              <div className="form-group">
                                <label htmlFor="twilioFrom">
                                  {reminderSettings.twilioType === 'whatsapp' ? 'Twilio WhatsApp Sender Number' : 'Twilio Phone Number'}
                                </label>
                                <input 
                                  type="text" 
                                  id="twilioFrom" 
                                  placeholder={reminderSettings.twilioType === 'whatsapp' ? 'e.g. +14155238886' : 'e.g. +1234567890'}
                                  value={reminderSettings.twilioFrom} 
                                  onChange={(e) => setReminderSettings(prev => ({ ...prev, twilioFrom: e.target.value }))}
                                  className="styled-text-input"
                                />
                                {reminderSettings.twilioType === 'whatsapp' && (
                                  <small className="text-dim">Typically <code>+14155238886</code> for the Twilio sandbox.</small>
                                )}
                              </div>
                              <div className="form-group">
                                <label htmlFor="twilioTo">Recipient Phone Number</label>
                                <input 
                                  type="text" 
                                  id="twilioTo" 
                                  placeholder="e.g. +919876543210 (your number)"
                                  value={reminderSettings.twilioTo} 
                                  onChange={(e) => setReminderSettings(prev => ({ ...prev, twilioTo: e.target.value }))}
                                  className="styled-text-input"
                                />
                                <small className="text-dim">Must include <code>+</code> and country code.</small>
                              </div>
                            </div>

                            {/* Twilio WhatsApp instructions if selected */}
                            {reminderSettings.twilioType === 'whatsapp' && (
                              <div className="whatsapp-guide" style={{ marginTop: '16px', borderColor: 'var(--accent-hover)' }}>
                                <h5>
                                  <Sparkles className="text-accent" style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                                  Twilio WhatsApp Sandbox Setup Required:
                                </h5>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                  Before Twilio can send messages to your WhatsApp, your recipient phone number must join your sandbox:
                                </p>
                                <ol className="guide-steps" style={{ fontSize: '0.85rem' }}>
                                  <li>Go to your <strong>Twilio Console &rarr; Messaging &rarr; Try it out &rarr; Send a WhatsApp message</strong>.</li>
                                  <li>Send the join message (e.g. <code className="code-highlight">join sandbox-name</code>) to Twilio's WhatsApp number (e.g., <strong>+1 415 523 8886</strong>).</li>
                                  <li>Once linked, you can click the Test button below to verify!</li>
                                </ol>
                              </div>
                            )}
                          </div>
                        )}

                        <hr className="settings-divider" />

                        {/* Time Slots */}
                        <div className="time-slots-section">
                          <h4>Customize Dose Reminders</h4>
                          <p className="subtitle">Configure the exact time you prefer to take each dose phase.</p>
                          
                          <div className="time-pickers-grid">
                            {/* Morning Pill Time */}
                            <div className="time-picker-card">
                              <div className="card-title-sub">
                                <Clock className="text-accent" />
                                <div>
                                  <h5>Morning Dose</h5>
                                  <small>Phase 1 (1st - 10th day)</small>
                                </div>
                              </div>
                              <input 
                                type="time" 
                                value={reminderSettings.morningTime} 
                                onChange={(e) => setReminderSettings(prev => ({ ...prev, morningTime: e.target.value }))}
                                className="styled-time-input"
                              />
                            </div>

                            {/* Evening Pill Time */}
                            <div className="time-picker-card">
                              <div className="card-title-sub">
                                <Clock className="text-accent" />
                                <div>
                                  <h5>Evening Dose</h5>
                                  <small>Phase 1 (1st - 10th day)</small>
                                </div>
                              </div>
                              <input 
                                type="time" 
                                value={reminderSettings.eveningTime} 
                                onChange={(e) => setReminderSettings(prev => ({ ...prev, eveningTime: e.target.value }))}
                                className="styled-time-input"
                              />
                            </div>

                            {/* Night Pill Time */}
                            <div className="time-picker-card">
                              <div className="card-title-sub">
                                <Clock className="text-accent" />
                                <div>
                                  <h5>Night Dose</h5>
                                  <small>Phase 3+ (Cycle Regulation)</small>
                                </div>
                              </div>
                              <input 
                                type="time" 
                                value={reminderSettings.nightTime} 
                                onChange={(e) => setReminderSettings(prev => ({ ...prev, nightTime: e.target.value }))}
                                className="styled-time-input"
                              />
                            </div>
                          </div>
                        </div>

                        <hr className="settings-divider" />

                        {/* Test & Troubleshooting Panel */}
                        <div className="troubleshoot-panel">
                          <div className="panel-info">
                            <h4>Test Your Settings</h4>
                            <p>Verify that your notification channels are working. Click the buttons below to trigger instant test alerts.</p>
                          </div>
                          <div className="test-buttons-row">
                            <button 
                              className="btn btn-secondary" 
                              onClick={handleTestReminder}
                            >
                              <Bell /> Test Push & Chime
                            </button>

                            {reminderSettings.twilioEnabled && (
                              <button 
                                className="btn btn-primary" 
                                onClick={async () => {
                                  if (!reminderSettings.twilioSid || !reminderSettings.twilioToken || !reminderSettings.twilioFrom || !reminderSettings.twilioTo) {
                                    alert("Please fill in all Twilio credentials above before testing.");
                                    return;
                                  }
                                  const success = await sendTwilioSMS("Bebo Reminder Test: This is a test SMS from your Bebo Pill Companion!");
                                  if (success) {
                                    alert("Twilio SMS sent! Check your phone.");
                                  } else {
                                    alert("Failed to send SMS. Please make sure server.js is running and your Twilio credentials are correct.");
                                  }
                                }}
                              >
                                <Play /> Test Twilio SMS
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Guide & Alert Card */}
                  <div className="dashboard-card info-card">
                    <div className="card-header">
                      <h3>
                        <Info className="text-info" />
                        Important Technical Notes
                      </h3>
                    </div>
                    <div className="card-body">
                      <div className="guideline-item">
                        <div className="guideline-icon text-warning">
                          <Clock />
                        </div>
                        <div className="guideline-content">
                          <h5>Browser Background Execution</h5>
                          <p>Since Bebo runs client-side, the browser tab must remain open (even in the background) for reminders to trigger. If you close the tab, reminders will catch up and alert you the next time you open the application if a dose is still outstanding today.</p>
                        </div>
                      </div>

                      <div className="guideline-item">
                        <div className="guideline-icon text-success">
                          <Shield />
                        </div>
                        <div className="guideline-content">
                          <h5>Notification Channels</h5>
                          <p>For system push notifications, check your browser's site settings to ensure that Bebo has permission to send notifications. For WhatsApp alerts, ensure your phone number has been registered with the Twilio WhatsApp Sandbox.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SCREEN 6: Regimen Guide Tab */}
            {activeTab === 'guide' && (
              <section className="screen-section">
                <div className="guide-grid">
                  <div className="guide-card">
                    <h3><Heart className="text-accent" /> Understanding Your Treatment Regimen</h3>
                    <p>This tracking calendar supports a specialized two-stage contraceptive and menstrual cycle regulation plan prescribed by your doctor.</p>
                    
                    <div className="timeline-roadmap">
                      <div className="roadmap-step">
                        <div className="step-num">1</div>
                        <div className="step-content">
                          <h4>Initial Priming Phase</h4>
                          <p><strong>Length:</strong> 10 Days</p>
                          <p><strong>Dosage:</strong> Morning and Evening (2 pills daily, after food).</p>
                          <p><strong>Purpose:</strong> Prepares the endometrium and establishes baseline hormones.</p>
                        </div>
                      </div>
                      
                      <div className="roadmap-step">
                        <div className="step-num">2</div>
                        <div className="step-content">
                          <h4>First Pause</h4>
                          <p><strong>Length:</strong> 5 Days (or until period starts)</p>
                          <p><strong>Dosage:</strong> No pills.</p>
                          <p><strong>Purpose:</strong> Allows withdrawal bleeding (your period) to begin. Typically happens during these 5 days.</p>
                        </div>
                      </div>

                      <div className="roadmap-step">
                        <div className="step-num">3</div>
                        <div className="step-content">
                          <h4>Regulation & Contraceptive Cycles</h4>
                          <p><strong>Length:</strong> 21 Days (starting on Day 3 of your period)</p>
                          <p><strong>Dosage:</strong> Evening/Night only (1 pill daily, after food).</p>
                          <p><strong>Purpose:</strong> Serves as your active contraceptive and cycle regulator. Starting specifically on the 3rd day of your bleed aligns with physiological follicle development.</p>
                        </div>
                      </div>

                      <div className="roadmap-step">
                        <div className="step-num">4</div>
                        <div className="step-content">
                          <h4>Subsequent Cycles</h4>
                          <p><strong>Pattern:</strong> 5-day pause (period comes) &rarr; restart on Day 3 of period &rarr; take for 21 days (night only) &rarr; repeat.</p>
                          <p><strong>Total Duration:</strong> 6 Months.</p>
                          <p><strong>Doctor Visit:</strong> Revisit your gynecologist after 1 month (approx. 30 days) to evaluate tolerance and confirm tracking.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="guide-card faq-card">
                    <h3><HelpCircle className="text-info" /> Frequently Asked Questions</h3>
                    
                    <div className="faq-item">
                      <h5>What if I miss a pill?</h5>
                      <p>Take it as soon as you remember. If it is almost time for your next dose, skip the missed dose and resume your regular schedule. Do NOT take double doses to make up for a missed one. Note: Contraceptive efficacy might be compromised for the next 7 days; use barrier contraception (condoms).</p>
                    </div>

                    <div className="faq-item">
                      <h5>What if my period starts late/early?</h5>
                      <p>The app automatically adjusts! As soon as your period starts, log it in the dashboard. The system will count 3 days and schedule the start of your next 21-day cycle on that exact 3rd day, maintaining accurate tracking regardless of cycle lengths.</p>
                    </div>

                    <div className="faq-item">
                      <h5>How does it work as a contraceptive?</h5>
                      <p>Once you transition to the regular 21-day cycle and take it consistently, the hormones prevent ovulation, thin the uterine lining, and thicken cervical mucus to prevent sperm from fertilizing an egg. Consistency is key.</p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>&copy; 2026 Bebo Track. Safe, simple, and consistent.</p>
      </footer>
    </div>
  );
}
