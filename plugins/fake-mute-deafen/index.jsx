import { createSignal } from "solid-js";

const {
  plugin: { scoped },
  flux: { storesFlat },
} = shelter;

const [muteState,   setMuteState]   = createSignal(0);
const [deafenState, setDeafenState] = createSignal(0);

const LABELS_MUTE   = ["Desmutado",  "Fake Mute",   "Mute Real"];
const LABELS_DEAFEN = ["Ouvindo",    "Fake Deafen", "Deafen Real"];
const COLORS        = [
  "var(--text-muted)",
  "var(--status-warning, #faa81a)",
  "var(--status-danger,  #f23f43)",
];

let uninterceptFlux = null;
let uninterceptHttp = null;

function install() {
  uninterceptFlux = scoped.flux.intercept((dispatch) => {
    if (dispatch.type === "AUDIO_TOGGLE_SELF_MUTE") {
      const cur = muteState();
      if (cur === 0) { setMuteState(1); return false; }
      if (cur === 1) { setMuteState(2); return; }
      if (cur === 2) { setMuteState(0); return; }
    }

    if (dispatch.type === "AUDIO_TOGGLE_SELF_DEAF") {
      const cur = deafenState();
      if (cur === 0) { setDeafenState(1); return false; }
      if (cur === 1) { setDeafenState(2); return; }
      if (cur === 2) { setDeafenState(0); return; }
    }
  });

  uninterceptHttp = shelter.http.intercept(
    "PATCH",
    /\/channels\/\d+\/voice-states\/@me/,
    (req) => {
      if (!req.body) return;
      if (muteState()   === 1) req.body.self_mute = true;
      if (deafenState() === 1) req.body.self_deaf = true;
    }
  );
}

function uninstall() {
  uninterceptFlux?.();
  uninterceptHttp?.();
  uninterceptFlux = null;
  uninterceptHttp = null;
}

export function onLoad() {
  install();
}

export function onUnload() {
  if (muteState() === 1 || deafenState() === 1) {
    shelter.http.ready.then(() => {
      const channelId = storesFlat.SelectedChannelStore?.getVoiceChannelId?.();
      if (channelId) {
        shelter.http.patch({
          url: `/channels/${channelId}/voice-states/@me`,
          body: { self_mute: false, self_deaf: false },
        }).catch(() => {});
      }
    });
  }
  setMuteState(0);
  setDeafenState(0);
  uninstall();
}

const { ui: { Text, Divider, Header, HeaderTags } } = shelter;

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
    <Header tag={HeaderTags.H4}>Fake Mute & Deafen</Header>
    <Text style={{ marginBottom: "12px", opacity: 0.7 }}>
      Clique 1 → Fake &nbsp;|&nbsp; Clique 2 → Real &nbsp;|&nbsp; Clique 3 → Desativa
    </Text>
    <Divider />
    <div style={{ margin: "8px 0" }}>
      <StateRow label="Microfone" state={muteState}   labels={LABELS_MUTE}   colors={COLORS} />
      <StateRow label="Áudio"     state={deafenState} labels={LABELS_DEAFEN} colors={COLORS} />
    </div>
    <Divider />
    <Text style={{ marginTop: "8px", opacity: 0.5, fontSize: "12px", color: "var(--status-danger)" }}>
      ⚠ Uso de mods pode violar os Termos de Serviço do Discord.
    </Text>
  </div>
);
