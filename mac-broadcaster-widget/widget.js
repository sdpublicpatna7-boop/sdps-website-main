// SDPS macOS Broadcaster Widget - Direct LAN Control Script (No Tunneling)

(function () {
  // DOM Elements
  const ipInput = document.getElementById("ipInput");
  const btnSaveIp = document.getElementById("btnSaveIp");
  const statusBadge = document.getElementById("statusBadge");
  const pulseDot = document.getElementById("pulseDot");
  const statusText = document.getElementById("statusText");
  const pingMs = document.getElementById("pingMs");
  const toastBar = document.getElementById("toastBar");

  const btnMic = document.getElementById("btnMic");
  const micBtnLabel = document.getElementById("micBtnLabel");
  const micStatusText = document.getElementById("micStatusText");
  const volumeFill = document.getElementById("volumeFill");

  const btnEmergencyCancel = document.getElementById("btnEmergencyCancel");
  const sourceSelect = document.getElementById("sourceSelect");
  const zonePreset = document.getElementById("zonePreset");
  const scheduleSelect = document.getElementById("scheduleSelect");
  const btnSyncTime = document.getElementById("btnSyncTime");

  const chimeButtons = document.querySelectorAll(".chime-btn");

  // State Variables
  let broadcasterIp = localStorage.getItem("sdps_mac_broadcaster_ip") || "192.168.29.252";
  let isOnline = false;
  let isMicActive = false;
  let audioContext = null;
  let mediaStream = null;
  let analyser = null;
  let animFrameId = null;

  // Initialize UI
  ipInput.value = broadcasterIp;

  function showToast(msg, isError = false) {
    toastBar.textContent = msg;
    toastBar.className = "toast-bar" + (isError ? " error" : "");
    toastBar.style.display = "block";
    setTimeout(() => {
      toastBar.style.display = "none";
    }, 3000);
  }

  function getCleanIp() {
    let raw = ipInput.value.trim();
    if (!raw) raw = "192.168.29.252";
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw.replace(/\/+$/, "");
    }
    return `http://${raw}`.replace(/\/+$/, "");
  }

  // 1. Direct Ping Check (No Tunneling, Direct LAN Request)
  async function checkHardwareStatus() {
    const targetUrl = getCleanIp();
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      // Fetch direct LAN address
      const res = await fetch(`${targetUrl}/`, {
        method: "GET",
        mode: "no-cors",
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      isOnline = true;
      statusBadge.className = "status-badge status-online";
      pulseDot.className = "pulse-dot online";
      statusText.textContent = "LAN ONLINE";
      pingMs.textContent = `${elapsed} ms`;
    } catch (err) {
      isOnline = false;
      statusBadge.className = "status-badge status-offline";
      pulseDot.className = "pulse-dot offline";
      statusText.textContent = "OFFLINE";
      pingMs.textContent = "Timeout";
    }
  }

  // Save IP Handler
  btnSaveIp.addEventListener("click", () => {
    broadcasterIp = ipInput.value.trim();
    localStorage.setItem("sdps_mac_broadcaster_ip", broadcasterIp);
    showToast(`Broadcaster IP saved: ${broadcasterIp}`);
    checkHardwareStatus();
  });

  // 2. Send Direct Form Data POST to Audislave Hardware (No Proxy / No Tunneling)
  async function sendDirectHardwareCommand(endpoint, data) {
    const baseUrl = getCleanIp();
    const targetUrl = `${baseUrl}${endpoint}`;

    const formBody = new URLSearchParams();
    formBody.append("sUser", "admin");
    formBody.append("sPass", "admin");
    for (const [key, val] of Object.entries(data)) {
      formBody.append(key, val);
    }

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: formBody,
        mode: "no-cors"
      });

      showToast(`Command sent: ${endpoint}`);
      return true;
    } catch (err) {
      showToast(`Failed to send command to ${baseUrl}: ${err.message}`, true);
      return false;
    }
  }

  // 3. Microphone Audio Stream & Push-to-Talk Logic
  async function startMicrophoneStream() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function updateVolume() {
        if (!isMicActive) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const percent = Math.min(100, Math.round((average / 128) * 100));
        volumeFill.style.width = `${percent}%`;
        animFrameId = requestAnimationFrame(updateVolume);
      }

      updateVolume();

      // Trigger hardware MIC connect command directly
      const dest = zonePreset.value || "1-200";
      await sendDirectHardwareCommand("/BcastDo", {
        sSource: "sMic",
        sFilename: "1",
        sDest: dest,
        sRooms: dest,
        sAct: "Connect"
      });

      isMicActive = true;
      btnMic.classList.add("active");
      micBtnLabel.textContent = "BROADCASTING";
      micStatusText.textContent = "🔴 LIVE MIC ON";
    } catch (err) {
      showToast(`Microphone access error: ${err.message}`, true);
    }
  }

  async function stopMicrophoneStream() {
    isMicActive = false;
    btnMic.classList.remove("active");
    micBtnLabel.textContent = "SPEAK NOW";
    micStatusText.textContent = "Ready";
    volumeFill.style.width = "0%";

    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    // Trigger hardware cancel command
    const dest = zonePreset.value || "1-200";
    await sendDirectHardwareCommand("/BcastDo", {
      sSource: "sMic",
      sFilename: "1",
      sDest: dest,
      sRooms: dest,
      sAct: "Cancel"
    });
  }

  btnMic.addEventListener("click", () => {
    if (isMicActive) {
      stopMicrophoneStream();
    } else {
      startMicrophoneStream();
    }
  });

  // 4. Instant Bell Chime Buttons
  chimeButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const track = btn.getAttribute("data-track") || "1";
      const name = btn.getAttribute("data-name") || "Bell";
      const dest = zonePreset.value || "1-200";

      showToast(`Playing ${name}...`);
      await sendDirectHardwareCommand("/BcastDo", {
        sSource: "sFile",
        sFilename: track,
        sDest: dest,
        sRooms: dest,
        sAct: "Connect"
      });
    });
  });

  // 5. Emergency Cancel All Button
  btnEmergencyCancel.addEventListener("click", async () => {
    if (isMicActive) {
      stopMicrophoneStream();
    }
    const dest = zonePreset.value || "1-200";
    await sendDirectHardwareCommand("/BcastDo", {
      sSource: sourceSelect.value || "sMic",
      sFilename: "1",
      sDest: dest,
      sRooms: dest,
      sAct: "Cancel"
    });
    showToast("🛑 ALL BROADCASTS CANCELLED!");
  });

  // 6. Bell Schedule Switcher
  scheduleSelect.addEventListener("change", async () => {
    const schId = scheduleSelect.value;
    await sendDirectHardwareCommand("/SchCurrMod", {
      sSchId: schId
    });
  });

  // 7. Sync Real-Time Clock (Mac System Time -> Hardware)
  btnSyncTime.addEventListener("click", async () => {
    const now = new Date();
    await sendDirectHardwareCommand("/RtcMod", {
      iH: String(now.getHours()).padStart(2, "0"),
      iMi: String(now.getMinutes()).padStart(2, "0"),
      iD: String(now.getDate()).padStart(2, "0"),
      iMo: String(now.getMonth() + 1).padStart(2, "0"),
      iY: String(now.getFullYear()),
      chSignTz: "+",
      iHTz: "05",
      iMiTz: "30"
    });
    showToast("⏱️ Hardware Real-Time Clock Synced to Mac!");
  });

  // Electron Window Controls (if running inside Electron)
  const btnClose = document.getElementById("btnClose");
  const btnMinimize = document.getElementById("btnMinimize");
  const btnExpand = document.getElementById("btnExpand");

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      if (window.close) window.close();
    });
  }
  if (btnMinimize) {
    btnMinimize.addEventListener("click", () => {
      if (window.electronAPI && window.electronAPI.minimize) {
        window.electronAPI.minimize();
      }
    });
  }

  // Periodic Status Ping
  checkHardwareStatus();
  setInterval(checkHardwareStatus, 3000);
})();
