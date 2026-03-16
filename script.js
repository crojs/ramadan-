// Complete Automatic Azan - No Click Required
class RamadanApp {
  constructor() {
    this.prayerTimes = null;
    this.selectedCity = 'Dhaka';
    this.azanEnabled = true;
    this.azanPlayedToday = {};
    this.audioElements = [];
    this.audioContext = null;
    this.userInteracted = false;
    
    this.prayerNames = {
      Fajr: 'ফজর', Dhuhr: 'যোহর', Asr: 'আসর', Maghrib: 'মাগরিব', Isha: 'ইশা'
    };
    
    this.init();
  }
  
  init() {
    this.setupAudio();
    this.setupEventListeners();
    this.fetchTimes('Dhaka');
    this.startClock();
    this.setupAutoAzan();
    this.setupUserInteraction();
  }
  
  // Setup audio elements
  setupAudio() {
    // Get all audio elements
    this.audioElements = [
      document.getElementById('adhanAudio1'),
      document.getElementById('adhanAudio2'),
      document.getElementById('adhanAudio3')
    ].filter(a => a !== null);
    
    // Set volume and preload
    this.audioElements.forEach(audio => {
      audio.volume = 1.0;
      audio.load();
    });
    
    // Create audio context for better control
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('AudioContext not supported');
    }
  }
  
  // Setup user interaction to unlock audio
  setupUserInteraction() {
    const unlockAudio = () => {
      if (!this.userInteracted) {
        this.userInteracted = true;
        
        // Resume audio context
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        
        // Play silent sound to unlock
        const silentAudio = document.getElementById('unlockAudio');
        silentAudio.volume = 0.1;
        silentAudio.play().catch(() => {});
        
        // Remove listeners after first interaction
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      }
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
  }
  
  setupEventListeners() {
    // City change
    document.getElementById('division').addEventListener('change', (e) => {
      this.selectedCity = e.target.value;
      this.fetchTimes(this.selectedCity);
      this.azanPlayedToday = {};
    });
    
    // Azan toggle
    document.getElementById('toggleAzan').addEventListener('click', () => {
      this.azanEnabled = !this.azanEnabled;
      const btn = document.getElementById('toggleAzan');
      btn.textContent = this.azanEnabled ? '🔊 আজান চালু' : '🔇 আজান বন্ধ';
      btn.className = this.azanEnabled ? 'azan-toggle-btn' : 'azan-toggle-btn off';
      document.getElementById('azanStatus').textContent = this.azanEnabled ? '🎵 আজান সক্রিয়' : '🔇 আজান নিষ্ক্রিয়';
    });
  }
  
  // Auto azan setup - checks every second
  setupAutoAzan() {
    setInterval(() => {
      this.checkAzanTime();
    }, 1000);
  }
  
  // Check if it's time for azan
  checkAzanTime() {
    if (!this.prayerTimes || !this.azanEnabled) return;
    
    const now = new Date();
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const currentHour = bdTime.getHours();
    const currentMinute = bdTime.getMinutes();
    const currentSecond = bdTime.getSeconds();
    
    // Only check at exact second 0
    if (currentSecond !== 0) return;
    
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    prayers.forEach(prayer => {
      const prayerTime = this.prayerTimes[prayer];
      if (!prayerTime) return;
      
      const [prayerHour, prayerMinute] = prayerTime.split(':').map(Number);
      
      // Exact time match
      if (currentHour === prayerHour && currentMinute === prayerMinute) {
        this.playAutomaticAzan(prayer);
      }
    });
  }
  
  // Play azan automatically
  playAutomaticAzan(prayer) {
    const today = new Date().toDateString();
    const key = `${prayer}-${today}`;
    
    // Don't play if already played today
    if (this.azanPlayedToday[key]) return;
    
    // Mark as played
    this.azanPlayedToday[key] = true;
    
    // Update UI
    const status = document.getElementById('azanStatus');
    status.textContent = `🔊 ${this.prayerNames[prayer]} এর আজান বাজছে`;
    status.className = 'azan-status playing';
    
    // Highlight prayer
    const prayerElement = document.querySelector(`[data-prayer="${prayer}"]`);
    if (prayerElement) {
      prayerElement.classList.add('azan-playing');
    }
    
    // Try to play audio with multiple sources
    this.playAudioWithFallback(prayer);
    
    // Reset UI after azan finishes (2 minutes)
    setTimeout(() => {
      status.textContent = this.azanEnabled ? '🎵 আজান সক্রিয়' : '🔇 আজান নিষ্ক্রিয়';
      status.className = 'azan-status';
      
      if (prayerElement) {
        prayerElement.classList.remove('azan-playing');
      }
    }, 120000);
  }
  
  // Play audio with fallback
  playAudioWithFallback(prayer) {
    let attemptCount = 0;
    
    const tryPlay = (index) => {
      if (index >= this.audioElements.length) {
        // All failed - show message
        document.getElementById('azanStatus').textContent = '⚠️ আজান বাজানো যাচ্ছে না';
        return;
      }
      
      const audio = this.audioElements[index];
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`Azan playing from source ${index + 1}`);
        }).catch(() => {
          tryPlay(index + 1);
        });
      } else {
        tryPlay(index + 1);
      }
    };
    
    tryPlay(0);
  }
  
  // Format time to 12 hour
  formatTime12h(time24) {
    if (!time24) return '--:--';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12 || 12;
    return `${h12.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${period}`;
  }
  
  // Get current Bangladesh time
  getCurrentTime() {
    return new Date().toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Dhaka',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    });
  }
  
  // Fetch prayer times
  async fetchTimes(city) {
    try {
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Bangladesh&method=99&methodSettings=18.5,null,17.5`
      );
      const data = await res.json();
      if (data.code === 200) {
        this.prayerTimes = data.data.timings;
        this.updateUI();
      } else {
        this.useFallbackData();
      }
    } catch {
      this.useFallbackData();
    }
  }
  
  // Fallback data
  useFallbackData() {
    this.prayerTimes = {
      Imsak: '04:18', Fajr: '04:28', Dhuhr: '12:01',
      Asr: '15:30', Maghrib: '18:10', Isha: '19:40'
    };
    this.updateUI();
  }
  
  // Update UI
  updateUI() {
    document.getElementById('sehriTime').textContent = this.formatTime12h(this.prayerTimes.Imsak);
    document.getElementById('iftarTime').textContent = this.formatTime12h(this.prayerTimes.Maghrib);
    
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let html = '';
    
    prayers.forEach(p => {
      html += `
        <div class="prayer-item" data-prayer="${p}" data-time="${this.prayerTimes[p]}">
          <div class="prayer-name">${this.prayerNames[p]}</div>
          <div class="prayer-time">${this.formatTime12h(this.prayerTimes[p])}</div>
          <div class="prayer-countdown" id="countdown-${p}">--:--:--</div>
        </div>
      `;
    });
    
    document.getElementById('prayerTimesGrid').innerHTML = html;
    this.startCountdowns();
  }
  
  // Get next event
  getNextEvent() {
    const now = new Date();
    const bd = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Dhaka'}));
    const current = bd.getHours() * 60 + bd.getMinutes();
    
    const imsak = this.timeToMins(this.prayerTimes.Imsak);
    const maghrib = this.timeToMins(this.prayerTimes.Maghrib);
    
    if (current < imsak) return {name: 'সেহরি শেষ', time: this.prayerTimes.Imsak};
    if (current < maghrib) return {name: 'ইফতার', time: this.prayerTimes.Maghrib};
    return {name: 'আগামীকাল সেহরি', time: this.prayerTimes.Imsak, tomorrow: true};
  }
  
  // Convert time to minutes
  timeToMins(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  
  // Update countdowns
  updateCountdowns() {
    if (!this.prayerTimes) return;
    
    const now = new Date();
    const bd = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Dhaka'}));
    const currentMins = bd.getHours() * 60 + bd.getMinutes();
    const currentSecs = bd.getSeconds();
    
    // Main event
    const next = this.getNextEvent();
    let target = this.timeToMins(next.time);
    if (next.tomorrow) target += 1440;
    
    let diff = target - currentMins;
    if (diff < 0) diff += 1440;
    
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    const s = 59 - currentSecs;
    
    document.getElementById('nextEventTimer').textContent = 
      `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    document.getElementById('nextEventName').textContent = next.name;
    
    // Prayer countdowns
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextPrayer = null;
    let minDiff = Infinity;
    
    prayers.forEach(p => {
      const pMins = this.timeToMins(this.prayerTimes[p]);
      let diff = pMins - currentMins;
      if (diff < 0) diff += 1440;
      
      const el = document.getElementById(`countdown-${p}`);
      if (el) {
        el.textContent = `${Math.floor(diff/60).toString().padStart(2,'0')}:${(diff%60).toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      }
      
      if (diff > 0 && diff < minDiff) {
        minDiff = diff;
        nextPrayer = p;
      }
    });
    
    // Highlight next prayer
    document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('next-prayer'));
    if (nextPrayer) {
      const el = document.querySelector(`[data-prayer="${nextPrayer}"]`);
      if (el) el.classList.add('next-prayer');
    }
  }
  
  // Start clock
  startClock() {
    setInterval(() => {
      document.getElementById('digitalClock').textContent = this.getCurrentTime();
    }, 1000);
  }
  
  // Start countdowns
  startCountdowns() {
    setInterval(() => this.updateCountdowns(), 1000);
  }
}

// Start app
new RamadanApp();