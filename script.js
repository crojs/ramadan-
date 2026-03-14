(function() {
    // ------------------- কনফিগারেশন --------------------
    const PRAYER_KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const PRAYER_NAMES = {
        bn: ['ফজর', 'সূর্যোদয়', 'যোহর', 'আসর', 'মাগরিব', 'ইশা'],
        en: ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
        ar: ['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء']
    };

    const LABELS = {
        bn: {
            next: 'পরবর্তী',
            sehri: 'সেহরি',
            iftar: 'ইফতার',
            sehriNote: 'শেষ সময়',
            iftarNote: 'মাগরিব',
            adhanBtn: 'আযান',
            justNow: 'এখন',
        },
        en: {
            next: 'Next',
            sehri: 'Sehri',
            iftar: 'Iftar',
            sehriNote: 'End time',
            iftarNote: 'Maghrib',
            adhanBtn: 'Adhan',
            justNow: 'Now',
        },
        ar: {
            next: 'التالي',
            sehri: 'السحور',
            iftar: 'الإفطار',
            sehriNote: 'وقت النهاية',
            iftarNote: 'المغرب',
            adhanBtn: 'أذان',
            justNow: 'الآن',
        }
    };

    // ------------------- STATE -------------------------
    let timings = null;
    let currentLang = 'bn';
    let currentDivision = 'Dhaka';
    let activeAdhanPrayer = null;
    let lastCheckedDate = '';

    // DOM elements
    const elGregorian = document.getElementById('displayGregorian');
    const elHijri = document.getElementById('displayHijri');
    const elLiveClock = document.getElementById('liveClock');
    const elNextLabel = document.getElementById('nextEventLabel');
    const elNextName = document.getElementById('nextEventName');
    const elCountdown = document.getElementById('countdownDisplay');
    const elSehriTime = document.getElementById('sehriTime');
    const elIftarTime = document.getElementById('iftarTime');
    const elSehriLabel = document.getElementById('sehriLabel');
    const elIftarLabel = document.getElementById('iftarLabel');
    const elSehriNote = document.getElementById('sehriNote');
    const elIftarNote = document.getElementById('iftarNote');
    const elLocationName = document.getElementById('locationName');
    const prayerGrid = document.getElementById('prayerGrid');
    const langBtns = document.querySelectorAll('.lang-btn');
    const divisionSelect = document.getElementById('divisionSelect');
    const adhanAudio = document.getElementById('adhanAudio');

    // ------------------- ইউটিলিটি ---------------------
    const twoDigits = (n) => (n < 10 ? '0' + n : n);

    function format12Hour(time24) {
        if (!time24) return '--:-- --';
        const [hourStr, minute] = time24.split(':');
        let hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12;
        return `${twoDigits(hour)}:${minute} ${ampm}`;
    }

    function updateLiveClock12() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = twoDigits(now.getMinutes());
        const seconds = twoDigits(now.getSeconds());
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const time12 = `${twoDigits(hours)}:${minutes}:${seconds} ${ampm}`;
        elLiveClock.innerText = time12;
        return now;
    }

    function timeStrToDate(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    }

    function getNextEvent(now, timingsObj) {
        const events = [];
        PRAYER_KEYS.forEach(key => {
            if (timingsObj[key]) {
                const eventTime = timeStrToDate(timingsObj[key]);
                events.push({ key, time: eventTime });
            }
        });
        events.sort((a,b) => a.time - b.time);
        let next = null;
        for (let e of events) {
            if (e.time > now) {
                next = e;
                break;
            }
        }
        if (!next && events.length) {
            const first = events[0];
            const tomorrow = new Date(first.time);
            tomorrow.setDate(tomorrow.getDate() + 1);
            next = { key: first.key, time: tomorrow };
        }
        return next;
    }

    function refreshCountdownAndHighlights() {
        if (!timings) return;
        const now = new Date();
        const next = getNextEvent(now, timings);
        if (!next) return;

        const diffMs = next.time - now;
        const diffSec = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSec / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        const seconds = diffSec % 60;

        if (diffSec <= 0) {
            elCountdown.innerText = LABELS[currentLang].justNow || '00:00:00';
        } else {
            elCountdown.innerText = `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
        }

        const idx = PRAYER_KEYS.indexOf(next.key);
        elNextName.innerText = idx !== -1 ? PRAYER_NAMES[currentLang][idx] : next.key;

        const nowMins = now.getHours() * 60 + now.getMinutes();
        let currentKey = null;
        for (let i = PRAYER_KEYS.length-1; i>=0; i--) {
            const key = PRAYER_KEYS[i];
            if (!timings[key]) continue;
            const [h,m] = timings[key].split(':').map(Number);
            if (h*60+m <= nowMins) {
                currentKey = key;
                break;
            }
        }
        document.querySelectorAll('.prayer-item').forEach(item => {
            const pKey = item.dataset.prayerKey;
            if (pKey === currentKey) item.classList.add('current');
            else item.classList.remove('current');
        });

        const nowHour = now.getHours();
        const nowMin = now.getMinutes();
        const nowSec = now.getSeconds();
        if (nowSec < 2 && timings) {
            for (let key of PRAYER_KEYS) {
                if (!timings[key]) continue;
                const [h,m] = timings[key].split(':').map(Number);
                if (h === nowHour && m === nowMin) {
                    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
                    if (activeAdhanPrayer !== key + todayStr) {
                        adhanAudio.currentTime = 0;
                        adhanAudio.play().catch(e => console.log('play error', e));
                        activeAdhanPrayer = key + todayStr;
                    }
                    break;
                }
            }
        }
    }

    function renderPrayerGrid() {
        if (!timings) return;
        let html = '';
        PRAYER_KEYS.forEach((key, i) => {
            const time24 = timings[key] || '--:--';
            const time12 = format12Hour(time24);
            const name = PRAYER_NAMES[currentLang][i];
            html += `
                <div class="prayer-item" data-prayer-key="${key}">
                    <div class="prayer-name">${name}</div>
                    <div class="prayer-time">${time12}</div>
                    <button class="prayer-adhan" data-key="${key}">🔊 ${LABELS[currentLang].adhanBtn}</button>
                </div>
            `;
        });
        prayerGrid.innerHTML = html;

        document.querySelectorAll('.prayer-adhan').forEach(btn => {
            btn.addEventListener('click', () => {
                adhanAudio.currentTime = 0;
                adhanAudio.play().catch(() => {});
            });
        });
    }

    function refreshLanguage() {
        elNextLabel.innerText = LABELS[currentLang].next;
        elSehriLabel.innerText = LABELS[currentLang].sehri;
        elIftarLabel.innerText = LABELS[currentLang].iftar;
        elSehriNote.innerText = LABELS[currentLang].sehriNote;
        elIftarNote.innerText = LABELS[currentLang].iftarNote;
        renderPrayerGrid();

        if (timings) {
            const now = new Date();
            const next = getNextEvent(now, timings);
            if (next) {
                const idx = PRAYER_KEYS.indexOf(next.key);
                elNextName.innerText = idx !== -1 ? PRAYER_NAMES[currentLang][idx] : next.key;
            }
        }

        langBtns.forEach(btn => {
            const lang = btn.dataset.lang;
            if (lang === currentLang) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    async function fetchTimings(division) {
        const address = `${division}, Bangladesh`;
        const url = `https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(address)}&method=1`;

        try {
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.code === 200 && data.data) {
                timings = data.data.timings;
                const greg = data.data.date.gregorian;
                const hijri = data.data.date.hijri;
                elGregorian.innerText = greg.date;
                elHijri.innerText = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;

                elSehriTime.innerText = format12Hour(timings.Fajr);
                elIftarTime.innerText = format12Hour(timings.Maghrib);

                elLocationName.innerText = division;

                renderPrayerGrid();
                refreshCountdownAndHighlights();

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
                if (lastCheckedDate !== todayStr) {
                    activeAdhanPrayer = null;
                    lastCheckedDate = todayStr;
                }
            }
        } catch (err) {
            console.warn('API fetch failed, using fallback data for', division);
            timings = {
                Fajr: '04:45', Sunrise: '06:03', Dhuhr: '12:02',
                Asr: '15:26', Maghrib: '18:01', Isha: '19:20'
            };
            elGregorian.innerText = '14-03-2026';
            elHijri.innerText = '25 Ramadan 1447 AH';
            elSehriTime.innerText = format12Hour('04:45');
            elIftarTime.innerText = format12Hour('18:01');
            elLocationName.innerText = division;
            renderPrayerGrid();
        }
    }

    async function init() {
        divisionSelect.value = currentDivision;
        await fetchTimings(currentDivision);

        divisionSelect.addEventListener('change', async (e) => {
            currentDivision = e.target.value;
            await fetchTimings(currentDivision);
        });

        langBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                if (lang) {
                    currentLang = lang;
                    refreshLanguage();
                }
            });
        });

        setInterval(() => {
            updateLiveClock12();
            if (timings) {
                refreshCountdownAndHighlights();
            }
        }, 1000);

        setInterval(() => {
            fetchTimings(currentDivision);
        }, 30 * 60 * 1000);
    }

    init();
})();