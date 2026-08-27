(() => {
  const stars = [
    { name: "Proxima Centauri", frequency: 55, luminosity: 0.00155, distance: 4.23 },
    { name: "Sirius", frequency: 82.5, luminosity: 25.4, distance: 8.6 },
    { name: "Vega", frequency: 110, luminosity: 40, distance: 25 },
    { name: "Betelgeuse", frequency: 165, luminosity: 10000, distance: 700 }
  ];
  const stateKey = "kimina-stellar-player";
  const epochKey = "kimina-stellar-epoch";
  const defaultState = { playing: false, volume: 55, continuePlaying: false, key: "A" };

  const readState = () => {
    try { return { ...defaultState, ...JSON.parse(sessionStorage.getItem(stateKey) || "{}") }; }
    catch { return { ...defaultState }; }
  };
  const state = readState();
  const saveState = () => sessionStorage.setItem(stateKey, JSON.stringify(state));
  if (!sessionStorage.getItem(epochKey)) sessionStorage.setItem(epochKey, String(Date.now()));

  const player = document.createElement("aside");
  player.className = "stellar-player";
  player.dataset.playing = "false";
  player.setAttribute("aria-label", "Stellar drone player");
  player.innerHTML = `
    <div class="stellar-player__bar">
      <button class="stellar-player__toggle" type="button" aria-pressed="false">
        <span class="stellar-player__dot" aria-hidden="true"></span>
        <span class="stellar-player__label">Sound off</span>
      </button>
      <button class="stellar-player__details" type="button" aria-expanded="false" aria-controls="stellar-panel" aria-label="Show stellar drone controls">+</button>
    </div>
    <div class="stellar-player__panel" id="stellar-panel" hidden>
      <div class="stellar-player__readout">
        <span>Source</span><span data-star-name>Proxima Centauri</span>
        <span>Luminosity</span><span data-star-luminosity>0.00155 L☉</span>
        <span>Distance</span><span data-star-distance>4.23 LY</span>
        <span>Key</span><span data-key-name>A minor</span>
        <span>Evolution</span><span data-star-mode>Drift</span>
        <span>Voice phase</span><span data-star-phase>00%</span>
      </div>
      <label class="stellar-player__volume">
        <span>Volume</span>
        <input type="range" min="0" max="100" step="1" value="${state.volume}" aria-label="Stellar drone volume">
        <output>${state.volume}%</output>
      </label>
      <label class="stellar-player__key">
        <span>Key</span>
        <select aria-label="Stellar drone key">
          <option value="A" ${state.key === "A" ? "selected" : ""}>A minor</option>
          <option value="F" ${state.key === "F" ? "selected" : ""}>F minor</option>
          <option value="C" ${state.key === "C" ? "selected" : ""}>C minor</option>
          <option value="D" ${state.key === "D" ? "selected" : ""}>D minor</option>
        </select>
      </label>
      <label class="stellar-player__continue">
        <input type="checkbox" ${state.continuePlaying ? "checked" : ""}>
        <span>Continue between pages</span>
      </label>
    </div>`;
  document.body.append(player);

  const toggle = player.querySelector(".stellar-player__toggle");
  const label = player.querySelector(".stellar-player__label");
  const details = player.querySelector(".stellar-player__details");
  const panel = player.querySelector(".stellar-player__panel");
  const volume = player.querySelector('input[type="range"]');
  const volumeOutput = player.querySelector("output");
  const continueInput = player.querySelector('input[type="checkbox"]');
  const keySelect = player.querySelector("select");
  const starName = player.querySelector("[data-star-name]");
  const starLuminosity = player.querySelector("[data-star-luminosity]");
  const starDistance = player.querySelector("[data-star-distance]");
  const keyName = player.querySelector("[data-key-name]");
  const starMode = player.querySelector("[data-star-mode]");
  const starPhase = player.querySelector("[data-star-phase]");

  let audioContext;
  let master;
  let filter;
  let panner;
  let delayNode;
  let feedbackNode;
  let isPlaying = false;
  let suspendTimer;
  let evolutionTimer;
  let evolutionStep = 0;
  let currentStarIndex = 0;
  let currentMode = "Drift";
  const voices = [];

  const targetGain = () => Math.max(0.0001, Number(state.volume) / 100 * 0.069);
  const buildDrone = () => {
    audioContext = new AudioContext();
    master = audioContext.createGain();
    filter = audioContext.createBiquadFilter();
    panner = audioContext.createStereoPanner();
    delayNode = audioContext.createDelay(2);
    feedbackNode = audioContext.createGain();
    const dry = audioContext.createGain();
    const wet = audioContext.createGain();
    const reverb = audioContext.createConvolver();
    const reverbGain = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    const filterLfo = audioContext.createOscillator();
    const filterDepth = audioContext.createGain();

    master.gain.value = 0.0001;
    filter.type = "lowpass";
    filter.frequency.value = 480;
    filter.Q.value = 2.2;
    delayNode.delayTime.value = 0.72;
    feedbackNode.gain.value = 0.82;
    dry.gain.value = 0.28;
    wet.gain.value = 1;
    reverbGain.gain.value = 1;
    compressor.threshold.value = -20;
    compressor.knee.value = 16;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.08;
    compressor.release.value = 1.4;
    filterLfo.frequency.value = 0.007;
    filterDepth.gain.value = 180;
    filter.connect(dry).connect(panner);
    filter.connect(delayNode);
    delayNode.connect(feedbackNode).connect(delayNode);
    delayNode.connect(wet).connect(panner);
    const impulseLength = Math.floor(audioContext.sampleRate * 4.2);
    const impulse = audioContext.createBuffer(2, impulseLength, audioContext.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let sample = 0; sample < impulseLength; sample += 1) {
        const decay = (1 - sample / impulseLength) ** 3.2;
        data[sample] = (Math.random() * 2 - 1) * decay;
      }
    }
    reverb.buffer = impulse;
    filter.connect(reverb).connect(reverbGain).connect(panner);
    panner.connect(compressor).connect(master).connect(audioContext.destination);
    filterLfo.connect(filterDepth).connect(filter.frequency);
    filterLfo.start();

    const waveforms = ["sine", "triangle", "sawtooth", "triangle"];
    const waveformLevels = [1, 0.88, 0.42, 0.72];
    stars.forEach((star, index) => {
      const oscillator = audioContext.createOscillator();
      const harmonic = audioContext.createOscillator();
      const harmonicGain = audioContext.createGain();
      const voiceGain = audioContext.createGain();
      const voiceFilter = audioContext.createBiquadFilter();
      const voicePanner = audioContext.createStereoPanner();
      const pitchLfo = audioContext.createOscillator();
      const pitchDepth = audioContext.createGain();
      const fadeLfo = audioContext.createOscillator();
      const fadeDepth = audioContext.createGain();
      const luminosity = (Math.log10(star.luminosity) + 3) / 7;
      const distance = Math.log10(star.distance + 1) / Math.log10(701);
      const baseGain = 0.028 + Math.max(0, Math.min(1, luminosity)) * 0.055;
      const fadeSeconds = 18 + distance * 34 + index * 3;
      const waveformLevel = waveformLevels[index];
      oscillator.type = waveforms[index];
      const initialSemitones = [0, 3, 7, 10][index];
      const initialOctaves = [-1, 0, 1, 2];
      const initialFrequency = (keyRoots[state.key] || keyRoots.A) * 2 ** (initialSemitones / 12 + initialOctaves[index]);
      oscillator.frequency.value = initialFrequency;
      oscillator.detune.value = index * 3 - 4;
      harmonic.type = index % 2 ? "sine" : "triangle";
      harmonic.frequency.value = initialFrequency * (index % 2 ? 2.002 : 1.501);
      harmonic.detune.value = 3 - index * 2;
      harmonicGain.gain.value = baseGain * 0.22;
      voiceFilter.type = "lowpass";
      voiceFilter.frequency.value = 1500 - distance * 1050 + luminosity * 260;
      voiceFilter.Q.value = 1.2 + luminosity * 2.4;
      voiceGain.gain.value = baseGain * waveformLevel;
      pitchLfo.frequency.value = 4.1 + index * 0.16;
      pitchDepth.gain.value = 1.1 + distance * 0.7;
      fadeLfo.frequency.value = 1 / fadeSeconds;
      fadeDepth.gain.value = baseGain * waveformLevel * 0.3;
      voicePanner.pan.value = [-0.72, 0.48, -0.28, 0.76][index];
      pitchLfo.connect(pitchDepth).connect(oscillator.detune);
      fadeLfo.connect(fadeDepth).connect(voiceGain.gain);
      oscillator.connect(voiceFilter);
      harmonic.connect(harmonicGain).connect(voiceFilter);
      voiceFilter.connect(voiceGain).connect(voicePanner).connect(filter);
      oscillator.start();
      harmonic.start();
      pitchLfo.start();
      fadeLfo.start(audioContext.currentTime + index * 2.7);
      voices.push({ oscillator, harmonic, harmonicGain, voiceGain, voiceFilter, voicePanner, baseGain, waveformLevel, star });
    });

    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 3, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let previousNoise = 0;
    for (let sample = 0; sample < noiseData.length; sample += 1) {
      const white = Math.random() * 2 - 1;
      previousNoise = previousNoise * 0.985 + white * 0.015;
      noiseData[sample] = previousNoise * 3.1;
    }
    const noiseSource = audioContext.createBufferSource();
    const noiseFilter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();
    const noiseLfo = audioContext.createOscillator();
    const noiseDepth = audioContext.createGain();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = (keyRoots[state.key] || keyRoots.A) * 8;
    noiseFilter.Q.value = 1.4;
    noiseGain.gain.value = 0.004;
    noiseLfo.frequency.value = 0.011;
    noiseDepth.gain.value = 0.0025;
    noiseLfo.connect(noiseDepth).connect(noiseGain.gain);
    noiseSource.connect(noiseFilter).connect(noiseGain).connect(filter);
    noiseSource.start();
    noiseLfo.start();
    voices.noiseFilter = noiseFilter;
    evolutionStep = Math.floor((Date.now() - Number(sessionStorage.getItem(epochKey))) / 30000);
    evolveDrone();
    evolutionTimer = window.setInterval(evolveDrone, 30000);
  };

  const harmonicFields = [
    { name: "Drift", semitones: [0, 7, 12, 15] },
    { name: "Convergence", semitones: [0, 3, 7, 12] },
    { name: "Transit", semitones: [0, 5, 7, 10] },
    { name: "Flare", semitones: [0, 3, 10, 14] },
    { name: "Afterglow", semitones: [0, 7, 10, 15] }
  ];
  const keyRoots = { A: 55, F: 43.6535, C: 65.4064, D: 73.4162 };

  function evolveDrone() {
    if (!audioContext || !voices.length) return;
    const now = audioContext.currentTime;
    const field = harmonicFields[evolutionStep % harmonicFields.length];
    const highEvent = evolutionStep % 3 === 2;
    const highVoiceIndex = highEvent ? Math.floor(Math.random() * voices.length) : -1;
    currentMode = highEvent ? `${field.name} / High signal` : field.name;
    currentStarIndex = (evolutionStep * 3 + 1) % stars.length;
    const octaveSpread = [-1, 0, 1, 2];
    for (let index = octaveSpread.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [octaveSpread[index], octaveSpread[swapIndex]] = [octaveSpread[swapIndex], octaveSpread[index]];
    }
    voices.forEach((voice, index) => {
      const stableChord = [0, 3, 7, 10];
      const highOctaveLift = index === highVoiceIndex ? 3 : 0;
      const targetFrequency = (keyRoots[state.key] || keyRoots.A) * 2 ** (stableChord[index] / 12 + octaveSpread[index] + highOctaveLift);
      const focus = index === currentStarIndex ? 1.35 : 0.62 + ((evolutionStep + index) % 3) * 0.13;
      voice.oscillator.frequency.cancelScheduledValues(now);
      voice.oscillator.frequency.setValueAtTime(targetFrequency, now);
      voice.harmonic.frequency.cancelScheduledValues(now);
      voice.harmonic.frequency.setValueAtTime(targetFrequency * (index % 2 ? 2.002 : 1.501), now);
      voice.voiceGain.gain.setTargetAtTime(voice.baseGain * voice.waveformLevel * focus, now, 10);
      voice.harmonicGain.gain.setTargetAtTime(voice.baseGain * (currentMode === "Flare" ? 0.34 : 0.16 + index * 0.025), now, 12);
      voice.voiceFilter.frequency.setTargetAtTime(380 + focus * 620 + (index % 2) * 210, now, 11);
      voice.voicePanner.pan.setTargetAtTime(Math.sin(evolutionStep * 0.7 + index * 1.8) * 0.78, now, 14);
    });
    delayNode.delayTime.setTargetAtTime([0.72, 0.94, 0.57, 1.18, 0.81][evolutionStep % 5], now, 10);
    feedbackNode.gain.setTargetAtTime(currentMode === "Flare" ? 0.88 : 0.8 + (evolutionStep % 3) * 0.03, now, 10);
    filter.frequency.setTargetAtTime(currentMode === "Afterglow" ? 360 : 500 + currentStarIndex * 95, now, 13);
    if (voices.noiseFilter) {
      const noisePitch = (keyRoots[state.key] || keyRoots.A) * [6, 8, 10, 12, 9][evolutionStep % 5];
      voices.noiseFilter.frequency.setTargetAtTime(noisePitch, now, 12);
    }
    evolutionStep += 1;
  }

  const reflectPlayback = (playing, message) => {
    isPlaying = playing;
    player.dataset.playing = String(playing);
    toggle.setAttribute("aria-pressed", String(playing));
    label.textContent = message || (playing ? "Sound on" : "Sound off");
  };

  const setPlaying = async (nextState, restoring = false) => {
    if (!audioContext) buildDrone();
    window.clearTimeout(suspendTimer);
    if (nextState) {
      try { await audioContext.resume(); } catch { /* The control remains available for a manual retry. */ }
      if (audioContext.state !== "running") {
        reflectPlayback(false, "Resume sound");
        return;
      }
      const now = audioContext.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(targetGain(), now + (restoring ? 1.2 : 1.8));
      reflectPlayback(true);
    } else {
      const now = audioContext.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      suspendTimer = window.setTimeout(() => audioContext.suspend(), 850);
      reflectPlayback(false);
    }
    state.playing = nextState;
    saveState();
  };

  toggle.addEventListener("click", () => setPlaying(!isPlaying));
  details.addEventListener("click", () => {
    const expanded = details.getAttribute("aria-expanded") === "true";
    details.setAttribute("aria-expanded", String(!expanded));
    details.setAttribute("aria-label", expanded ? "Show stellar drone controls" : "Hide stellar drone controls");
    details.textContent = expanded ? "+" : "−";
    panel.hidden = expanded;
  });
  volume.addEventListener("input", () => {
    state.volume = Number(volume.value);
    volumeOutput.value = `${state.volume}%`;
    saveState();
    if (audioContext && isPlaying) master.gain.setTargetAtTime(targetGain(), audioContext.currentTime, 0.15);
  });
  continueInput.addEventListener("change", () => {
    state.continuePlaying = continueInput.checked;
    saveState();
  });
  keySelect.addEventListener("change", () => {
    state.key = keySelect.value;
    keyName.textContent = `${state.key} minor`;
    saveState();
    if (audioContext) evolveDrone();
  });
  window.addEventListener("pointermove", (event) => {
    if (!audioContext || !isPlaying) return;
    const now = audioContext.currentTime;
    filter.frequency.setTargetAtTime(240 + (1 - event.clientY / innerHeight) * 900, now, 0.35);
    panner.pan.setTargetAtTime((event.clientX / innerWidth - 0.5) * 0.9, now, 0.4);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && audioContext?.state === "running") audioContext.suspend();
    if (!document.hidden && isPlaying) audioContext?.resume();
  });

  const updateReadout = () => {
    const elapsed = (Date.now() - Number(sessionStorage.getItem(epochKey))) / 1000;
    const starIndex = audioContext ? currentStarIndex : Math.floor(elapsed / 30) % stars.length;
    const star = stars[starIndex];
    const phase = Math.round((Math.sin(elapsed / (7 + starIndex * 2)) * 0.5 + 0.5) * 100);
    starName.textContent = star.name;
    starLuminosity.textContent = `${star.luminosity.toLocaleString()} L☉`;
    starDistance.textContent = `${star.distance.toLocaleString()} LY`;
    keyName.textContent = `${state.key} minor`;
    starMode.textContent = audioContext ? currentMode : harmonicFields[Math.floor(elapsed / 30) % harmonicFields.length].name;
    starPhase.textContent = `${String(phase).padStart(2, "0")}%`;
  };
  updateReadout();
  window.setInterval(updateReadout, 1000);

  if (state.playing && state.continuePlaying) {
    setPlaying(true, true);
  } else if (state.playing) {
    state.playing = false;
    saveState();
  }
})();
