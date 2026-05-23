(function(exports) {

//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion

//#region solid-js/web
var require_web = __commonJS({ "solid-js/web"(exports, module) {
	module.exports = shelter.solidWeb;
} });

//#endregion
//#region solid-js
var require_solid_js = __commonJS({ "solid-js"(exports, module) {
	module.exports = shelter.solid;
} });

//#endregion
//#region plugins/fake-mute-deafen/index.jsx
var import_web = __toESM(require_web());
var import_web$1 = __toESM(require_web());
var import_web$2 = __toESM(require_web());
var import_web$3 = __toESM(require_web());
var import_web$4 = __toESM(require_web());
var import_web$5 = __toESM(require_web());
var import_solid_js = __toESM(require_solid_js());
const _tmpl$ = /*#__PURE__*/ (0, import_web.template)(`<div><!#><!/><span></span></div>`, 6), _tmpl$2 = /*#__PURE__*/ (0, import_web.template)(`<div><!#><!/><!#><!/><!#><!/><div><!#><!/><!#><!/></div><!#><!/><!#><!/></div>`, 18);
const { plugin: { scoped }, flux: { storesFlat } } = shelter;
const [muteState, setMuteState] = (0, import_solid_js.createSignal)(0);
const [deafenState, setDeafenState] = (0, import_solid_js.createSignal)(0);
const MUTE_COLORS = [
	"transparent",
	"#faa81a",
	"#f23f43"
];
const DEAFEN_COLORS = [
	"transparent",
	"#faa81a",
	"#f23f43"
];
const MUTE_LABEL = [
	"",
	"FAKE",
	"REAL"
];
const DEAFEN_LABEL = [
	"",
	"FAKE",
	"REAL"
];
let uninterceptFlux = null;
let uninterceptHttp = null;
let cleanupIndicators = null;
function install() {
	uninterceptFlux = scoped.flux.intercept((dispatch) => {
		if (dispatch.type === "AUDIO_TOGGLE_SELF_MUTE") {
			const cur = muteState();
			if (cur === 0) {
				setMuteState(1);
				return false;
			}
			if (cur === 1) {
				setMuteState(2);
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
				return false;
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
	uninterceptHttp = shelter.http.intercept("PATCH", /\/channels\/\d+\/voice-states\/@me/, (req) => {
		if (!req.body) return;
		if (muteState() === 1) req.body.self_mute = true;
		if (deafenState() === 1) req.body.self_deaf = true;
	});
}
function uninstall() {
	uninterceptFlux?.();
	uninterceptHttp?.();
	uninterceptFlux = null;
	uninterceptHttp = null;
}
const INDICATOR_ID_MUTE = "fmd-indicator-mute";
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
function injectIndicators() {
	const tryInject = () => {
		const buttons = document.querySelectorAll("[class*=\"buttonWrapper\"]");
		let muteBtn = null;
		let deafenBtn = null;
		buttons.forEach((btn) => {
			const label = btn.getAttribute("aria-label") || btn.querySelector("[aria-label]")?.getAttribute("aria-label") || "";
			if (/mute|mutar|microfone/i.test(label)) muteBtn = btn;
			if (/deafen|ensurdec|headphone/i.test(label)) deafenBtn = btn;
		});
		if (!muteBtn || !deafenBtn) {
			const voiceBar = document.querySelector("[class*=\"panels\"]") || document.querySelector("[class*=\"voiceControlsContainer\"]");
			if (voiceBar) {
				const btns = voiceBar.querySelectorAll("button");
				if (btns.length >= 2) {
					muteBtn = muteBtn || btns[0];
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
		updateIndicator(INDICATOR_ID_MUTE, muteState(), MUTE_COLORS, MUTE_LABEL);
		updateIndicator(INDICATOR_ID_DEAFEN, deafenState(), DEAFEN_COLORS, DEAFEN_LABEL);
	};
	tryInject();
	const obs = scoped.observeDom("[class*=\"panels\"], [class*=\"voiceControlsContainer\"]", () => {
		setTimeout(tryInject, 100);
	});
	const unsubMute = scoped.flux.subscribe("AUDIO_TOGGLE_SELF_MUTE", () => {
		setTimeout(() => updateIndicator(INDICATOR_ID_MUTE, muteState(), MUTE_COLORS, MUTE_LABEL), 50);
	});
	const unsubDeaf = scoped.flux.subscribe("AUDIO_TOGGLE_SELF_DEAF", () => {
		setTimeout(() => updateIndicator(INDICATOR_ID_DEAFEN, deafenState(), DEAFEN_COLORS, DEAFEN_LABEL), 50);
	});
	cleanupIndicators = () => {
		document.getElementById(INDICATOR_ID_MUTE)?.remove();
		document.getElementById(INDICATOR_ID_DEAFEN)?.remove();
		unsubMute?.();
		unsubDeaf?.();
	};
}
function onLoad() {
	install();
	injectIndicators();
}
function onUnload() {
	if (muteState() === 1 || deafenState() === 1) shelter.http.ready.then(() => {
		const channelId = storesFlat.SelectedChannelStore?.getVoiceChannelId?.();
		if (channelId) shelter.http.patch({
			url: `/channels/${channelId}/voice-states/@me`,
			body: {
				self_mute: false,
				self_deaf: false
			}
		}).catch(() => {});
	});
	setMuteState(0);
	setDeafenState(0);
	cleanupIndicators?.();
	uninstall();
}
const { ui: { Text, Divider, Header, HeaderTags } } = shelter;
const LABELS_MUTE = [
	"Desmutado",
	"Fake Mute",
	"Mute Real"
];
const LABELS_DEAFEN = [
	"Ouvindo",
	"Fake Deafen",
	"Deafen Real"
];
const COLORS = [
	"var(--text-muted)",
	"#faa81a",
	"#f23f43"
];
function StateRow({ label, state, labels, colors }) {
	return (() => {
		const _el$ = (0, import_web$2.getNextElement)(_tmpl$), _el$3 = _el$.firstChild, [_el$4, _co$] = (0, import_web$3.getNextMarker)(_el$3.nextSibling), _el$2 = _el$4.nextSibling;
		_el$.style.setProperty("display", "flex");
		_el$.style.setProperty("alignItems", "center");
		_el$.style.setProperty("justifyContent", "space-between");
		_el$.style.setProperty("padding", "10px 0");
		(0, import_web$4.insert)(_el$, (0, import_web$5.createComponent)(Text, {
			style: { fontWeight: 600 },
			children: label
		}), _el$4, _co$);
		_el$2.style.setProperty("padding", "3px 10px");
		_el$2.style.setProperty("borderRadius", "12px");
		_el$2.style.setProperty("background", "var(--background-secondary)");
		_el$2.style.setProperty("fontWeight", "700");
		_el$2.style.setProperty("fontSize", "13px");
		_el$2.style.setProperty("transition", "all 0.2s");
		(0, import_web$4.insert)(_el$2, () => labels[state()]);
		(0, import_web$1.effect)((_p$) => {
			const _v$ = colors[state()], _v$2 = `1px solid ${colors[state()]}`;
			_v$ !== _p$._v$ && _el$2.style.setProperty("color", _p$._v$ = _v$);
			_v$2 !== _p$._v$2 && _el$2.style.setProperty("border", _p$._v$2 = _v$2);
			return _p$;
		}, {
			_v$: undefined,
			_v$2: undefined
		});
		return _el$;
	})();
}
const settings = () => (() => {
	const _el$5 = (0, import_web$2.getNextElement)(_tmpl$2), _el$1 = _el$5.firstChild, [_el$10, _co$4] = (0, import_web$3.getNextMarker)(_el$1.nextSibling), _el$11 = _el$10.nextSibling, [_el$12, _co$5] = (0, import_web$3.getNextMarker)(_el$11.nextSibling), _el$13 = _el$12.nextSibling, [_el$14, _co$6] = (0, import_web$3.getNextMarker)(_el$13.nextSibling), _el$6 = _el$14.nextSibling, _el$7 = _el$6.firstChild, [_el$8, _co$2] = (0, import_web$3.getNextMarker)(_el$7.nextSibling), _el$9 = _el$8.nextSibling, [_el$0, _co$3] = (0, import_web$3.getNextMarker)(_el$9.nextSibling), _el$15 = _el$6.nextSibling, [_el$16, _co$7] = (0, import_web$3.getNextMarker)(_el$15.nextSibling), _el$17 = _el$16.nextSibling, [_el$18, _co$8] = (0, import_web$3.getNextMarker)(_el$17.nextSibling);
	_el$5.style.setProperty("padding", "8px 0");
	(0, import_web$4.insert)(_el$5, (0, import_web$5.createComponent)(Header, {
		get tag() {
			return HeaderTags.H4;
		},
		children: "Fake Mute & Deafen"
	}), _el$10, _co$4);
	(0, import_web$4.insert)(_el$5, (0, import_web$5.createComponent)(Text, {
		style: {
			marginBottom: "12px",
			opacity: .7
		},
		children: "Clique 1 → Fake \xA0|\xA0 Clique 2 → Real \xA0|\xA0 Clique 3 → Desativa"
	}), _el$12, _co$5);
	(0, import_web$4.insert)(_el$5, (0, import_web$5.createComponent)(Divider, {}), _el$14, _co$6);
	_el$6.style.setProperty("margin", "8px 0");
	(0, import_web$4.insert)(_el$6, (0, import_web$5.createComponent)(StateRow, {
		label: "Microfone",
		state: muteState,
		labels: LABELS_MUTE,
		colors: COLORS
	}), _el$8, _co$2);
	(0, import_web$4.insert)(_el$6, (0, import_web$5.createComponent)(StateRow, {
		label: "Áudio",
		state: deafenState,
		labels: LABELS_DEAFEN,
		colors: COLORS
	}), _el$0, _co$3);
	(0, import_web$4.insert)(_el$5, (0, import_web$5.createComponent)(Divider, {}), _el$16, _co$7);
	(0, import_web$4.insert)(_el$5, (0, import_web$5.createComponent)(Text, {
		style: {
			marginTop: "8px",
			opacity: .5,
			fontSize: "12px",
			color: "var(--status-danger)"
		},
		children: "⚠ Uso de mods pode violar os Termos de Serviço do Discord."
	}), _el$18, _co$8);
	return _el$5;
})();

//#endregion
exports.onLoad = onLoad
exports.onUnload = onUnload
exports.settings = settings
return exports;
})({});