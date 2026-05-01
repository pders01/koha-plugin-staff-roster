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
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, ee = h.trustedTypes, te = ee ? ee.emptyScript : "", ne = h.reactiveElementPolyfillSupport, g = (e, t) => e, _ = {
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
}, re = (e, t) => !l(e, t), ie = {
	attribute: !0,
	type: String,
	converter: _,
	reflect: !1,
	useDefault: !1,
	hasChanged: re
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var v = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ie) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? ie;
	}
	static _$Ei() {
		if (this.hasOwnProperty(g("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(g("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(g("properties"))) {
			let e = this.properties, t = [...f(e), ...p(e)];
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
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
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
		return s(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? _ : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? _ : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? re)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
v.elementStyles = [], v.shadowRootOptions = { mode: "open" }, v[g("elementProperties")] = /* @__PURE__ */ new Map(), v[g("finalized")] = /* @__PURE__ */ new Map(), ne?.({ ReactiveElement: v }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ae = globalThis, oe = (e) => e, se = ae.trustedTypes, ce = se ? se.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, le = "$lit$", y = `lit$${Math.random().toFixed(9).slice(2)}$`, ue = "?" + y, de = `<${ue}>`, b = document, x = () => b.createComment(""), S = (e) => e === null || typeof e != "object" && typeof e != "function", fe = Array.isArray, pe = (e) => fe(e) || typeof e?.[Symbol.iterator] == "function", me = "[ 	\n\f\r]", C = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, he = /-->/g, ge = />/g, w = RegExp(`>|${me}(?:([^\\s"'>=/]+)(${me}*=${me}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), _e = /'/g, ve = /"/g, ye = /^(?:script|style|textarea|title)$/i, T = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), E = Symbol.for("lit-noChange"), D = Symbol.for("lit-nothing"), be = /* @__PURE__ */ new WeakMap(), O = b.createTreeWalker(b, 129);
function xe(e, t) {
	if (!fe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ce === void 0 ? t : ce.createHTML(t);
}
var Se = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = C;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === C ? c[1] === "!--" ? o = he : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = w) : (ye.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = w) : o = ge : o === w ? c[0] === ">" ? (o = i ?? C, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? w : c[3] === "\"" ? ve : _e) : o === ve || o === _e ? o = w : o === he || o === ge ? o = C : (o = w, i = void 0);
		let d = o === w && e[t + 1].startsWith("/>") ? " " : "";
		a += o === C ? n + de : l >= 0 ? (r.push(s), n.slice(0, l) + le + n.slice(l) + y + d) : n + y + (l === -2 ? t : d);
	}
	return [xe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ce = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Se(t, n);
		if (this.el = e.createElement(l, r), O.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = O.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(le)) {
					let t = u[o++], n = i.getAttribute(e).split(y), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ee : r[1] === "?" ? De : r[1] === "@" ? Oe : A
					}), i.removeAttribute(e);
				} else e.startsWith(y) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ye.test(i.tagName)) {
					let e = i.textContent.split(y), t = e.length - 1;
					if (t > 0) {
						i.textContent = se ? se.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], x()), O.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], x());
					}
				}
			} else if (i.nodeType === 8) if (i.data === ue) c.push({
				type: 2,
				index: a
			});
			else {
				let e = -1;
				for (; (e = i.data.indexOf(y, e + 1)) !== -1;) c.push({
					type: 7,
					index: a
				}), e += y.length - 1;
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = b.createElement("template");
		return n.innerHTML = e, n;
	}
};
function k(e, t, n = e, r) {
	if (t === E) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = S(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = k(e, i._$AS(e, t.values), i, r)), t;
}
var we = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? b).importNode(t, !0);
		O.currentNode = r;
		let i = O.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Te(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new ke(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = O.nextNode(), a++);
		}
		return O.currentNode = b, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Te = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = D, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = k(this, e, t), S(e) ? e === D || e == null || e === "" ? (this._$AH !== D && this._$AR(), this._$AH = D) : e !== this._$AH && e !== E && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? pe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== D && S(this._$AH) ? this._$AA.nextSibling.data = e : this.T(b.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Ce.createElement(xe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new we(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = be.get(e.strings);
		return t === void 0 && be.set(e.strings, t = new Ce(e)), t;
	}
	k(t) {
		fe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(x()), this.O(x()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = oe(e).nextSibling;
			oe(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, A = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = D, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = D;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = k(this, e, t, 0), a = !S(e) || e !== this._$AH && e !== E, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = k(this, r[n + o], t, o), s === E && (s = this._$AH[o]), a ||= !S(s) || s !== this._$AH[o], s === D ? e = D : e !== D && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === D ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Ee = class extends A {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === D ? void 0 : e;
	}
}, De = class extends A {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== D);
	}
}, Oe = class extends A {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = k(this, e, t, 0) ?? D) === E) return;
		let n = this._$AH, r = e === D && n !== D || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== D && (n === D || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, ke = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		k(this, e);
	}
}, Ae = {
	M: le,
	P: y,
	A: ue,
	C: 1,
	L: Se,
	R: we,
	D: pe,
	V: k,
	I: Te,
	H: A,
	N: De,
	U: Oe,
	B: Ee,
	F: ke
}, je = ae.litHtmlPolyfillSupport;
je?.(Ce, Te), (ae.litHtmlVersions ??= []).push("3.3.2");
var Me = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Te(t.insertBefore(x(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Ne = globalThis, j = class extends v {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Me(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return E;
	}
};
j._$litElement$ = !0, j.finalized = !0, Ne.litElementHydrateSupport?.({ LitElement: j });
var Pe = Ne.litElementPolyfillSupport;
Pe?.({ LitElement: j }), (Ne.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var Fe = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, Ie = {
	attribute: !0,
	type: String,
	converter: _,
	reflect: !1,
	hasChanged: re
}, Le = (e = Ie, t, n) => {
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
function Re(e) {
	return (t, n) => typeof n == "object" ? Le(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function M(e) {
	return Re({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region node_modules/lit-html/directive.js
var ze = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Be = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Ve = class {
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
}, { I: He } = Ae, Ue = (e) => e, We = () => document.createComment(""), N = (e, t, n) => {
	let r = e._$AA.parentNode, i = t === void 0 ? e._$AB : t._$AA;
	if (n === void 0) n = new He(r.insertBefore(We(), i), r.insertBefore(We(), i), e, e.options);
	else {
		let t = n._$AB.nextSibling, a = n._$AM, o = a !== e;
		if (o) {
			let t;
			n._$AQ?.(e), n._$AM = e, n._$AP !== void 0 && (t = e._$AU) !== a._$AU && n._$AP(t);
		}
		if (t !== i || o) {
			let e = n._$AA;
			for (; e !== t;) {
				let t = Ue(e).nextSibling;
				Ue(r).insertBefore(e, i), e = t;
			}
		}
	}
	return n;
}, P = (e, t, n = e) => (e._$AI(t, n), e), Ge = {}, Ke = (e, t = Ge) => e._$AH = t, qe = (e) => e._$AH, Je = (e) => {
	e._$AR(), e._$AA.remove();
}, Ye = (e, t, n) => {
	let r = /* @__PURE__ */ new Map();
	for (let i = t; i <= n; i++) r.set(e[i], i);
	return r;
}, Xe = Be(class extends Ve {
	constructor(e) {
		if (super(e), e.type !== ze.CHILD) throw Error("repeat() can only be used in text expressions");
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
		let i = qe(e), { values: a, keys: o } = this.dt(t, n, r);
		if (!Array.isArray(i)) return this.ut = o, a;
		let s = this.ut ??= [], c = [], l, u, d = 0, f = i.length - 1, p = 0, m = a.length - 1;
		for (; d <= f && p <= m;) if (i[d] === null) d++;
		else if (i[f] === null) f--;
		else if (s[d] === o[p]) c[p] = P(i[d], a[p]), d++, p++;
		else if (s[f] === o[m]) c[m] = P(i[f], a[m]), f--, m--;
		else if (s[d] === o[m]) c[m] = P(i[d], a[m]), N(e, c[m + 1], i[d]), d++, m--;
		else if (s[f] === o[p]) c[p] = P(i[f], a[p]), N(e, i[d], i[f]), f--, p++;
		else if (l === void 0 && (l = Ye(o, p, m), u = Ye(s, d, f)), l.has(s[d])) if (l.has(s[f])) {
			let t = u.get(o[p]), n = t === void 0 ? null : i[t];
			if (n === null) {
				let t = N(e, i[d]);
				P(t, a[p]), c[p] = t;
			} else c[p] = P(n, a[p]), N(e, i[d], n), i[t] = null;
			p++;
		} else Je(i[f]), f--;
		else Je(i[d]), d++;
		for (; p <= m;) {
			let t = N(e, c[m + 1]);
			P(t, a[p]), c[p++] = t;
		}
		for (; d <= f;) {
			let e = i[d++];
			e !== null && Je(e);
		}
		return this.ut = o, Ke(e, c), E;
	}
});
//#endregion
//#region ../../../pers/web/lit-framework/dist/utilities-BUI2aO8f.js
async function Ze(e) {
	try {
		return [null, await e];
	} catch (e) {
		return [e instanceof Error ? e : Error(String(e)), null];
	}
}
//#endregion
//#region ../../../pers/web/lit-framework/node_modules/ts-pattern/dist/index.js
var F = Symbol.for("@ts-pattern/matcher"), Qe = Symbol.for("@ts-pattern/isVariadic"), $e = "@ts-pattern/anonymous-select-key", et = (e) => !!(e && typeof e == "object"), tt = (e) => e && !!e[F], I = (e, t, n) => {
	if (tt(e)) {
		let { matched: r, selections: i } = e[F]().match(t);
		return r && i && Object.keys(i).forEach((e) => n(e, i[e])), r;
	}
	if (et(e)) {
		if (!et(t)) return !1;
		if (Array.isArray(e)) {
			if (!Array.isArray(t)) return !1;
			let r = [], i = [], a = [];
			for (let t of e.keys()) {
				let n = e[t];
				tt(n) && n[Qe] ? a.push(n) : a.length ? i.push(n) : r.push(n);
			}
			if (a.length) {
				if (a.length > 1) throw Error("Pattern error: Using `...P.array(...)` several times in a single pattern is not allowed.");
				if (t.length < r.length + i.length) return !1;
				let e = t.slice(0, r.length), o = i.length === 0 ? [] : t.slice(-i.length), s = t.slice(r.length, i.length === 0 ? Infinity : -i.length);
				return r.every((t, r) => I(t, e[r], n)) && i.every((e, t) => I(e, o[t], n)) && (a.length === 0 || I(a[0], s, n));
			}
			return e.length === t.length && e.every((e, r) => I(e, t[r], n));
		}
		return Reflect.ownKeys(e).every((r) => {
			let i = e[r];
			return (r in t || tt(a = i) && a[F]().matcherType === "optional") && I(i, t[r], n);
			var a;
		});
	}
	return Object.is(t, e);
}, L = (e) => {
	var t;
	return et(e) ? tt(e) ? (t = e[F]()).getSelectionKeys?.call(t) ?? [] : nt(Array.isArray(e) ? e : Object.values(e), L) : [];
}, nt = (e, t) => e.reduce((e, n) => e.concat(t(n)), []);
function rt(...e) {
	if (e.length === 1) {
		let [t] = e;
		return (e) => I(t, e, () => {});
	}
	if (e.length === 2) {
		let [t, n] = e;
		return I(t, n, () => {});
	}
	throw Error(`isMatching wasn't given the right number of arguments: expected 1 or 2, received ${e.length}.`);
}
function R(e) {
	return Object.assign(e, {
		optional: () => at(e),
		and: (t) => z(e, t),
		or: (t) => lt(e, t),
		select: (t) => t === void 0 ? V(e) : V(t, e)
	});
}
function it(e) {
	return Object.assign(((e) => Object.assign(e, { [Symbol.iterator]() {
		let t = 0, n = [{
			value: Object.assign(e, { [Qe]: !0 }),
			done: !1
		}, {
			done: !0,
			value: void 0
		}];
		return { next: () => n[t++] ?? n.at(-1) };
	} }))(e), {
		optional: () => it(at(e)),
		select: (t) => it(t === void 0 ? V(e) : V(t, e))
	});
}
function at(e) {
	return R({ [F]: () => ({
		match: (t) => {
			let n = {}, r = (e, t) => {
				n[e] = t;
			};
			return t === void 0 ? (L(e).forEach((e) => r(e, void 0)), {
				matched: !0,
				selections: n
			}) : {
				matched: I(e, t, r),
				selections: n
			};
		},
		getSelectionKeys: () => L(e),
		matcherType: "optional"
	}) });
}
var ot = (e, t) => {
	for (let n of e) if (!t(n)) return !1;
	return !0;
}, st = (e, t) => {
	for (let [n, r] of e.entries()) if (!t(r, n)) return !1;
	return !0;
}, ct = (e, t) => {
	let n = Reflect.ownKeys(e);
	for (let r of n) if (!t(r, e[r])) return !1;
	return !0;
};
function z(...e) {
	return R({ [F]: () => ({
		match: (t) => {
			let n = {}, r = (e, t) => {
				n[e] = t;
			};
			return {
				matched: e.every((e) => I(e, t, r)),
				selections: n
			};
		},
		getSelectionKeys: () => nt(e, L),
		matcherType: "and"
	}) });
}
function lt(...e) {
	return R({ [F]: () => ({
		match: (t) => {
			let n = {}, r = (e, t) => {
				n[e] = t;
			};
			return nt(e, L).forEach((e) => r(e, void 0)), {
				matched: e.some((e) => I(e, t, r)),
				selections: n
			};
		},
		getSelectionKeys: () => nt(e, L),
		matcherType: "or"
	}) });
}
function B(e) {
	return { [F]: () => ({ match: (t) => ({ matched: !!e(t) }) }) };
}
function V(...e) {
	let t = typeof e[0] == "string" ? e[0] : void 0, n = e.length === 2 ? e[1] : typeof e[0] == "string" ? void 0 : e[0];
	return R({ [F]: () => ({
		match: (e) => {
			let r = { [t ?? $e]: e };
			return {
				matched: n === void 0 || I(n, e, (e, t) => {
					r[e] = t;
				}),
				selections: r
			};
		},
		getSelectionKeys: () => [t ?? $e].concat(n === void 0 ? [] : L(n))
	}) });
}
function ut(e) {
	return !0;
}
function H(e) {
	return typeof e == "number";
}
function U(e) {
	return typeof e == "string";
}
function W(e) {
	return typeof e == "bigint";
}
var dt = R(B(ut)), ft = R(B(ut)), pt = dt, G = (e) => Object.assign(R(e), {
	startsWith: (t) => {
		return G(z(e, (n = t, B((e) => U(e) && e.startsWith(n)))));
		var n;
	},
	endsWith: (t) => {
		return G(z(e, (n = t, B((e) => U(e) && e.endsWith(n)))));
		var n;
	},
	minLength: (t) => G(z(e, ((e) => B((t) => U(t) && t.length >= e))(t))),
	length: (t) => G(z(e, ((e) => B((t) => U(t) && t.length === e))(t))),
	maxLength: (t) => G(z(e, ((e) => B((t) => U(t) && t.length <= e))(t))),
	includes: (t) => {
		return G(z(e, (n = t, B((e) => U(e) && e.includes(n)))));
		var n;
	},
	regex: (t) => {
		return G(z(e, (n = t, B((e) => U(e) && !!e.match(n)))));
		var n;
	}
}), mt = G(B(U)), K = (e) => Object.assign(R(e), {
	between: (t, n) => K(z(e, ((e, t) => B((n) => H(n) && e <= n && t >= n))(t, n))),
	lt: (t) => K(z(e, ((e) => B((t) => H(t) && t < e))(t))),
	gt: (t) => K(z(e, ((e) => B((t) => H(t) && t > e))(t))),
	lte: (t) => K(z(e, ((e) => B((t) => H(t) && t <= e))(t))),
	gte: (t) => K(z(e, ((e) => B((t) => H(t) && t >= e))(t))),
	int: () => K(z(e, B((e) => H(e) && Number.isInteger(e)))),
	finite: () => K(z(e, B((e) => H(e) && Number.isFinite(e)))),
	positive: () => K(z(e, B((e) => H(e) && e > 0))),
	negative: () => K(z(e, B((e) => H(e) && e < 0)))
}), ht = K(B(H)), q = (e) => Object.assign(R(e), {
	between: (t, n) => q(z(e, ((e, t) => B((n) => W(n) && e <= n && t >= n))(t, n))),
	lt: (t) => q(z(e, ((e) => B((t) => W(t) && t < e))(t))),
	gt: (t) => q(z(e, ((e) => B((t) => W(t) && t > e))(t))),
	lte: (t) => q(z(e, ((e) => B((t) => W(t) && t <= e))(t))),
	gte: (t) => q(z(e, ((e) => B((t) => W(t) && t >= e))(t))),
	positive: () => q(z(e, B((e) => W(e) && e > 0))),
	negative: () => q(z(e, B((e) => W(e) && e < 0)))
}), J = {
	__proto__: null,
	matcher: F,
	optional: at,
	array: function(...e) {
		return it({ [F]: () => ({
			match: (t) => {
				if (!Array.isArray(t)) return { matched: !1 };
				if (e.length === 0) return { matched: !0 };
				let n = e[0], r = {};
				if (t.length === 0) return L(n).forEach((e) => {
					r[e] = [];
				}), {
					matched: !0,
					selections: r
				};
				let i = (e, t) => {
					r[e] = (r[e] || []).concat([t]);
				};
				return {
					matched: t.every((e) => I(n, e, i)),
					selections: r
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : L(e[0])
		}) });
	},
	set: function(...e) {
		return R({ [F]: () => ({
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
					matched: ot(t, (e) => I(i, e, r)),
					selections: n
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : L(e[0])
		}) });
	},
	map: function(...e) {
		return R({ [F]: () => ({
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
					matched: st(t, (e, t) => {
						let n = I(i, t, r), o = I(a, e, r);
						return n && o;
					}),
					selections: n
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : [...L(e[0]), ...L(e[1])]
		}) });
	},
	record: function(...e) {
		return R({ [F]: () => ({
			match: (t) => {
				if (typeof t != "object" || !t || Array.isArray(t)) return { matched: !1 };
				if (e.length === 0) throw Error(`\`P.record\` wasn't given enough arguments. Expected (value) or (key, value), received ${e[0]?.toString()}`);
				let n = {}, r = (e, t) => {
					n[e] = (n[e] || []).concat([t]);
				}, [i, a] = e.length === 1 ? [mt, e[0]] : e;
				return {
					matched: ct(t, (e, t) => {
						let n = typeof e != "string" || Number.isNaN(Number(e)) ? null : Number(e), o = n !== null && I(i, n, r), s = I(i, e, r), c = I(a, t, r);
						return (s || o) && c;
					}),
					selections: n
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : [...L(e[0]), ...L(e[1])]
		}) });
	},
	intersection: z,
	union: lt,
	not: function(e) {
		return R({ [F]: () => ({
			match: (t) => ({ matched: !I(e, t, () => {}) }),
			getSelectionKeys: () => [],
			matcherType: "not"
		}) });
	},
	when: B,
	select: V,
	any: dt,
	unknown: ft,
	_: pt,
	string: mt,
	number: ht,
	bigint: q(B(W)),
	boolean: R(B(function(e) {
		return typeof e == "boolean";
	})),
	symbol: R(B(function(e) {
		return typeof e == "symbol";
	})),
	nullish: R(B(function(e) {
		return e == null;
	})),
	nonNullable: R(B(function(e) {
		return e != null;
	})),
	instanceOf: function(e) {
		return R(B(function(e) {
			return (t) => t instanceof e;
		}(e)));
	},
	shape: function(e) {
		return R(B(rt(e)));
	}
}, gt = class extends Error {
	constructor(e) {
		let t;
		try {
			t = JSON.stringify(e);
		} catch {
			t = e;
		}
		super(`Pattern matching error: no pattern matches value ${t}`), this.input = void 0, this.input = e;
	}
}, _t = {
	matched: !1,
	value: void 0
};
function vt(e) {
	return new yt(e, _t);
}
var yt = class e {
	constructor(e, t) {
		this.input = void 0, this.state = void 0, this.input = e, this.state = t;
	}
	with(...t) {
		if (this.state.matched) return this;
		let n = t[t.length - 1], r = [t[0]], i;
		t.length === 3 && typeof t[1] == "function" ? i = t[1] : t.length > 2 && r.push(...t.slice(1, t.length - 1));
		let a = !1, o = {}, s = (e, t) => {
			a = !0, o[e] = t;
		}, c = !r.some((e) => I(e, this.input, s)) || i && !i(this.input) ? _t : {
			matched: !0,
			value: n(a ? $e in o ? o[$e] : o : this.input, this.input)
		};
		return new e(this.input, c);
	}
	when(t, n) {
		if (this.state.matched) return this;
		let r = !!t(this.input);
		return new e(this.input, r ? {
			matched: !0,
			value: n(this.input, this.input)
		} : _t);
	}
	otherwise(e) {
		return this.state.matched ? this.state.value : e(this.input);
	}
	exhaustive(e = bt) {
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
function bt(e) {
	throw new gt(e);
}
//#endregion
//#region ../../../pers/web/lit-framework/dist/http-CJJa-frZ.js
var xt = class {
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
			let [t, a] = await Ze(fetch(n, r));
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
					let [, e] = await Ze(Promise.resolve(t(u, n, r)));
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
		return vt(e).with(J.nullish, () => "").with(J.string, (e) => e.startsWith("?") ? e.slice(1) : e).with(J._, (e) => new URLSearchParams(e).toString()).exhaustive();
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
		s = vt(r?.body).with(J.nullish, () => s).with(J.instanceOf(FormData), () => s).with(J._, (e) => ({
			...s,
			headers: { "Content-Type": "application/json" },
			body: e
		})).exhaustive();
		let c = navigator.userAgent.toLowerCase();
		s.cache = vt(c).when((e) => e.includes("chrome"), () => a.ignoreCache ? "no-cache" : "no-store").when((e) => e.includes("firefox"), () => a.ignoreCache ? "no-cache" : "default").otherwise(() => a.ignoreCache ? "no-cache" : a.cache ? "default" : "force-cache");
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
}, Y = "/api/v1/contrib/staffroster", X = new xt(Y, {
	get: {
		rosterWeek: {
			url: `${Y}/rosters`,
			cache: !1
		},
		availableStaff: {
			url: `${Y}/staff/available`,
			cache: !1
		}
	},
	post: {
		assignments: {
			url: `${Y}/assignments`,
			cache: !1
		},
		bulk: {
			url: `${Y}/assignments/bulk`,
			cache: !1
		}
	},
	put: { assignments: {
		url: `${Y}/assignments`,
		cache: !1
	} },
	delete: { assignments: {
		url: `${Y}/assignments`,
		cache: !1
	} }
});
async function Z(e) {
	if (!e.ok) {
		let t = await e.json().catch(() => ({})), n = Error(t.error ?? `HTTP ${e.status}`);
		throw n.status = e.status, n;
	}
	if (e.status !== 204) return await e.json();
}
async function St(e, t) {
	return Z(await X.get({
		endpoint: "rosterWeek",
		path: [String(e), "week"],
		query: { start: t }
	}));
}
async function Ct(e) {
	return Z(await X.post({
		endpoint: "assignments",
		requestInit: {
			method: "post",
			body: JSON.stringify(e)
		}
	}));
}
async function wt(e, t) {
	return Z(await X.put({
		endpoint: "assignments",
		path: [String(e)],
		requestInit: {
			method: "put",
			body: JSON.stringify(t)
		}
	}));
}
async function Tt(e) {
	await Z(await X.delete({
		endpoint: "assignments",
		path: [String(e)]
	}));
}
async function Et(e) {
	let t = { date: e.date };
	return e.slot_id && (t.slot_id = String(e.slot_id)), e.branch && (t.branch = e.branch), e.q && (t.q = e.q), Z(await X.get({
		endpoint: "availableStaff",
		query: t
	}));
}
//#endregion
//#region \0@oxc-project+runtime@0.127.0/helpers/decorate.js
function Q(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/components/staff-roster-grid.ts
var Dt = 5e3, Ot = 10, kt = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun"
], $ = class extends j {
	constructor(...e) {
		super(...e), this.rosterId = 0, this.weekStart = "", this.week = null, this.available = [], this.staffQuery = "", this.error = "", this.dragging = null, this.undoStack = [], this.onKeyDown = (e) => {
			(e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey && (e.preventDefault(), this.undo());
		};
	}
	static {
		this.styles = o`
    :host {
      display: block;
      font-family: inherit;
      color: #222;
    }

    .layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 1rem;
    }

    .sidebar {
      background: #f7f7f9;
      border-radius: 6px;
      padding: 0.75rem;
      max-height: 80vh;
      overflow-y: auto;
    }

    .sidebar h4 {
      margin: 0 0 0.5rem;
      font-size: 0.9rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #555;
    }

    .sidebar input[type="search"] {
      width: 100%;
      padding: 0.4rem;
      box-sizing: border-box;
      margin-bottom: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 3px;
    }

    .staff-pill {
      display: block;
      padding: 0.4rem 0.5rem;
      margin-bottom: 0.25rem;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: grab;
      font-size: 0.85rem;
      user-select: none;
    }

    .staff-pill:hover {
      border-color: #4caf50;
      background: #f0fdf4;
    }

    .staff-pill[draggable="true"]:active {
      cursor: grabbing;
    }

    .grid {
      display: grid;
      grid-template-columns: 140px repeat(7, 1fr);
      gap: 1px;
      background: #ddd;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }

    .header,
    .slot-label,
    .cell {
      background: white;
      padding: 0.5rem;
      min-height: 60px;
    }

    .header {
      font-weight: 600;
      text-align: center;
      background: #f0f0f0;
      font-size: 0.85rem;
    }

    .slot-label {
      font-size: 0.85rem;
      color: #444;
    }

    .slot-label .time {
      font-weight: 600;
      color: #222;
    }

    .cell {
      cursor: pointer;
      transition: background 0.1s;
    }

    .cell.dropping {
      background: #e8f5e9;
      box-shadow: inset 0 0 0 2px #4caf50;
    }

    .cell.exception {
      background: #fff8e1;
      color: #6d4c00;
      cursor: not-allowed;
    }

    .assignment {
      display: block;
      background: var(--type-color, #3498db);
      color: white;
      padding: 0.25rem 0.4rem;
      border-radius: 3px;
      margin-bottom: 0.2rem;
      font-size: 0.8rem;
      cursor: grab;
    }

    .assignment.cancelled,
    .assignment.no_show {
      opacity: 0.5;
      text-decoration: line-through;
    }

    .toolbar {
      margin-bottom: 0.5rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    button {
      padding: 0.35rem 0.75rem;
      border: 1px solid #999;
      background: white;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    button:hover {
      background: #f0f0f0;
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .error {
      background: #ffebee;
      color: #b71c1c;
      padding: 0.5rem;
      border-radius: 3px;
      margin-bottom: 0.5rem;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #888;
    }
  `;
	}
	connectedCallback() {
		super.connectedCallback(), this.weekStart ||= At(/* @__PURE__ */ new Date()), this.refresh(), this.pollTimer = setInterval(() => void this.refresh(), Dt), document.addEventListener("keydown", this.onKeyDown);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.pollTimer && clearInterval(this.pollTimer), document.removeEventListener("keydown", this.onKeyDown);
	}
	async refresh() {
		if (this.rosterId) try {
			this.week = await St(this.rosterId, this.weekStart), this.error = "";
		} catch (e) {
			this.error = e.message;
		}
	}
	async loadAvailable() {
		if (this.week) try {
			this.available = await Et({
				date: this.weekStart,
				q: this.staffQuery || void 0
			});
		} catch (e) {
			this.error = e.message;
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
		this.undoStack.push(e), this.undoStack.length > Ot && this.undoStack.shift();
	}
	async undo() {
		let e = this.undoStack.pop();
		if (e) try {
			e.kind === "create" ? await Tt(e.id) : e.kind === "delete" ? await Ct(e.payload) : await wt(e.id, e.before), await this.refresh();
		} catch (e) {
			this.error = `Undo failed: ${e.message}`;
		}
	}
	async dropOnCell(e, t) {
		if (this.dragging) {
			if (this.dragging.kind === "staff") {
				let n = this.dragging.staff;
				try {
					let r = await Ct({
						slot_id: e.id,
						borrowernumber: n.borrowernumber,
						assignment_date: t
					});
					await this.pushUndo({
						kind: "create",
						id: r.id
					}), await this.refresh();
				} catch (e) {
					this.error = e.message;
				}
			} else {
				let n = this.dragging.assignment;
				if (n.slot_id === e.id && n.assignment_date === t) return;
				try {
					await wt(n.id, {
						slot_id: e.id,
						assignment_date: t
					}), await this.pushUndo({
						kind: "update",
						id: n.id,
						before: {
							slot_id: n.slot_id,
							borrowernumber: n.borrowernumber,
							assignment_date: n.assignment_date
						}
					}), await this.refresh();
				} catch (e) {
					this.error = e.message;
				}
			}
			this.dragging = null;
		}
	}
	async deleteAssignment(e) {
		if (confirm(`Remove ${e.firstname} ${e.surname}?`)) try {
			await Tt(e.id), await this.pushUndo({
				kind: "delete",
				payload: {
					slot_id: e.slot_id,
					borrowernumber: e.borrowernumber,
					assignment_date: e.assignment_date,
					status: e.status,
					notes: e.notes
				}
			}), await this.refresh();
		} catch (e) {
			this.error = e.message;
		}
	}
	onStaffSearch(e) {
		this.staffQuery = e.target.value, this.staffDebounce && clearTimeout(this.staffDebounce), this.staffDebounce = setTimeout(() => void this.loadAvailable(), 300);
	}
	render() {
		if (!this.week) return T`<div class="loading">Loading…</div>`;
		let e = this.week.roster.type_color, t = [...this.week.slots].sort((e, t) => e.start_time.localeCompare(t.start_time) || e.day_of_week - t.day_of_week), n = [...new Set(t.map((e) => `${e.start_time}-${e.end_time}-${e.location ?? ""}`))];
		return T`
      ${this.error ? T`<div class="error">${this.error}</div>` : D}
      <div class="toolbar">
        <button @click=${() => this.shiftWeek(-7)}>← Previous</button>
        <strong>${this.week.roster.name} — week of ${this.weekStart}</strong>
        <button @click=${() => this.shiftWeek(7)}>Next →</button>
        <button @click=${() => void this.undo()} ?disabled=${this.undoStack.length === 0}>
          Undo (${this.undoStack.length})
        </button>
        <button @click=${() => void this.refresh()}>Refresh</button>
      </div>

      <div class="layout">
        <div class="sidebar">
          <h4>Available staff</h4>
          <input
            type="search"
            placeholder="Search…"
            .value=${this.staffQuery}
            @input=${this.onStaffSearch}
            @focus=${() => void this.loadAvailable()}
          />
          ${Xe(this.available, (e) => e.borrowernumber, (e) => T`
              <div
                class="staff-pill"
                draggable="true"
                @dragstart=${(t) => {
			this.dragging = {
				kind: "staff",
				staff: e
			}, t.dataTransfer?.setData("text/plain", String(e.borrowernumber));
		}}
              >
                ${e.surname}, ${e.firstname}
              </div>
            `)}
        </div>

        <div class="grid" style=${`--type-color: ${e}`}>
          <div class="header">Slot</div>
          ${kt.map((e, t) => T`<div class="header">${e}<br /><small>${this.cellDate(t).slice(5)}</small></div>`)}
          ${n.map((e) => {
			let n = t.find((t) => `${t.start_time}-${t.end_time}-${t.location ?? ""}` === e);
			return T`
              <div class="slot-label">
                <span class="time">${n.start_time.slice(0, 5)}–${n.end_time.slice(0, 5)}</span>
                ${n.location ? T`<br /><small>${n.location}</small>` : D}
              </div>
              ${kt.map((n, r) => {
				let i = t.find((t) => `${t.start_time}-${t.end_time}-${t.location ?? ""}` === e && t.day_of_week === r), a = this.cellDate(r), o = this.exceptionFor(a);
				if (!i) return T`<div class="cell"></div>`;
				if (o) return T`<div class="cell exception">closed</div>`;
				let s = this.assignmentsFor(i.id, a);
				return T`
                  <div
                    class="cell"
                    @dragover=${(e) => {
					e.preventDefault(), e.currentTarget.classList.add("dropping");
				}}
                    @dragleave=${(e) => {
					e.currentTarget.classList.remove("dropping");
				}}
                    @drop=${async (e) => {
					e.preventDefault(), e.currentTarget.classList.remove("dropping"), await this.dropOnCell(i, a);
				}}
                  >
                    ${Xe(s, (e) => e.id, (e) => T`
                        <div
                          class="assignment ${e.status}"
                          draggable="true"
                          title="${e.firstname} ${e.surname} (${e.status}). Click to remove."
                          @dragstart=${(t) => {
					this.dragging = {
						kind: "assignment",
						assignment: e
					}, t.dataTransfer?.setData("text/plain", String(e.id));
				}}
                          @click=${() => void this.deleteAssignment(e)}
                        >
                          ${e.surname}, ${e.firstname}
                        </div>
                      `)}
                    ${s.length < i.max_staff ? T`<small style="color:#888">${s.length}/${i.max_staff}</small>` : D}
                  </div>
                `;
			})}
            `;
		})}
        </div>
      </div>
    `;
	}
};
Q([Re({
	type: Number,
	attribute: "roster-id"
})], $.prototype, "rosterId", void 0), Q([Re({
	type: String,
	attribute: "week-start"
})], $.prototype, "weekStart", void 0), Q([M()], $.prototype, "week", void 0), Q([M()], $.prototype, "available", void 0), Q([M()], $.prototype, "staffQuery", void 0), Q([M()], $.prototype, "error", void 0), Q([M()], $.prototype, "dragging", void 0), $ = Q([Fe("staff-roster-grid")], $);
function At(e) {
	let t = (e.getDay() + 6) % 7, n = new Date(e);
	return n.setDate(e.getDate() - t), n.toISOString().slice(0, 10);
}
//#endregion
