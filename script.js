/* ==========================================================================
   1. Web Audio API Sound Engine
   ========================================================================== */
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.bgmNode = null;
        this.isPlayingBGM = false;
        this.currentChord = 0;
        this.bgmTimer = null;
        this.tempo = 6000; // 6 seconds per chord
        this.isMuted = true;
        this.chordProgression = 'romantic'; // 'romantic', 'joyful', 'calm'
        
        // Frequencies for chords
        this.chords = {
            romantic: [
                // Ebmaj7
                [77.78, 196.00, 233.08, 293.66, 392.00],
                // Bb/D
                [73.42, 174.61, 233.08, 293.66, 349.23],
                // Cm7
                [65.41, 196.00, 233.08, 311.13, 392.00],
                // Abmaj7
                [51.91, 130.81, 196.00, 261.63, 311.13]
            ],
            joyful: [
                // Cmaj7
                [65.41, 130.81, 196.00, 246.94, 293.66],
                // Fmaj7
                [87.31, 174.61, 261.63, 329.63, 392.00],
                // G7
                [98.00, 196.00, 246.94, 293.66, 392.00],
                // Cmaj7
                [65.41, 130.81, 196.00, 246.94, 329.63]
            ],
            calm: [
                // Ebmaj7 (very spacious)
                [77.78, 196.00, 293.66],
                // Abmaj7
                [51.91, 196.00, 261.63],
                // Fm7
                [87.31, 174.61, 311.13],
                // Bbsus4
                [58.27, 233.08, 293.66]
            ]
        };
    }

    init() {
        if (this.ctx) return;
        
        // Create Audio Context
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        // Master Volume
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterVolume.connect(this.ctx.destination);
        
        // Start BGM loop
        this.isMuted = false;
        this.fadeVolume(0.12, 1.5);
        this.playBGMNextChord();
    }

    setMute(mute) {
        this.isMuted = mute;
        if (!this.ctx) return;
        
        if (mute) {
            this.fadeVolume(0, 0.3);
        } else {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.fadeVolume(0.12, 0.5);
            if (!this.isPlayingBGM) {
                this.playBGMNextChord();
            }
        }
    }

    fadeVolume(target, duration) {
        if (!this.masterVolume) return;
        this.masterVolume.gain.linearRampToValueAtTime(target, this.ctx.currentTime + duration);
    }

    // Play a single soft piano-like note
    playPianoNote(freq, startTime, duration, velocity = 0.5) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        // Triangle oscillator gives a warm, woody tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Low-pass filter to soften the high-frequency harmonics
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, startTime);
        filter.frequency.exponentialRampToValueAtTime(300, startTime + duration);
        
        // Volume envelope (soft attack, long decay/release)
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(velocity * 0.1, startTime + 0.15); // Soft attack
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // Long release
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterVolume);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // BGM loop generator
    playBGMNextChord() {
        if (this.isMuted || !this.ctx) {
            this.isPlayingBGM = false;
            return;
        }
        this.isPlayingBGM = true;
        
        const now = this.ctx.currentTime;
        const currentChordSet = this.chords[this.chordProgression][this.currentChord];
        
        // Play the chord notes slightly arpeggiated
        currentChordSet.forEach((freq, idx) => {
            const delay = idx * 0.15;
            const noteDuration = 6.5;
            const velocity = idx === 0 ? 0.7 : 0.4; // Stronger bass
            this.playPianoNote(freq, now + delay, noteDuration, velocity);
        });

        // Add a soft high-register melody note occasionally
        if (Math.random() > 0.4 && this.chordProgression !== 'calm') {
            const melodyFreqs = [392.00, 440.00, 523.25, 587.33, 659.25, 783.99]; // Pentatonic notes
            const randomMelody = melodyFreqs[Math.floor(Math.random() * melodyFreqs.length)];
            this.playPianoNote(randomMelody, now + 2.0, 4.0, 0.25);
        }

        // Schedule next chord
        this.currentChord = (this.currentChord + 1) % this.chords[this.chordProgression].length;
        this.bgmTimer = setTimeout(() => this.playBGMNextChord(), this.tempo);
    }

    changeProgression(type) {
        this.chordProgression = type;
        this.currentChord = 0;
        if (type === 'joyful') {
            this.tempo = 4500; // Brighter, faster
        } else if (type === 'calm') {
            this.tempo = 8000; // Slower, more spacious
        } else {
            this.tempo = 6000;
        }
    }

    /* Sound Effects Synthesizers */
    playSFX(type) {
        if (this.isMuted || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        
        if (type === 'click') {
            // Soft click pluck
            this.playPianoNote(392.00, now, 0.4, 0.3);
            this.playPianoNote(587.33, now + 0.05, 0.3, 0.2);
        } 
        else if (type === 'sparkle') {
            // Rapid high crystalline chimes
            const chimes = [523.25, 659.25, 783.99, 987.77, 1046.50];
            chimes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                
                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);
                
                osc.connect(gain);
                gain.connect(this.masterVolume);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.6);
            });
        } 
        else if (type === 'whoosh') {
            // Filtered noise sweep
            const bufferSize = this.ctx.sampleRate * 0.6; // 0.6s whoosh
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.setValueAtTime(4.0, now);
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(1500, now + 0.3);
            filter.frequency.exponentialRampToValueAtTime(300, now + 0.6);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.25);
            gain.gain.linearRampToValueAtTime(0, now + 0.6);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);
            
            noise.start(now);
            noise.stop(now + 0.6);
        } 
        else if (type === 'typing') {
            // Short high-pass filtered clicks
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
            
            gain.gain.setValueAtTime(0.02 * (0.5 + Math.random() * 0.5), now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
            
            osc.connect(gain);
            gain.connect(this.masterVolume);
            osc.start(now);
            osc.stop(now + 0.05);
        }
        else if (type === 'chime') {
            // A beautiful bell chime
            const freqs = [261.63, 329.63, 392.00, 523.25, 659.25];
            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                // Add a tiny detune for richness
                osc.frequency.setValueAtTime(freq + (Math.random() * 2 - 1), now);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.04, now + 0.05 + idx * 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
                
                osc.connect(gain);
                gain.connect(this.masterVolume);
                osc.start(now);
                osc.stop(now + 2.1);
            });
        }
    }
}

const audio = new AudioEngine();

// Hook up audio toggle
const audioToggle = document.getElementById('audio-toggle');
audioToggle.addEventListener('click', () => {
    if (audioToggle.classList.contains('muted')) {
        audioToggle.classList.remove('muted');
        audioToggle.querySelector('.audio-status-text').textContent = 'Sound On';
        audio.init();
        audio.setMute(false);
    } else {
        audioToggle.classList.add('muted');
        audioToggle.querySelector('.audio-status-text').textContent = 'Muted';
        audio.setMute(true);
    }
});


/* ==========================================================================
   2. Background & Particle Systems
   ========================================================================== */

// 2a. Stars Canvas (Twinkling background stars)
class Starfield {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.active = true;
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initStars();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initStars() {
        const count = Math.floor((this.canvas.width * this.canvas.height) / 8000);
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random(),
                speed: Math.random() * 0.02 + 0.005,
                twinkleSpeed: Math.random() * 0.03 + 0.005
            });
        }
    }

    draw() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        
        this.stars.forEach(star => {
            star.alpha += star.twinkleSpeed;
            if (star.alpha > 1 || star.alpha < 0.1) {
                star.twinkleSpeed = -star.twinkleSpeed;
            }
            // Gentle drift
            star.y -= star.speed;
            if (star.y < 0) star.y = this.canvas.height;

            this.ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
    }
}

// 2b. Fireflies & Hearts Particle System
class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.active = true;
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initParticles();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initParticles() {
        const count = 35;
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        const isHeart = Math.random() > 0.8;
        return {
            x: Math.random() * this.canvas.width,
            y: this.canvas.height + Math.random() * 100,
            size: isHeart ? Math.random() * 8 + 6 : Math.random() * 3 + 1,
            speedY: -(Math.random() * 0.8 + 0.2),
            speedX: Math.random() * 0.6 - 0.3,
            alpha: Math.random() * 0.5 + 0.3,
            decay: Math.random() * 0.005 + 0.002,
            isHeart: isHeart,
            angle: Math.random() * Math.PI * 2,
            angleSpeed: Math.random() * 0.02 - 0.01
        };
    }

    drawHeartShape(x, y, size) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size / 4);
        this.ctx.quadraticCurveTo(x, y, x + size / 2, y);
        this.ctx.quadraticCurveTo(x + size, y, x + size, y + size / 3);
        this.ctx.quadraticCurveTo(x + size, y + size * 2/3, x + size/2, y + size);
        this.ctx.quadraticCurveTo(x, y + size * 2/3, x, y + size / 3);
        this.ctx.closePath();
    }

    draw() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach((p, index) => {
            p.x += p.speedX + Math.sin(p.angle) * 0.2;
            p.y += p.speedY;
            p.angle += p.angleSpeed;
            p.alpha -= p.decay;

            if (p.alpha <= 0 || p.y < -50 || p.x < -50 || p.x > this.canvas.width + 50) {
                this.particles[index] = this.createParticle();
                return;
            }

            this.ctx.globalAlpha = p.alpha;
            
            if (p.isHeart) {
                // Glow effect for hearts
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = 'rgba(255, 75, 139, 0.6)';
                this.ctx.fillStyle = 'rgba(255, 75, 139, 0.7)';
                this.drawHeartShape(p.x, p.y, p.size);
                this.ctx.fill();
            } else {
                // Glowing Firefly
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = 'rgba(0, 180, 216, 0.5)';
                this.ctx.fillStyle = 'rgba(0, 180, 216, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Reset shadow properties
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1.0;
    }
}

// 2c. Custom Cursor Sparkle Trail
class CursorTrail {
    constructor() {
        this.canvas = document.getElementById('cursor-trail');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: 0, y: 0, lastX: 0, lastY: 0 };
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => this.addParticles(e));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    addParticles(e) {
        this.mouse.x = e.clientX || (e.touches && e.touches[0].clientX);
        this.mouse.y = e.clientY || (e.touches && e.touches[0].clientY);

        // If the event doesn't have coordinates (e.g. touch ended), return
        if (this.mouse.x === undefined || this.mouse.y === undefined) return;

        // Calculate distance moved
        const dist = Math.hypot(this.mouse.x - this.mouse.lastX, this.mouse.y - this.mouse.lastY);
        
        // Only spawn sparkles when moving
        if (dist > 3) {
            const count = Math.min(3, Math.floor(dist / 5));
            for (let i = 0; i < count; i++) {
                // Interpolate position
                const ratio = i / count;
                const px = this.mouse.lastX + (this.mouse.x - this.mouse.lastX) * ratio;
                const py = this.mouse.lastY + (this.mouse.y - this.mouse.lastY) * ratio;
                
                this.particles.push({
                    x: px + (Math.random() * 6 - 3),
                    y: py + (Math.random() * 6 - 3),
                    size: Math.random() * 2.5 + 1,
                    color: Math.random() > 0.5 ? 'rgba(255, 75, 139, 0.8)' : 'rgba(0, 180, 216, 0.8)',
                    speedX: (Math.random() * 1.2 - 0.6),
                    speedY: (Math.random() * 1.2 - 0.6) - 0.2, // Drift up slightly
                    alpha: 1.0,
                    decay: Math.random() * 0.03 + 0.015
                });
            }
        }
        this.mouse.lastX = this.mouse.x;
        this.mouse.lastY = this.mouse.y;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1.0;
    }
}

// Instantiate canvas systems
const bgStars = new Starfield('stars-canvas');
const bgParticles = new ParticleSystem('fireflies-canvas');
const cursorTrail = new CursorTrail();

// Handle touch events for the sparkle trail on mobile
window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        cursorTrail.addParticles(e.touches[0]);
    }
}, { passive: true });

window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        cursorTrail.mouse.lastX = e.touches[0].clientX;
        cursorTrail.mouse.lastY = e.touches[0].clientY;
        cursorTrail.addParticles(e.touches[0]);
    }
}, { passive: true });

// Main background loop (running at 60fps)
function bgAnimationLoop() {
    bgStars.draw();
    bgParticles.draw();
    cursorTrail.draw();
    requestAnimationFrame(bgAnimationLoop);
}
bgAnimationLoop();


/* ==========================================================================
   3. Custom Cursor Positioning
   ========================================================================== */
const cursorDot = document.getElementById('custom-cursor');
let mouseX = 0, mouseY = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Quick movement for the inner dot
    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;
});

// Hover states for cursor
document.body.addEventListener('mouseenter', (e) => {
    const target = e.target;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.classList.contains('timeline-card') || target.classList.contains('gallery-item')) {
        cursorDot.classList.add('hovering');
    }
}, true);

document.body.addEventListener('mouseleave', (e) => {
    const target = e.target;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.classList.contains('timeline-card') || target.classList.contains('gallery-item')) {
        cursorDot.classList.remove('hovering');
    }
}, true);


/* ==========================================================================
   4. Loading Screen Logic
   ========================================================================== */
const loaderStars = new Starfield('loading-stars');
function loaderStarsLoop() {
    if (document.getElementById('loading-screen').classList.contains('active')) {
        loaderStars.draw();
        requestAnimationFrame(loaderStarsLoop);
    }
}
loaderStarsLoop();

const loaderQuote = document.getElementById('loader-quote');
const loadPercentageNode = document.getElementById('load-percentage');
const heartContainer = document.querySelector('.heart-container');

const quoteText = "Every beautiful story starts with a single click...";
let quoteIdx = 0;

function typeLoaderQuote() {
    if (quoteIdx < quoteText.length) {
        loaderQuote.textContent += quoteText.charAt(quoteIdx);
        quoteIdx++;
        
        // Sync percentage directly to typing progress
        const currentProgress = Math.floor((quoteIdx / quoteText.length) * 100);
        loadPercentageNode.textContent = currentProgress;
        
        if (currentProgress >= 40) {
            heartContainer.classList.add('pulse-active');
        }
        
        // Play soft typewriter sound
        if (Math.random() > 0.4) {
            audio.playSFX('typing');
        }
        
        setTimeout(typeLoaderQuote, 85); // slightly slower typing for readability
    } else {
        loadPercentageNode.textContent = "100";
        setTimeout(triggerLoadingComplete, 1000);
    }
}

// Kick off typing shortly after load
setTimeout(typeLoaderQuote, 800);

// Transition from loader to website
function triggerLoadingComplete() {
    const flash = document.createElement('div');
    flash.className = 'white-flash';
    document.body.appendChild(flash);
    
    setTimeout(() => {
        flash.classList.add('active'); // Fade to white
    }, 200);

    setTimeout(() => {
        // Hide loader, show app
        document.getElementById('loading-screen').classList.remove('active');
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-wrapper').classList.remove('hidden');
        document.getElementById('app-wrapper').classList.add('revealed');
        
        // Reveal Hero Text
        triggerHeroReveal();
    }, 700);

    setTimeout(() => {
        flash.classList.remove('active'); // Fade white out
        setTimeout(() => flash.remove(), 500);
    }, 1200);
}


/* ==========================================================================
   5. Hero Section Reveal
   ========================================================================== */
function triggerHeroReveal() {
    const heroTitle = document.getElementById('hero-title');
    const subtitle = document.getElementById('hero-subtitle');
    const buttonWrap = document.querySelector('.hero-btn-wrap');
    
    const text = "Hi Sanjuu ❤️";
    heroTitle.innerHTML = '';
    heroTitle.style.opacity = '1';
    
    // Create span for each letter for smooth stagger reveal
    text.split('').forEach((char, idx) => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = char === ' ' ? '\u00A0' : char;
        heroTitle.appendChild(span);
        
        setTimeout(() => {
            span.style.opacity = '1';
            span.style.transform = 'translateY(0) scale(1)';
            span.style.filter = 'blur(0)';
            span.style.transition = 'all 0.8s var(--ease-spring)';
            // Soft key typewriter click sound
            audio.playSFX('typing');
        }, idx * 120 + 300);
    });

    // Fade in subtitle and button
    setTimeout(() => {
        subtitle.classList.add('revealed');
    }, text.length * 120 + 400);

    setTimeout(() => {
        buttonWrap.classList.add('revealed');
    }, text.length * 120 + 800);
}


/* ==========================================================================
   6. 3D Tilt Effect & Magnetic Buttons
   ========================================================================== */

// 6a. 3D Tilt on Cards
const tiltCards = document.querySelectorAll('[data-tilt]');
tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position within card
        const y = e.clientY - rect.top;  // y position within card
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Rotate values (-10 to 10 degrees)
        const rotateX = ((centerY - y) / centerY) * 10;
        const rotateY = ((x - centerX) / centerX) * 10;
        
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        
        // Add subtle light reflection glow
        const glow = card.querySelector('.image-overlay') || card.querySelector('.gallery-item-glow');
        if (glow) {
            const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
            glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 60%)`;
        }
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateX(0) rotateY(0) translateY(0)';
        const glow = card.querySelector('.image-overlay') || card.querySelector('.gallery-item-glow');
        if (glow) {
            if (card.classList.contains('gallery-item')) {
                glow.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%)';
            } else {
                glow.style.background = 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%)';
            }
        }
    });
});

// 6b. Magnetic Buttons
const magneticButtons = document.querySelectorAll('.magnetic');
magneticButtons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        // Pull button 40% towards cursor
        btn.style.transform = `translate(${x * 0.4}px, ${y * 0.4}px) scale(1.03)`;
    });
    
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0, 0) scale(1)';
    });
    
    // Add Click ripple and particle explosion
    btn.addEventListener('click', (e) => {
        const sfxType = btn.getAttribute('data-sound');
        if (sfxType) audio.playSFX(sfxType);
        
        // 1. Create Ripple
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${e.clientX - rect.left}px`;
        ripple.style.top = `${e.clientY - rect.top}px`;
        btn.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 800);
        
        // 2. Create Particle Explosion
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'btn-particle';
            particle.style.left = `${e.clientX - rect.left}px`;
            particle.style.top = `${e.clientY - rect.top}px`;
            
            // Random color
            const colors = ['#ff4b8b', '#9d4edd', '#00b4d8', '#ffffff'];
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            // Size
            const size = Math.random() * 6 + 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Spread vector
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 80 + 40;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            
            btn.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
    });
});


/* ==========================================================================
   7. Narrative Flow Transitions
   ========================================================================== */
function transitionSection(fromId, toId, callback = null) {
    const fromSec = document.getElementById(fromId);
    const toSec = document.getElementById(toId);
    
    // Play transition whoosh
    audio.playSFX('whoosh');
    
    fromSec.style.opacity = '0';
    fromSec.style.transform = 'translateY(-30px) scale(0.97)';
    fromSec.style.transition = 'all 1.0s var(--ease-smooth)';
    
    setTimeout(() => {
        fromSec.classList.remove('active-section');
        fromSec.classList.add('hidden-section');
        
        toSec.classList.remove('hidden-section');
        toSec.classList.add('active-section');
        
        // Scroll to top of window to reset position
        window.scrollTo(0, 0);
        
        if (callback) callback();
    }, 900);
}

// Hero -> Timeline
document.getElementById('btn-begin').addEventListener('click', () => {
    transitionSection('hero-section', 'timeline-section', () => {
        setupTimelineIntersectionObserver();
    });
});

// Timeline -> Gallery
document.getElementById('btn-to-gallery').addEventListener('click', () => {
    transitionSection('timeline-section', 'gallery-section', () => {
        startGalleryDrift();
        initMobileInfiniteScroll();
    });
});

// Gallery -> Video
document.getElementById('btn-to-letter').addEventListener('click', () => {
    // Stop the mobile gallery autoscroll loop to save battery
    if (galleryAutoscrollId) {
        cancelAnimationFrame(galleryAutoscrollId);
        galleryAutoscrollId = null;
    }
    
    transitionSection('gallery-section', 'video-section', () => {
        // Lower BGM volume
        audio.fadeVolume(0.04, 1.5);
        initVideoOrFallback();
    });
});

// Letter -> Decision
document.getElementById('btn-letter-next').addEventListener('click', () => {
    // Only proceed if letter is fully shown or we are bypassing
    if (letterParagraphIndex >= letterParagraphs.length) {
        transitionSection('letter-section', 'decision-section', () => {
            setupDecisionPage();
        });
    } else {
        // Type next paragraph
        typeNextLetterParagraph();
    }
});

// Yes -> Ending
document.getElementById('btn-yes-continue').addEventListener('click', () => {
    transitionSection('yes-screen', 'ending-section', () => {
        startEndingScene('yes');
    });
});

// Maybe -> Ending
document.getElementById('btn-maybe-continue').addEventListener('click', () => {
    transitionSection('maybe-screen', 'ending-section', () => {
        startEndingScene('maybe');
    });
});


/* ==========================================================================
   8. Memory Timeline Intersection Observer
   ========================================================================== */
function setupTimelineIntersectionObserver() {
    const cards = document.querySelectorAll('.timeline-card-wrapper');
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
                // Soft chime/sparkle on card reveal
                audio.playSFX('typing');
            }
        });
    }, observerOptions);
    
    cards.forEach(card => observer.observe(card));
}


/* ==========================================================================
   9. Floating Gallery Drift & Modal & Infinite Mobile Scroll
   ========================================================================== */
let galleryDriftId = null;
const galleryItems = document.querySelectorAll('.gallery-item');
let isGalleryScrolling = false;
let galleryAutoscrollId = null;
let isGalleryUserInteracting = false;
let galleryInteractionTimeout = null;

function initMobileInfiniteScroll() {
    if (window.innerWidth >= 900) return; // Only on mobile
    
    const container = document.querySelector('.gallery-container');
    const drifter = document.querySelector('.gallery-drifter');
    const originalItems = Array.from(drifter.querySelectorAll('.gallery-item:not(.clone)'));
    if (originalItems.length === 0) return;

    // Build 3 sets (total 9 items) dynamically for seamless infinite looping
    if (drifter.querySelectorAll('.gallery-item').length < 9) {
        drifter.innerHTML = '';
        const allItems = [];
        for (let set = 0; set < 3; set++) {
            originalItems.forEach((item) => {
                const clone = item.cloneNode(true);
                drifter.appendChild(clone);
                allItems.push(clone);
            });
        }

        // Re-bind modal click events for all 9 cards
        const captions = [
            "🌸 Capturing memories that will last a lifetime.",
            "✨ A sparkling reminder of our special connection.",
            "☕ Warm cups, warmer smiles, and beautiful mornings."
        ];
        allItems.forEach((item, index) => {
            const originalIdx = index % originalItems.length;
            item.addEventListener('click', () => {
                const imgSrc = item.querySelector('img').src;
                openModal(imgSrc, captions[originalIdx]);
            });
        });
    }

    const updatedItems = drifter.querySelectorAll('.gallery-item');
    const getScrollPosForIndex = (index) => {
        const item = updatedItems[index];
        return item.offsetLeft - (container.offsetWidth - item.offsetWidth) / 2;
    };

    // Center Card 2 of Set B (index 4) on load
    const centerPos = getScrollPosForIndex(4);
    container.scrollLeft = centerPos;
    let floatScrollPos = centerPos;

    // Scroll listener for seamless looping (manual marquee style)
    container.addEventListener('scroll', () => {
        const scrollLeft = container.scrollLeft;
        
        // Sync our float accumulator if there's a manual swipe or jump
        if (Math.abs(floatScrollPos - scrollLeft) > 4) {
            floatScrollPos = scrollLeft;
        }

        if (isGalleryScrolling) return;

        const setWidth = getScrollPosForIndex(6) - getScrollPosForIndex(3); // Width of exactly 3 cards + gaps
        
        const leftThreshold = getScrollPosForIndex(2); // Card 3 of Set A
        const rightThreshold = getScrollPosForIndex(6); // Card 1 of Set C

        // If swiping right (finger moves left, scrolling right) and passing the right threshold
        if (scrollLeft >= rightThreshold) {
            isGalleryScrolling = true;
            container.scrollLeft = scrollLeft - setWidth;
            floatScrollPos = container.scrollLeft;
            setTimeout(() => { isGalleryScrolling = false; }, 50);
        }
        // If swiping left (finger moves right, scrolling left) and passing the left threshold
        else if (scrollLeft <= leftThreshold) {
            isGalleryScrolling = true;
            container.scrollLeft = scrollLeft + setWidth;
            floatScrollPos = container.scrollLeft;
            setTimeout(() => { isGalleryScrolling = false; }, 50);
        }
    });

    // Touch Event Listeners to pause autoscroll during user interaction
    container.addEventListener('touchstart', () => {
        isGalleryUserInteracting = true;
        if (galleryInteractionTimeout) clearTimeout(galleryInteractionTimeout);
    }, { passive: true });

    container.addEventListener('touchend', () => {
        // Resume autoscroll after 2.5 seconds of no touch interaction
        galleryInteractionTimeout = setTimeout(() => {
            isGalleryUserInteracting = false;
            floatScrollPos = container.scrollLeft; // Sync position
        }, 2500);
    }, { passive: true });

    container.addEventListener('touchcancel', () => {
        galleryInteractionTimeout = setTimeout(() => {
            isGalleryUserInteracting = false;
            floatScrollPos = container.scrollLeft; // Sync position
        }, 2500);
    }, { passive: true });

    // Start the autoscroll marquee loop
    if (galleryAutoscrollId) cancelAnimationFrame(galleryAutoscrollId);
    
    function crawl() {
        if (!isGalleryUserInteracting && !isGalleryScrolling) {
            floatScrollPos += 0.55; // Extremely smooth slow crawl (0.55px per frame)
            container.scrollLeft = Math.floor(floatScrollPos);
        }
        galleryAutoscrollId = requestAnimationFrame(crawl);
    }
    crawl();
}

function startGalleryDrift() {
    // Disable drift animation on mobile to prevent touch scroll interference and save CPU
    if (window.innerWidth < 900) return;
    
    let angle = 0;
    
    function drift() {
        angle += 0.004; // Very slow speed
        
        galleryItems.forEach((item, idx) => {
            // Check if hovered to stop drift on that specific item
            if (!item.matches(':hover')) {
                const phase = idx * (Math.PI / 1.5);
                const dx = Math.sin(angle + phase) * 15;
                const dy = Math.cos(angle * 1.3 + phase) * 15;
                
                // Keep initial rotations
                let baseRot = -8;
                if (idx === 1) baseRot = 5;
                if (idx === 2) baseRot = -4;
                
                item.style.transform = `translate(${dx}px, ${dy}px) rotate(${baseRot + Math.sin(angle + phase) * 2}deg)`;
            }
        });
        galleryDriftId = requestAnimationFrame(drift);
    }
    drift();
}

// Modal Enlargement for Cards & Gallery
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-image');
const modalCaption = document.getElementById('modal-caption');
const modalClose = document.querySelector('.modal-close');

function openModal(imgSrc, captionText) {
    modalImg.src = imgSrc;
    modalCaption.textContent = captionText;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 50);
    audio.playSFX('sparkle');
}

modalClose.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 500);
});

// Click handlers for timeline cards and gallery
document.querySelectorAll('.timeline-card').forEach(card => {
    card.addEventListener('click', () => {
        const imgSrc = card.querySelector('img').src;
        const title = card.querySelector('h3').textContent;
        const desc = card.querySelector('p').textContent;
        openModal(imgSrc, `${title} — ${desc}`);
    });
});

galleryItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
        const imgSrc = item.querySelector('img').src;
        const captions = [
            "🌸 Capturing memories that will last a lifetime.",
            "✨ A sparkling reminder of our special connection.",
            "☕ Warm cups, warmer smiles, and beautiful mornings."
        ];
        openModal(imgSrc, captions[idx]);
    });
});


/* ==========================================================================
   10. Love Letter Typing & Falling Rose Petals
   ========================================================================== */
let letterParagraphs = [];
let letterParagraphIndex = 0;
let letterCharIndex = 0;
let letterTypingTimer = null;
const letterTypingTextNode = document.getElementById('letter-typing-text');
const letterBtnNext = document.getElementById('btn-letter-next');

function startLetterTyping() {
    const pNodes = document.querySelectorAll('.letter-p');
    letterParagraphs = Array.from(pNodes).map(node => node.getAttribute('data-text'));
    letterParagraphIndex = 0;
    letterCharIndex = 0;
    letterTypingTextNode.textContent = '';
    
    typeNextLetterParagraph();
}

function typeNextLetterParagraph() {
    letterCharIndex = 0;
    letterTypingTextNode.textContent = '';
    letterBtnNext.style.opacity = '0.3';
    letterBtnNext.style.pointerEvents = 'none';
    
    typeLetterChar();
}

function typeLetterChar() {
    const currentText = letterParagraphs[letterParagraphIndex];
    if (letterCharIndex < currentText.length) {
        letterTypingTextNode.textContent += currentText.charAt(letterCharIndex);
        letterCharIndex++;
        
        // Random typing speed for realism
        const delay = currentText.charAt(letterCharIndex - 1) === ',' ? 350 : 
                      currentText.charAt(letterCharIndex - 1) === '.' ? 600 : 
                      (30 + Math.random() * 40);
        
        // Play typing click sound
        if (Math.random() > 0.3) {
            audio.playSFX('typing');
        }
        
        letterTypingTimer = setTimeout(typeLetterChar, delay);
    } else {
        // Paragraph complete
        letterParagraphIndex++;
        letterBtnNext.style.opacity = '1';
        letterBtnNext.style.pointerEvents = 'auto';
        if (letterParagraphIndex >= letterParagraphs.length) {
            letterBtnNext.querySelector('span').textContent = 'Make Your Choice ❤️';
        }
    }
}

// Falling Rose Petals Canvas
class RosePetals {
    constructor() {
        this.canvas = document.getElementById('rose-petals-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.petals = [];
        this.active = false;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initPetals() {
        const count = 25;
        this.petals = [];
        for (let i = 0; i < count; i++) {
            this.petals.push({
                x: Math.random() * this.canvas.width,
                y: -50 - Math.random() * 200,
                size: Math.random() * 12 + 8,
                speedY: Math.random() * 1.5 + 1.0,
                speedX: Math.random() * 1.0 - 0.2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: Math.random() * 0.02 - 0.01,
                opacity: Math.random() * 0.4 + 0.5
            });
        }
    }

    draw() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.petals.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX + Math.sin(p.y / 30) * 0.5;
            p.rotation += p.rotationSpeed;
            
            if (p.y > this.canvas.height + 50) {
                p.y = -20;
                p.x = Math.random() * this.canvas.width;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.globalAlpha = p.opacity;
            
            // Draw an organic rose petal shape (curved leaf)
            this.ctx.fillStyle = '#ff4b8b';
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add shadow line in petal
            this.ctx.strokeStyle = '#d92b6c';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -p.size);
            this.ctx.quadraticCurveTo(p.size * 0.2, 0, 0, p.size);
            this.ctx.stroke();
            
            this.ctx.restore();
        });
        
        requestAnimationFrame(() => this.draw());
    }
}

const rosePetals = new RosePetals();
function startRosePetals() {
    rosePetals.active = true;
    rosePetals.initPetals();
    rosePetals.draw();
}


/* ==========================================================================
   11. Proposal Video Section
   ========================================================================== */
const video = document.getElementById('proposal-video');
const videoCanvas = document.getElementById('video-canvas-fallback');
const videoCtx = videoCanvas.getContext('2d');
const videoPlaceholderUI = document.getElementById('video-placeholder-ui');
const playPauseBtn = document.getElementById('btn-play-pause');
const videoProgress = document.getElementById('video-progress-filled');
const timeDisplay = document.getElementById('video-time-display');

let isUsingFallback = false;
let fallbackAnimId = null;
let fallbackTime = 0;
const fallbackDuration = 20; // 20 seconds mock video length
let fallbackPlaying = false;
let dreamParticles = [];

function initVideoOrFallback() {
    // Reset state and ensure native video player is shown
    isUsingFallback = false;
    video.style.display = 'block';
    videoCanvas.style.display = 'none';
    videoPlaceholderUI.classList.remove('hidden');
    document.querySelector('.video-container-box').classList.remove('playing');
    
    // Load the video source (OneDrive stream)
    video.load();
    
    // Listen for media errors (e.g. invalid URL, unsupported format)
    video.addEventListener('error', handleVideoError, { once: true });
    
    // Stop background particles to focus attention on the video
    bgParticles.active = false;
}

function handleVideoError(error) {
    console.warn("Video error encountered. Switching to canvas fallback:", error);
    isUsingFallback = true;
    video.style.display = 'none';
    videoCanvas.style.display = 'block';
    setupCanvasFallback();
}

// Fallback Canvas Visualization (Dreamy Nebula & Particles)
function setupCanvasFallback() {
    videoCanvas.width = videoCanvas.offsetWidth;
    videoCanvas.height = videoCanvas.offsetHeight;
    
    dreamParticles = [];
    for (let i = 0; i < 60; i++) {
        dreamParticles.push({
            x: Math.random() * videoCanvas.width,
            y: Math.random() * videoCanvas.height,
            size: Math.random() * 4 + 1,
            speedX: Math.random() * 0.4 - 0.2,
            speedY: Math.random() * 0.4 - 0.2,
            color: Math.random() > 0.5 ? 'rgba(157, 78, 221, 0.5)' : 'rgba(255, 75, 139, 0.5)',
            alpha: Math.random() * 0.8 + 0.2,
            pulseSpeed: Math.random() * 0.02 + 0.01
        });
    }
}

function drawCanvasFallback() {
    if (!fallbackPlaying) return;
    
    videoCtx.fillStyle = '#050505';
    videoCtx.fillRect(0, 0, videoCanvas.width, videoCanvas.height);
    
    // Draw Nebula background
    const grad = videoCtx.createRadialGradient(
        videoCanvas.width / 2, videoCanvas.height / 2, 10,
        videoCanvas.width / 2, videoCanvas.height / 2, videoCanvas.width * 0.6
    );
    grad.addColorStop(0, 'rgba(157, 78, 221, 0.15)');
    grad.addColorStop(0.5, 'rgba(255, 75, 139, 0.08)');
    grad.addColorStop(1, 'rgba(5, 5, 5, 0)');
    videoCtx.fillStyle = grad;
    videoCtx.fillRect(0, 0, videoCanvas.width, videoCanvas.height);
    
    // Draw particles
    dreamParticles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha += p.pulseSpeed;
        
        if (p.alpha > 1.0 || p.alpha < 0.2) {
            p.pulseSpeed = -p.pulseSpeed;
        }
        
        if (p.x < 0 || p.x > videoCanvas.width) p.speedX = -p.speedX;
        if (p.y < 0 || p.y > videoCanvas.height) p.speedY = -p.speedY;
        
        videoCtx.globalAlpha = p.alpha;
        videoCtx.fillStyle = p.color;
        videoCtx.shadowBlur = 10;
        videoCtx.shadowColor = p.color;
        videoCtx.beginPath();
        videoCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        videoCtx.fill();
    });
    
    videoCtx.shadowBlur = 0;
    videoCtx.globalAlpha = 1.0;
    
    // Draw romantic text in center
    videoCtx.fillStyle = '#ffffff';
    videoCtx.font = "italic 400 22px 'Playfair Display'";
    videoCtx.textAlign = "center";
    videoCtx.fillText("Hold my hand, and let's watch the stars together...", videoCanvas.width / 2, videoCanvas.height / 2);
    
    // Update progress
    fallbackTime += 0.016; // Approx 60fps
    if (fallbackTime >= fallbackDuration) {
        fallbackTime = fallbackDuration;
        handleVideoEnded();
    } else {
        updateProgressBar(fallbackTime, fallbackDuration);
        fallbackAnimId = requestAnimationFrame(drawCanvasFallback);
    }
}

function togglePlay() {
    audio.playSFX('click');
    
    if (isUsingFallback) {
        videoPlaceholderUI.classList.add('hidden');
        document.querySelector('.video-container-box').classList.add('playing');
        if (fallbackPlaying) {
            fallbackPlaying = false;
            cancelAnimationFrame(fallbackAnimId);
            playPauseBtn.querySelector('.icon-play').classList.remove('hidden');
            playPauseBtn.querySelector('.icon-pause').classList.add('hidden');
        } else {
            fallbackPlaying = true;
            playPauseBtn.querySelector('.icon-play').classList.add('hidden');
            playPauseBtn.querySelector('.icon-pause').classList.remove('hidden');
            drawCanvasFallback();
        }
    } else {
        if (video.paused) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    videoPlaceholderUI.classList.add('hidden');
                    document.querySelector('.video-container-box').classList.add('playing');
                    playPauseBtn.querySelector('.icon-play').classList.add('hidden');
                    playPauseBtn.querySelector('.icon-pause').classList.remove('hidden');
                }).catch(error => {
                    // Ignore AbortError (e.g. user paused during buffering) to prevent accidental fallback
                    if (error.name === 'AbortError') {
                        console.log("Playback interrupted. Ignoring.");
                        return;
                    }
                    console.warn("Playback failed. Switching to fallback:", error);
                    handleVideoError(error);
                    // Re-trigger play state on the fallback
                    togglePlay();
                });
            }
        } else {
            video.pause();
            playPauseBtn.querySelector('.icon-play').classList.remove('hidden');
            playPauseBtn.querySelector('.icon-pause').classList.add('hidden');
        }
    }
}

// Update progress bar
function updateProgressBar(currentTime, duration) {
    const pct = (currentTime / duration) * 100;
    videoProgress.style.width = `${pct}%`;
    
    const curMin = Math.floor(currentTime / 60);
    const curSec = Math.floor(currentTime % 60).toString().padStart(2, '0');
    const durMin = Math.floor(duration / 60);
    const durSec = Math.floor(duration % 60).toString().padStart(2, '0');
    
    timeDisplay.textContent = `${curMin}:${curSec} / ${durMin}:${durSec}`;
}

// 10-Second Skip Functionality (YouTube-like)
const skipBackBtn = document.getElementById('btn-skip-back');
const skipForwardBtn = document.getElementById('btn-skip-forward');

function skipVideo(seconds) {
    if (isUsingFallback) {
        fallbackTime = Math.max(0, Math.min(fallbackDuration, fallbackTime + seconds));
        updateProgressBar(fallbackTime, fallbackDuration);
    } else {
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }
    audio.playSFX('click');
}

if (skipBackBtn) skipBackBtn.addEventListener('click', () => skipVideo(-10));
if (skipForwardBtn) skipForwardBtn.addEventListener('click', () => skipVideo(10));

// Double-tap to skip (YouTube style)
let lastTapTime = 0;
function handleVideoTap(e) {
    const now = Date.now();
    const doubleTapDelay = 300;
    
    if (now - lastTapTime < doubleTapDelay) {
        const rect = e.target.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        if (clientX === undefined) return;
        
        const clickX = clientX - rect.left;
        const halfWidth = rect.width / 2;
        
        if (clickX < halfWidth) {
            skipVideo(-10);
            showSkipOverlay('back');
        } else {
            skipVideo(10);
            showSkipOverlay('forward');
        }
    }
    lastTapTime = now;
}

function showSkipOverlay(direction) {
    const box = document.querySelector('.video-container-box');
    const overlay = document.createElement('div');
    overlay.className = `video-skip-overlay ${direction}`;
    overlay.innerHTML = direction === 'back' ? '<span>◀◀ 10s</span>' : '<span>10s ▶▶</span>';
    box.appendChild(overlay);
    
    setTimeout(() => {
        overlay.style.transition = 'opacity 0.3s ease-out';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }, 400);
}

// Event Listeners for Video
video.addEventListener('timeupdate', () => {
    updateProgressBar(video.currentTime, video.duration);
});

video.addEventListener('ended', () => {
    handleVideoEnded();
});

videoPlaceholderUI.addEventListener('click', togglePlay);
playPauseBtn.addEventListener('click', togglePlay);
videoCanvas.addEventListener('click', togglePlay);

// Video Buffering/Loader Spinner Events
const videoLoader = document.getElementById('video-loader');

video.addEventListener('waiting', () => {
    if (videoLoader) videoLoader.classList.remove('hidden');
});
video.addEventListener('loadstart', () => {
    if (videoLoader) videoLoader.classList.remove('hidden');
});
video.addEventListener('seeking', () => {
    if (videoLoader) videoLoader.classList.remove('hidden');
});

video.addEventListener('playing', () => {
    if (videoLoader) videoLoader.classList.add('hidden');
});
video.addEventListener('canplay', () => {
    if (videoLoader) videoLoader.classList.add('hidden');
});
video.addEventListener('seeked', () => {
    if (videoLoader) videoLoader.classList.add('hidden');
});
video.addEventListener('pause', () => {
    if (videoLoader) videoLoader.classList.add('hidden');
});
video.addEventListener('error', () => {
    if (videoLoader) videoLoader.classList.add('hidden');
});

// Attach tap/click listeners to the video elements
video.addEventListener('click', handleVideoTap);
videoCanvas.addEventListener('click', handleVideoTap);

// Touch support for mobile double-tap
video.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        handleVideoTap(e);
    }
});
videoCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        handleVideoTap(e);
    }
});

function handleVideoEnded() {
    fallbackPlaying = false;
    document.querySelector('.video-container-box').classList.remove('playing');
    
    // Wait 2 seconds, then transition to Letter Section (now "A Small Promise")
    setTimeout(() => {
        // Bring back background particles
        bgParticles.active = true;
        // Fade BGM back up
        audio.fadeVolume(0.12, 1.5);
        
        transitionSection('video-section', 'letter-section', () => {
            startLetterTyping();
            startRosePetals();
        });
    }, 2000);
}


/* ==========================================================================
   12. Disclaimer Card Reveal
   ========================================================================== */
function triggerDisclaimerReveal() {
    const paragraphs = document.querySelectorAll('.disclaimer-p');
    const btnWrap = document.querySelector('.disclaimer-btn-wrap');
    
    paragraphs.forEach((p, idx) => {
        setTimeout(() => {
            p.classList.add('revealed');
            audio.playSFX('typing');
        }, idx * 1500 + 500);
    });
    
    setTimeout(() => {
        btnWrap.classList.add('revealed');
    }, paragraphs.length * 1500 + 1000);
}


/* ==========================================================================
   13. Decision Page & Magnetic Buttons & Email Notification
   ========================================================================== */
function setupDecisionPage() {
    // Reset background and make sure particles are glowing
    bgParticles.active = true;
}

// Silent Email Notification using Formspree
function sendDecisionEmail(decision) {
    // Linked to Formspree endpoint for vishalgouda486@gmail.com
    const formspreeId = 'mzdlgvar'; 
    const targetEmail = 'vishalgouda486@gmail.com';
    
    if (formspreeId === 'YOUR_FORM_ID') {
        console.warn('Formspree Form ID not set. Email was not sent. Please replace "YOUR_FORM_ID" with your actual Formspree ID in script.js.');
        // Fallback: log to console or we can store it in localStorage
        localStorage.setItem('sanjuu_decision', decision);
        return;
    }

    fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            targetEmail: targetEmail,
            decision: decision,
            message: `Sanjuu has responded to your proposal!`,
            answer: decision,
            timestamp: new Date().toLocaleString()
        })
    })
    .then(response => {
        if (response.ok) {
            console.log('Decision sent successfully via Formspree.');
        } else {
            console.error('Failed to send decision via Formspree.');
        }
    })
    .catch(error => {
        console.error('Error sending decision:', error);
    });
}

// Yes click
document.getElementById('btn-yes').addEventListener('click', () => {
    audio.playSFX('sparkle');
    sendDecisionEmail('Yes');
    // Transition to YES screen
    transitionSection('decision-section', 'yes-screen', () => {
        audio.changeProgression('joyful'); // Joyful progression
        startFireworks();
    });
});

// Maybe click
document.getElementById('btn-maybe').addEventListener('click', () => {
    audio.playSFX('click');
    sendDecisionEmail('I Need Some Time');
    // Transition to MAYBE screen
    transitionSection('decision-section', 'maybe-screen', () => {
        audio.changeProgression('calm'); // Calm progression
    });
});


// Fireworks Particle System for Yes Screen
class Fireworks {
    constructor() {
        this.canvas = document.getElementById('fireworks-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.active = false;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    spawnExplosion(x, y) {
        const count = 40;
        const colors = ['#ff4b8b', '#9d4edd', '#00b4d8', '#ffeb3b', '#ffffff'];
        const chosenColor = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1.5,
                color: chosenColor,
                alpha: 1.0,
                decay: Math.random() * 0.015 + 0.01
            });
        }
    }

    draw() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Randomly spawn fireworks
        if (Math.random() < 0.05) {
            this.spawnExplosion(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height * 0.6
            );
            audio.playSFX('sparkle');
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08; // Gravity
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1.0;
        requestAnimationFrame(() => this.draw());
    }
}

const fireworks = new Fireworks();
function startFireworks() {
    fireworks.active = true;
    fireworks.draw();
}


/* ==========================================================================
   14. Ending Scene & Blooming Rose Canvas
   ========================================================================== */
let endingCanvas = null;
let endingCtx = null;
let roseGrowth = 0;
let roseBloomed = false;

function startEndingScene(decisionType) {
    endingCanvas = document.getElementById('ending-canvas');
    endingCtx = endingCanvas.getContext('2d');
    
    // Resize ending canvas
    endingCanvas.width = endingCanvas.offsetWidth;
    endingCanvas.height = endingCanvas.offsetHeight;
    
    // Stop other background canvases to focus resources
    bgStars.active = false;
    bgParticles.active = false;
    fireworks.active = false;
    rosePetals.active = false;
    
    // Trigger Rose Blooming and Cinematic text credits
    animateRoseBloom();
    triggerEndingCredits(decisionType);
}

// Draw Blooming Rose on Canvas
function animateRoseBloom() {
    if (roseGrowth < 1.0) {
        roseGrowth += 0.003; // Slow growth
    } else if (!roseBloomed) {
        roseBloomed = true;
        // Play sweet chime sound when rose fully blooms
        audio.playSFX('chime');
    }
    
    drawEndingCanvasScene();
    requestAnimationFrame(animateRoseBloom);
}

function drawEndingCanvasScene() {
    endingCtx.fillStyle = '#020202';
    endingCtx.fillRect(0, 0, endingCanvas.width, endingCanvas.height);
    
    const cx = endingCanvas.width / 2;
    const cy = endingCanvas.height * 0.55;
    
    // 1. Draw crescent moon in the top right
    endingCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    endingCtx.shadowBlur = 40;
    endingCtx.shadowColor = 'rgba(255, 255, 255, 0.1)';
    endingCtx.beginPath();
    endingCtx.arc(endingCanvas.width * 0.8, endingCanvas.height * 0.2, 50, 0, Math.PI * 2);
    endingCtx.fill();
    endingCtx.shadowBlur = 0;
    
    // 2. Draw stars in sky
    endingCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 30; i++) {
        const sx = (Math.sin(i * 382.2) * 0.5 + 0.5) * endingCanvas.width;
        const sy = (Math.cos(i * 129.4) * 0.5 + 0.5) * endingCanvas.height * 0.45;
        endingCtx.beginPath();
        endingCtx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        endingCtx.fill();
    }
    
    // 3. Draw Rose Stem (Growth)
    endingCtx.strokeStyle = '#2d6a4f';
    endingCtx.lineWidth = 4;
    endingCtx.lineCap = 'round';
    
    const stemHeight = 160 * roseGrowth;
    endingCtx.beginPath();
    endingCtx.moveTo(cx, cy + 160);
    // Draw a curved stem
    endingCtx.quadraticCurveTo(cx - 20, cy + 160 - stemHeight/2, cx, cy + 160 - stemHeight);
    endingCtx.stroke();
    
    // Draw leaves
    if (roseGrowth > 0.4) {
        endingCtx.fillStyle = '#1b4332';
        endingCtx.beginPath();
        // Left leaf
        endingCtx.ellipse(cx - 15, cy + 100, 15, 8, -Math.PI/6, 0, Math.PI * 2);
        endingCtx.fill();
    }
    if (roseGrowth > 0.7) {
        endingCtx.fillStyle = '#1b4332';
        endingCtx.beginPath();
        // Right leaf
        endingCtx.ellipse(cx + 15, cy + 60, 12, 6, Math.PI/6, 0, Math.PI * 2);
        endingCtx.fill();
    }
    
    // 4. Draw Rose Bud / Petals blooming
    if (roseGrowth > 0.3) {
        const petalScale = (roseGrowth - 0.3) / 0.7; // 0 to 1
        endingCtx.save();
        endingCtx.translate(cx, cy + 160 - stemHeight);
        
        // Glow behind rose
        endingCtx.shadowBlur = 30;
        endingCtx.shadowColor = 'rgba(255, 75, 139, 0.5)';
        
        // Draw outer petals
        endingCtx.fillStyle = '#d90429';
        endingCtx.beginPath();
        endingCtx.ellipse(-10 * petalScale, -5 * petalScale, 20 * petalScale, 15 * petalScale, -Math.PI / 4, 0, Math.PI * 2);
        endingCtx.ellipse(10 * petalScale, -5 * petalScale, 20 * petalScale, 15 * petalScale, Math.PI / 4, 0, Math.PI * 2);
        endingCtx.fill();
        
        // Draw middle petals
        endingCtx.fillStyle = '#ef233c';
        endingCtx.beginPath();
        endingCtx.ellipse(0, -10 * petalScale, 15 * petalScale, 15 * petalScale, 0, 0, Math.PI * 2);
        endingCtx.fill();
        
        // Draw inner bud
        endingCtx.fillStyle = '#ff4d6d';
        endingCtx.beginPath();
        endingCtx.ellipse(0, -12 * petalScale, 8 * petalScale, 10 * petalScale, 0, 0, Math.PI * 2);
        endingCtx.fill();
        
        endingCtx.restore();
        endingCtx.shadowBlur = 0;
    }
}

// Cinematic text credits
const endingCreditsNode = document.getElementById('ending-credits');
function triggerEndingCredits(decisionType) {
    const lines = [
        "Some flowers bloom in gardens...<br>Mine bloomed the day I met you, Sanjuu. 🌹",
        "Thank you for watching till the end.",
        "No matter what happens after today...",
        "You'll always be special to me, Sanjuu. ❤️"
    ];
    
    let currentLineIdx = 0;
    
    function displayNextLine() {
        if (currentLineIdx < lines.length) {
            const line = document.createElement('div');
            line.className = 'credit-line';
            line.innerHTML = lines[currentLineIdx];
            endingCreditsNode.appendChild(line);
            
            // Fade in
            setTimeout(() => {
                line.classList.add('revealed');
            }, 100);
            
            // Wait and fade out
            setTimeout(() => {
                line.classList.add('faded-out');
                setTimeout(() => {
                    line.remove();
                    currentLineIdx++;
                    displayNextLine();
                }, 1000);
            }, 2800);
        } else {
            // Final fade away of everything
            setTimeout(() => {
                const appWrapper = document.getElementById('app-wrapper');
                appWrapper.style.transition = 'opacity 4s ease-out';
                appWrapper.style.opacity = '0';
                
                // Fade music out
                audio.fadeVolume(0, 3.8);
            }, 1500);
        }
    }
    
    // Start displaying lines after rose is partially grown
    setTimeout(displayNextLine, 3000);
}
