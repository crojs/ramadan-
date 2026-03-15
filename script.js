// ===== আধুনিক রমাদান ক্যালেন্ডার JavaScript =====
class RamadanCalendar {
    constructor() {
        // এলিমেন্ট সিলেক্ট করা
        this.citySelect = document.getElementById('citySelect');
        this.themeToggle = document.getElementById('themeToggle');
        this.gregorianDate = document.getElementById('gregorianDate');
        this.hijriDate = document.getElementById('hijriDate');
        this.liveTime = document.getElementById('liveTime');
        this.nextPrayer = document.getElementById('nextPrayer');
        this.countdownTimer = document.getElementById('countdownTimer');
        this.sehriTime = document.getElementById('sehriTime');
        this.iftarTime = document.getElementById('iftarTime');
        this.prayerGrid = document.getElementById('prayerGrid');
        this.adhanAudio = document.getElementById('adhanAudio');

        // ডাটা স্টেট
        this.timings = null;
        this.currentCity = 'dhaka';
        this.is24Hour = false;
        this.activeAdhan = null;

        // নামাজের তালিকা
        this.prayerNames = {
            bn: ['ফজর', 'সূর্যোদয়', 'যোহর', 'আসর', 'মাগরিব', 'ইশা'],
            en: ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
        };
        this.prayerKeys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        // লোকাল স্টোরেজ থেকে থিম লোড
        this.loadTheme();
        
        // ইভেন্ট লিসেনার
        this.initEventListeners();
        
        // ডাটা লোড
        this.fetchTimings();
        
        // টাইমার শুরু
        this.startClock();
        this.startCountdown();
    }

    // থিম লোড করা
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    // ইভেন্ট লিসেনার
    initEventListeners() {
        // সিটি পরিবর্তন
        this.citySelect.addEventListener('change', () => {
            this.currentCity = this.citySelect.value;
            this.fetchTimings();
        });

        // থিম টগল
        this.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            this.themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }

    // API থেকে টাইমিং আনা
    async fetchTimings() {
        try {
            const url = `https://api.aladhan.com/v1/timingsByCity?city=${this.currentCity}&country=Bangladesh&method=1`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 200) {
                this.timings = data.data.timings;
                this.updateDates(data.data.date);
                this.updateSehriIftar();
                this.renderPrayerGrid();
            }
        } catch (error) {
            console.error('API fetch failed:', error);
            // ফallback ডাটা
            this.useFallbackData();
        }
    }

    // ফallback ডাটা
    useFallbackData() {
        this.timings = {
            Fajr: '04:30',
            Sunrise: '05:55',
            Dhuhr: '12:00',
            Asr: '15:30',
            Maghrib: '18:15',
            Isha: '19:30'
        };
        this.gregorianDate.textContent = '১৫ মার্চ ২০২৬';
        this.hijriDate.textContent = '২৫ রমাদান ১৪৪৭';
        this.updateSehriIftar();
        this.renderPrayerGrid();
    }

    // তারিখ আপডেট
    updateDates(dateData) {
        if (dateData) {
            this.gregorianDate.textContent = dateData.gregorian.date;
            this.hijriDate.textContent = `${dateData.hijri.day} ${dateData.hijri.month.en} ${dateData.hijri.year} AH`;
        }
    }

    // সেহরি ও ইফতার আপডেট
    updateSehriIftar() {
        if (this.timings) {
            this.sehriTime.textContent = this.formatTime(this.timings.Fajr);
            this.iftarTime.textContent = this.formatTime(this.timings.Maghrib);
        }
    }

    // টাইম ফরম্যাট (১২/২৪ ঘণ্টা)
    formatTime(time24) {
        if (!time24) return '--:--';
        
        let [hours, minutes] = time24.split(':');
        hours = parseInt(hours);
        
        if (this.is24Hour) {
            return `${hours.toString().padStart(2, '0')}:${minutes}`;
        } else {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
        }
    }

    // নামাজের গ্রিড রেন্ডার
    renderPrayerGrid() {
        if (!this.timings) return;
        
        let html = '';
        this.prayerKeys.forEach((key, index) => {
            html += `
                <div class="prayer-item" data-prayer="${key}">
                    <div class="prayer-name">${this.prayerNames.bn[index]}</div>
                    <div class="prayer-time">${this.formatTime(this.timings[key])}</div>
                    <button class="prayer-adhan" data-key="${key}">
                        <i class="fas fa-volume-up"></i> আযান
                    </button>
                </div>
            `;
        });
        
        this.prayerGrid.innerHTML = html;
        
        // আযান বাটনে ক্লিক ইভেন্ট
        document.querySelectorAll('.prayer-adhan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playAdhan();
            });
        });
    }

    // আযান বাজানো
    playAdhan() {
        this.adhanAudio.src = 'https://www.islamcan.com/audio/adhan/azan1.mp3';
        this.adhanAudio.play().catch(() => {});
    }

    // ক্লক চালু করা
    startClock() {
        setInterval(() => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            
            if (this.is24Hour) {
                this.liveTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
            } else {
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                this.liveTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
            }
        }, 1000);
    }

    // কাউন্টডাউন শুরু
    startCountdown() {
        setInterval(() => {
            if (!this.timings) return;
            
            const now = new Date();
            let nextEvent = this.getNextEvent(now);
            
            if (nextEvent) {
                const diff = nextEvent.time - now;
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                
                this.countdownTimer.textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                this.nextPrayer.textContent = this.prayerNames.bn[this.prayerKeys.indexOf(nextEvent.key)];
                
                // বর্তমান ওয়াক্ত হাইলাইট
                this.highlightCurrentPrayer(now);
                
                // আযান চেক (শুধু মিনিটের শুরুতে)
                if (seconds === 0 && minutes === 0) {
                    this.checkAdhanTrigger(now, nextEvent.key);
                }
            }
        }, 1000);
    }

    // পরবর্তী ওয়াক্ত বের করা
    getNextEvent(now) {
        const events = this.prayerKeys.map(key => ({
            key,
            time: this.timeToDate(this.timings[key])
        })).sort((a, b) => a.time - b.time);
        
        return events.find(e => e.time > now) || events[0];
    }

    // টাইম স্ট্রিংকে ডেটে রূপান্তর
    timeToDate(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    }

    // বর্তমান ওয়াক্ত হাইলাইট
    highlightCurrentPrayer(now) {
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTotal = currentHour * 60 + currentMin;
        
        let currentKey = null;
        for (let i = this.prayerKeys.length - 1; i >= 0; i--) {
            const key = this.prayerKeys[i];
            const [h, m] = this.timings[key].split(':').map(Number);
            if (h * 60 + m <= currentTotal) {
                currentKey = key;
                break;
            }
        }
        
        document.querySelectorAll('.prayer-item').forEach(item => {
            const key = item.dataset.prayer;
            item.classList.toggle('current', key === currentKey);
        });
    }

    // আযান ট্রিগার চেক
    checkAdhanTrigger(now, nextKey) {
        const today = now.toDateString();
        if (this.activeAdhan !== nextKey + today) {
            this.playAdhan();
            this.activeAdhan = nextKey + today;
        }
    }
}

// ক্যালেন্ডার শুরু করা
document.addEventListener('DOMContentLoaded', () => {
    new RamadanCalendar();
});