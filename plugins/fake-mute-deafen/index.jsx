import { createSignal, createEffect } from "solid-js";

const {
  plugin: { scoped },
  flux: { storesFlat },
} = shelter;

const [muteState, setMuteState] = createSignal(0);
const [deafenState, setDeafenState] = createSignal(0);

// 0 = normal, 1 = fake, 2 = real
const MUTE_COLORS   = ["transparent", "#faa81a", "#f23f43"];
const DEAFEN_COLORS = ["transparent", "#faa81a", "#f23f43"];
const MUTE_LABEL    = ["", "FAKE", "REAL"];
const DEAFEN_LABEL  = ["", "FAKE", "REAL"];

let uninterceptFlux = null;
let cleanupIndicators = null;

// ── WEBSOCKET DESYNC (A Mágica da Rede) ────────────────────────────────────────

const originalWsSend = window.WebSocket.prototype.send;
let gatewaySocket = null;

function installWebSocketHook() {
  window.WebSocket.prototype.send = function (data) {
    // Captura a conexão principal do Gateway do Discord
    if (this.url && this.url.includes("gateway.discord.gg")) {
      gatewaySocket = this;
    }

    // Intercepta os pacotes indo para o servidor
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        // OP 4 é o evento de Voice State Update
        if (parsed.op === 4 && parsed.d) {
          if (muteState() === 1) parsed.d.self_mute = true;
          if (deafenState() === 1) parsed.d.self_deaf = true;
          data = JSON.stringify(parsed);
        }
      } catch (e) {
        // Ignora erros de parse em pacotes não-JSON
      }
    }
    return originalWsSend.apply(this, arguments);
  };
}

function removeWebSocketHook() {
  window.WebSocket.prototype.send = originalWsSend;
  gatewaySocket = null;
}

// Força o envio de um pacote pro servidor sem alterar a UI local
function forceGatewayUpdate() {
  if (!gatewaySocket) return;
  const channelId = storesFlat.SelectedChannelStore?.getVoiceChannelId?.();
  const guildId = storesFlat.SelectedChannelStore?.getGuildId?.() || null;

  if (channelId) {
    const payload = {
      op: 4,
      d: {
        guild_id: guildId,
        channel_id: channelId,
        self_mute: muteState() === 1 ? true : false,
        self_deaf: deafenState() === 1 ? true : false,
        self_video: false
      }
    };
    originalWsSend.call(gatewaySocket, JSON.stringify(payload));
  }
}

// ── INTERCEPTADORES FLUX ──────────────────────────────────────────────────────

function install() {
  installWebSocketHook();

  uninterceptFlux = scoped.flux.intercept((dispatch) => {
    if (dispatch.type === "AUDIO_TOGGLE_SELF_MUTE") {
      const cur = muteState();
      if (cur === 0) {
        setMuteState(1);
        forceGatewayUpdate(); // Avisa os outros que você mutou
        return false; // BLOQUEIA: Mantém seu mic aberto localmente
      }
      if (cur === 1) {
        setMuteState(2);
        // Deixa a ação nativa rolar (muta o mic de verdade)
        return;
      }
      if (cur === 2) {
        setMuteState(0);
        return;
      }
    }
    
    if (dispatch.type === "AUDIO_TOGGLE_SELF_DEAF") {
      const cur = deafenState();
      if (cur === 0) {
        setDeafenState(1);
        forceGatewayUpdate(); // Avisa os outros
        return false; // BLOQUEIA: Continua ouvindo tudo
      }
      if (cur === 1) {
        setDeafenState(2);
        return;
      }
      if (cur === 2) {
        setDeafenState(0);
        return;
      }
    }
  });
}

function uninstall() {
  uninterceptFlux?.();
  uninterceptFlux = null;
  removeWebSocketHook();
}

// ── INDICADORES VISUAIS ───────────────────────────────────────────────────────

const INDICATOR_ID_MUTE   = "fmd-indicator-mute";
const INDICATOR_ID_DEAFEN = "fmd-indicator-deafen";

function makeIndicator(id) {
  const el = document.createElement("div");
  el.id = id;
  el.style.cssText = `
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.04em;
    color: #fff;
    background: transparent;
    padding: 1px 3px;
    border-radius: 3px;
    pointer-events: none;
    z-index: 999;
    line-height: 1;
    white-space: nowrap;
    transition: background 0.15s;
  `;
  return el;
}

function updateIndicator(id, state, colors, labels) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.background = colors[state];
  el.textContent = labels[state];
}

createEffect(() => {
  updateIndicator(INDICATOR_ID_MUTE,   muteState(),   MUTE_COLORS,   MUTE_LABEL);
  updateIndicator(INDICATOR_ID_DEAFEN, deafenState(), DEAFEN_COLORS, DEAFEN_LABEL);
});

function injectIndicators() {
  const tryInject = () => {
    const buttons = document.querySelectorAll('[class*="buttonWrapper"]');
    let muteBtn = null;
    let deafenBtn = null;

    buttons.forEach(btn => {
      const label = btn.getAttribute("aria-label") || btn.querySelector("[aria-label]")?.getAttribute("aria-label") || "";
      if (/mute|mutar|microfone/i.test(label)) muteBtn = btn;
      if (/deafen|ensurdec|headphone/i.test(label)) deafenBtn = btn;
    });

    if (!muteBtn || !deafenBtn) {
      const voiceBar = document.querySelector('[class*="panels"]') || document.querySelector('[class*="voiceControlsContainer"]');
      if (voiceBar) {
        const btns = voiceBar.querySelectorAll("button");
        if (btns.length >= 2) {
          muteBtn   = muteBtn   || btns[0];
          deafenBtn = deafenBtn || btns[1];
        }
      }
    }

    if (muteBtn && !document.getElementById(INDICATOR_ID_MUTE)) {
      muteBtn.style.position = "relative";
      const ind = makeIndicator(INDICATOR_ID_MUTE);
      muteBtn.appendChild(ind);
    }

    if (deafenBtn && !document.getElementById(INDICATOR_ID_DEAFEN)) {
      deafenBtn.style.position = "relative";
      const ind = makeIndicator(INDICATOR_ID_DEAFEN);
      deafenBtn.appendChild(ind);
    }

    updateIndicator(INDICATOR_ID_MUTE,   muteState(),   MUTE_COLORS,   MUTE_LABEL);
    updateIndicator(INDICATOR_ID_DEAFEN, deafenState(), DEAFEN_COLORS, DEAFEN_LABEL);
  };

  tryInject();

  const obs = scoped.observeDom('[class*="panels"], [class*="voiceControlsContainer"]', () => {
    setTimeout(tryInject, 100);
  });

  cleanupIndicators = () => {
    document.getElementById(INDICATOR_ID_MUTE)?.remove();
    document.getElementById(INDICATOR_ID_DEAFEN)?.remove();
    obs?.();
  };
}

// ── CICLO DE VIDA ─────────────────────────────────────────────────────────────

export function onLoad() {
  install();
  injectIndicators();
}

export function onUnload() {
  if (muteState() === 1 || deafenState() === 1) {
    setMuteState(0);
    setDeafenState(0);
    forceGatewayUpdate(); // Desfaz a mentira pro servidor ao desativar o plugin
  }
  cleanupIndicators?.();
  uninstall();
}

// ── SETTINGS UI ───────────────────────────────────────────────────────────────
const { ui: { Text, Divider, Header, HeaderTags } } = shelter;

const LABELS_MUTE   = ["Desmutado",  "Fake Mute",   "Mute Real"];
const LABELS_DEAFEN = ["Ouvindo",    "Fake Deafen", "Deafen Real"];
const COLORS        = ["var(--text-muted)", "#faa81a", "#f23f43"];

function StateRow({ label, state, labels, colors }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
      <Text style={{ fontWeight: 600 }}>{label}</Text>
      <span style={{
        padding: "3px 10px",
        borderRadius: "12px",
        background: "var(--background-secondary)",
        color: colors[state()],
        fontWeight: 700,
        fontSize: "13px",
        border: `1px solid ${colors[state()]}`,
        transition: "all 0.2s",
      }}>
        {labels[state()]}
      </span>
    </div>
  );
}

export const settings = () => (
  <div style={{ padding: "8px 0" }}>
    <Header tag={HeaderTags.H4}>Fake Mute & Deafen (Gateway Exploit)</Header>
    <Text style={{ marginBottom: "12px", opacity: 0.7 }}>
      Clique 1 → Fake (Rede) &nbsp;|&nbsp; Clique 2 → Real &nbsp;|&nbsp; Clique 3 → Desativa
    </Text>
    <Divider />
    <div style={{ margin: "8px 0" }}>
      <StateRow label="Microfone" state={muteState}   labels={LABELS_MUTE}   colors={COLORS} />
      <StateRow label="Áudio"      state={deafenState} labels={LABELS_DEAFEN} colors={COLORS} />
    </div>
    <Divider />
    <Text style={{ marginTop: "8px", opacity: 0.5, fontSize: "12px", color: "var(--status-danger)" }}>
      ⚠ Este método adultera os pacotes WebSocket do Discord. Pode ser instável dependendo do servidor RTC.
    </Text>
  </div>
);
