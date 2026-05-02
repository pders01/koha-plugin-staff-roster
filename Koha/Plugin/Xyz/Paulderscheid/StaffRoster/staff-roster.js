//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, s = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: c, defineProperty: l, getOwnPropertyDescriptor: u, getOwnPropertyNames: d, getOwnPropertySymbols: f, getPrototypeOf: p } = Object, m = globalThis, ee = m.trustedTypes, te = ee ? ee.emptyScript : "", ne = m.reactiveElementPolyfillSupport, h = (e, t) => e, re = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? te : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, ie = (e, t) => !c(e, t), ae = {
	attribute: !0,
	type: String,
	converter: re,
	reflect: !1,
	useDefault: !1,
	hasChanged: ie
};
Symbol.metadata ??= Symbol("metadata"), m.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var g = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ae) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && l(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = u(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? ae;
	}
	static _$Ei() {
		if (this.hasOwnProperty(h("elementProperties"))) return;
		let e = p(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(h("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(h("properties"))) {
			let e = this.properties, t = [...d(e), ...f(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(Infinity).reverse());
			for (let e of n) t.unshift(s(e));
		} else e !== void 0 && t.push(s(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return o(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? re : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? re : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ie)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
g.elementStyles = [], g.shadowRootOptions = { mode: "open" }, g[h("elementProperties")] = /* @__PURE__ */ new Map(), g[h("finalized")] = /* @__PURE__ */ new Map(), ne?.({ ReactiveElement: g }), (m.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var oe = globalThis, se = (e) => e, ce = oe.trustedTypes, le = ce ? ce.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ue = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + _, fe = `<${de}>`, v = document, y = () => v.createComment(""), pe = (e) => e === null || typeof e != "object" && typeof e != "function", me = Array.isArray, he = (e) => me(e) || typeof e?.[Symbol.iterator] == "function", ge = "[ 	\n\f\r]", _e = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ve = /-->/g, ye = />/g, b = RegExp(`>|${ge}(?:([^\\s"'>=/]+)(${ge}*=${ge}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), be = /'/g, xe = /"/g, Se = /^(?:script|style|textarea|title)$/i, x = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), S = Symbol.for("lit-noChange"), C = Symbol.for("lit-nothing"), Ce = /* @__PURE__ */ new WeakMap(), w = v.createTreeWalker(v, 129);
function we(e, t) {
	if (!me(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return le === void 0 ? t : le.createHTML(t);
}
var Te = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = _e;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === _e ? c[1] === "!--" ? o = ve : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = b) : (Se.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = b) : o = ye : o === b ? c[0] === ">" ? (o = i ?? _e, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? b : c[3] === "\"" ? xe : be) : o === xe || o === be ? o = b : o === ve || o === ye ? o = _e : (o = b, i = void 0);
		let d = o === b && e[t + 1].startsWith("/>") ? " " : "";
		a += o === _e ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + ue + n.slice(l) + _ + d) : n + _ + (l === -2 ? t : d);
	}
	return [we(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ee = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Te(t, n);
		if (this.el = e.createElement(l, r), w.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = w.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ue)) {
					let t = u[o++], n = i.getAttribute(e).split(_), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? ke : r[1] === "?" ? Ae : r[1] === "@" ? je : E
					}), i.removeAttribute(e);
				} else e.startsWith(_) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Se.test(i.tagName)) {
					let e = i.textContent.split(_), t = e.length - 1;
					if (t > 0) {
						i.textContent = ce ? ce.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], y()), w.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], y());
					}
				}
			} else if (i.nodeType === 8) if (i.data === de) c.push({
				type: 2,
				index: a
			});
			else {
				let e = -1;
				for (; (e = i.data.indexOf(_, e + 1)) !== -1;) c.push({
					type: 7,
					index: a
				}), e += _.length - 1;
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = v.createElement("template");
		return n.innerHTML = e, n;
	}
};
function T(e, t, n = e, r) {
	if (t === S) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = pe(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = T(e, i._$AS(e, t.values), i, r)), t;
}
var De = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? v).importNode(t, !0);
		w.currentNode = r;
		let i = w.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Oe(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Me(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = w.nextNode(), a++);
		}
		return w.currentNode = v, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Oe = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = C, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = T(this, e, t), pe(e) ? e === C || e == null || e === "" ? (this._$AH !== C && this._$AR(), this._$AH = C) : e !== this._$AH && e !== S && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? he(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== C && pe(this._$AH) ? this._$AA.nextSibling.data = e : this.T(v.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Ee.createElement(we(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new De(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ce.get(e.strings);
		return t === void 0 && Ce.set(e.strings, t = new Ee(e)), t;
	}
	k(t) {
		me(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(y()), this.O(y()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = se(e).nextSibling;
			se(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, E = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = C, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = C;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = T(this, e, t, 0), a = !pe(e) || e !== this._$AH && e !== S, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = T(this, r[n + o], t, o), s === S && (s = this._$AH[o]), a ||= !pe(s) || s !== this._$AH[o], s === C ? e = C : e !== C && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === C ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, ke = class extends E {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === C ? void 0 : e;
	}
}, Ae = class extends E {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== C);
	}
}, je = class extends E {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = T(this, e, t, 0) ?? C) === S) return;
		let n = this._$AH, r = e === C && n !== C || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== C && (n === C || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Me = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		T(this, e);
	}
}, Ne = {
	M: ue,
	P: _,
	A: de,
	C: 1,
	L: Te,
	R: De,
	D: he,
	V: T,
	I: Oe,
	H: E,
	N: Ae,
	U: je,
	B: ke,
	F: Me
}, Pe = oe.litHtmlPolyfillSupport;
Pe?.(Ee, Oe), (oe.litHtmlVersions ??= []).push("3.3.2");
var Fe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Oe(t.insertBefore(y(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Ie = globalThis, D = class extends g {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Fe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return S;
	}
};
D._$litElement$ = !0, D.finalized = !0, Ie.litElementHydrateSupport?.({ LitElement: D });
var Le = Ie.litElementPolyfillSupport;
Le?.({ LitElement: D }), (Ie.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var Re = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, ze = {
	attribute: !0,
	type: String,
	converter: re,
	reflect: !1,
	hasChanged: ie
}, Be = (e = ze, t, n) => {
	let { kind: r, metadata: i } = n, a = globalThis.litPropertyMetadata.get(i);
	if (a === void 0 && globalThis.litPropertyMetadata.set(i, a = /* @__PURE__ */ new Map()), r === "setter" && ((e = Object.create(e)).wrapped = !0), a.set(n.name, e), r === "accessor") {
		let { name: r } = n;
		return {
			set(n) {
				let i = t.get.call(this);
				t.set.call(this, n), this.requestUpdate(r, i, e, !0, n);
			},
			init(t) {
				return t !== void 0 && this.C(r, void 0, e, t), t;
			}
		};
	}
	if (r === "setter") {
		let { name: r } = n;
		return function(n) {
			let i = this[r];
			t.call(this, n), this.requestUpdate(r, i, e, !0, n);
		};
	}
	throw Error("Unsupported decorator location: " + r);
};
function O(e) {
	return (t, n) => typeof n == "object" ? Be(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function k(e) {
	return O({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region node_modules/lit-html/directive.js
var Ve = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, He = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Ue = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: We } = Ne, Ge = (e) => e, Ke = () => document.createComment(""), A = (e, t, n) => {
	let r = e._$AA.parentNode, i = t === void 0 ? e._$AB : t._$AA;
	if (n === void 0) n = new We(r.insertBefore(Ke(), i), r.insertBefore(Ke(), i), e, e.options);
	else {
		let t = n._$AB.nextSibling, a = n._$AM, o = a !== e;
		if (o) {
			let t;
			n._$AQ?.(e), n._$AM = e, n._$AP !== void 0 && (t = e._$AU) !== a._$AU && n._$AP(t);
		}
		if (t !== i || o) {
			let e = n._$AA;
			for (; e !== t;) {
				let t = Ge(e).nextSibling;
				Ge(r).insertBefore(e, i), e = t;
			}
		}
	}
	return n;
}, j = (e, t, n = e) => (e._$AI(t, n), e), qe = {}, Je = (e, t = qe) => e._$AH = t, Ye = (e) => e._$AH, Xe = (e) => {
	e._$AR(), e._$AA.remove();
}, Ze = (e, t, n) => {
	let r = /* @__PURE__ */ new Map();
	for (let i = t; i <= n; i++) r.set(e[i], i);
	return r;
}, Qe = He(class extends Ue {
	constructor(e) {
		if (super(e), e.type !== Ve.CHILD) throw Error("repeat() can only be used in text expressions");
	}
	dt(e, t, n) {
		let r;
		n === void 0 ? n = t : t !== void 0 && (r = t);
		let i = [], a = [], o = 0;
		for (let t of e) i[o] = r ? r(t, o) : o, a[o] = n(t, o), o++;
		return {
			values: a,
			keys: i
		};
	}
	render(e, t, n) {
		return this.dt(e, t, n).values;
	}
	update(e, [t, n, r]) {
		let i = Ye(e), { values: a, keys: o } = this.dt(t, n, r);
		if (!Array.isArray(i)) return this.ut = o, a;
		let s = this.ut ??= [], c = [], l, u, d = 0, f = i.length - 1, p = 0, m = a.length - 1;
		for (; d <= f && p <= m;) if (i[d] === null) d++;
		else if (i[f] === null) f--;
		else if (s[d] === o[p]) c[p] = j(i[d], a[p]), d++, p++;
		else if (s[f] === o[m]) c[m] = j(i[f], a[m]), f--, m--;
		else if (s[d] === o[m]) c[m] = j(i[d], a[m]), A(e, c[m + 1], i[d]), d++, m--;
		else if (s[f] === o[p]) c[p] = j(i[f], a[p]), A(e, i[d], i[f]), f--, p++;
		else if (l === void 0 && (l = Ze(o, p, m), u = Ze(s, d, f)), l.has(s[d])) if (l.has(s[f])) {
			let t = u.get(o[p]), n = t === void 0 ? null : i[t];
			if (n === null) {
				let t = A(e, i[d]);
				j(t, a[p]), c[p] = t;
			} else c[p] = j(n, a[p]), A(e, i[d], n), i[t] = null;
			p++;
		} else Xe(i[f]), f--;
		else Xe(i[d]), d++;
		for (; p <= m;) {
			let t = A(e, c[m + 1]);
			j(t, a[p]), c[p++] = t;
		}
		for (; d <= f;) {
			let e = i[d++];
			e !== null && Xe(e);
		}
		return this.ut = o, Je(e, c), S;
	}
});
//#endregion
//#region node_modules/@jpahd/lit-stack/dist/utilities-BUI2aO8f.js
async function $e(e) {
	try {
		return [null, await e];
	} catch (e) {
		return [e instanceof Error ? e : Error(String(e)), null];
	}
}
//#endregion
//#region node_modules/ts-pattern/dist/index.js
var M = Symbol.for("@ts-pattern/matcher"), et = Symbol.for("@ts-pattern/isVariadic"), tt = "@ts-pattern/anonymous-select-key", nt = (e) => !!(e && typeof e == "object"), rt = (e) => e && !!e[M], N = (e, t, n) => {
	if (rt(e)) {
		let { matched: r, selections: i } = e[M]().match(t);
		return r && i && Object.keys(i).forEach((e) => n(e, i[e])), r;
	}
	if (nt(e)) {
		if (!nt(t)) return !1;
		if (Array.isArray(e)) {
			if (!Array.isArray(t)) return !1;
			let r = [], i = [], a = [];
			for (let t of e.keys()) {
				let n = e[t];
				rt(n) && n[et] ? a.push(n) : a.length ? i.push(n) : r.push(n);
			}
			if (a.length) {
				if (a.length > 1) throw Error("Pattern error: Using `...P.array(...)` several times in a single pattern is not allowed.");
				if (t.length < r.length + i.length) return !1;
				let e = t.slice(0, r.length), o = i.length === 0 ? [] : t.slice(-i.length), s = t.slice(r.length, i.length === 0 ? Infinity : -i.length);
				return r.every((t, r) => N(t, e[r], n)) && i.every((e, t) => N(e, o[t], n)) && (a.length === 0 || N(a[0], s, n));
			}
			return e.length === t.length && e.every((e, r) => N(e, t[r], n));
		}
		return Reflect.ownKeys(e).every((r) => {
			let i = e[r];
			return (r in t || rt(a = i) && a[M]().matcherType === "optional") && N(i, t[r], n);
			var a;
		});
	}
	return Object.is(t, e);
}, P = (e) => {
	var t;
	return nt(e) ? rt(e) ? (t = e[M]()).getSelectionKeys?.call(t) ?? [] : it(Array.isArray(e) ? e : Object.values(e), P) : [];
}, it = (e, t) => e.reduce((e, n) => e.concat(t(n)), []);
function at(...e) {
	if (e.length === 1) {
		let [t] = e;
		return (e) => N(t, e, () => {});
	}
	if (e.length === 2) {
		let [t, n] = e;
		return N(t, n, () => {});
	}
	throw Error(`isMatching wasn't given the right number of arguments: expected 1 or 2, received ${e.length}.`);
}
function F(e) {
	return Object.assign(e, {
		optional: () => st(e),
		and: (t) => I(e, t),
		or: (t) => dt(e, t),
		select: (t) => t === void 0 ? ft(e) : ft(t, e)
	});
}
function ot(e) {
	return Object.assign(((e) => Object.assign(e, { [Symbol.iterator]() {
		let t = 0, n = [{
			value: Object.assign(e, { [et]: !0 }),
			done: !1
		}, {
			done: !0,
			value: void 0
		}];
		return { next: () => n[t++] ?? n.at(-1) };
	} }))(e), {
		optional: () => ot(st(e)),
		select: (t) => ot(t === void 0 ? ft(e) : ft(t, e))
	});
}
function st(e) {
	return F({ [M]: () => ({
		match: (t) => {
			let n = {}, r = (e, t) => {
				n[e] = t;
			};
			return t === void 0 ? (P(e).forEach((e) => r(e, void 0)), {
				matched: !0,
				selections: n
			}) : {
				matched: N(e, t, r),
				selections: n
			};
		},
		getSelectionKeys: () => P(e),
		matcherType: "optional"
	}) });
}
var ct = (e, t) => {
	for (let n of e) if (!t(n)) return !1;
	return !0;
}, lt = (e, t) => {
	for (let [n, r] of e.entries()) if (!t(r, n)) return !1;
	return !0;
}, ut = (e, t) => {
	let n = Reflect.ownKeys(e);
	for (let r of n) if (!t(r, e[r])) return !1;
	return !0;
};
function I(...e) {
	return F({ [M]: () => ({
		match: (t) => {
			let n = {}, r = (e, t) => {
				n[e] = t;
			};
			return {
				matched: e.every((e) => N(e, t, r)),
				selections: n
			};
		},
		getSelectionKeys: () => it(e, P),
		matcherType: "and"
	}) });
}
function dt(...e) {
	return F({ [M]: () => ({
		match: (t) => {
			let n = {}, r = (e, t) => {
				n[e] = t;
			};
			return it(e, P).forEach((e) => r(e, void 0)), {
				matched: e.some((e) => N(e, t, r)),
				selections: n
			};
		},
		getSelectionKeys: () => it(e, P),
		matcherType: "or"
	}) });
}
function L(e) {
	return { [M]: () => ({ match: (t) => ({ matched: !!e(t) }) }) };
}
function ft(...e) {
	let t = typeof e[0] == "string" ? e[0] : void 0, n = e.length === 2 ? e[1] : typeof e[0] == "string" ? void 0 : e[0];
	return F({ [M]: () => ({
		match: (e) => {
			let r = { [t ?? tt]: e };
			return {
				matched: n === void 0 || N(n, e, (e, t) => {
					r[e] = t;
				}),
				selections: r
			};
		},
		getSelectionKeys: () => [t ?? tt].concat(n === void 0 ? [] : P(n))
	}) });
}
function pt(e) {
	return !0;
}
function R(e) {
	return typeof e == "number";
}
function z(e) {
	return typeof e == "string";
}
function B(e) {
	return typeof e == "bigint";
}
var mt = F(L(pt)), ht = F(L(pt)), gt = mt, V = (e) => Object.assign(F(e), {
	startsWith: (t) => {
		return V(I(e, (n = t, L((e) => z(e) && e.startsWith(n)))));
		var n;
	},
	endsWith: (t) => {
		return V(I(e, (n = t, L((e) => z(e) && e.endsWith(n)))));
		var n;
	},
	minLength: (t) => V(I(e, ((e) => L((t) => z(t) && t.length >= e))(t))),
	length: (t) => V(I(e, ((e) => L((t) => z(t) && t.length === e))(t))),
	maxLength: (t) => V(I(e, ((e) => L((t) => z(t) && t.length <= e))(t))),
	includes: (t) => {
		return V(I(e, (n = t, L((e) => z(e) && e.includes(n)))));
		var n;
	},
	regex: (t) => {
		return V(I(e, (n = t, L((e) => z(e) && !!e.match(n)))));
		var n;
	}
}), _t = V(L(z)), H = (e) => Object.assign(F(e), {
	between: (t, n) => H(I(e, ((e, t) => L((n) => R(n) && e <= n && t >= n))(t, n))),
	lt: (t) => H(I(e, ((e) => L((t) => R(t) && t < e))(t))),
	gt: (t) => H(I(e, ((e) => L((t) => R(t) && t > e))(t))),
	lte: (t) => H(I(e, ((e) => L((t) => R(t) && t <= e))(t))),
	gte: (t) => H(I(e, ((e) => L((t) => R(t) && t >= e))(t))),
	int: () => H(I(e, L((e) => R(e) && Number.isInteger(e)))),
	finite: () => H(I(e, L((e) => R(e) && Number.isFinite(e)))),
	positive: () => H(I(e, L((e) => R(e) && e > 0))),
	negative: () => H(I(e, L((e) => R(e) && e < 0)))
}), vt = H(L(R)), U = (e) => Object.assign(F(e), {
	between: (t, n) => U(I(e, ((e, t) => L((n) => B(n) && e <= n && t >= n))(t, n))),
	lt: (t) => U(I(e, ((e) => L((t) => B(t) && t < e))(t))),
	gt: (t) => U(I(e, ((e) => L((t) => B(t) && t > e))(t))),
	lte: (t) => U(I(e, ((e) => L((t) => B(t) && t <= e))(t))),
	gte: (t) => U(I(e, ((e) => L((t) => B(t) && t >= e))(t))),
	positive: () => U(I(e, L((e) => B(e) && e > 0))),
	negative: () => U(I(e, L((e) => B(e) && e < 0)))
}), W = {
	__proto__: null,
	matcher: M,
	optional: st,
	array: function(...e) {
		return ot({ [M]: () => ({
			match: (t) => {
				if (!Array.isArray(t)) return { matched: !1 };
				if (e.length === 0) return { matched: !0 };
				let n = e[0], r = {};
				if (t.length === 0) return P(n).forEach((e) => {
					r[e] = [];
				}), {
					matched: !0,
					selections: r
				};
				let i = (e, t) => {
					r[e] = (r[e] || []).concat([t]);
				};
				return {
					matched: t.every((e) => N(n, e, i)),
					selections: r
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : P(e[0])
		}) });
	},
	set: function(...e) {
		return F({ [M]: () => ({
			match: (t) => {
				if (!(t instanceof Set)) return { matched: !1 };
				let n = {};
				if (t.size === 0) return {
					matched: !0,
					selections: n
				};
				if (e.length === 0) return { matched: !0 };
				let r = (e, t) => {
					n[e] = (n[e] || []).concat([t]);
				}, i = e[0];
				return {
					matched: ct(t, (e) => N(i, e, r)),
					selections: n
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : P(e[0])
		}) });
	},
	map: function(...e) {
		return F({ [M]: () => ({
			match: (t) => {
				if (!(t instanceof Map)) return { matched: !1 };
				let n = {};
				if (t.size === 0) return {
					matched: !0,
					selections: n
				};
				let r = (e, t) => {
					n[e] = (n[e] || []).concat([t]);
				};
				if (e.length === 0) return { matched: !0 };
				if (e.length === 1) throw Error(`\`P.map\` wasn't given enough arguments. Expected (key, value), received ${e[0]?.toString()}`);
				let [i, a] = e;
				return {
					matched: lt(t, (e, t) => {
						let n = N(i, t, r), o = N(a, e, r);
						return n && o;
					}),
					selections: n
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : [...P(e[0]), ...P(e[1])]
		}) });
	},
	record: function(...e) {
		return F({ [M]: () => ({
			match: (t) => {
				if (typeof t != "object" || !t || Array.isArray(t)) return { matched: !1 };
				if (e.length === 0) throw Error(`\`P.record\` wasn't given enough arguments. Expected (value) or (key, value), received ${e[0]?.toString()}`);
				let n = {}, r = (e, t) => {
					n[e] = (n[e] || []).concat([t]);
				}, [i, a] = e.length === 1 ? [_t, e[0]] : e;
				return {
					matched: ut(t, (e, t) => {
						let n = typeof e != "string" || Number.isNaN(Number(e)) ? null : Number(e), o = n !== null && N(i, n, r), s = N(i, e, r), c = N(a, t, r);
						return (s || o) && c;
					}),
					selections: n
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : [...P(e[0]), ...P(e[1])]
		}) });
	},
	intersection: I,
	union: dt,
	not: function(e) {
		return F({ [M]: () => ({
			match: (t) => ({ matched: !N(e, t, () => {}) }),
			getSelectionKeys: () => [],
			matcherType: "not"
		}) });
	},
	when: L,
	select: ft,
	any: mt,
	unknown: ht,
	_: gt,
	string: _t,
	number: vt,
	bigint: U(L(B)),
	boolean: F(L(function(e) {
		return typeof e == "boolean";
	})),
	symbol: F(L(function(e) {
		return typeof e == "symbol";
	})),
	nullish: F(L(function(e) {
		return e == null;
	})),
	nonNullable: F(L(function(e) {
		return e != null;
	})),
	instanceOf: function(e) {
		return F(L(function(e) {
			return (t) => t instanceof e;
		}(e)));
	},
	shape: function(e) {
		return F(L(at(e)));
	}
}, yt = class extends Error {
	constructor(e) {
		let t;
		try {
			t = JSON.stringify(e);
		} catch {
			t = e;
		}
		super(`Pattern matching error: no pattern matches value ${t}`), this.input = void 0, this.input = e;
	}
}, bt = {
	matched: !1,
	value: void 0
};
function xt(e) {
	return new St(e, bt);
}
var St = class e {
	constructor(e, t) {
		this.input = void 0, this.state = void 0, this.input = e, this.state = t;
	}
	with(...t) {
		if (this.state.matched) return this;
		let n = t[t.length - 1], r = [t[0]], i;
		t.length === 3 && typeof t[1] == "function" ? i = t[1] : t.length > 2 && r.push(...t.slice(1, t.length - 1));
		let a = !1, o = {}, s = (e, t) => {
			a = !0, o[e] = t;
		}, c = !r.some((e) => N(e, this.input, s)) || i && !i(this.input) ? bt : {
			matched: !0,
			value: n(a ? tt in o ? o[tt] : o : this.input, this.input)
		};
		return new e(this.input, c);
	}
	when(t, n) {
		if (this.state.matched) return this;
		let r = !!t(this.input);
		return new e(this.input, r ? {
			matched: !0,
			value: n(this.input, this.input)
		} : bt);
	}
	otherwise(e) {
		return this.state.matched ? this.state.value : e(this.input);
	}
	exhaustive(e = Ct) {
		return this.state.matched ? this.state.value : e(this.input);
	}
	run() {
		return this.exhaustive();
	}
	returnType() {
		return this;
	}
	narrow() {
		return this;
	}
};
function Ct(e) {
	throw new yt(e);
}
//#endregion
//#region node_modules/@jpahd/lit-stack/dist/http-CJJa-frZ.js
var wt = class {
	constructor(e, t, n) {
		this.interceptors = [], this.inflight = /* @__PURE__ */ new Map(), this.basePath = e, this.endpoints = t, this.retry = n ?? { maxRetries: 0 };
	}
	use(e) {
		this.interceptors.push(e);
	}
	async _fetch(e, t) {
		let n = e, r = t;
		for (let e of this.interceptors) e.request && ([n, r] = await e.request(n, r));
		let { maxRetries: i, baseDelay: a = 1e3, retryOn: o } = this.retry, s = o ?? ((e) => e >= 500), c = (e) => new Promise((t) => setTimeout(t, a * 2 ** e)), l, u = null;
		for (let e = 0; e <= i; e++) {
			let [t, a] = await $e(fetch(n, r));
			if (t) {
				if (u = t, e < i) {
					await c(e);
					continue;
				}
				break;
			}
			if (l = a, a.ok || !s(a.status)) break;
			if (e < i) {
				await c(e);
				continue;
			}
		}
		if (!l && u) {
			for (let e = this.interceptors.length - 1; e >= 0; e--) {
				let t = this.interceptors[e].error;
				if (t) {
					let [, e] = await $e(Promise.resolve(t(u, n, r)));
					if (e) {
						l = e;
						break;
					}
				}
			}
			if (!l) throw u;
		}
		for (let e = this.interceptors.length - 1; e >= 0; e--) {
			let t = this.interceptors[e].response;
			t && (l = await t(l));
		}
		return l;
	}
	_stringifyQuery(e) {
		return xt(e).with(W.nullish, () => "").with(W.string, (e) => e.startsWith("?") ? e.slice(1) : e).with(W._, (e) => new URLSearchParams(e).toString()).exhaustive();
	}
	_toRelativeUrl(e, t, n) {
		if (!e) throw Error(`Argument basePath is ${e}.`);
		let r = t?.length ? `/${t.join("/")}` : "", i = this._stringifyQuery(n);
		return `${e}${r}${i ? `?${i}` : ""}`;
	}
	_request({ endpoint: e, path: t, query: n, requestInit: r }) {
		let i = r?.method;
		[
			"get",
			"post",
			"put",
			"delete"
		].includes(i ?? "") || (i = void 0);
		let a = this.endpoints[i ?? "get"][e];
		if (!a) return this._fetch(this._toRelativeUrl(this.basePath), r ?? {});
		let { url: o } = a;
		if (!o) throw Error(`No URL configured for: ${e}`);
		t && (o += `/${t.join("/")}`);
		let s = {
			...a.requestInit,
			...r
		};
		s = xt(r?.body).with(W.nullish, () => s).with(W.instanceOf(FormData), () => s).with(W._, (e) => ({
			...s,
			headers: { "Content-Type": "application/json" },
			body: e
		})).exhaustive();
		let c = navigator.userAgent.toLowerCase();
		s.cache = xt(c).when((e) => e.includes("chrome"), () => a.ignoreCache ? "no-cache" : "no-store").when((e) => e.includes("firefox"), () => a.ignoreCache ? "no-cache" : "default").otherwise(() => a.ignoreCache ? "no-cache" : a.cache ? "default" : "force-cache");
		let l = new URLSearchParams();
		if (a.query && (l = new URLSearchParams(a.query)), n) {
			let e = new URLSearchParams(l);
			new URLSearchParams(n).forEach((t, n) => {
				e.append(n, t);
			}), l = e;
		}
		return l.size && (o += `?${l.toString()}`), this._fetch(o, s);
	}
	get({ endpoint: e, path: t, query: n, requestInit: r = { method: "get" } }) {
		let i = `GET:${e}:${t?.join("/") ?? ""}:${typeof n == "string" ? n : JSON.stringify(n ?? {})}`, a = this.inflight.get(i);
		if (a) return a.then((e) => e.clone());
		let o = this._request({
			endpoint: e,
			path: t,
			query: n,
			requestInit: {
				...r,
				method: "get"
			}
		}).finally(() => {
			this.inflight.delete(i);
		});
		return this.inflight.set(i, o), o;
	}
	post({ endpoint: e, path: t, query: n, requestInit: r = { method: "post" } }) {
		return this._request({
			endpoint: e,
			path: t,
			query: n,
			requestInit: {
				...r,
				method: "post"
			}
		});
	}
	put({ endpoint: e, path: t, query: n, requestInit: r = { method: "put" } }) {
		return this._request({
			endpoint: e,
			path: t,
			query: n,
			requestInit: {
				...r,
				method: "put"
			}
		});
	}
	delete({ endpoint: e, path: t, query: n, requestInit: r = { method: "delete" } }) {
		return this._request({
			endpoint: e,
			path: t,
			query: n,
			requestInit: {
				...r,
				method: "delete"
			}
		});
	}
}, Tt = { de: {
	"Staff Roster": "Dienstplan",
	"No rosters yet.": "Noch keine Dienstpläne.",
	Plugins: "Plugins",
	Configuration: "Konfiguration",
	Administration: "Verwaltung",
	Cancel: "Abbrechen",
	Save: "Speichern",
	Yes: "Ja",
	No: "Nein",
	Edit: "Bearbeiten",
	Delete: "Löschen",
	ID: "ID",
	"ID:": "ID:",
	Code: "Kürzel",
	"Code:": "Kürzel:",
	Name: "Name",
	"Name:": "Name:",
	Description: "Beschreibung",
	"Description:": "Beschreibung:",
	Color: "Farbe",
	"Color:": "Farbe:",
	Status: "Status",
	Actions: "Aktionen",
	Active: "Aktiv",
	"Active:": "Aktiv:",
	Inactive: "Inaktiv",
	Required: "Pflichtfeld",
	"Loading…": "Wird geladen…",
	Close: "Schließen",
	Dismiss: "Schließen",
	Refresh: "Aktualisieren",
	Previous: "Zurück",
	Next: "Weiter",
	"Week of": "Woche vom",
	All: "Alle",
	"All branches": "Alle Bibliotheken",
	ongoing: "laufend",
	Type: "Typ",
	"Type:": "Typ:",
	Branch: "Bibliothek",
	"Branch:": "Bibliothek:",
	Branches: "Bibliotheken",
	"Library groups": "Bibliotheksgruppen",
	Target: "Geltungsbereich",
	"Target:": "Geltungsbereich:",
	Effective: "Gültig",
	"Effective from:": "Gültig ab:",
	"Effective to:": "Gültig bis:",
	"Leave empty for ongoing roster": "Leer lassen für unbefristeten Dienstplan",
	Slots: "Zeitfenster",
	Slot: "Zeitfenster",
	Time: "Zeit",
	Days: "Tage",
	Staff: "Personal",
	Schedule: "Plan",
	Settings: "Einstellungen",
	Rosters: "Dienstpläne",
	"New roster": "Neuer Dienstplan",
	New: "Neu",
	"New Roster": "Neuer Dienstplan",
	"Edit Roster": "Dienstplan bearbeiten",
	Roster: "Dienstplan",
	"Manage Roster": "Dienstplan verwalten",
	"Manage Slots": "Zeitfenster verwalten",
	"Manage slots": "Zeitfenster verwalten",
	"View Assignments": "Zuweisungen anzeigen",
	"My Shifts": "Meine Schichten",
	"My shifts": "Meine Schichten",
	"Open Shifts": "Offene Schichten",
	"Open shifts": "Offene Schichten",
	"Confirm Deletion": "Löschen bestätigen",
	"Confirm deletion": "Löschen bestätigen",
	"This roster": "Dieser Dienstplan",
	Exceptions: "Ausnahmen",
	"Swap requests": "Tauschanfragen",
	"Roster types": "Dienstplantypen",
	"Roster Types": "Dienstplantypen",
	"Roster type:": "Dienstplantyp:",
	"Roster Details": "Dienstplandetails",
	"Configuration saved successfully.": "Konfiguration erfolgreich gespeichert.",
	"You don't have the staffroster_configure permission. Changes were not saved.": "Sie haben nicht die Berechtigung staffroster_configure. Die Änderungen wurden nicht gespeichert.",
	"Notification Settings": "Benachrichtigungseinstellungen",
	"Enable email reminders:": "E-Mail-Erinnerungen aktivieren:",
	"Send reminders (days before):": "Erinnerungen senden (Tage vorher):",
	"Number of days before a shift to send reminder": "Anzahl der Tage vor einer Schicht, an denen die Erinnerung gesendet wird",
	"Enable swap request notifications:": "Benachrichtigungen für Tauschanfragen aktivieren:",
	"Library scope & staff selection": "Bibliotheksbereich & Personalauswahl",
	"Group enforcement:": "Gruppenerzwingung:",
	"Off: groups ignored": "Aus: Gruppen werden ignoriert",
	"Filter: non-members don't see group rosters": "Filter: Nicht-Mitglieder sehen keine Gruppendienstpläne",
	"Strict: non-members get 403 on read and write": "Streng: Nicht-Mitglieder erhalten 403 beim Lesen und Schreiben",
	"Superlibrarians always see all rosters regardless of mode.": "Super-Bibliothekare sehen unabhängig vom Modus immer alle Dienstpläne.",
	"Default group:": "Standardgruppe:",
	None: "Keine",
	"Pre-selected for new rosters.": "Voreinstellung für neue Dienstpläne.",
	"Staff patron categories:": "Personalkategorien:",
	"Default in effect: all category_type S patrons are pre-selected. Saving without changes locks this list, so newly created S-type categories will not be auto-included after that. Clear the selection to keep the open-ended default.": "Standard aktiv: alle Benutzer der Kategorie S sind voreingestellt. Speichern ohne Änderung fixiert diese Liste, sodass neu angelegte S-Kategorien danach nicht mehr automatisch eingeschlossen werden. Auswahl leeren, um den offenen Standard beizubehalten.",
	"Categories whose patrons can be assigned to slots. Hold Ctrl/Cmd to multi-select. Empty = fall back to all category_type='S' patrons.": "Kategorien, deren Benutzer Zeitfenstern zugewiesen werden können. Strg/Cmd halten für Mehrfachauswahl. Leer = Rückfall auf alle category_type='S' Benutzer.",
	"Calendar integration": "Kalenderintegration",
	"Use Koha calendar:": "Koha-Kalender verwenden:",
	"Merge Koha calendar closures into roster exceptions.": "Koha-Kalenderschließungen in Dienstplanausnahmen einbeziehen.",
	"Calendar source:": "Kalenderquelle:",
	"Roster's branch (or all branches in its group)": "Bibliothek des Dienstplans (oder alle Bibliotheken seiner Gruppe)",
	"For multi-branch rosters, a date is closed only if every branch in the group is closed.": "Bei dienstplanübergreifenden Bibliotheken gilt ein Datum nur dann als geschlossen, wenn alle Bibliotheken der Gruppe geschlossen sind.",
	"Closure handling:": "Schließungsbehandlung:",
	"Hard: block assignment on closed dates": "Hart: Zuweisung an geschlossenen Tagen blockieren",
	"Soft: show closure but allow assignment": "Weich: Schließung anzeigen, aber Zuweisung erlauben",
	"Slot location source": "Zeitfenster-Standortquelle",
	"Koha desks:": "Koha-Desks:",
	"For single-branch rosters, suggest the branch's Koha desks in the location field. Free text otherwise.": "Bei Einzel-Bibliotheks-Dienstplänen die Koha-Desks der Bibliothek im Standortfeld vorschlagen. Andernfalls Freitext.",
	"Authorised values:": "Normierte Werte:",
	"Replace the location input with a dropdown from a Koha AV category. Takes precedence over Koha desks. Submitted values must match the category.": "Ersetzt das Standorteingabefeld durch eine Dropdown-Liste einer Koha-AV-Kategorie. Hat Vorrang vor Koha-Desks. Übermittelte Werte müssen der Kategorie entsprechen.",
	"AV category:": "AV-Kategorie:",
	"Category code (default STAFFROSTER_LOCATION). Create the category in Koha admin first.": "Kategoriekürzel (Standard STAFFROSTER_LOCATION). Erstellen Sie die Kategorie zuerst in der Koha-Administration.",
	"Custom fields": "Benutzerdefinierte Felder",
	"Roster custom fields:": "Benutzerdefinierte Dienstplanfelder:",
	"Manage in Koha admin": "In Koha-Administration verwalten",
	"Define optional per-roster fields (text or authorised value). Shown on the roster edit form. Empty values aren't stored.": "Definieren Sie optionale Felder pro Dienstplan (Text oder normierte Werte). Sie werden im Dienstplan-Bearbeitungsformular angezeigt. Leere Werte werden nicht gespeichert.",
	"Permission Settings": "Berechtigungseinstellungen",
	"Staff can self-assign to open slots:": "Personal kann sich selbst offenen Zeitfenstern zuweisen:",
	"Self-unclaim lockout (hours before shift):": "Sperrfrist für Selbst-Aufgabe (Stunden vor Schicht):",
	"0 = no lockout. Set e.g. 24 to block self-drops within 24 hours of the shift start.": "0 = keine Sperrfrist. z. B. 24 setzen, um Selbst-Aufgabe innerhalb von 24 Stunden vor Schichtbeginn zu blockieren.",
	"Require manager approval for swaps:": "Manager-Genehmigung für Tausche erforderlich:",
	"Save configuration": "Konfiguration speichern",
	"Modify roster type": "Dienstplantyp ändern",
	"New roster type": "Neuer Dienstplantyp",
	"An error occurred when updating this roster type.": "Beim Aktualisieren dieses Dienstplantyps ist ein Fehler aufgetreten.",
	"An error occurred when adding this roster type. The code might already exist.": "Beim Hinzufügen dieses Dienstplantyps ist ein Fehler aufgetreten. Das Kürzel existiert möglicherweise bereits.",
	"An error occurred when deleting this roster type. It may be in use by existing rosters.": "Beim Löschen dieses Dienstplantyps ist ein Fehler aufgetreten. Er wird möglicherweise von bestehenden Dienstplänen verwendet.",
	"Roster type updated successfully.": "Dienstplantyp erfolgreich aktualisiert.",
	"Roster type added successfully.": "Dienstplantyp erfolgreich hinzugefügt.",
	"Roster type deleted successfully.": "Dienstplantyp erfolgreich gelöscht.",
	"Cannot delete this roster type because it is in use by N roster(s).": "Dieser Dienstplantyp kann nicht gelöscht werden, da er von N Dienstplan/Dienstplänen verwendet wird.",
	"Uppercase letters, numbers, and underscores only": "Nur Großbuchstaben, Zahlen und Unterstriche",
	"Short identifier (e.g., CIRC, REF). Uppercase letters, numbers, underscores only.": "Kurze Kennung (z. B. CIRC, REF). Nur Großbuchstaben, Zahlen, Unterstriche.",
	"Color used to display this roster type in the calendar": "Farbe zur Anzeige dieses Dienstplantyps im Kalender",
	"Inactive types cannot be used for new rosters": "Inaktive Typen können nicht für neue Dienstpläne verwendet werden",
	"Save roster type": "Dienstplantyp speichern",
	"Delete roster type 'NAME'?": "Dienstplantyp 'NAME' löschen?",
	"Yes, delete this roster type": "Ja, diesen Dienstplantyp löschen",
	"No, do not delete": "Nein, nicht löschen",
	"Back to Roster": "Zurück zum Dienstplan",
	"Roster types define the categories of duties staff can be assigned to (e.g., Circulation Desk, Reference Desk).": "Dienstplantypen definieren die Aufgabenkategorien, denen Personal zugewiesen werden kann (z. B. Ausleihtheke, Auskunft).",
	"No roster types defined.": "Keine Dienstplantypen definiert.",
	"Create a new roster type": "Einen neuen Dienstplantyp erstellen",
	Report: "Bericht",
	"Reports are not yet implemented.": "Berichte sind noch nicht implementiert.",
	"Filter rosters": "Dienstpläne filtern",
	"All types": "Alle Typen",
	"Apply filters": "Filter anwenden",
	Clear: "Zurücksetzen",
	"Filters active.": "Filter aktiv.",
	"Roster created successfully.": "Dienstplan erfolgreich erstellt.",
	"Roster updated successfully.": "Dienstplan erfolgreich aktualisiert.",
	"Roster deleted successfully.": "Dienstplan erfolgreich gelöscht.",
	"An error occurred when creating the roster.": "Beim Erstellen des Dienstplans ist ein Fehler aufgetreten.",
	"An error occurred when updating the roster.": "Beim Aktualisieren des Dienstplans ist ein Fehler aufgetreten.",
	"An error occurred when deleting the roster.": "Beim Löschen des Dienstplans ist ein Fehler aufgetreten.",
	"Time slot saved successfully.": "Zeitfenster erfolgreich gespeichert.",
	"Time slot deleted successfully.": "Zeitfenster erfolgreich gelöscht.",
	"Pick at least one day of the week for the slot.": "Wählen Sie mindestens einen Wochentag für das Zeitfenster aus.",
	"Exception saved.": "Ausnahme gespeichert.",
	"Exception deleted.": "Ausnahme gelöscht.",
	"Provide a valid date in YYYY-MM-DD format.": "Geben Sie ein gültiges Datum im Format JJJJ-MM-TT an.",
	"Pick one of the supported exception types.": "Wählen Sie einen der unterstützten Ausnahmetypen aus.",
	"Swap request sent.": "Tauschanfrage gesendet.",
	"Swap approved; the assignment has been reassigned.": "Tausch genehmigt; die Zuweisung wurde umverteilt.",
	"Swap rejected.": "Tausch abgelehnt.",
	"Swap cancelled.": "Tausch abgebrochen.",
	"Pick a shift and a target staff member.": "Wählen Sie eine Schicht und einen Ziel-Mitarbeiter aus.",
	"That shift doesn't belong to this roster.": "Diese Schicht gehört nicht zu diesem Dienstplan.",
	"Pick approve or reject.": "Wählen Sie genehmigen oder ablehnen.",
	"That swap is no longer pending.": "Dieser Tausch ist nicht mehr ausstehend.",
	"The swap could not be completed (database error). Try again or check the server logs.": "Der Tausch konnte nicht abgeschlossen werden (Datenbankfehler). Versuchen Sie es erneut oder prüfen Sie die Server-Logs.",
	"Manager approval is required for this swap.": "Für diesen Tausch ist eine Manager-Genehmigung erforderlich.",
	"You don't have permission to act on this swap.": "Sie sind nicht berechtigt, auf diesen Tausch zu reagieren.",
	"Location \"VAL\" is not in authorised value category \"CAT\". Pick a value from the list.": "Standort \"VAL\" ist nicht in der normierten Wertekategorie \"CAT\". Wählen Sie einen Wert aus der Liste.",
	"You are not authorized to view that roster.": "Sie sind nicht berechtigt, diesen Dienstplan anzusehen.",
	"Assignment not found": "Zuweisung nicht gefunden",
	"Authentication required": "Anmeldung erforderlich",
	"Date is closed per Koha calendar": "Datum laut Koha-Kalender geschlossen",
	"Date is closed": "Datum geschlossen",
	"date is required": "Datum ist erforderlich",
	"ids must be a non-empty array": "ids muss ein nicht-leeres Array sein",
	"Not authorized for this roster": "Keine Berechtigung für diesen Dienstplan",
	"Not your assignment": "Nicht Ihre Zuweisung",
	"Roster not found": "Dienstplan nicht gefunden",
	"Self-service is disabled": "Selbstbedienung ist deaktiviert",
	"Slot or roster not found": "Zeitfenster oder Dienstplan nicht gefunden",
	"slot_id and assignment_date required": "slot_id und assignment_date erforderlich",
	"slot_id, patron_id, assignment_date required": "slot_id, patron_id, assignment_date erforderlich",
	"staffroster_assign permission required": "Berechtigung staffroster_assign erforderlich",
	"staffroster_self_assign permission required": "Berechtigung staffroster_self_assign erforderlich",
	"staffroster_view permission required": "Berechtigung staffroster_view erforderlich",
	"target must include slot_id, patron_id, or assignment_date": "Ziel muss slot_id, patron_id oder assignment_date enthalten",
	"target required for move": "Ziel für Verschieben erforderlich",
	"Staff already assigned to overlapping slot that day": "Personal bereits einer überlappenden Schicht an diesem Tag zugewiesen",
	"Staff rosters": "Dienstpläne",
	"No rosters found.": "Keine Dienstpläne gefunden.",
	"Create your first roster": "Erstellen Sie Ihren ersten Dienstplan",
	"-- Select type --": "-- Typ wählen --",
	"Choose all branches, a single branch, or a library group.": "Wählen Sie alle Bibliotheken, eine einzelne Bibliothek oder eine Bibliotheksgruppe.",
	"Additional fields": "Zusätzliche Felder",
	"No custom fields defined for rosters.": "Keine benutzerdefinierten Felder für Dienstpläne definiert.",
	"Configure them in Koha admin": "In der Koha-Administration konfigurieren",
	"Save roster": "Dienstplan speichern",
	"Delete roster 'NAME'?": "Dienstplan 'NAME' löschen?",
	"This will also delete all associated time slots and assignments.": "Damit werden auch alle zugehörigen Zeitfenster und Zuweisungen gelöscht.",
	"Time slots:": "Zeitfenster:",
	"Yes, delete this roster": "Ja, diesen Dienstplan löschen",
	"Add time slot": "Zeitfenster hinzufügen",
	"Back to rosters": "Zurück zu den Dienstplänen",
	"Manage Time Slots": "Zeitfenster verwalten",
	"Add Time Slot": "Zeitfenster hinzufügen",
	"Edit Time Slot": "Zeitfenster bearbeiten",
	"Frequency:": "Häufigkeit:",
	Weekly: "Wöchentlich",
	Monthly: "Monatlich",
	"Weekly = each picked weekday. Monthly = nth weekday of month.": "Wöchentlich = jeder gewählte Wochentag. Monatlich = n-ter Wochentag des Monats.",
	"Repeat every:": "Wiederholen alle:",
	"week(s)": "Woche(n)",
	"month(s)": "Monat(e)",
	"Which occurrence:": "Welches Vorkommen:",
	"1st": "1.",
	"2nd": "2.",
	"3rd": "3.",
	"4th": "4.",
	Last: "Letzte",
	"Applies to all picked weekdays (e.g. 1st Mon + 1st Wed).": "Gilt für alle gewählten Wochentage (z. B. 1. Mo + 1. Mi).",
	"Days of week:": "Wochentage:",
	"Days of week": "Wochentage",
	Mon: "Mo",
	Tue: "Di",
	Wed: "Mi",
	Thu: "Do",
	Fri: "Fr",
	Sat: "Sa",
	Sun: "So",
	Monday: "Montag",
	Tuesday: "Dienstag",
	Wednesday: "Mittwoch",
	Thursday: "Donnerstag",
	Friday: "Freitag",
	Saturday: "Samstag",
	Sunday: "Sonntag",
	"Pick one or more days. Combined with frequency above.": "Wählen Sie einen oder mehrere Tage. In Kombination mit der Häufigkeit oben.",
	"Until (optional):": "Bis (optional):",
	"No more occurrences after this date.": "Keine weiteren Vorkommen nach diesem Datum.",
	"Start time:": "Anfangszeit:",
	"End time:": "Endzeit:",
	"Minimum staff:": "Minimales Personal:",
	"Maximum staff:": "Maximales Personal:",
	"Location:": "Standort:",
	Location: "Standort",
	"-- None --": "-- Keine --",
	"Pick from the configured authorised value category. Submitting other values is rejected.": "Wählen Sie aus der konfigurierten normierten Wertekategorie. Andere Werte werden abgelehnt.",
	"Suggestions are this branch's Koha desks; you can also type a custom value.": "Die Vorschläge sind die Koha-Desks dieser Bibliothek; Sie können auch einen benutzerdefinierten Wert eingeben.",
	"Specific desk or area within the branch.": "Spezifischer Desk oder Bereich innerhalb der Bibliothek.",
	"Notes:": "Notizen:",
	Notes: "Notizen",
	"Save slot": "Zeitfenster speichern",
	"No time slots defined yet. Use Add time slot to create one.": "Noch keine Zeitfenster definiert. Verwenden Sie 'Zeitfenster hinzufügen', um eines zu erstellen.",
	"Delete time slot?": "Zeitfenster löschen?",
	"Are you sure you want to delete the slot": "Möchten Sie das Zeitfenster wirklich löschen?",
	"Existing assignments on this slot will be removed too.": "Bestehende Zuweisungen für dieses Zeitfenster werden ebenfalls entfernt.",
	"Delete slot": "Zeitfenster löschen",
	"Add exception": "Ausnahme hinzufügen",
	"One-off date overrides for this roster (closures, holidays, special events). Koha calendar closures merge in automatically when \"Use Koha calendar\" is on; rows here are non-calendar additions.": "Einmalige Datumsüberschreibungen für diesen Dienstplan (Schließungen, Feiertage, Sonderveranstaltungen). Koha-Kalenderschließungen werden automatisch übernommen, wenn \"Koha-Kalender verwenden\" aktiv ist; Einträge hier sind ergänzende Nicht-Kalender-Daten.",
	"Date:": "Datum:",
	Date: "Datum",
	"Reason:": "Grund:",
	Reason: "Grund",
	"Optional note shown alongside the exception in the schedule.": "Optionale Notiz, die neben der Ausnahme im Plan angezeigt wird.",
	"Save exception": "Ausnahme speichern",
	Closed: "Geschlossen",
	Holiday: "Feiertag",
	"Special event": "Sonderveranstaltung",
	"Reduced hours": "Reduzierte Öffnungszeiten",
	"Edit exception": "Ausnahme bearbeiten",
	"Delete exception for DATE?": "Ausnahme für DATE löschen?",
	"No exceptions defined. Use Add exception to create one.": "Keine Ausnahmen definiert. Verwenden Sie 'Ausnahme hinzufügen', um eine zu erstellen.",
	"Request swap": "Tausch anfragen",
	"Request a shift swap, then the targeted staff member (and a manager, when manager approval is enabled) can approve or reject it. On approval the assignment is reassigned automatically; if a return assignment was named, both shifts swap borrowers in one transaction.": "Fragen Sie einen Schichttausch an, dann kann das angefragte Personal (und ein Manager, wenn die Manager-Genehmigung aktiviert ist) ihn genehmigen oder ablehnen. Bei Genehmigung wird die Zuweisung automatisch übertragen; wenn eine Rück-Zuweisung benannt wurde, tauschen beide Schichten in einer Transaktion ihre Personen.",
	"Request shift swap": "Schichttausch anfragen",
	"Give up shift:": "Schicht abgeben:",
	"-- Pick an upcoming assignment --": "-- Eine bevorstehende Zuweisung wählen --",
	"You have no upcoming shifts on this roster to swap.": "Sie haben keine bevorstehenden Schichten in diesem Dienstplan zum Tauschen.",
	"Hand off to:": "Übergeben an:",
	"-- Pick a staff member --": "-- Eine Personalkraft wählen --",
	"In exchange for (optional):": "Im Austausch für (optional):",
	"-- No return shift, one-way handoff --": "-- Keine Gegenschicht, einseitige Übergabe --",
	"Filtered to the staffer selected above. Empty = one-way reassignment.": "Gefiltert nach der oben gewählten Personalkraft. Leer = einseitige Umverteilung.",
	"Message:": "Nachricht:",
	Message: "Nachricht",
	"Send request": "Anfrage senden",
	Shift: "Schicht",
	Requester: "Anfragender",
	Requested: "Angefragt",
	Pending: "Ausstehend",
	Approved: "Genehmigt",
	Rejected: "Abgelehnt",
	Cancelled: "Abgebrochen",
	Approve: "Genehmigen",
	Reject: "Ablehnen",
	"Cancel this swap request?": "Diese Tauschanfrage abbrechen?",
	"No swap requests on this roster yet.": "Noch keine Tauschanfragen für diesen Dienstplan.",
	"Self-service is disabled in plugin configuration. Ask an administrator to enable Staff can self-assign to open slots on the Configuration page.": "Selbstbedienung ist in der Plugin-Konfiguration deaktiviert. Bitten Sie einen Administrator, 'Personal kann sich selbst offenen Zeitfenstern zuweisen' auf der Konfigurationsseite zu aktivieren.",
	"You do not have the staffroster_self_assign permission. Ask a manager to grant it on your patron record.": "Sie haben nicht die Berechtigung staffroster_self_assign. Bitten Sie einen Manager, sie in Ihrem Benutzerdatensatz zu vergeben.",
	"Slots with capacity remaining that you are eligible to claim.": "Zeitfenster mit verbleibender Kapazität, für die Sie sich anmelden können.",
	"Your scheduled shifts across all rosters you can see.": "Ihre geplanten Schichten in allen Dienstplänen, die Sie sehen können.",
	"Cancelled.": "Abgebrochen.",
	"category type S (any patron flagged staff)": "Kategorietyp S (alle als Personal markierten Benutzer)",
	"library group": "Bibliotheksgruppe",
	"(unnamed)": "(unbenannt)",
	branch: "Bibliothek",
	"all branches": "alle Bibliotheken",
	"Free at": "Frei um",
	on: "am",
	"Free on": "Frei am",
	of: "von",
	eligible: "berechtigt",
	"capped at": "begrenzt auf",
	"Showing all category-type-S patrons (incl. service accounts). Set staff_categorycodes in plugin configuration to narrow.": "Es werden alle category_type=S-Benutzer angezeigt (inkl. Service-Konten). Setzen Sie staff_categorycodes in der Plugin-Konfiguration, um einzugrenzen.",
	configuration: "Konfiguration",
	Removed: "Entfernt",
	from: "aus",
	"Picked up": "Aufgenommen",
	"Use arrow keys to choose a target cell. Press Enter to drop, Esc to cancel.": "Verwenden Sie die Pfeiltasten, um eine Zielzelle zu wählen. Drücken Sie Eingabe zum Ablegen, Esc zum Abbrechen.",
	"Use arrow keys to move. Press Enter to drop, Esc to cancel.": "Verwenden Sie die Pfeiltasten zum Bewegen. Drücken Sie Eingabe zum Ablegen, Esc zum Abbrechen.",
	"Cannot drop here.": "Hier kann nicht abgelegt werden.",
	Moved: "Verschoben",
	to: "nach",
	"slot.": "Zeitfenster.",
	slot: "Zeitfenster",
	"slot, closed.": "Zeitfenster, geschlossen.",
	"staff assigned": "Personal zugewiesen",
	"Press Enter to pick up.": "Drücken Sie Eingabe zum Aufnehmen.",
	"Press Enter to move, Delete to remove. Click to edit.": "Eingabe zum Verschieben drücken, Entfernen zum Löschen. Klicken zum Bearbeiten.",
	"Click to edit.": "Zum Bearbeiten klicken.",
	Undo: "Rückgängig",
	"Available staff": "Verfügbares Personal",
	"Search staff…": "Personal suchen…",
	"No matches": "Keine Treffer",
	"Staff roster schedule": "Dienstplan-Übersicht",
	"No time slots defined for this roster yet.": "Für diesen Dienstplan sind noch keine Zeitfenster definiert.",
	closed: "geschlossen",
	"Edit assignment": "Zuweisung bearbeiten",
	"Optional notes shown on the chip and in handoffs": "Optionale Notizen, die am Chip und bei Übergaben angezeigt werden",
	Remove: "Entfernen",
	"comma-separated values": "kommagetrennte Werte",
	"Remove assignment?": "Zuweisung entfernen?",
	"from this slot on": "aus diesem Zeitfenster am",
	"You can undo with Cmd-Z (or the Undo button) if this was a mistake.": "Sie können mit Cmd-Z (oder dem Rückgängig-Knopf) widerrufen, falls dies ein Fehler war.",
	Scheduled: "Geplant",
	Confirmed: "Bestätigt",
	Completed: "Abgeschlossen",
	"No-show": "Nicht erschienen",
	"Shift dropped.": "Schicht aufgegeben.",
	"No shifts scheduled this week.": "Keine Schichten in dieser Woche geplant.",
	"Roster #": "Dienstplan Nr. ",
	"Request swap on this roster": "Tausch in diesem Dienstplan anfragen",
	Swap: "Tausch",
	"Drop this shift": "Diese Schicht aufgeben",
	"Drop this shift?": "Diese Schicht aufgeben?",
	"Dropping…": "Wird aufgegeben…",
	Drop: "Aufgeben",
	"Drop your shift on": "Schicht aufgeben am",
	"The slot will be re-opened for someone else to claim. If you need a one-for-one trade instead, use Swap.": "Das Zeitfenster wird für eine andere Person zur Übernahme wieder freigegeben. Für einen Eins-zu-Eins-Tausch verwenden Sie 'Tausch'.",
	"Drop shift": "Schicht aufgeben",
	Claimed: "Übernommen",
	"No open shifts available this week.": "Keine offenen Schichten in dieser Woche verfügbar.",
	"Claim this shift?": "Diese Schicht übernehmen?",
	Claim: "Übernehmen",
	"You'll be added to the roster immediately. Drop the shift later from My shifts if plans change.": "Sie werden sofort zum Dienstplan hinzugefügt. Geben Sie die Schicht später unter 'Meine Schichten' auf, wenn sich Ihre Pläne ändern.",
	"Claim shift": "Schicht übernehmen",
	open: "offen",
	"Claiming…": "Wird übernommen…"
} };
function Et() {
	return (typeof document < "u" && document.documentElement.lang || "en").toLowerCase().split(/[-_]/)[0] ?? "en";
}
var Dt = Tt[Et()] ?? {};
function G(e) {
	return Dt[e] ?? e;
}
//#endregion
//#region src/api.ts
var K = "/api/v1/contrib/staffroster", q = new wt(K, {
	get: {
		rosterWeek: {
			url: `${K}/rosters`,
			ignoreCache: !0
		},
		availableStaff: {
			url: `${K}/staff/available`,
			ignoreCache: !0
		},
		myWeek: {
			url: `${K}/me/week`,
			ignoreCache: !0
		},
		myOpenSlots: {
			url: `${K}/me/open_slots`,
			ignoreCache: !0
		}
	},
	post: {
		assignments: {
			url: `${K}/assignments`,
			ignoreCache: !0
		},
		selfClaim: {
			url: `${K}/me/claim`,
			ignoreCache: !0
		}
	},
	put: { assignments: {
		url: `${K}/assignments`,
		ignoreCache: !0
	} },
	delete: {
		assignments: {
			url: `${K}/assignments`,
			ignoreCache: !0
		},
		selfClaim: {
			url: `${K}/me/claim`,
			ignoreCache: !0
		}
	}
});
async function J(e) {
	if (!e.ok) {
		let t = (await e.json().catch(() => ({}))).error ?? `HTTP ${e.status}`, n = Error(G(t));
		throw n.status = e.status, n;
	}
	if (e.status !== 204) return await e.json();
}
async function Ot(e, t) {
	return J(await q.get({
		endpoint: "rosterWeek",
		path: [String(e), "week"],
		query: { start: t }
	}));
}
async function kt(e) {
	return J(await q.post({
		endpoint: "assignments",
		requestInit: {
			method: "post",
			body: JSON.stringify(e)
		}
	}));
}
async function At(e, t) {
	return J(await q.put({
		endpoint: "assignments",
		path: [String(e)],
		requestInit: {
			method: "put",
			body: JSON.stringify(t)
		}
	}));
}
async function jt(e) {
	await J(await q.delete({
		endpoint: "assignments",
		path: [String(e)]
	}));
}
async function Mt(e) {
	return J(await q.get({
		endpoint: "myWeek",
		query: { start: e }
	}));
}
async function Nt(e) {
	return J(await q.get({
		endpoint: "myOpenSlots",
		query: { start: e }
	}));
}
async function Pt(e) {
	return J(await q.post({
		endpoint: "selfClaim",
		requestInit: {
			method: "post",
			body: JSON.stringify(e)
		}
	}));
}
async function Ft(e) {
	await J(await q.delete({
		endpoint: "selfClaim",
		path: [String(e)]
	}));
}
async function It(e) {
	let t = { date: e.date };
	return e.slot_id && (t.slot_id = String(e.slot_id)), e.branch && (t.branch = e.branch), e.q && (t.q = e.q), J(await q.get({
		endpoint: "availableStaff",
		query: t
	}));
}
//#endregion
//#region src/util.ts
function Lt(e) {
	let t = (e.getDay() + 6) % 7, n = new Date(e);
	return n.setDate(e.getDate() - t), n.toISOString().slice(0, 10);
}
function Rt() {
	return new URLSearchParams(window.location.search).get("class") ?? "";
}
function zt(e, t) {
	let n = new Date(e);
	return n.setDate(n.getDate() + t), n.toISOString().slice(0, 10);
}
function Bt() {
	return typeof document < "u" && document.documentElement.lang || "en";
}
function Vt(e) {
	let t = /* @__PURE__ */ new Date(e + "T00:00:00");
	return new Intl.DateTimeFormat(Bt(), {
		weekday: "long",
		month: "short",
		day: "numeric"
	}).format(t);
}
//#endregion
//#region src/components/shared/toolbar.ts
function Ht(e) {
	let { weekStart: t, onShift: n, onRefresh: r, extras: i } = e;
	return x`
    <div class="btn-toolbar srg-toolbar" role="toolbar">
      <div class="btn-group" role="group">
        <button class="btn btn-default btn-sm" @click=${() => n(-7)}>
          <i class="fa fa-arrow-left" aria-hidden="true"></i> ${G("Previous")}
        </button>
        <button class="btn btn-default btn-sm" @click=${() => n(7)}>
          ${G("Next")} <i class="fa fa-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
      <span class="srg-week-label">${G("Week of")} ${t}</span>
      ${i ?? C}
      <div class="btn-group" role="group">
        <button class="btn btn-default btn-sm" @click=${() => r()}>
          <i class="fa fa-refresh" aria-hidden="true"></i> ${G("Refresh")}
        </button>
      </div>
    </div>
  `;
}
//#endregion
//#region src/components/shared/toasts.ts
function Ut(e) {
	let { successMsg: t, error: n, onDismissError: r } = e;
	return !t && !n ? C : x`
    ${t ? x`
          <div class="srg-toast alert alert-success" role="status" aria-live="polite">
            <i class="fa fa-check" aria-hidden="true"></i>
            <span>${t}</span>
          </div>
        ` : C}
    ${n ? x`
          <div class="srg-toast alert alert-danger" role="alert" aria-live="assertive">
            <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
            <span>${n}</span>
            ${r ? x`<button
                  type="button"
                  class="btn-close"
                  aria-label="${G("Dismiss")}"
                  @click=${r}
                ></button>` : C}
          </div>
        ` : C}
  `;
}
//#endregion
//#region src/components/shared/modal.ts
function Wt(e) {
	let { title: t, body: n, footer: r, onCancel: i, dialogClass: a } = e;
	return x`
    <div
      class="modal show staff-roster-modal-open"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      style="display: block;"
      @click=${(e) => {
		e.target.classList.contains("modal") && i();
	}}
    >
      <div class="modal-dialog ${a ?? ""}" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title">${t}</h1>
            <button
              type="button"
              class="btn-close"
              aria-label="${G("Close")}"
              @click=${i}
            ></button>
          </div>
          <div class="modal-body">${n}</div>
          <div class="modal-footer">${r}</div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show staff-roster-modal-backdrop"></div>
  `;
}
//#endregion
//#region src/components/shared/escape-controller.ts
var Y = class {
	constructor(e, t, n) {
		this.host = e, this.isActive = t, this.onEscape = n, this.onKey = (e) => {
			e.key === "Escape" && this.isActive() && (e.preventDefault(), e.stopPropagation(), this.onEscape());
		}, e.addController(this);
	}
	hostConnected() {
		document.addEventListener("keydown", this.onKey);
	}
	hostDisconnected() {
		document.removeEventListener("keydown", this.onKey);
	}
}, Gt = () => ({
	scheduled: G("Scheduled"),
	confirmed: G("Confirmed"),
	completed: G("Completed"),
	cancelled: G("Cancelled"),
	no_show: G("No-show")
});
//#endregion
//#region \0@oxc-project+runtime@0.127.0/helpers/decorate.js
function X(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/components/staff-roster-grid.ts
var Kt = 5e3, qt = 10, Jt = () => [
	G("Mon"),
	G("Tue"),
	G("Wed"),
	G("Thu"),
	G("Fri"),
	G("Sat"),
	G("Sun")
], Yt = () => [
	G("Monday"),
	G("Tuesday"),
	G("Wednesday"),
	G("Thursday"),
	G("Friday"),
	G("Saturday"),
	G("Sunday")
], Xt = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA",
	"SU"
], Z = class extends D {
	constructor() {
		super(), this.rosterId = 0, this.weekStart = "", this.week = null, this.available = [], this.availableMeta = null, this.availableContextDay = null, this.staffQuery = "", this.error = "", this.dragging = null, this.pickedUp = null, this.pendingDelete = null, this.editing = null, this.editForm = {
			status: "scheduled",
			notes: "",
			fields: {}
		}, this.editOriginEl = null, this.liveMessage = "", this.focusedCellKey = "", this.focusedPillIdx = 0, this.undoStack = [], this.fetchGeneration = 0, this.recentlyChanged = /* @__PURE__ */ new Set(), this.pickupOriginEl = null, this.deleteOriginEl = null, this.pendingFocusCellKey = null, this.pendingFocusPillIdx = null, this.pendingFocusModal = !1, this.onKeyDown = (e) => {
			(e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey && (e.preventDefault(), this.undo());
		}, new Y(this, () => this.editing !== null, () => this.cancelEdit()), new Y(this, () => this.pendingDelete !== null, () => this.cancelDelete()), new Y(this, () => this.pickedUp !== null, () => this.cancelPickup());
	}
	setError(e) {
		this.error = e, this.errorDismissTimer && clearTimeout(this.errorDismissTimer), e && (this.errorDismissTimer = setTimeout(() => this.error = "", 5e3));
	}
	createRenderRoot() {
		return this;
	}
	connectedCallback() {
		super.connectedCallback(), this.weekStart ||= Lt(/* @__PURE__ */ new Date()), this.refresh(), this.loadAvailable(), this.pollTimer = setInterval(() => void this.refresh(), Kt), document.addEventListener("keydown", this.onKeyDown);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.pollTimer && clearInterval(this.pollTimer), this.recentlyChangedTimer && clearTimeout(this.recentlyChangedTimer), document.removeEventListener("keydown", this.onKeyDown);
	}
	async refresh() {
		if (!this.rosterId) return;
		let e = ++this.fetchGeneration, t = () => {
			let e = this.querySelector(".srg-grid");
			e && e.offsetWidth;
		};
		try {
			let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set();
			for (let e of this.week?.assignments ?? []) n.set(this.assignmentKey(e), e.updated_at), r.add(e.id);
			let i = await Ot(this.rosterId, this.weekStart);
			if (this.dragging || e !== this.fetchGeneration) return;
			if (this.week = i, this.updateComplete.then(t), this.error = "", r.size > 0) {
				let e = /* @__PURE__ */ new Set();
				for (let t of i.assignments) {
					let r = n.get(this.assignmentKey(t));
					(!r || r !== t.updated_at) && e.add(t.id);
				}
				e.size > 0 && (this.recentlyChanged = e, this.recentlyChangedTimer && clearTimeout(this.recentlyChangedTimer), this.recentlyChangedTimer = setTimeout(() => {
					this.recentlyChanged = /* @__PURE__ */ new Set();
				}, 4e3));
			}
		} catch (e) {
			this.setError(e.message);
		}
	}
	assignmentKey(e) {
		return `${e.id}`;
	}
	renderAvailableFilterHeader() {
		let e = this.availableMeta;
		if (!e) return C;
		let t = e.filter, n = t.mode === "codes" ? t.codes.join(", ") : G("category type S (any patron flagged staff)"), r = t.branch_scope.mode === "group" ? `${G("library group")}: ${t.branch_scope.label ?? G("(unnamed)")}` : t.branch_scope.mode === "branch" ? `${G("branch")}: ${t.branch_scope.label}` : G("all branches"), i = this.availableContextDay === null ? null : Yt()[this.availableContextDay], a = t.slot, o = a ? `${G("Free at")} ${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)} ${G("on")} ${i ?? a.date}` : `${G("Free on")} ${t.date}`, s = e.count >= e.limit, c = t.mode === "category_type_s";
		return x`
      <div class="srg-avail-meta">
        <div class="srg-avail-context">${o}</div>
        <div class="srg-avail-filter" title="${n} · ${r}">
          <i class="fa fa-filter" aria-hidden="true"></i>
          <span>${n}</span>
          <span class="text-muted"> · ${r}</span>
        </div>
        <div class="srg-avail-counter">
          <strong>${e.count}</strong> ${G("of")} ${e.pool} ${G("eligible")}
          ${s ? x`<span class="text-muted"> · ${G("capped at")} ${e.limit}</span>` : C}
        </div>
        ${c ? x`
              <div class="srg-avail-warn text-muted">
                <i class="fa fa-info-circle" aria-hidden="true"></i>
                ${G("Showing all category-type-S patrons (incl. service accounts). Set staff_categorycodes in plugin configuration to narrow.")}
                <a href="?class=${Rt()}&method=configure">${G("configuration")}</a>
              </div>
            ` : C}
      </div>
    `;
	}
	async loadAvailable(e) {
		if (this.week) try {
			let t = await It({
				date: e?.date ?? this.weekStart,
				slot_id: e?.slotId,
				q: this.staffQuery || void 0
			});
			this.available = t.staff, this.availableMeta = {
				count: t.count,
				pool: t.pool,
				limit: t.limit,
				filter: t.filter
			}, this.availableContextDay = e?.dayIdx ?? null;
		} catch (e) {
			this.setError(e.message);
		}
	}
	shiftWeek(e) {
		let t = new Date(this.weekStart);
		t.setDate(t.getDate() + e), this.weekStart = t.toISOString().slice(0, 10), this.refresh(), this.loadAvailable();
	}
	cellDate(e) {
		let t = new Date(this.weekStart);
		return t.setDate(t.getDate() + e), t.toISOString().slice(0, 10);
	}
	assignmentsFor(e, t) {
		return (this.week?.assignments ?? []).filter((n) => n.slot_id === e && n.assignment_date === t);
	}
	exceptionFor(e) {
		return (this.week?.exceptions ?? []).some((t) => t.exception_date === e);
	}
	async pushUndo(e) {
		this.undoStack.push(e), this.undoStack.length > qt && this.undoStack.shift();
	}
	async undo() {
		let e = this.undoStack.pop();
		if (e) try {
			e.kind === "create" ? await jt(e.id) : e.kind === "delete" ? await kt(e.payload) : await At(e.id, e.before), await this.refresh();
		} catch (e) {
			this.setError(`Undo failed: ${e.message}`);
		}
	}
	async dropOnCell(e, t) {
		if (!this.dragging) return;
		let n = this.dragging;
		if (n.kind === "staff") {
			let r = n.staff;
			try {
				let n = await kt({
					slot_id: e.id,
					patron_id: r.patron_id,
					assignment_date: t
				});
				await this.pushUndo({
					kind: "create",
					id: n.id
				}), this.dragging = null, this.week &&= {
					...this.week,
					assignments: [...this.week.assignments, n]
				}, await this.refresh();
			} catch (e) {
				this.dragging = null, this.setError(e.message);
			}
		} else {
			let r = n.assignment;
			if (r.slot_id === e.id && r.assignment_date === t) {
				this.dragging = null;
				return;
			}
			try {
				await At(r.id, {
					slot_id: e.id,
					assignment_date: t
				}), await this.pushUndo({
					kind: "update",
					id: r.id,
					before: {
						slot_id: r.slot_id,
						patron_id: r.patron_id,
						assignment_date: r.assignment_date
					}
				}), this.dragging = null, await this.refresh();
			} catch (e) {
				this.dragging = null, this.setError(e.message);
			}
		}
	}
	requestDelete(e) {
		this.pendingDelete = e, this.pendingFocusModal = !0;
	}
	requestEdit(e, t = null) {
		this.editing = e, this.editOriginEl = t, this.editForm = {
			status: e.status,
			notes: e.notes ?? "",
			fields: { ...e.additional_fields }
		}, this.pendingFocusModal = !0;
	}
	cancelEdit() {
		this.editing = null;
		let e = this.editOriginEl;
		this.editOriginEl = null, e && requestAnimationFrame(() => e.focus());
	}
	async saveEdit() {
		let e = this.editing;
		if (!e) return;
		let t = {
			status: this.editForm.status,
			notes: this.editForm.notes === "" ? null : this.editForm.notes
		};
		(this.week?.assignment_fields ?? []).length && (t.additional_fields = this.editForm.fields);
		let n = this.dayIdxForDate(e.assignment_date), r = `${e.slot_id}-${n}`;
		try {
			await At(e.id, t), this.liveMessage = `Updated assignment for ${e.firstname} ${e.surname}.`, this.editing = null, this.editOriginEl = null, await this.refresh(), this.focusedCellKey = r, this.pendingFocusCellKey = r;
		} catch (e) {
			this.setError(e.message);
		}
	}
	deleteFromEdit() {
		let e = this.editing;
		if (!e) return;
		this.editing = null;
		let t = this.editOriginEl;
		this.editOriginEl = null, this.deleteOriginEl = t, this.requestDelete(e);
	}
	cancelDelete() {
		this.pendingDelete = null;
		let e = this.deleteOriginEl;
		this.deleteOriginEl = null, e && requestAnimationFrame(() => e.focus());
	}
	async confirmDelete() {
		let e = this.pendingDelete;
		if (!e) return;
		this.pendingDelete = null;
		let t = this.dayIdxForDate(e.assignment_date), n = `${e.slot_id}-${t}`;
		try {
			await jt(e.id), await this.pushUndo({
				kind: "delete",
				payload: {
					slot_id: e.slot_id,
					patron_id: e.patron_id,
					assignment_date: e.assignment_date,
					status: e.status,
					notes: e.notes ?? void 0
				}
			}), this.liveMessage = `${G("Removed")} ${e.firstname} ${e.surname} ${G("from")} ${Yt()[t]} ${e.assignment_date}.`, await this.refresh();
		} catch (e) {
			this.setError(e.message);
		}
		this.deleteOriginEl = null, this.focusedCellKey = n, this.pendingFocusCellKey = n;
	}
	onStaffSearch(e) {
		this.staffQuery = e.target.value, this.staffDebounce && clearTimeout(this.staffDebounce), this.staffDebounce = setTimeout(() => void this.loadAvailable(), 300);
	}
	sortedSlots() {
		return [...this.week?.slots ?? []].sort((e, t) => e.start_time.localeCompare(t.start_time) || e.id - t.id);
	}
	cellApplies(e, t) {
		return e.applies_on_dates ? e.applies_on_dates.includes(this.cellDate(t)) : e.days_of_week.includes(Xt[t]);
	}
	firstApplicableCellKey() {
		let e = this.sortedSlots();
		for (let t = 0; t < e.length; t++) for (let n = 0; n < 7; n++) if (this.cellApplies(e[t], n)) return `${e[t].id}-${n}`;
		return "";
	}
	cargoName(e) {
		return e.kind === "staff" ? `${e.staff.firstname} ${e.staff.surname}` : `${e.assignment.firstname} ${e.assignment.surname}`;
	}
	cellAriaLabel(e, t, n, r, i) {
		let a = Yt()[n], o = `${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}`;
		if (r) return `${a} ${t}, ${o} ${G("slot, closed.")}`;
		let s = i.length, c = `${a} ${t}, ${o} ${G("slot")}, ${s} ${G("of")} ${e.max_staff} ${G("staff assigned")}`;
		return s === 0 ? `${c}.` : `${c}: ${i.map((e) => `${e.firstname} ${e.surname}`).join(", ")}.`;
	}
	pickUpStaff(e, t) {
		this.pickedUp = {
			kind: "staff",
			staff: e
		}, this.pickupOriginEl = t, this.liveMessage = `${G("Picked up")} ${e.firstname} ${e.surname}. ${G("Use arrow keys to choose a target cell. Press Enter to drop, Esc to cancel.")}`;
		let n = this.firstApplicableCellKey();
		n && (this.focusedCellKey = n, this.pendingFocusCellKey = n);
	}
	pickUpAssignment(e, t) {
		this.pickedUp = {
			kind: "assignment",
			assignment: e
		}, this.pickupOriginEl = t, this.liveMessage = `${G("Picked up")} ${e.firstname} ${e.surname}. ${G("Use arrow keys to move. Press Enter to drop, Esc to cancel.")}`;
		let n = this.firstApplicableCellKey();
		n && (this.focusedCellKey = n, this.pendingFocusCellKey = n);
	}
	cancelPickup() {
		this.pickedUp = null, this.liveMessage = G("Cancelled.");
		let e = this.pickupOriginEl;
		this.pickupOriginEl = null, e && requestAnimationFrame(() => e.focus());
	}
	async dropFromKeyboard(e, t) {
		if (!this.pickedUp) return;
		let n = this.pickedUp, r = this.cargoName(n), i = e.start_time.slice(0, 5);
		this.dragging = n, this.pickedUp = null, this.pickupOriginEl = null;
		let a = this.error;
		await this.dropOnCell(e, t), this.error && this.error !== a ? this.liveMessage = `${G("Cannot drop here.")} ${this.error}` : this.liveMessage = `${G("Moved")} ${r} ${G("to")} ${Yt()[this.dayIdxForDate(t)]} ${t}, ${i} ${G("slot.")}`;
		let o = `${e.id}-${this.dayIdxForDate(t)}`;
		this.focusedCellKey = o, this.pendingFocusCellKey = o;
	}
	dayIdxForDate(e) {
		let t = new Date(this.weekStart), n = new Date(e).getTime() - t.getTime();
		return Math.round(n / (1e3 * 60 * 60 * 24));
	}
	moveCellFocus(e, t, n) {
		let r = this.sortedSlots(), i = (e, i) => {
			let a = t + e, o = n + i;
			for (; a >= 0 && a < r.length && o >= 0 && o < 7;) {
				if (this.cellApplies(r[a], o)) return [a, o];
				a += e, o += i;
			}
			return null;
		}, a = null;
		switch (e) {
			case "ArrowUp":
				a = i(-1, 0);
				break;
			case "ArrowDown":
				a = i(1, 0);
				break;
			case "ArrowLeft":
				a = i(0, -1);
				break;
			case "ArrowRight":
				a = i(0, 1);
				break;
			case "Home":
				for (let e = 0; e < 7; e++) if (this.cellApplies(r[t], e)) {
					a = [t, e];
					break;
				}
				break;
			case "End":
				for (let e = 6; e >= 0; e--) if (this.cellApplies(r[t], e)) {
					a = [t, e];
					break;
				}
				break;
			case "PageUp":
				this.shiftWeek(-7), this.pendingFocusCellKey = this.focusedCellKey;
				return;
			case "PageDown":
				this.shiftWeek(7), this.pendingFocusCellKey = this.focusedCellKey;
				return;
		}
		if (a) {
			let [e, t] = a, n = `${r[e].id}-${t}`;
			this.focusedCellKey = n, this.pendingFocusCellKey = n;
		}
	}
	onCellKeyDown(e, t, n, r, i) {
		if (e.target === e.currentTarget) {
			if ([
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Home",
				"End",
				"PageUp",
				"PageDown"
			].includes(e.key)) {
				e.preventDefault(), this.moveCellFocus(e.key, r, i);
				return;
			}
			if ((e.key === "Enter" || e.key === " ") && this.pickedUp) {
				e.preventDefault(), this.dropFromKeyboard(t, n);
				return;
			}
			if ((e.key === "Delete" || e.key === "Backspace") && !this.pickedUp) {
				let r = this.assignmentsFor(t.id, n);
				r.length > 0 && (e.preventDefault(), this.deleteOriginEl = e.currentTarget, this.requestDelete(r[0]));
			}
		}
	}
	onPillKeyDown(e, t, n) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault(), e.stopPropagation(), this.pickUpStaff(t, e.currentTarget);
			return;
		}
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault(), e.stopPropagation();
			let t = e.key === "ArrowDown" ? Math.min(this.available.length - 1, n + 1) : Math.max(0, n - 1);
			this.focusedPillIdx = t, this.pendingFocusPillIdx = t;
		}
	}
	onAssignmentKeyDown(e, t) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault(), e.stopPropagation(), this.pickUpAssignment(t, e.currentTarget);
			return;
		}
		(e.key === "Delete" || e.key === "Backspace") && (e.preventDefault(), e.stopPropagation(), this.deleteOriginEl = e.currentTarget, this.requestDelete(t));
	}
	updated(e) {
		if (this.week && !this.focusedCellKey && (this.focusedCellKey = this.firstApplicableCellKey()), this.pendingFocusCellKey) {
			let e = `[data-cell-key="${this.pendingFocusCellKey}"]`, t = this.querySelector(e);
			t && t.focus(), this.pendingFocusCellKey = null;
		}
		if (this.pendingFocusPillIdx !== null) {
			let e = this.pendingFocusPillIdx, t = this.querySelector(`[data-pill-idx="${e}"]`);
			t && t.focus(), this.pendingFocusPillIdx = null;
		}
		if (this.pendingFocusModal) {
			let e = this.editing ? "#srg-edit-status" : ".staff-roster-modal-open .modal-footer .btn-default", t = this.querySelector(e);
			t && t.focus(), this.pendingFocusModal = !1;
		}
	}
	render() {
		if (!this.week) return x`<div class="text-center text-muted py-4">${G("Loading…")}</div>`;
		let e = this.week.roster.type_color, t = this.sortedSlots(), n = this.pickedUp !== null, r = Jt(), i = Gt();
		return x`
      <div class="srg-sr-only" aria-live="polite" aria-atomic="true">${this.liveMessage}</div>

      ${Ut({
			error: this.error,
			onDismissError: () => this.error = ""
		})}

      ${Ht({
			weekStart: this.weekStart,
			onShift: (e) => this.shiftWeek(e),
			onRefresh: () => void this.refresh(),
			extras: x`
          <div class="btn-group" role="group">
            <button
              class="btn btn-default btn-sm"
              @click=${() => void this.undo()}
              ?disabled=${this.undoStack.length === 0}
            >
              <i class="fa fa-undo" aria-hidden="true"></i> ${G("Undo")} (${this.undoStack.length})
            </button>
          </div>
        `
		})}

      <div class="srg-layout" style=${`--srg-type-color: ${e}`}>
        <section class="page-section srg-staff-panel">
          <h3 class="srg-panel-title" id="srg-staff-list-label">${G("Available staff")}</h3>
          ${this.renderAvailableFilterHeader()}
          <input
            type="search"
            class="form-control input-sm"
            placeholder="${G("Search staff…")}"
            .value=${this.staffQuery}
            @input=${this.onStaffSearch}
            @focus=${() => void this.loadAvailable()}
          />
          <ul
            class="list-group srg-staff-list"
            role="listbox"
            aria-labelledby="srg-staff-list-label"
          >
            ${Qe(this.available, (e) => e.patron_id, (e, t) => {
			let n = this.pickedUp?.kind === "staff" && this.pickedUp.staff.patron_id === e.patron_id;
			return x`
                  <li
                    class="list-group-item srg-staff-pill ${n ? "srg-picked-up" : ""}"
                    role="option"
                    tabindex="0"
                    data-pill-idx=${t}
                    aria-selected=${n ? "true" : "false"}
                    aria-label="${e.surname}, ${e.firstname}. ${G("Press Enter to pick up.")}"
                    draggable="true"
                    @dragstart=${(t) => {
				this.dragging = {
					kind: "staff",
					staff: e
				}, t.dataTransfer?.setData("text/plain", String(e.patron_id));
			}}
                    @click=${(t) => {
				n ? this.cancelPickup() : this.pickUpStaff(e, t.currentTarget);
			}}
                    @keydown=${(n) => this.onPillKeyDown(n, e, t)}
                    @focus=${() => this.focusedPillIdx = t}
                  >
                    <i class="fa fa-user text-muted" aria-hidden="true"></i>
                    <span>${e.surname}, ${e.firstname}</span>
                    <i class="fa fa-grip-vertical text-muted srg-grip" aria-hidden="true"></i>
                  </li>
                `;
		})}
            ${this.available.length === 0 && this.staffQuery ? x`<li class="list-group-item text-muted">${G("No matches")}</li>` : C}
          </ul>
        </section>

        <section class="page-section srg-grid-wrap">
          <table
            class="table srg-grid ${n ? "srg-pickup-active" : ""}"
            role="grid"
            aria-label="${G("Staff roster schedule")}"
            aria-rowcount=${t.length + 1}
            aria-colcount="8"
          >
            <thead>
              <tr role="row" aria-rowindex="1">
                <th class="srg-slot-col" role="columnheader" aria-colindex="1">${G("Slot")}</th>
                ${r.map((e, t) => x`
                    <th role="columnheader" aria-colindex=${t + 2}>
                      <span class="srg-day">${e}</span>
                      <small class="text-muted">${this.cellDate(t).slice(5)}</small>
                    </th>
                  `)}
              </tr>
            </thead>
            <tbody>
              ${t.length === 0 ? x`
                    <tr role="row">
                      <td colspan="8" class="srg-empty" role="gridcell">
                        <p>${G("No time slots defined for this roster yet.")}</p>
                        <a class="btn btn-default btn-sm" href="?class=${Rt()}&method=tool&op=manage_slots&roster_id=${this.rosterId}">
                          <i class="fa fa-clock" aria-hidden="true"></i> ${G("Manage slots")}
                        </a>
                      </td>
                    </tr>
                  ` : C}
              ${t.map((e, t) => x`
                  <tr role="row" aria-rowindex=${t + 2}>
                    <th
                      scope="row"
                      role="rowheader"
                      class="srg-slot-cell"
                      aria-colindex="1"
                    >
                      <span class="srg-slot-time">${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}</span>
                      ${e.location ? x`<small class="text-muted d-block">${e.location}</small>` : C}
                    </th>
                    ${r.map((r, a) => {
			let o = this.cellDate(a), s = this.cellApplies(e, a), c = this.exceptionFor(o), l = a + 2;
			if (!s) return x`<td
                          class="srg-cell-empty"
                          role="gridcell"
                          aria-colindex=${l}
                          aria-disabled="true"
                        ></td>`;
			let u = `${e.id}-${a}`;
			if (c) return x`<td
                          class="srg-cell-exception"
                          role="gridcell"
                          aria-colindex=${l}
                          tabindex="0"
                          data-cell-key=${u}
                          aria-label=${this.cellAriaLabel(e, o, a, !0, [])}
                          @keydown=${(n) => this.onCellKeyDown(n, e, o, t, a)}
                          @focus=${() => this.focusedCellKey = u}
                        >
                          <small>${G("closed")}</small>
                        </td>`;
			let d = this.assignmentsFor(e.id, o), f = d.length;
			return x`
                        <td
                          class="srg-cell ${n ? "srg-drop-target" : ""}"
                          role="gridcell"
                          aria-colindex=${l}
                          tabindex="0"
                          data-cell-key=${u}
                          aria-label=${this.cellAriaLabel(e, o, a, !1, d)}
                          @dragover=${(e) => {
				e.preventDefault(), e.currentTarget.classList.add("srg-dropping");
			}}
                          @dragleave=${(e) => {
				e.currentTarget.classList.remove("srg-dropping");
			}}
                          @drop=${async (t) => {
				t.preventDefault(), t.currentTarget.classList.remove("srg-dropping"), await this.dropOnCell(e, o);
			}}
                          @click=${async () => {
				this.pickedUp && await this.dropFromKeyboard(e, o);
			}}
                          @keydown=${(n) => this.onCellKeyDown(n, e, o, t, a)}
                          @focus=${() => {
				this.focusedCellKey = u, this.loadAvailable({
					slotId: e.id,
					date: o,
					dayIdx: a
				});
			}}
                        >
                          ${Qe(d, (e) => e.id, (t) => {
				let n = this.pickedUp?.kind === "assignment" && this.pickedUp.assignment.id === t.id, r = this.recentlyChanged.has(t.id);
				return x`
                                <div
                                  class="srg-assignment srg-status-${t.status} ${n ? "srg-picked-up" : ""} ${r ? "srg-recent-update" : ""}"
                                  role="button"
                                  tabindex="0"
                                  draggable="true"
                                  aria-label="${t.firstname} ${t.surname}, ${i[t.status]}. ${G("Press Enter to move, Delete to remove. Click to edit.")}"
                                  title="${t.firstname} ${t.surname} (${i[t.status]}). ${G("Click to edit.")}"
                                  @dragstart=${(e) => {
					this.dragging = {
						kind: "assignment",
						assignment: t
					}, e.dataTransfer?.setData("text/plain", String(t.id));
				}}
                                  @click=${async (n) => {
					if (this.pickedUp) {
						n.stopPropagation(), await this.dropFromKeyboard(e, o);
						return;
					}
					this.requestEdit(t, n.currentTarget);
				}}
                                  @keydown=${(e) => this.onAssignmentKeyDown(e, t)}
                                >
                                  ${t.surname}, ${t.firstname}
                                </div>
                              `;
			})}
                          <small class="srg-capacity" aria-hidden="true">${f}/${e.max_staff}</small>
                        </td>
                      `;
		})}
                  </tr>
                `)}
            </tbody>
          </table>
        </section>
      </div>

      ${this.editing ? this.renderEditModal(this.editing) : C}
      ${this.pendingDelete ? this.renderDeleteModal(this.pendingDelete) : C}
    `;
	}
	renderEditModal(e) {
		let t = this.week?.assignment_fields ?? [], n = [
			"scheduled",
			"confirmed",
			"completed",
			"cancelled",
			"no_show"
		], r = Gt();
		return x`
      <div
        class="modal show staff-roster-modal-open"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        style="display: block;"
        @click=${(e) => {
			e.target.classList.contains("modal") && this.cancelEdit();
		}}
      >
        <div class="modal-dialog modal-lg srg-edit-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h1 class="modal-title">${G("Edit assignment")}</h1>
              <button type="button" class="btn-close" aria-label="${G("Close")}" @click=${() => this.cancelEdit()}></button>
            </div>
            <div class="modal-body srg-edit-body">
              <p class="srg-edit-subject">
                <strong>${e.surname}, ${e.firstname}</strong>
                <span class="text-muted"> · ${Yt()[this.dayIdxForDate(e.assignment_date)]} ${e.assignment_date}</span>
              </p>
              <div class="srg-edit-grid">
                <div class="srg-edit-row">
                  <label for="srg-edit-status">${G("Status")}</label>
                  <select
                    id="srg-edit-status"
                    class="form-select"
                    .value=${this.editForm.status}
                    @change=${(e) => this.editForm = {
			...this.editForm,
			status: e.target.value
		}}
                  >
                    ${n.map((e) => x`<option value=${e} ?selected=${e === this.editForm.status}>${r[e]}</option>`)}
                  </select>
                </div>
                <div class="srg-edit-row">
                  <label for="srg-edit-notes">${G("Notes")}</label>
                  <textarea
                    id="srg-edit-notes"
                    class="form-control"
                    rows="3"
                    placeholder="${G("Optional notes shown on the chip and in handoffs")}"
                    .value=${this.editForm.notes}
                    @input=${(e) => this.editForm = {
			...this.editForm,
			notes: e.target.value
		}}
                  ></textarea>
                </div>
                ${t.map((e) => this.renderEditField(e))}
              </div>
            </div>
            <div class="modal-footer srg-edit-footer">
              <button type="button" class="btn btn-danger me-auto" @click=${() => this.deleteFromEdit()}>
                <i class="fa fa-trash"></i> ${G("Remove")}
              </button>
              <button type="button" class="btn btn-default" @click=${() => this.cancelEdit()}>${G("Cancel")}</button>
              <button type="button" class="btn btn-primary" @click=${() => void this.saveEdit()}>
                <i class="fa fa-save"></i> ${G("Save")}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show staff-roster-modal-backdrop"></div>
    `;
	}
	renderEditField(e) {
		let t = `srg-edit-af-${e.id}`, n = this.editForm.fields[e.id] ?? [], r = (t) => {
			this.editForm = {
				...this.editForm,
				fields: {
					...this.editForm.fields,
					[e.id]: t
				}
			};
		};
		if (e.av_options && e.av_options.length) {
			let i = n[0] ?? "";
			return x`
        <div class="srg-edit-row">
          <label for=${t}>${e.name}</label>
          <select
            id=${t}
            class="form-select"
            .value=${i}
            @change=${(e) => {
				let t = e.target.value;
				r(t === "" ? [] : [t]);
			}}
          >
            <option value="">${G("— None —")}</option>
            ${e.av_options.map((e) => x`<option value=${e.value} ?selected=${e.value === i}>${e.lib || e.value}</option>`)}
          </select>
        </div>
      `;
		}
		let i = n.join(", ");
		return x`
      <div class="srg-edit-row">
        <label for=${t}>${e.name}</label>
        <input
          id=${t}
          type="text"
          class="form-control"
          placeholder=${e.repeatable ? G("comma-separated values") : ""}
          .value=${i}
          @input=${(t) => {
			let n = t.target.value;
			r(e.repeatable ? n.split(",").map((e) => e.trim()).filter(Boolean) : n === "" ? [] : [n]);
		}}
        />
      </div>
    `;
	}
	renderDeleteModal(e) {
		return Wt({
			title: G("Remove assignment?"),
			onCancel: () => this.cancelDelete(),
			body: x`
        <p>${G("Remove")} <strong>${e.surname}, ${e.firstname}</strong> ${G("from this slot on")} ${e.assignment_date}?</p>
        <p class="text-muted">${G("You can undo with Cmd-Z (or the Undo button) if this was a mistake.")}</p>
      `,
			footer: x`
        <button type="button" class="btn btn-danger" @click=${() => void this.confirmDelete()}>
          <i class="fa fa-trash"></i> ${G("Remove")}
        </button>
        <button type="button" class="btn btn-default" @click=${() => this.cancelDelete()}>
          <i class="fa fa-times"></i> ${G("Cancel")}
        </button>
      `
		});
	}
};
X([O({
	type: Number,
	attribute: "roster-id"
})], Z.prototype, "rosterId", void 0), X([O({
	type: String,
	attribute: "week-start"
})], Z.prototype, "weekStart", void 0), X([k()], Z.prototype, "week", void 0), X([k()], Z.prototype, "available", void 0), X([k()], Z.prototype, "availableMeta", void 0), X([k()], Z.prototype, "availableContextDay", void 0), X([k()], Z.prototype, "staffQuery", void 0), X([k()], Z.prototype, "error", void 0), X([k()], Z.prototype, "dragging", void 0), X([k()], Z.prototype, "pickedUp", void 0), X([k()], Z.prototype, "pendingDelete", void 0), X([k()], Z.prototype, "editing", void 0), X([k()], Z.prototype, "editForm", void 0), X([k()], Z.prototype, "liveMessage", void 0), X([k()], Z.prototype, "focusedCellKey", void 0), X([k()], Z.prototype, "focusedPillIdx", void 0), X([k()], Z.prototype, "recentlyChanged", void 0), Z = X([Re("staff-roster-grid")], Z);
//#endregion
//#region src/components/shared/day-groups.ts
function Zt(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = t(r), i = n.get(e);
		i ? i.push(r) : n.set(e, [r]);
	}
	return [...n.entries()].sort(([e], [t]) => e.localeCompare(t)).map(([e, t]) => ({
		date: e,
		items: t
	}));
}
function Qt(e) {
	let { groups: t, emptyText: n, renderItem: r } = e;
	return x`
    <section class="page-section">
      ${t.length === 0 ? x`<p class="text-muted">${n}</p>` : x`
            <ul class="list-group">
              ${Qe(t, (e) => e.date, (e) => x`
                  <li class="list-group-item">
                    <h4 class="srg-day-heading">${Vt(e.date)}</h4>
                    <ul class="list-unstyled">
                      ${e.items.map((e) => r(e))}
                    </ul>
                  </li>
                `)}
            </ul>
          `}
    </section>
  `;
}
//#endregion
//#region src/components/my-shifts-list.ts
var Q = class extends D {
	constructor() {
		super(), this.weekStart = "", this.week = null, this.error = "", this.loading = !1, this.dropping = null, this.successMsg = "", this.pendingDrop = null, new Y(this, () => this.pendingDrop !== null, () => this.cancelDrop());
	}
	createRenderRoot() {
		return this;
	}
	connectedCallback() {
		super.connectedCallback(), this.weekStart ||= Lt(/* @__PURE__ */ new Date()), this.refresh();
	}
	async refresh() {
		this.loading = !0;
		try {
			this.week = await Mt(this.weekStart), this.error = "";
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
		} finally {
			this.loading = !1;
		}
	}
	shiftWeek(e) {
		this.weekStart = zt(this.weekStart, e), this.refresh();
	}
	rosterById(e) {
		return this.week?.rosters.find((t) => t.id === e);
	}
	requestDrop(e) {
		this.pendingDrop = e;
	}
	cancelDrop() {
		this.pendingDrop = null;
	}
	async confirmDrop() {
		let e = this.pendingDrop;
		if (e) {
			this.pendingDrop = null, this.dropping = e.assignment_id, this.error = "";
			try {
				await Ft(e.assignment_id), this.successMsg = G("Shift dropped."), setTimeout(() => this.successMsg = "", 4e3), await this.refresh();
			} catch (e) {
				this.error = e instanceof Error ? e.message : String(e);
			} finally {
				this.dropping = null;
			}
		}
	}
	render() {
		if (this.loading && !this.week) return x`<div class="text-center text-muted py-4">${G("Loading…")}</div>`;
		let e = Zt(this.week?.shifts ?? [], (e) => e.assignment_date);
		return x`
      ${Ut({
			successMsg: this.successMsg,
			error: this.error,
			onDismissError: () => this.error = ""
		})}

      ${Ht({
			weekStart: this.weekStart,
			onShift: (e) => this.shiftWeek(e),
			onRefresh: () => void this.refresh()
		})}

      ${Qt({
			groups: e,
			emptyText: G("No shifts scheduled this week."),
			renderItem: (e) => this.renderShift(e)
		})}

      ${this.pendingDrop ? this.renderDropModal(this.pendingDrop) : C}
    `;
	}
	renderShift(e) {
		let t = this.rosterById(e.roster_id);
		return x`
      <li class="srg-my-shift">
        <span
          class="staff-roster-type-swatch"
          style="background-color: ${t?.type_color ?? "#666"};"
          aria-hidden="true"
        ></span>
        <span class="srg-my-shift-time">
          ${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}
        </span>
        <span class="srg-my-shift-roster">
          <a
            href="?class=${Rt()}&method=tool&op=view_assignments&roster_id=${e.roster_id}&week_start=${this.weekStart}"
          >
            ${t?.name ?? G("Roster #") + e.roster_id}
          </a>
          ${t?.branch_name ? x`<small class="text-muted"> · ${t.branch_name}</small>` : C}
        </span>
        ${e.location ? x`<span class="srg-my-shift-location text-muted">
              <i class="fa fa-map-marker" aria-hidden="true"></i> ${e.location}
            </span>` : C}
        <span class="srg-my-shift-status badge">${Gt()[e.status] ?? e.status}</span>
        <span class="srg-my-shift-actions">
          <a
            class="btn btn-default btn-xs"
            href="?class=${Rt()}&method=tool&op=manage_swaps&roster_id=${e.roster_id}"
            title="${G("Request swap on this roster")}"
          >
            <i class="fa fa-exchange" aria-hidden="true"></i> ${G("Swap")}
          </a>
          <button
            type="button"
            class="btn btn-default btn-xs"
            ?disabled=${this.dropping === e.assignment_id}
            @click=${() => this.requestDrop(e)}
            title="${G("Drop this shift")}"
          >
            <i class="fa fa-times" aria-hidden="true"></i>
            ${this.dropping === e.assignment_id ? G("Dropping…") : G("Drop")}
          </button>
        </span>
      </li>
    `;
	}
	renderDropModal(e) {
		let t = this.rosterById(e.roster_id);
		return Wt({
			title: G("Drop this shift?"),
			onCancel: () => this.cancelDrop(),
			body: x`
        <p>
          ${G("Drop your shift on")}
          <strong>${Vt(e.assignment_date)}</strong>,
          <strong>${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}</strong>
          (${t?.name ?? G("Roster #") + e.roster_id})?
        </p>
        <p class="text-muted">
          ${G("The slot will be re-opened for someone else to claim. If you need a one-for-one trade instead, use Swap.")}
        </p>
      `,
			footer: x`
        <button type="button" class="btn btn-danger" @click=${() => void this.confirmDrop()}>
          <i class="fa fa-times"></i> ${G("Drop shift")}
        </button>
        <button type="button" class="btn btn-default" @click=${() => this.cancelDrop()}>
          ${G("Cancel")}
        </button>
      `
		});
	}
};
X([O({
	type: String,
	attribute: "week-start"
})], Q.prototype, "weekStart", void 0), X([k()], Q.prototype, "week", void 0), X([k()], Q.prototype, "error", void 0), X([k()], Q.prototype, "loading", void 0), X([k()], Q.prototype, "dropping", void 0), X([k()], Q.prototype, "successMsg", void 0), X([k()], Q.prototype, "pendingDrop", void 0), Q = X([Re("my-shifts-list")], Q);
//#endregion
//#region src/components/open-shifts-list.ts
var $ = class extends D {
	constructor() {
		super(), this.weekStart = "", this.data = null, this.error = "", this.loading = !1, this.claiming = null, this.successMsg = "", this.pendingClaim = null, new Y(this, () => this.pendingClaim !== null, () => this.cancelClaim());
	}
	createRenderRoot() {
		return this;
	}
	connectedCallback() {
		super.connectedCallback(), this.weekStart ||= Lt(/* @__PURE__ */ new Date()), this.refresh();
	}
	async refresh() {
		this.loading = !0;
		try {
			this.data = await Nt(this.weekStart), this.error = "";
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
		} finally {
			this.loading = !1;
		}
	}
	shiftWeek(e) {
		this.weekStart = zt(this.weekStart, e), this.refresh();
	}
	requestClaim(e) {
		this.pendingClaim = e;
	}
	cancelClaim() {
		this.pendingClaim = null;
	}
	async confirmClaim() {
		let e = this.pendingClaim;
		if (!e) return;
		this.pendingClaim = null;
		let t = this.openingKey(e);
		this.claiming = t, this.error = "";
		try {
			await Pt({
				slot_id: e.slot_id,
				assignment_date: e.assignment_date
			}), this.successMsg = `${G("Claimed")} ${e.roster_name} ${G("on")} ${e.assignment_date}.`, setTimeout(() => this.successMsg = "", 4e3), await this.refresh();
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
		} finally {
			this.claiming = null;
		}
	}
	openingKey(e) {
		return e.slot_id * 1e8 + this.dateHash(e.assignment_date);
	}
	dateHash(e) {
		return Number(e.replaceAll("-", ""));
	}
	render() {
		if (this.loading && !this.data) return x`<div class="text-center text-muted py-4">${G("Loading…")}</div>`;
		let e = Zt(this.data?.openings ?? [], (e) => e.assignment_date);
		return x`
      ${Ut({
			successMsg: this.successMsg,
			error: this.error,
			onDismissError: () => this.error = ""
		})}

      ${Ht({
			weekStart: this.weekStart,
			onShift: (e) => this.shiftWeek(e),
			onRefresh: () => void this.refresh()
		})}

      ${Qt({
			groups: e,
			emptyText: G("No open shifts available this week."),
			renderItem: (e) => this.renderOpening(e)
		})}

      ${this.pendingClaim ? this.renderClaimModal(this.pendingClaim) : C}
    `;
	}
	renderClaimModal(e) {
		return Wt({
			title: G("Claim this shift?"),
			onCancel: () => this.cancelClaim(),
			body: x`
        <p>
          ${G("Claim")}
          <strong>${Vt(e.assignment_date)}</strong>,
          <strong>${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}</strong>
          ${G("on")} <strong>${e.roster_name}</strong>?
        </p>
        ${e.location ? x`<p class="text-muted"><i class="fa fa-map-marker" aria-hidden="true"></i> ${e.location}</p>` : C}
        <p class="text-muted">
          ${G("You'll be added to the roster immediately. Drop the shift later from My shifts if plans change.")}
        </p>
      `,
			footer: x`
        <button type="button" class="btn btn-primary" @click=${() => void this.confirmClaim()}>
          <i class="fa fa-hand-paper-o"></i> ${G("Claim shift")}
        </button>
        <button type="button" class="btn btn-default" @click=${() => this.cancelClaim()}>
          ${G("Cancel")}
        </button>
      `
		});
	}
	renderOpening(e) {
		let t = this.openingKey(e), n = this.claiming === t;
		return x`
      <li class="srg-my-shift">
        <span
          class="staff-roster-type-swatch"
          style="background-color: ${e.type_color};"
          aria-hidden="true"
        ></span>
        <span class="srg-my-shift-time">
          ${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}
        </span>
        <span class="srg-my-shift-roster">
          ${e.roster_name}
          ${e.branch_name ? x`<small class="text-muted"> · ${e.branch_name}</small>` : C}
        </span>
        ${e.location ? x`<span class="srg-my-shift-location text-muted">
              <i class="fa fa-map-marker" aria-hidden="true"></i> ${e.location}
            </span>` : C}
        <span class="srg-my-shift-status badge">${e.capacity_remaining} ${G("open")}</span>
        <button
          type="button"
          class="btn btn-primary btn-xs"
          ?disabled=${n}
          @click=${() => this.requestClaim(e)}
        >
          <i class="fa fa-hand-paper-o" aria-hidden="true"></i>
          ${G(n ? "Claiming…" : "Claim")}
        </button>
      </li>
    `;
	}
};
X([O({
	type: String,
	attribute: "week-start"
})], $.prototype, "weekStart", void 0), X([k()], $.prototype, "data", void 0), X([k()], $.prototype, "error", void 0), X([k()], $.prototype, "loading", void 0), X([k()], $.prototype, "claiming", void 0), X([k()], $.prototype, "successMsg", void 0), X([k()], $.prototype, "pendingClaim", void 0), $ = X([Re("open-shifts-list")], $);
//#endregion
