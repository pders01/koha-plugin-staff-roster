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
var oe = globalThis, se = (e) => e, ce = oe.trustedTypes, le = ce ? ce.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ue = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + _, fe = `<${de}>`, v = document, y = () => v.createComment(""), b = (e) => e === null || typeof e != "object" && typeof e != "function", pe = Array.isArray, me = (e) => pe(e) || typeof e?.[Symbol.iterator] == "function", he = "[ 	\n\f\r]", x = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ge = /-->/g, _e = />/g, S = RegExp(`>|${he}(?:([^\\s"'>=/]+)(${he}*=${he}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ve = /'/g, ye = /"/g, be = /^(?:script|style|textarea|title)$/i, C = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), w = Symbol.for("lit-noChange"), T = Symbol.for("lit-nothing"), xe = /* @__PURE__ */ new WeakMap(), E = v.createTreeWalker(v, 129);
function Se(e, t) {
	if (!pe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return le === void 0 ? t : le.createHTML(t);
}
var Ce = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = x;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === x ? c[1] === "!--" ? o = ge : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = S) : (be.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = S) : o = _e : o === S ? c[0] === ">" ? (o = i ?? x, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? S : c[3] === "\"" ? ye : ve) : o === ye || o === ve ? o = S : o === ge || o === _e ? o = x : (o = S, i = void 0);
		let d = o === S && e[t + 1].startsWith("/>") ? " " : "";
		a += o === x ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + ue + n.slice(l) + _ + d) : n + _ + (l === -2 ? t : d);
	}
	return [Se(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, we = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Ce(t, n);
		if (this.el = e.createElement(l, r), E.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = E.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ue)) {
					let t = u[o++], n = i.getAttribute(e).split(_), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? De : r[1] === "?" ? Oe : r[1] === "@" ? ke : O
					}), i.removeAttribute(e);
				} else e.startsWith(_) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (be.test(i.tagName)) {
					let e = i.textContent.split(_), t = e.length - 1;
					if (t > 0) {
						i.textContent = ce ? ce.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], y()), E.nextNode(), c.push({
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
function D(e, t, n = e, r) {
	if (t === w) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = b(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = D(e, i._$AS(e, t.values), i, r)), t;
}
var Te = class {
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
		E.currentNode = r;
		let i = E.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Ee(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ae(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = E.nextNode(), a++);
		}
		return E.currentNode = v, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Ee = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = T, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = D(this, e, t), b(e) ? e === T || e == null || e === "" ? (this._$AH !== T && this._$AR(), this._$AH = T) : e !== this._$AH && e !== w && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? me(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== T && b(this._$AH) ? this._$AA.nextSibling.data = e : this.T(v.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = we.createElement(Se(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Te(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = xe.get(e.strings);
		return t === void 0 && xe.set(e.strings, t = new we(e)), t;
	}
	k(t) {
		pe(this._$AH) || (this._$AH = [], this._$AR());
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
}, O = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = T, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = T;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = D(this, e, t, 0), a = !b(e) || e !== this._$AH && e !== w, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = D(this, r[n + o], t, o), s === w && (s = this._$AH[o]), a ||= !b(s) || s !== this._$AH[o], s === T ? e = T : e !== T && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === T ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, De = class extends O {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === T ? void 0 : e;
	}
}, Oe = class extends O {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== T);
	}
}, ke = class extends O {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = D(this, e, t, 0) ?? T) === w) return;
		let n = this._$AH, r = e === T && n !== T || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== T && (n === T || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ae = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		D(this, e);
	}
}, je = {
	M: ue,
	P: _,
	A: de,
	C: 1,
	L: Ce,
	R: Te,
	D: me,
	V: D,
	I: Ee,
	H: O,
	N: Oe,
	U: ke,
	B: De,
	F: Ae
}, Me = oe.litHtmlPolyfillSupport;
Me?.(we, Ee), (oe.litHtmlVersions ??= []).push("3.3.2");
var Ne = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Ee(t.insertBefore(y(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Pe = globalThis, k = class extends g {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ne(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return w;
	}
};
k._$litElement$ = !0, k.finalized = !0, Pe.litElementHydrateSupport?.({ LitElement: k });
var Fe = Pe.litElementPolyfillSupport;
Fe?.({ LitElement: k }), (Pe.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var Ie = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, Le = {
	attribute: !0,
	type: String,
	converter: re,
	reflect: !1,
	hasChanged: ie
}, Re = (e = Le, t, n) => {
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
function ze(e) {
	return (t, n) => typeof n == "object" ? Re(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function A(e) {
	return ze({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region node_modules/lit-html/directive.js
var Be = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Ve = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), He = class {
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
}, { I: Ue } = je, We = (e) => e, Ge = () => document.createComment(""), j = (e, t, n) => {
	let r = e._$AA.parentNode, i = t === void 0 ? e._$AB : t._$AA;
	if (n === void 0) n = new Ue(r.insertBefore(Ge(), i), r.insertBefore(Ge(), i), e, e.options);
	else {
		let t = n._$AB.nextSibling, a = n._$AM, o = a !== e;
		if (o) {
			let t;
			n._$AQ?.(e), n._$AM = e, n._$AP !== void 0 && (t = e._$AU) !== a._$AU && n._$AP(t);
		}
		if (t !== i || o) {
			let e = n._$AA;
			for (; e !== t;) {
				let t = We(e).nextSibling;
				We(r).insertBefore(e, i), e = t;
			}
		}
	}
	return n;
}, M = (e, t, n = e) => (e._$AI(t, n), e), Ke = {}, qe = (e, t = Ke) => e._$AH = t, Je = (e) => e._$AH, Ye = (e) => {
	e._$AR(), e._$AA.remove();
}, Xe = (e, t, n) => {
	let r = /* @__PURE__ */ new Map();
	for (let i = t; i <= n; i++) r.set(e[i], i);
	return r;
}, Ze = Ve(class extends He {
	constructor(e) {
		if (super(e), e.type !== Be.CHILD) throw Error("repeat() can only be used in text expressions");
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
		let i = Je(e), { values: a, keys: o } = this.dt(t, n, r);
		if (!Array.isArray(i)) return this.ut = o, a;
		let s = this.ut ??= [], c = [], l, u, d = 0, f = i.length - 1, p = 0, m = a.length - 1;
		for (; d <= f && p <= m;) if (i[d] === null) d++;
		else if (i[f] === null) f--;
		else if (s[d] === o[p]) c[p] = M(i[d], a[p]), d++, p++;
		else if (s[f] === o[m]) c[m] = M(i[f], a[m]), f--, m--;
		else if (s[d] === o[m]) c[m] = M(i[d], a[m]), j(e, c[m + 1], i[d]), d++, m--;
		else if (s[f] === o[p]) c[p] = M(i[f], a[p]), j(e, i[d], i[f]), f--, p++;
		else if (l === void 0 && (l = Xe(o, p, m), u = Xe(s, d, f)), l.has(s[d])) if (l.has(s[f])) {
			let t = u.get(o[p]), n = t === void 0 ? null : i[t];
			if (n === null) {
				let t = j(e, i[d]);
				M(t, a[p]), c[p] = t;
			} else c[p] = M(n, a[p]), j(e, i[d], n), i[t] = null;
			p++;
		} else Ye(i[f]), f--;
		else Ye(i[d]), d++;
		for (; p <= m;) {
			let t = j(e, c[m + 1]);
			M(t, a[p]), c[p++] = t;
		}
		for (; d <= f;) {
			let e = i[d++];
			e !== null && Ye(e);
		}
		return this.ut = o, qe(e, c), w;
	}
});
//#endregion
//#region ../../../pers/web/lit-framework/dist/utilities-BUI2aO8f.js
async function Qe(e) {
	try {
		return [null, await e];
	} catch (e) {
		return [e instanceof Error ? e : Error(String(e)), null];
	}
}
//#endregion
//#region ../../../pers/web/lit-framework/node_modules/ts-pattern/dist/index.js
var N = Symbol.for("@ts-pattern/matcher"), $e = Symbol.for("@ts-pattern/isVariadic"), P = "@ts-pattern/anonymous-select-key", et = (e) => !!(e && typeof e == "object"), F = (e) => e && !!e[N], I = (e, t, n) => {
	if (F(e)) {
		let { matched: r, selections: i } = e[N]().match(t);
		return r && i && Object.keys(i).forEach((e) => n(e, i[e])), r;
	}
	if (et(e)) {
		if (!et(t)) return !1;
		if (Array.isArray(e)) {
			if (!Array.isArray(t)) return !1;
			let r = [], i = [], a = [];
			for (let t of e.keys()) {
				let n = e[t];
				F(n) && n[$e] ? a.push(n) : a.length ? i.push(n) : r.push(n);
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
			return (r in t || F(a = i) && a[N]().matcherType === "optional") && I(i, t[r], n);
			var a;
		});
	}
	return Object.is(t, e);
}, L = (e) => {
	var t;
	return et(e) ? F(e) ? (t = e[N]()).getSelectionKeys?.call(t) ?? [] : tt(Array.isArray(e) ? e : Object.values(e), L) : [];
}, tt = (e, t) => e.reduce((e, n) => e.concat(t(n)), []);
function nt(...e) {
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
		optional: () => it(e),
		and: (t) => z(e, t),
		or: (t) => ct(e, t),
		select: (t) => t === void 0 ? V(e) : V(t, e)
	});
}
function rt(e) {
	return Object.assign(((e) => Object.assign(e, { [Symbol.iterator]() {
		let t = 0, n = [{
			value: Object.assign(e, { [$e]: !0 }),
			done: !1
		}, {
			done: !0,
			value: void 0
		}];
		return { next: () => n[t++] ?? n.at(-1) };
	} }))(e), {
		optional: () => rt(it(e)),
		select: (t) => rt(t === void 0 ? V(e) : V(t, e))
	});
}
function it(e) {
	return R({ [N]: () => ({
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
var at = (e, t) => {
	for (let n of e) if (!t(n)) return !1;
	return !0;
}, ot = (e, t) => {
	for (let [n, r] of e.entries()) if (!t(r, n)) return !1;
	return !0;
}, st = (e, t) => {
	let n = Reflect.ownKeys(e);
	for (let r of n) if (!t(r, e[r])) return !1;
	return !0;
};
function z(...e) {
	return R({ [N]: () => ({
		match: (t) => {
			let n = {}, r = (e, t) => {
				n[e] = t;
			};
			return {
				matched: e.every((e) => I(e, t, r)),
				selections: n
			};
		},
		getSelectionKeys: () => tt(e, L),
		matcherType: "and"
	}) });
}
function ct(...e) {
	return R({ [N]: () => ({
		match: (t) => {
			let n = {}, r = (e, t) => {
				n[e] = t;
			};
			return tt(e, L).forEach((e) => r(e, void 0)), {
				matched: e.some((e) => I(e, t, r)),
				selections: n
			};
		},
		getSelectionKeys: () => tt(e, L),
		matcherType: "or"
	}) });
}
function B(e) {
	return { [N]: () => ({ match: (t) => ({ matched: !!e(t) }) }) };
}
function V(...e) {
	let t = typeof e[0] == "string" ? e[0] : void 0, n = e.length === 2 ? e[1] : typeof e[0] == "string" ? void 0 : e[0];
	return R({ [N]: () => ({
		match: (e) => {
			let r = { [t ?? P]: e };
			return {
				matched: n === void 0 || I(n, e, (e, t) => {
					r[e] = t;
				}),
				selections: r
			};
		},
		getSelectionKeys: () => [t ?? P].concat(n === void 0 ? [] : L(n))
	}) });
}
function lt(e) {
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
var ut = R(B(lt)), dt = R(B(lt)), ft = ut, G = (e) => Object.assign(R(e), {
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
}), pt = G(B(U)), K = (e) => Object.assign(R(e), {
	between: (t, n) => K(z(e, ((e, t) => B((n) => H(n) && e <= n && t >= n))(t, n))),
	lt: (t) => K(z(e, ((e) => B((t) => H(t) && t < e))(t))),
	gt: (t) => K(z(e, ((e) => B((t) => H(t) && t > e))(t))),
	lte: (t) => K(z(e, ((e) => B((t) => H(t) && t <= e))(t))),
	gte: (t) => K(z(e, ((e) => B((t) => H(t) && t >= e))(t))),
	int: () => K(z(e, B((e) => H(e) && Number.isInteger(e)))),
	finite: () => K(z(e, B((e) => H(e) && Number.isFinite(e)))),
	positive: () => K(z(e, B((e) => H(e) && e > 0))),
	negative: () => K(z(e, B((e) => H(e) && e < 0)))
}), mt = K(B(H)), q = (e) => Object.assign(R(e), {
	between: (t, n) => q(z(e, ((e, t) => B((n) => W(n) && e <= n && t >= n))(t, n))),
	lt: (t) => q(z(e, ((e) => B((t) => W(t) && t < e))(t))),
	gt: (t) => q(z(e, ((e) => B((t) => W(t) && t > e))(t))),
	lte: (t) => q(z(e, ((e) => B((t) => W(t) && t <= e))(t))),
	gte: (t) => q(z(e, ((e) => B((t) => W(t) && t >= e))(t))),
	positive: () => q(z(e, B((e) => W(e) && e > 0))),
	negative: () => q(z(e, B((e) => W(e) && e < 0)))
}), J = {
	__proto__: null,
	matcher: N,
	optional: it,
	array: function(...e) {
		return rt({ [N]: () => ({
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
		return R({ [N]: () => ({
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
					matched: at(t, (e) => I(i, e, r)),
					selections: n
				};
			},
			getSelectionKeys: () => e.length === 0 ? [] : L(e[0])
		}) });
	},
	map: function(...e) {
		return R({ [N]: () => ({
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
					matched: ot(t, (e, t) => {
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
		return R({ [N]: () => ({
			match: (t) => {
				if (typeof t != "object" || !t || Array.isArray(t)) return { matched: !1 };
				if (e.length === 0) throw Error(`\`P.record\` wasn't given enough arguments. Expected (value) or (key, value), received ${e[0]?.toString()}`);
				let n = {}, r = (e, t) => {
					n[e] = (n[e] || []).concat([t]);
				}, [i, a] = e.length === 1 ? [pt, e[0]] : e;
				return {
					matched: st(t, (e, t) => {
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
	union: ct,
	not: function(e) {
		return R({ [N]: () => ({
			match: (t) => ({ matched: !I(e, t, () => {}) }),
			getSelectionKeys: () => [],
			matcherType: "not"
		}) });
	},
	when: B,
	select: V,
	any: ut,
	unknown: dt,
	_: ft,
	string: pt,
	number: mt,
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
		return R(B(nt(e)));
	}
}, ht = class extends Error {
	constructor(e) {
		let t;
		try {
			t = JSON.stringify(e);
		} catch {
			t = e;
		}
		super(`Pattern matching error: no pattern matches value ${t}`), this.input = void 0, this.input = e;
	}
}, gt = {
	matched: !1,
	value: void 0
};
function _t(e) {
	return new vt(e, gt);
}
var vt = class e {
	constructor(e, t) {
		this.input = void 0, this.state = void 0, this.input = e, this.state = t;
	}
	with(...t) {
		if (this.state.matched) return this;
		let n = t[t.length - 1], r = [t[0]], i;
		t.length === 3 && typeof t[1] == "function" ? i = t[1] : t.length > 2 && r.push(...t.slice(1, t.length - 1));
		let a = !1, o = {}, s = (e, t) => {
			a = !0, o[e] = t;
		}, c = !r.some((e) => I(e, this.input, s)) || i && !i(this.input) ? gt : {
			matched: !0,
			value: n(a ? P in o ? o[P] : o : this.input, this.input)
		};
		return new e(this.input, c);
	}
	when(t, n) {
		if (this.state.matched) return this;
		let r = !!t(this.input);
		return new e(this.input, r ? {
			matched: !0,
			value: n(this.input, this.input)
		} : gt);
	}
	otherwise(e) {
		return this.state.matched ? this.state.value : e(this.input);
	}
	exhaustive(e = yt) {
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
function yt(e) {
	throw new ht(e);
}
//#endregion
//#region ../../../pers/web/lit-framework/dist/http-CJJa-frZ.js
var bt = class {
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
			let [t, a] = await Qe(fetch(n, r));
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
					let [, e] = await Qe(Promise.resolve(t(u, n, r)));
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
		return _t(e).with(J.nullish, () => "").with(J.string, (e) => e.startsWith("?") ? e.slice(1) : e).with(J._, (e) => new URLSearchParams(e).toString()).exhaustive();
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
		s = _t(r?.body).with(J.nullish, () => s).with(J.instanceOf(FormData), () => s).with(J._, (e) => ({
			...s,
			headers: { "Content-Type": "application/json" },
			body: e
		})).exhaustive();
		let c = navigator.userAgent.toLowerCase();
		s.cache = _t(c).when((e) => e.includes("chrome"), () => a.ignoreCache ? "no-cache" : "no-store").when((e) => e.includes("firefox"), () => a.ignoreCache ? "no-cache" : "default").otherwise(() => a.ignoreCache ? "no-cache" : a.cache ? "default" : "force-cache");
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
}, Y = "/api/v1/contrib/staffroster", X = new bt(Y, {
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
async function xt(e, t) {
	return Z(await X.get({
		endpoint: "rosterWeek",
		path: [String(e), "week"],
		query: { start: t }
	}));
}
async function St(e) {
	return Z(await X.post({
		endpoint: "assignments",
		requestInit: {
			method: "post",
			body: JSON.stringify(e)
		}
	}));
}
async function Ct(e, t) {
	return Z(await X.put({
		endpoint: "assignments",
		path: [String(e)],
		requestInit: {
			method: "put",
			body: JSON.stringify(t)
		}
	}));
}
async function wt(e) {
	await Z(await X.delete({
		endpoint: "assignments",
		path: [String(e)]
	}));
}
async function Tt(e) {
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
var Et = 5e3, Dt = 10, Ot = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun"
], kt = (e) => (e + 1) % 7, $ = class extends k {
	constructor(...e) {
		super(...e), this.rosterId = 0, this.weekStart = "", this.week = null, this.available = [], this.staffQuery = "", this.error = "", this.dragging = null, this.pendingDelete = null, this.undoStack = [], this.onKeyDown = (e) => {
			(e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey && (e.preventDefault(), this.undo());
		};
	}
	setError(e) {
		this.error = e, this.errorDismissTimer && clearTimeout(this.errorDismissTimer), e && (this.errorDismissTimer = setTimeout(() => this.error = "", 5e3));
	}
	createRenderRoot() {
		return this;
	}
	connectedCallback() {
		super.connectedCallback(), this.weekStart ||= At(/* @__PURE__ */ new Date()), this.refresh(), this.pollTimer = setInterval(() => void this.refresh(), Et), document.addEventListener("keydown", this.onKeyDown);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.pollTimer && clearInterval(this.pollTimer), document.removeEventListener("keydown", this.onKeyDown);
	}
	async refresh() {
		if (this.rosterId) try {
			this.week = await xt(this.rosterId, this.weekStart), this.error = "";
		} catch (e) {
			this.setError(e.message);
		}
	}
	async loadAvailable() {
		if (this.week) try {
			this.available = await Tt({
				date: this.weekStart,
				q: this.staffQuery || void 0
			});
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
		this.undoStack.push(e), this.undoStack.length > Dt && this.undoStack.shift();
	}
	async undo() {
		let e = this.undoStack.pop();
		if (e) try {
			e.kind === "create" ? await wt(e.id) : e.kind === "delete" ? await St(e.payload) : await Ct(e.id, e.before), await this.refresh();
		} catch (e) {
			this.setError(`Undo failed: ${e.message}`);
		}
	}
	async dropOnCell(e, t) {
		if (this.dragging) {
			if (this.dragging.kind === "staff") {
				let n = this.dragging.staff;
				try {
					let r = await St({
						slot_id: e.id,
						borrowernumber: n.borrowernumber,
						assignment_date: t
					});
					await this.pushUndo({
						kind: "create",
						id: r.id
					}), await this.refresh();
				} catch (e) {
					this.setError(e.message);
				}
			} else {
				let n = this.dragging.assignment;
				if (n.slot_id === e.id && n.assignment_date === t) return;
				try {
					await Ct(n.id, {
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
					this.setError(e.message);
				}
			}
			this.dragging = null;
		}
	}
	requestDelete(e) {
		this.pendingDelete = e;
	}
	cancelDelete() {
		this.pendingDelete = null;
	}
	async confirmDelete() {
		let e = this.pendingDelete;
		if (e) {
			this.pendingDelete = null;
			try {
				await wt(e.id), await this.pushUndo({
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
				this.setError(e.message);
			}
		}
	}
	onStaffSearch(e) {
		this.staffQuery = e.target.value, this.staffDebounce && clearTimeout(this.staffDebounce), this.staffDebounce = setTimeout(() => void this.loadAvailable(), 300);
	}
	render() {
		if (!this.week) return C`<div class="text-center text-muted py-4">Loading…</div>`;
		let e = this.week.roster.type_color, t = [...this.week.slots].sort((e, t) => e.start_time.localeCompare(t.start_time) || e.day_of_week - t.day_of_week), n = [...new Set(t.map((e) => `${e.start_time}-${e.end_time}-${e.location ?? ""}`))];
		return C`
      ${this.error ? C`
            <div class="srg-toast alert alert-danger" role="alert" aria-live="assertive">
              <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
              <span>${this.error}</span>
              <button
                type="button"
                class="btn-close"
                aria-label="Dismiss"
                @click=${() => this.error = ""}
              ></button>
            </div>
          ` : T}

      <div class="btn-toolbar srg-toolbar" role="toolbar">
        <div class="btn-group" role="group">
          <button class="btn btn-default btn-sm" @click=${() => this.shiftWeek(-7)}>
            <i class="fa fa-arrow-left" aria-hidden="true"></i> Previous
          </button>
          <button class="btn btn-default btn-sm" @click=${() => this.shiftWeek(7)}>
            Next <i class="fa fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
        <span class="srg-week-label">Week of ${this.weekStart}</span>
        <div class="btn-group" role="group">
          <button
            class="btn btn-default btn-sm"
            @click=${() => void this.undo()}
            ?disabled=${this.undoStack.length === 0}
          >
            <i class="fa fa-undo" aria-hidden="true"></i> Undo (${this.undoStack.length})
          </button>
          <button class="btn btn-default btn-sm" @click=${() => void this.refresh()}>
            <i class="fa fa-refresh" aria-hidden="true"></i> Refresh
          </button>
        </div>
      </div>

      <div class="page-section srg-layout" style=${`--srg-type-color: ${e}`}>
        <section class="srg-staff-panel">
          <h3 class="srg-panel-title">Available staff</h3>
          <input
            type="search"
            class="form-control input-sm"
            placeholder="Search staff…"
            .value=${this.staffQuery}
            @input=${this.onStaffSearch}
            @focus=${() => void this.loadAvailable()}
          />
          <ul class="list-group srg-staff-list" role="list">
            ${Ze(this.available, (e) => e.borrowernumber, (e) => C`
                <li
                  class="list-group-item srg-staff-pill"
                  draggable="true"
                  @dragstart=${(t) => {
			this.dragging = {
				kind: "staff",
				staff: e
			}, t.dataTransfer?.setData("text/plain", String(e.borrowernumber));
		}}
                >
                  <i class="fa fa-user text-muted" aria-hidden="true"></i>
                  <span>${e.surname}, ${e.firstname}</span>
                  <i class="fa fa-grip-vertical text-muted srg-grip" aria-hidden="true"></i>
                </li>
              `)}
            ${this.available.length === 0 && this.staffQuery ? C`<li class="list-group-item text-muted">No matches</li>` : T}
          </ul>
        </section>

        <section class="srg-grid-wrap">
          <table class="table srg-grid">
            <thead>
              <tr>
                <th class="srg-slot-col">Slot</th>
                ${Ot.map((e, t) => C`
                    <th>
                      <span class="srg-day">${e}</span>
                      <small class="text-muted">${this.cellDate(t).slice(5)}</small>
                    </th>
                  `)}
              </tr>
            </thead>
            <tbody>
              ${n.length === 0 ? C`
                    <tr>
                      <td colspan="8" class="srg-empty">
                        <p>No time slots defined for this roster yet.</p>
                        <a class="btn btn-default btn-sm" href="?class=${jt()}&method=tool&op=manage_slots&roster_id=${this.rosterId}">
                          <i class="fa fa-clock" aria-hidden="true"></i> Manage slots
                        </a>
                      </td>
                    </tr>
                  ` : T}
              ${n.map((e) => {
			let n = t.find((t) => `${t.start_time}-${t.end_time}-${t.location ?? ""}` === e);
			return C`
                  <tr>
                    <th scope="row" class="srg-slot-cell">
                      <span class="srg-slot-time">${n.start_time.slice(0, 5)}–${n.end_time.slice(0, 5)}</span>
                      ${n.location ? C`<small class="text-muted d-block">${n.location}</small>` : T}
                    </th>
                    ${Ot.map((n, r) => {
				let i = kt(r), a = t.find((t) => `${t.start_time}-${t.end_time}-${t.location ?? ""}` === e && t.day_of_week === i), o = this.cellDate(r), s = this.exceptionFor(o);
				if (!a) return C`<td class="srg-cell-empty"></td>`;
				if (s) return C`<td class="srg-cell-exception"><small>closed</small></td>`;
				let c = this.assignmentsFor(a.id, o), l = c.length;
				return C`
                        <td
                          class="srg-cell"
                          @dragover=${(e) => {
					e.preventDefault(), e.currentTarget.classList.add("srg-dropping");
				}}
                          @dragleave=${(e) => {
					e.currentTarget.classList.remove("srg-dropping");
				}}
                          @drop=${async (e) => {
					e.preventDefault(), e.currentTarget.classList.remove("srg-dropping"), await this.dropOnCell(a, o);
				}}
                        >
                          ${Ze(c, (e) => e.id, (e) => C`
                              <div
                                class="srg-assignment srg-status-${e.status}"
                                draggable="true"
                                title="${e.firstname} ${e.surname} (${e.status}). Click to remove."
                                @dragstart=${(t) => {
					this.dragging = {
						kind: "assignment",
						assignment: e
					}, t.dataTransfer?.setData("text/plain", String(e.id));
				}}
                                @click=${() => this.requestDelete(e)}
                              >
                                ${e.surname}, ${e.firstname}
                              </div>
                            `)}
                          <small class="srg-capacity">${l}/${a.max_staff}</small>
                        </td>
                      `;
			})}
                  </tr>
                `;
		})}
            </tbody>
          </table>
        </section>
      </div>

      ${this.pendingDelete ? this.renderDeleteModal(this.pendingDelete) : T}
    `;
	}
	renderDeleteModal(e) {
		return C`
      <div
        class="modal show staff-roster-modal-open"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        style="display: block;"
        @click=${(e) => {
			e.target.classList.contains("modal") && this.cancelDelete();
		}}
      >
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h1 class="modal-title">Remove assignment?</h1>
              <button type="button" class="btn-close" aria-label="Close" @click=${() => this.cancelDelete()}></button>
            </div>
            <div class="modal-body">
              <p>Remove <strong>${e.surname}, ${e.firstname}</strong> from this slot on ${e.assignment_date}?</p>
              <p class="text-muted">You can undo with Cmd-Z (or the Undo button) if this was a mistake.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-danger" @click=${() => void this.confirmDelete()}>
                <i class="fa fa-trash"></i> Remove
              </button>
              <button type="button" class="btn btn-default" @click=${() => this.cancelDelete()}>
                <i class="fa fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show staff-roster-modal-backdrop"></div>
    `;
	}
};
Q([ze({
	type: Number,
	attribute: "roster-id"
})], $.prototype, "rosterId", void 0), Q([ze({
	type: String,
	attribute: "week-start"
})], $.prototype, "weekStart", void 0), Q([A()], $.prototype, "week", void 0), Q([A()], $.prototype, "available", void 0), Q([A()], $.prototype, "staffQuery", void 0), Q([A()], $.prototype, "error", void 0), Q([A()], $.prototype, "dragging", void 0), Q([A()], $.prototype, "pendingDelete", void 0), $ = Q([Ie("staff-roster-grid")], $);
function At(e) {
	let t = (e.getDay() + 6) % 7, n = new Date(e);
	return n.setDate(e.getDate() - t), n.toISOString().slice(0, 10);
}
function jt() {
	return new URLSearchParams(window.location.search).get("class") ?? "";
}
//#endregion
