(() => {
  const root = document.querySelector("[data-release-player]");
  if (!root) return;

  const audio = root.querySelector(".release-player__audio");
  const deck = root.querySelector(".release-player__deck");
  const toggle = root.querySelector('[data-player-action="toggle"]');
  const previous = root.querySelector('[data-player-action="previous"]');
  const next = root.querySelector('[data-player-action="next"]');
  const nowPlaying = root.querySelector(".release-player__now");
  const seek = root.querySelector(".release-player__seek");
  const currentTime = root.querySelector("[data-time-current]");
  const totalTime = root.querySelector("[data-time-total]");
  const status = root.querySelector(".release-player__status");
  const cover = root.querySelector(".release-player__cover");
  const buttons = [...root.querySelectorAll(".release-track__button")];
  const tracks = buttons.map((button) => ({
    title: button.dataset.title,
    src: button.dataset.src,
    duration: button.querySelector(".release-track__duration")
  }));
  let index = -1;
  let seeking = false;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  };
  const number = (position) => String(position + 1).padStart(2, "0");

  const render = () => {
    const playing = !audio.paused && !audio.ended;
    root.dataset.playing = String(playing);
    toggle.textContent = playing ? "Pause" : "Play";
    toggle.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${tracks[Math.max(index, 0)].title}`);
    previous.disabled = index <= 0;
    next.disabled = index < 0 || index >= tracks.length - 1;
    buttons.forEach((button, position) => {
      const active = position === index;
      if (active) {
        button.dataset.state = playing ? "playing" : "paused";
        button.setAttribute("aria-current", "true");
      } else {
        delete button.dataset.state;
        button.removeAttribute("aria-current");
      }
      button.setAttribute("aria-label", `${active && playing ? "Pause" : "Play"} ${tracks[position].title}`);
    });
    nowPlaying.textContent = index < 0 ? `${number(0)} — ${tracks[0].title}` : `${number(index)} — ${tracks[index].title}`;
  };

  const renderTime = () => {
    const duration = audio.duration;
    currentTime.textContent = formatTime(audio.currentTime || 0);
    totalTime.textContent = formatTime(duration);
    seek.disabled = !Number.isFinite(duration);
    if (!seeking && Number.isFinite(duration) && duration > 0) seek.value = String(Math.round((audio.currentTime / duration) * 1000));
    seek.setAttribute("aria-valuetext", `${formatTime(audio.currentTime || 0)} of ${formatTime(duration)}`);
  };

  const updateMediaSession = () => {
    if (!("mediaSession" in navigator) || index < 0 || typeof MediaMetadata === "undefined") return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: tracks[index].title,
      artist: root.dataset.artist,
      album: root.dataset.album,
      artwork: cover ? [{ src: cover.currentSrc || cover.src }] : []
    });
  };

  const play = async () => {
    status.textContent = "";
    document.dispatchEvent(new CustomEvent("kimina:audio-start", { detail: { source: "release" } }));
    try { await audio.play(); }
    catch (error) {
      if (error.name !== "AbortError") status.textContent = "Playback was blocked. Press play to try again.";
    }
  };

  const load = (position, autoplay = true) => {
    index = position;
    audio.src = tracks[position].src;
    seek.value = "0";
    renderTime();
    render();
    updateMediaSession();
    if (autoplay) play();
  };

  const toggleTrack = (position) => {
    if (position === index) {
      if (audio.paused) play();
      else audio.pause();
    } else {
      load(position);
    }
  };

  buttons.forEach((button, position) => button.addEventListener("click", () => toggleTrack(position)));
  toggle.addEventListener("click", () => toggleTrack(Math.max(index, 0)));
  previous.addEventListener("click", () => { if (index > 0) load(index - 1); });
  next.addEventListener("click", () => { if (index < tracks.length - 1) load(index + 1); });

  seek.addEventListener("input", () => {
    seeking = true;
    if (Number.isFinite(audio.duration)) currentTime.textContent = formatTime((Number(seek.value) / 1000) * audio.duration);
  });
  seek.addEventListener("change", () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    seeking = false;
  });

  audio.addEventListener("play", render);
  audio.addEventListener("pause", render);
  audio.addEventListener("timeupdate", renderTime);
  audio.addEventListener("loadedmetadata", () => {
    renderTime();
    const label = tracks[index]?.duration;
    if (label && !label.textContent.trim()) label.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("ended", () => {
    if (index < tracks.length - 1) load(index + 1);
    else {
      audio.currentTime = 0;
      render();
      renderTime();
    }
  });
  audio.addEventListener("error", () => {
    if (!audio.getAttribute("src")) return;
    status.textContent = `“${tracks[index].title}” could not be loaded.`;
    render();
  });

  document.addEventListener("kimina:audio-start", (event) => {
    if (event.detail?.source !== "release" && !audio.paused) audio.pause();
  });

  if ("mediaSession" in navigator) {
    const actions = {
      play: () => toggleTrack(Math.max(index, 0)),
      pause: () => audio.pause(),
      previoustrack: () => previous.click(),
      nexttrack: () => next.click()
    };
    for (const [action, handler] of Object.entries(actions)) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Unsupported action. */ }
    }
  }

  root.classList.add("is-enhanced");
  deck.hidden = false;
  render();
  renderTime();
})();
