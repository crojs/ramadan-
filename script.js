// Complete Azan System with Exact Timing
class RamadanApp {
  constructor() {
    this.prayerTimesData = null;
    this.selectedDivision = 'Dhaka';
    this.timers = [];
    this.azanEnabled = true;
    this.audioContext = null;
    this.azanPlayedToday = {};
    this.currentAzanPlaying = null;
    
    this.prayerNames = {
      Fajr: 'ফজর', Dhuhr: 'যোহর', Asr: 'আসর', Maghrib: 'মাগরিব', Isha: 'ইশা'
    };
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.fetchTimes('Dhaka');
    this.startClock();
    this.initAudio();
    this.resetAzanPlayed();
  }
  
  // Reset azan played status at midnight
  resetAzanPlayed() {
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.azanPlayedToday = {};
        console.log('Azan status reset for new day');
      }
    }, 60000); // Check every minute
  }
  
  // Initialize audio context for better playback
  initAudio() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Resume audio context on user interaction
      document.addEventListener('click', () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      }, { once: true });
    } catch (e) {
      console.log('AudioContext not supported');
    }
  }
  
  convertTo12Hour(time24) {
    if (!time24) return '--:--';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${period}`;
  }
  
  getCurrentBangladeshTime() {
    return new Date().toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Dhaka',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    });
  }
  
  setupEventListeners() {
    document.getElementById('division').addEventListener('change', (e) => {
      this.selectedDivision = e.target.value;
      this.fetchTimes(this.selectedDivision);
      this.azanPlayedToday = {}; // Reset for new location
    });
    
    document.getElementById('toggleAzan').addEventListener('click', () => {
      this.azanEnabled = !this.azanEnabled;
      const btn = document.getElementById('toggleAzan');
      const status = document.getElementById('azanStatus');
      
      if (this.azanEnabled) {
        btn.textContent = 'আজান চালু';
        btn.classList.remove('off');
        status.textContent = 'আজান সক্রিয়';
        status.style.background = 'var(--accent)';
      } else {
        btn.textContent = 'আজান বন্ধ';
        btn.classList.add('off');
        status.textContent = 'আজান নিষ্ক্রিয়';
        status.style.background = 'var(--danger)';
      }
    });
  }
  
  async fetchTimes(city) {
    try {
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Bangladesh&method=99&methodSettings=18.5,null,17.5`
      );
      const data = await res.json();
      if (data.code === 200) {
        this.prayerTimesData = data.data;
        this.updateUI();
        
        // Show success message
        document.getElementById('azanStatus').textContent = `${city} এর সময় লোড হয়েছে`;
        setTimeout(() => {
          document.getElementById('azanStatus').textContent = this.azanEnabled ? 'আজান সক্রিয়' : 'আজান নিষ্ক্রিয়';
        }, 2000);
      } else {
        this.useFallbackData();
      }
    } catch {
      this.useFallbackData();
    }
  }
  
  useFallbackData() {
    this.prayerTimesData = {
      timings: {
        Imsak: '04:18', Fajr: '04:28', Dhuhr: '12:01',
        Asr: '15:30', Maghrib: '18:10', Isha: '19:40'
      }
    };
    this.updateUI();
    
    document.getElementById('azanStatus').textContent = 'ডেমো ডেটা';
    setTimeout(() => {
      document.getElementById('azanStatus').textContent = this.azanEnabled ? 'আজান সক্রিয়' : 'আজান নিষ্ক্রিয়';
    }, 2000);
  }
  
  updateUI() {
    const t = this.prayerTimesData.timings;
    document.getElementById('sehriTime').textContent = this.convertTo12Hour(t.Imsak);
    document.getElementById('iftarTime').textContent = this.convertTo12Hour(t.Maghrib);
    this.updatePrayerGrid();
    this.startCountdowns();
  }
  
  updatePrayerGrid() {
    const t = this.prayerTimesData.timings;
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    let html = '';
    prayers.forEach(p => {
      html += `
        <div class="prayer-item" data-prayer="${p}" data-time="${t[p]}">
          <div class="prayer-name">${this.prayerNames[p]}</div>
          <div class="prayer-time">${this.convertTo12Hour(t[p])}</div>
          <div class="prayer-countdown" id="countdown-${p}">--:--:--</div>
        </div>
      `;
    });
    
    document.getElementById('prayerTimesGrid').innerHTML = html;
  }
  
  getNextEvent() {
    const now = new Date();
    const banglaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const current = banglaTime.getHours() * 60 + banglaTime.getMinutes();
    
    const imsak = this.timeToMinutes(this.prayerTimesData?.timings.Imsak || '04:18');
    const maghrib = this.timeToMinutes(this.prayerTimesData?.timings.Maghrib || '18:10');
    
    if (current < imsak) return { name: 'সেহরি শেষ', time: this.prayerTimesData.timings.Imsak };
    if (current < maghrib) return { name: 'ইফতার', time: this.prayerTimesData.timings.Maghrib };
    return { name: 'আগামীকাল সেহরি', time: this.prayerTimesData.timings.Imsak, tomorrow: true };
  }
  
  timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  
  // Play Azan with exact timing
  playAzan(prayer) {
    if (!this.azanEnabled) return;
    
    const today = new Date().toDateString();
    const prayerKey = `${prayer}-${today}`;
    
    // Check if already played today
    if (this.azanPlayedToday[prayerKey]) {
      console.log(`${prayer} আজান ইতিমধ্যে বাজানো হয়েছে`);
      return;
    }
    
    // Get current time in Bangladesh
    const now = new Date();
    const banglaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const currentMinutes = banglaTime.getHours() * 60 + banglaTime.getMinutes();
    const prayerMinutes = this.timeToMinutes(this.prayerTimesData.timings[prayer]);
    
    // Exact time check (within 1 minute window)
    if (Math.abs(currentMinutes - prayerMinutes) > 1) {
      console.log(`${prayer} এর সঠিক সময় নয়`);
      return;
    }
    
    // Mark as played
    this.azanPlayedToday[prayerKey] = true;
    this.currentAzanPlaying = prayer;
    
    // Update UI
    const status = document.getElementById('azanStatus');
    const prayerElement = document.querySelector(`[data-prayer="${prayer}"]`);
    
    status.textContent = `${this.prayerNames[prayer]} এর আজান বাজছে`;
    status.classList.add('playing');
    
    if (prayerElement) {
      prayerElement.classList.add('azan-active');
      
      // Add badge
      const badge = document.createElement('div');
      badge.className = 'azan-badge';
      badge.textContent = 'আজান';
      prayerElement.appendChild(badge);
    }
    
    // Try multiple audio sources for reliability
    this.playAudioWithFallback();
    
    // Remove effects after azan finishes (about 3 minutes)
    setTimeout(() => {
      status.classList.remove('playing');
      status.textContent = this.azanEnabled ? 'আজান সক্রিয়' : 'আজান নিষ্ক্রিয়';
      
      if (prayerElement) {
        prayerElement.classList.remove('azan-active');
        const badge = prayerElement.querySelector('.azan-badge');
        if (badge) badge.remove();
      }
      
      this.currentAzanPlaying = null;
    }, 180000); // 3 minutes
  }
  
  // Play audio with multiple fallback options
  playAudioWithFallback() {
    const primaryAudio = document.getElementById('adhanAudio');
    const fallbackAudio = document.getElementById('adhanFallbackAudio');
    
    // Try primary audio
    primaryAudio.volume = 1.0;
    primaryAudio.currentTime = 0;
    
    const playPromise = primaryAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log('Primary audio failed, trying fallback:', error);
        
        // Try fallback audio
        fallbackAudio.volume = 1.0;
        fallbackAudio.currentTime = 0;
        fallbackAudio.play().catch(e => {
          console.log('Fallback audio also failed:', e);
          
          // Show alert for user interaction
          const status = document.getElementById('azanStatus');
          status.textContent = 'আজান বাজাতে ক্লিক করুন';
          
          // Create manual play button
          const manualBtn = document.createElement('button');
          manualBtn.textContent = 'আজান বাজান';
          manualBtn.style.cssText = `
            background: white;
            color: var(--accent);
            border: none;
            border-radius: 30px;
            padding: 8px 20px;
            margin-top: 10px;
            font-size: 0.9rem;
            cursor: pointer;
          `;
          
          manualBtn.onclick = () => {
            primaryAudio.play();
            manualBtn.remove();
            status.textContent = 'আজান বাজছে';
          };
          
          status.appendChild(manualBtn);
        });
      });
    }
  }
  
  updateCountdowns() {
    if (!this.prayerTimesData) return;
    
    const now = new Date();
    const banglaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const currentMinutes = banglaTime.getHours() * 60 + banglaTime.getMinutes();
    const currentSeconds = banglaTime.getSeconds();
    
    // Main event
    const next = this.getNextEvent();
    let target = this.timeToMinutes(next.time);
    if (next.tomorrow) target += 1440;
    
    let diff = target - currentMinutes;
    if (diff < 0) diff += 1440;
    
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    const s = 59 - currentSeconds;
    
    document.getElementById('nextEventTimer').textContent = 
      `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    document.getElementById('nextEventName').textContent = next.name;
    
    // Prayer countdowns and azan check
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextPrayer = null;
    let minDiff = Infinity;
    
    prayers.forEach(p => {
      const prayerTime = this.prayerTimesData.timings[p];
      let pMins = this.timeToMinutes(prayerTime);
      if (pMins < currentMinutes) pMins += 1440;
      
      const diff = pMins - currentMinutes;
      const el = document.getElementById(`countdown-${p}`);
      if (el) {
        el.textContent = `${Math.floor(diff/60).toString().padStart(2,'0')}:${(diff%60).toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      }
      
      if (diff < minDiff && diff > 0) {
        minDiff = diff;
        nextPrayer = p;
      }
      
      // EXACT AZAN CHECK - at the exact minute and second 0
      if (currentMinutes === this.timeToMinutes(prayerTime) && currentSeconds === 0) {
        this.playAzan(p);
      }
    });
    
    // Highlight next prayer
    document.querySelectorAll('.prayer-item').forEach(el => {
      el.classList.remove('next-prayer');
    });
    
    if (nextPrayer && !this.currentAzanPlaying) {
      const nextEl = document.querySelector(`[data-prayer="${nextPrayer}"]`);
      if (nextEl) nextEl.classList.add('next-prayer');
    }
  }
  
  startClock() {
    setInterval(() => {
      document.getElementById('digitalClock').textContent = this.getCurrentBangladeshTime();
    }, 1000);
  }
  
  startCountdowns() {
    if (this.timers.length) this.timers.forEach(t => clearInterval(t));
    this.timers.push(setInterval(() => this.updateCountdowns(), 1000));
    this.updateCountdowns();
  }
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
  new RamadanApp();
});