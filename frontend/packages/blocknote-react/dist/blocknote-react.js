import He, { useState as ie, useCallback as Vn, useRef as pr, useEffect as Dt, forwardRef as ju, useMemo as o0 } from "react";
import { EditorContent as a0, NodeViewContent as l0, ReactNodeViewRenderer as f0, NodeViewWrapper as c0 } from "@tiptap/react";
import { blockStyles as Yu, createTipTapBlock as s0, propsToAttributes as d0, parse as h0, render as g0, camelToDataKebab as v0, BaseSlashMenuItem as p0, defaultSlashMenuItems as _0, BlockNoteEditor as m0 } from "@mtt-blocknote/core";
import x0 from "react-dom";
import { MantineProvider as y0, createStyles as Ft, Menu as ln, Box as zl, Group as no, ActionIcon as Ku, Stack as eo, Text as bi, Button as Dl, ColorPicker as w0, Container as b0, TextInput as C0, Badge as T0 } from "@mantine/core";
import Ti from "@tippyjs/react";
var hr = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, Zu = { exports: {} }, gr = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ml;
function E0() {
  if (Ml)
    return gr;
  Ml = 1;
  var u = He, g = Symbol.for("react.element"), a = Symbol.for("react.fragment"), b = Object.prototype.hasOwnProperty, T = u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, I = { key: !0, ref: !0, __self: !0, __source: !0 };
  function C(V, D, hn) {
    var Z, nn = {}, Cn = null, Tn = null;
    hn !== void 0 && (Cn = "" + hn), D.key !== void 0 && (Cn = "" + D.key), D.ref !== void 0 && (Tn = D.ref);
    for (Z in D)
      b.call(D, Z) && !I.hasOwnProperty(Z) && (nn[Z] = D[Z]);
    if (V && V.defaultProps)
      for (Z in D = V.defaultProps, D)
        nn[Z] === void 0 && (nn[Z] = D[Z]);
    return { $$typeof: g, type: V, key: Cn, ref: Tn, props: nn, _owner: T.current };
  }
  return gr.Fragment = a, gr.jsx = C, gr.jsxs = C, gr;
}
var vr = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ll;
function R0() {
  return Ll || (Ll = 1, process.env.NODE_ENV !== "production" && function() {
    var u = He, g = Symbol.for("react.element"), a = Symbol.for("react.portal"), b = Symbol.for("react.fragment"), T = Symbol.for("react.strict_mode"), I = Symbol.for("react.profiler"), C = Symbol.for("react.provider"), V = Symbol.for("react.context"), D = Symbol.for("react.forward_ref"), hn = Symbol.for("react.suspense"), Z = Symbol.for("react.suspense_list"), nn = Symbol.for("react.memo"), Cn = Symbol.for("react.lazy"), Tn = Symbol.for("react.offscreen"), be = Symbol.iterator, gt = "@@iterator";
    function In(c) {
      if (c === null || typeof c != "object")
        return null;
      var w = be && c[be] || c[gt];
      return typeof w == "function" ? w : null;
    }
    var Mn = u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function pn(c) {
      {
        for (var w = arguments.length, E = new Array(w > 1 ? w - 1 : 0), B = 1; B < w; B++)
          E[B - 1] = arguments[B];
        Yn("error", c, E);
      }
    }
    function Yn(c, w, E) {
      {
        var B = Mn.ReactDebugCurrentFrame, q = B.getStackAddendum();
        q !== "" && (w += "%s", E = E.concat([q]));
        var J = E.map(function(N) {
          return String(N);
        });
        J.unshift("Warning: " + w), Function.prototype.apply.call(console[c], console, J);
      }
    }
    var ze = !1, Kn = !1, De = !1, ue = !1, je = !1, vt;
    vt = Symbol.for("react.module.reference");
    function Ri(c) {
      return !!(typeof c == "string" || typeof c == "function" || c === b || c === I || je || c === T || c === hn || c === Z || ue || c === Tn || ze || Kn || De || typeof c == "object" && c !== null && (c.$$typeof === Cn || c.$$typeof === nn || c.$$typeof === C || c.$$typeof === V || c.$$typeof === D || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      c.$$typeof === vt || c.getModuleId !== void 0));
    }
    function Si(c, w, E) {
      var B = c.displayName;
      if (B)
        return B;
      var q = w.displayName || w.name || "";
      return q !== "" ? E + "(" + q + ")" : E;
    }
    function _r(c) {
      return c.displayName || "Context";
    }
    function oe(c) {
      if (c == null)
        return null;
      if (typeof c.tag == "number" && pn("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof c == "function")
        return c.displayName || c.name || null;
      if (typeof c == "string")
        return c;
      switch (c) {
        case b:
          return "Fragment";
        case a:
          return "Portal";
        case I:
          return "Profiler";
        case T:
          return "StrictMode";
        case hn:
          return "Suspense";
        case Z:
          return "SuspenseList";
      }
      if (typeof c == "object")
        switch (c.$$typeof) {
          case V:
            var w = c;
            return _r(w) + ".Consumer";
          case C:
            var E = c;
            return _r(E._context) + ".Provider";
          case D:
            return Si(c, c.render, "ForwardRef");
          case nn:
            var B = c.displayName || null;
            return B !== null ? B : oe(c.type) || "Memo";
          case Cn: {
            var q = c, J = q._payload, N = q._init;
            try {
              return oe(N(J));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var ge = Object.assign, nt = 0, mr, ve, ae, xr, et, zn, yr;
    function wr() {
    }
    wr.__reactDisabledLog = !0;
    function Ai() {
      {
        if (nt === 0) {
          mr = console.log, ve = console.info, ae = console.warn, xr = console.error, et = console.group, zn = console.groupCollapsed, yr = console.groupEnd;
          var c = {
            configurable: !0,
            enumerable: !0,
            value: wr,
            writable: !0
          };
          Object.defineProperties(console, {
            info: c,
            log: c,
            warn: c,
            error: c,
            group: c,
            groupCollapsed: c,
            groupEnd: c
          });
        }
        nt++;
      }
    }
    function Fe() {
      {
        if (nt--, nt === 0) {
          var c = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: ge({}, c, {
              value: mr
            }),
            info: ge({}, c, {
              value: ve
            }),
            warn: ge({}, c, {
              value: ae
            }),
            error: ge({}, c, {
              value: xr
            }),
            group: ge({}, c, {
              value: et
            }),
            groupCollapsed: ge({}, c, {
              value: zn
            }),
            groupEnd: ge({}, c, {
              value: yr
            })
          });
        }
        nt < 0 && pn("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var Ue = Mn.ReactCurrentDispatcher, Ut;
    function pe(c, w, E) {
      {
        if (Ut === void 0)
          try {
            throw Error();
          } catch (q) {
            var B = q.stack.trim().match(/\n( *(at )?)/);
            Ut = B && B[1] || "";
          }
        return `
` + Ut + c;
      }
    }
    var Ce = !1, pt;
    {
      var _t = typeof WeakMap == "function" ? WeakMap : Map;
      pt = new _t();
    }
    function tt(c, w) {
      if (!c || Ce)
        return "";
      {
        var E = pt.get(c);
        if (E !== void 0)
          return E;
      }
      var B;
      Ce = !0;
      var q = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var J;
      J = Ue.current, Ue.current = null, Ai();
      try {
        if (w) {
          var N = function() {
            throw Error();
          };
          if (Object.defineProperty(N.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(N, []);
            } catch (On) {
              B = On;
            }
            Reflect.construct(c, [], N);
          } else {
            try {
              N.call();
            } catch (On) {
              B = On;
            }
            c.call(N.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (On) {
            B = On;
          }
          c();
        }
      } catch (On) {
        if (On && B && typeof On.stack == "string") {
          for (var U = On.stack.split(`
`), mn = B.stack.split(`
`), on = U.length - 1, fn = mn.length - 1; on >= 1 && fn >= 0 && U[on] !== mn[fn]; )
            fn--;
          for (; on >= 1 && fn >= 0; on--, fn--)
            if (U[on] !== mn[fn]) {
              if (on !== 1 || fn !== 1)
                do
                  if (on--, fn--, fn < 0 || U[on] !== mn[fn]) {
                    var Ln = `
` + U[on].replace(" at new ", " at ");
                    return c.displayName && Ln.includes("<anonymous>") && (Ln = Ln.replace("<anonymous>", c.displayName)), typeof c == "function" && pt.set(c, Ln), Ln;
                  }
                while (on >= 1 && fn >= 0);
              break;
            }
        }
      } finally {
        Ce = !1, Ue.current = J, Fe(), Error.prepareStackTrace = q;
      }
      var fe = c ? c.displayName || c.name : "", Lr = fe ? pe(fe) : "";
      return typeof c == "function" && pt.set(c, Lr), Lr;
    }
    function br(c, w, E) {
      return tt(c, !1);
    }
    function Dn(c) {
      var w = c.prototype;
      return !!(w && w.isReactComponent);
    }
    function _e(c, w, E) {
      if (c == null)
        return "";
      if (typeof c == "function")
        return tt(c, Dn(c));
      if (typeof c == "string")
        return pe(c);
      switch (c) {
        case hn:
          return pe("Suspense");
        case Z:
          return pe("SuspenseList");
      }
      if (typeof c == "object")
        switch (c.$$typeof) {
          case D:
            return br(c.render);
          case nn:
            return _e(c.type, w, E);
          case Cn: {
            var B = c, q = B._payload, J = B._init;
            try {
              return _e(J(q), w, E);
            } catch {
            }
          }
        }
      return "";
    }
    var mt = Object.prototype.hasOwnProperty, Zn = {}, Wt = Mn.ReactDebugCurrentFrame;
    function xt(c) {
      if (c) {
        var w = c._owner, E = _e(c.type, c._source, w ? w.type : null);
        Wt.setExtraStackFrame(E);
      } else
        Wt.setExtraStackFrame(null);
    }
    function rt(c, w, E, B, q) {
      {
        var J = Function.call.bind(mt);
        for (var N in c)
          if (J(c, N)) {
            var U = void 0;
            try {
              if (typeof c[N] != "function") {
                var mn = Error((B || "React class") + ": " + E + " type `" + N + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof c[N] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw mn.name = "Invariant Violation", mn;
              }
              U = c[N](w, N, B, E, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (on) {
              U = on;
            }
            U && !(U instanceof Error) && (xt(q), pn("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", B || "React class", E, N, typeof U), xt(null)), U instanceof Error && !(U.message in Zn) && (Zn[U.message] = !0, xt(q), pn("Failed %s type: %s", E, U.message), xt(null));
          }
      }
    }
    var Fn = Array.isArray;
    function Te(c) {
      return Fn(c);
    }
    function yt(c) {
      {
        var w = typeof Symbol == "function" && Symbol.toStringTag, E = w && c[Symbol.toStringTag] || c.constructor.name || "Object";
        return E;
      }
    }
    function Ii(c) {
      try {
        return We(c), !1;
      } catch {
        return !0;
      }
    }
    function We(c) {
      return "" + c;
    }
    function Cr(c) {
      if (Ii(c))
        return pn("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", yt(c)), We(c);
    }
    var le = Mn.ReactCurrentOwner, Ne = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, wt, bt, it;
    it = {};
    function Nt(c) {
      if (mt.call(c, "ref")) {
        var w = Object.getOwnPropertyDescriptor(c, "ref").get;
        if (w && w.isReactWarning)
          return !1;
      }
      return c.ref !== void 0;
    }
    function $t(c) {
      if (mt.call(c, "key")) {
        var w = Object.getOwnPropertyDescriptor(c, "key").get;
        if (w && w.isReactWarning)
          return !1;
      }
      return c.key !== void 0;
    }
    function Gt(c, w) {
      if (typeof c.ref == "string" && le.current && w && le.current.stateNode !== w) {
        var E = oe(le.current.type);
        it[E] || (pn('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', oe(le.current.type), c.ref), it[E] = !0);
      }
    }
    function qt(c, w) {
      {
        var E = function() {
          wt || (wt = !0, pn("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", w));
        };
        E.isReactWarning = !0, Object.defineProperty(c, "key", {
          get: E,
          configurable: !0
        });
      }
    }
    function Vt(c, w) {
      {
        var E = function() {
          bt || (bt = !0, pn("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", w));
        };
        E.isReactWarning = !0, Object.defineProperty(c, "ref", {
          get: E,
          configurable: !0
        });
      }
    }
    var Yt = function(c, w, E, B, q, J, N) {
      var U = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: g,
        // Built-in properties that belong on the element
        type: c,
        key: w,
        ref: E,
        props: N,
        // Record the component responsible for creating this element.
        _owner: J
      };
      return U._store = {}, Object.defineProperty(U._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(U, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: B
      }), Object.defineProperty(U, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: q
      }), Object.freeze && (Object.freeze(U.props), Object.freeze(U)), U;
    };
    function Mi(c, w, E, B, q) {
      {
        var J, N = {}, U = null, mn = null;
        E !== void 0 && (Cr(E), U = "" + E), $t(w) && (Cr(w.key), U = "" + w.key), Nt(w) && (mn = w.ref, Gt(w, q));
        for (J in w)
          mt.call(w, J) && !Ne.hasOwnProperty(J) && (N[J] = w[J]);
        if (c && c.defaultProps) {
          var on = c.defaultProps;
          for (J in on)
            N[J] === void 0 && (N[J] = on[J]);
        }
        if (U || mn) {
          var fn = typeof c == "function" ? c.displayName || c.name || "Unknown" : c;
          U && qt(N, fn), mn && Vt(N, fn);
        }
        return Yt(c, U, mn, q, B, le.current, N);
      }
    }
    var Kt = Mn.ReactCurrentOwner, Tr = Mn.ReactDebugCurrentFrame;
    function Ee(c) {
      if (c) {
        var w = c._owner, E = _e(c.type, c._source, w ? w.type : null);
        Tr.setExtraStackFrame(E);
      } else
        Tr.setExtraStackFrame(null);
    }
    var Ct;
    Ct = !1;
    function Zt(c) {
      return typeof c == "object" && c !== null && c.$$typeof === g;
    }
    function Er() {
      {
        if (Kt.current) {
          var c = oe(Kt.current.type);
          if (c)
            return `

Check the render method of \`` + c + "`.";
        }
        return "";
      }
    }
    function Li(c) {
      {
        if (c !== void 0) {
          var w = c.fileName.replace(/^.*[\\\/]/, ""), E = c.lineNumber;
          return `

Check your code at ` + w + ":" + E + ".";
        }
        return "";
      }
    }
    var Rr = {};
    function Sr(c) {
      {
        var w = Er();
        if (!w) {
          var E = typeof c == "string" ? c : c.displayName || c.name;
          E && (w = `

Check the top-level render call using <` + E + ">.");
        }
        return w;
      }
    }
    function Ar(c, w) {
      {
        if (!c._store || c._store.validated || c.key != null)
          return;
        c._store.validated = !0;
        var E = Sr(w);
        if (Rr[E])
          return;
        Rr[E] = !0;
        var B = "";
        c && c._owner && c._owner !== Kt.current && (B = " It was passed a child from " + oe(c._owner.type) + "."), Ee(c), pn('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', E, B), Ee(null);
      }
    }
    function Ir(c, w) {
      {
        if (typeof c != "object")
          return;
        if (Te(c))
          for (var E = 0; E < c.length; E++) {
            var B = c[E];
            Zt(B) && Ar(B, w);
          }
        else if (Zt(c))
          c._store && (c._store.validated = !0);
        else if (c) {
          var q = In(c);
          if (typeof q == "function" && q !== c.entries)
            for (var J = q.call(c), N; !(N = J.next()).done; )
              Zt(N.value) && Ar(N.value, w);
        }
      }
    }
    function Oi(c) {
      {
        var w = c.type;
        if (w == null || typeof w == "string")
          return;
        var E;
        if (typeof w == "function")
          E = w.propTypes;
        else if (typeof w == "object" && (w.$$typeof === D || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        w.$$typeof === nn))
          E = w.propTypes;
        else
          return;
        if (E) {
          var B = oe(w);
          rt(E, c.props, "prop", B, c);
        } else if (w.PropTypes !== void 0 && !Ct) {
          Ct = !0;
          var q = oe(w);
          pn("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", q || "Unknown");
        }
        typeof w.getDefaultProps == "function" && !w.getDefaultProps.isReactClassApproved && pn("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function Jt(c) {
      {
        for (var w = Object.keys(c.props), E = 0; E < w.length; E++) {
          var B = w[E];
          if (B !== "children" && B !== "key") {
            Ee(c), pn("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", B), Ee(null);
            break;
          }
        }
        c.ref !== null && (Ee(c), pn("Invalid attribute `ref` supplied to `React.Fragment`."), Ee(null));
      }
    }
    function Mr(c, w, E, B, q, J) {
      {
        var N = Ri(c);
        if (!N) {
          var U = "";
          (c === void 0 || typeof c == "object" && c !== null && Object.keys(c).length === 0) && (U += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var mn = Li(q);
          mn ? U += mn : U += Er();
          var on;
          c === null ? on = "null" : Te(c) ? on = "array" : c !== void 0 && c.$$typeof === g ? (on = "<" + (oe(c.type) || "Unknown") + " />", U = " Did you accidentally export a JSX literal instead of a component?") : on = typeof c, pn("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", on, U);
        }
        var fn = Mi(c, w, E, q, J);
        if (fn == null)
          return fn;
        if (N) {
          var Ln = w.children;
          if (Ln !== void 0)
            if (B)
              if (Te(Ln)) {
                for (var fe = 0; fe < Ln.length; fe++)
                  Ir(Ln[fe], c);
                Object.freeze && Object.freeze(Ln);
              } else
                pn("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              Ir(Ln, c);
        }
        return c === b ? Jt(fn) : Oi(fn), fn;
      }
    }
    function Xt(c, w, E) {
      return Mr(c, w, E, !0);
    }
    function Bi(c, w, E) {
      return Mr(c, w, E, !1);
    }
    var ki = Bi, Hi = Xt;
    vr.Fragment = b, vr.jsx = ki, vr.jsxs = Hi;
  }()), vr;
}
process.env.NODE_ENV === "production" ? Zu.exports = E0() : Zu.exports = R0();
var to = Zu.exports;
const S0 = to.Fragment, x = to.jsx, An = to.jsxs;
function kv(u) {
  var g;
  return (
    // TODO: Should we wrap editor in MantineProvider? Otherwise we have to duplicate color hex values.
    // <MantineProvider theme={BlockNoteTheme}>
    /* @__PURE__ */ x(a0, { editor: ((g = u.editor) == null ? void 0 : g._tiptapEditor) || null })
  );
}
const Hv = (u) => /* @__PURE__ */ x(
  l0,
  {
    ...u,
    className: `${u.className ? u.className + " " : ""}${Yu.inlineContent}`
  }
);
function Pv(u) {
  return {
    node: s0({
      name: u.type,
      content: u.containsInlineContent ? "inline*" : "",
      selectable: u.containsInlineContent,
      addOptions() {
        return {
          editor: void 0
        };
      },
      addAttributes() {
        return d0(u);
      },
      parseHTML() {
        return h0(u);
      },
      renderHTML({ HTMLAttributes: a }) {
        return g0(u, a);
      },
      addNodeView() {
        return f0((b) => {
          const T = u.render, I = {};
          for (const [Cn, Tn] of Object.entries(b.node.attrs))
            Cn in u.propSchema && (I[v0(Cn)] = Tn);
          const C = this.options.editor, V = typeof b.getPos == "function" ? b.getPos() : void 0, Z = C._tiptapEditor.state.doc.resolve(V).node().attrs.id, nn = C.getBlock(Z);
          if (nn.type !== u.type)
            throw new Error("Block type does not match");
          return /* @__PURE__ */ x(
            c0,
            {
              className: Yu.blockContent,
              "data-content-type": u.type,
              ...I,
              children: /* @__PURE__ */ x(T, { block: nn, editor: C })
            }
          );
        }, {
          className: Yu.reactNodeViewRenderer
        });
      }
    }),
    propSchema: u.propSchema
  };
}
const Y = [
  "#FFFFFF",
  "#EEEEEE",
  "#DDDDDD",
  "#CCCCCC",
  "#999999",
  "#666666",
  "#444444",
  "#333333",
  "#222222",
  "#111111"
], mi = (u = !1) => {
  const g = `0px 4px 8px ${u ? Y[8] : Y[2]}, 0px 0px 1px ${u ? Y[6] : Y[1]}`, a = `1px solid ${u ? Y[7] : Y[1]}`, b = u ? Y[4] : Y[3], T = u ? Y[6] : Y[0], I = u ? Y[7] : Y[1], C = u ? Y[2] : Y[6], V = Y[4], D = u ? Y[7] : Y[1], hn = u ? Y[2] : Y[6], Z = u ? Y[8] : Y[6], nn = u ? Y[2] : Y[0], Cn = u ? Y[7] : Y[1], Tn = u ? Y[5] : Y[3];
  return {
    activeStyles: {
      // Removes button press effect.
      transform: "none"
    },
    colorScheme: u ? "dark" : "light",
    colors: {
      scheme: Y,
      dark: Y,
      textColors: [
        // primaryText,
        Y[6],
        "#9b9a97",
        "#64473a",
        "#e03e3e",
        "#d9730d",
        "#dfab01",
        "#4d6461",
        "#0b6e99",
        "#6940a5",
        "#ad1a72"
      ],
      backgroundColors: [
        // primaryBackground,
        Y[0],
        "#ebeced",
        "#e9e5e3",
        "#fbe4e4",
        "#f6e9d9",
        "#fbf3db",
        "#ddedea",
        "#ddebf1",
        "#eae4f2",
        "#f4dfeb"
      ]
    },
    components: {
      // Block Side Menu items
      ActionIcon: {
        styles: () => ({
          root: {
            color: b
          }
        })
      },
      // Slash Menu, Formatting Toolbar dropdown, color picker dropdown
      Menu: {
        styles: () => ({
          dropdown: {
            backgroundColor: T,
            border: a,
            borderRadius: "6px",
            boxShadow: g,
            color: C,
            padding: "2px",
            ".mantine-Menu-item": {
              backgroundColor: T,
              border: "none",
              color: C
            },
            ".mantine-Menu-item[data-hovered]": {
              backgroundColor: D,
              border: "none",
              color: hn
            }
          }
        })
      },
      DragHandleMenu: {
        styles: () => ({
          root: {
            ".mantine-Menu-item": {
              fontSize: "12px",
              height: "30px"
            }
          }
        })
      },
      EditHyperlinkMenu: {
        styles: () => ({
          root: {
            backgroundColor: T,
            border: a,
            borderRadius: "6px",
            boxShadow: g,
            color: C,
            gap: "4px",
            minWidth: "145px",
            padding: "2px",
            // Row
            ".mantine-Group-root": {
              flexWrap: "nowrap",
              gap: "8px",
              paddingInline: "6px",
              // Row icon
              ".mantine-Container-root": {
                color: C,
                display: "flex",
                justifyContent: "center",
                padding: 0,
                width: "fit-content"
              },
              // Row input field
              ".mantine-TextInput-root": {
                width: "300px",
                ".mantine-TextInput-wrapper": {
                  ".mantine-TextInput-input": {
                    border: "none",
                    color: C,
                    fontSize: "12px",
                    padding: 0
                  }
                }
              }
            }
          }
        })
      },
      Toolbar: {
        styles: () => ({
          root: {
            backgroundColor: T,
            boxShadow: g,
            border: a,
            borderRadius: "6px",
            flexWrap: "nowrap",
            gap: "2px",
            padding: "2px",
            width: "fit-content",
            // Button (including dropdown target)
            ".mantine-UnstyledButton-root": {
              backgroundColor: T,
              border: "none",
              borderRadius: "4px",
              color: C
            },
            // Hovered button
            ".mantine-UnstyledButton-root:hover": {
              backgroundColor: D,
              border: "none",
              color: hn
            },
            // Selected button
            ".mantine-UnstyledButton-root[data-selected]": {
              backgroundColor: Z,
              border: "none",
              color: nn
            },
            // Disabled button
            ".mantine-UnstyledButton-root[data-disabled]": {
              backgroundColor: Cn,
              border: "none",
              color: Tn
            },
            // Dropdown
            ".mantine-Menu-dropdown": {
              // Dropdown item
              ".mantine-Menu-item": {
                fontSize: "12px",
                height: "30px",
                ".mantine-Menu-itemRightSection": {
                  paddingLeft: "5px"
                }
              },
              ".mantine-Menu-item:hover": {
                backgroundColor: D
              }
            }
          }
        })
      },
      Tooltip: {
        styles: () => ({
          root: {
            backgroundColor: T,
            border: a,
            borderRadius: "6px",
            boxShadow: g,
            color: C,
            padding: "4px 10px",
            textAlign: "center",
            "div ~ div": {
              color: V
            }
          }
        })
      },
      SlashMenu: {
        styles: () => ({
          root: {
            ".mantine-Menu-item": {
              // Icon
              ".mantine-Menu-itemIcon": {
                backgroundColor: I,
                borderRadius: "4px",
                color: C,
                padding: "8px"
              },
              // Text
              ".mantine-Menu-itemLabel": {
                paddingRight: "16px",
                ".mantine-Stack-root": {
                  gap: "0"
                }
              },
              // Badge (keyboard shortcut)
              ".mantine-Menu-itemRightSection": {
                ".mantine-Badge-root": {
                  backgroundColor: I,
                  color: C
                }
              }
            }
          }
        })
      }
    },
    fontFamily: "Inter",
    other: {
      colors: [
        "default",
        "gray",
        "brown",
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
        "purple",
        "pink"
      ]
    },
    primaryColor: "scheme"
  };
};
var Ju, xi = x0;
if (process.env.NODE_ENV === "production")
  Ju = xi.createRoot, xi.hydrateRoot;
else {
  var Ol = xi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  Ju = function(u, g) {
    Ol.usingClientEntryPoint = !0;
    try {
      return xi.createRoot(u, g);
    } finally {
      Ol.usingClientEntryPoint = !1;
    }
  };
}
function Bl(u) {
  console.log("heLLO1", u);
  const g = u.editorElementComponent, [a, b] = ie(!1), T = Vn(
    () => u.dynamicParams.referenceRect,
    [u.dynamicParams]
  ), I = Vn(() => {
    b(!1), document.body.appendChild(u.rootElement);
  }, [u.rootElement]), C = Vn(() => {
    u.rootElement.remove(), b(!0);
  }, [u.rootElement]);
  return /* @__PURE__ */ x(y0, { theme: u.theme, children: /* @__PURE__ */ x(
    Ti,
    {
      appendTo: u.rootElement,
      content: a ? void 0 : /* @__PURE__ */ x(
        g,
        {
          ...u.staticParams,
          ...u.dynamicParams
        }
      ),
      getReferenceClientRect: a ? void 0 : T,
      interactive: !0,
      onShow: I,
      onHidden: C,
      visible: u.isOpen,
      ...u.tippyProps
    }
  ) });
}
const Ei = (u, g, a, b) => {
  const T = document.createElement("div"), I = Ju(T);
  let C;
  return {
    element: T,
    render: (V, D) => {
      C = V, I.render(
        /* @__PURE__ */ x(
          Bl,
          {
            rootElement: T,
            isOpen: !0,
            staticParams: u,
            dynamicParams: V,
            editorElementComponent: g,
            theme: a,
            tippyProps: b
          }
        )
      );
    },
    hide: () => {
      I.render(
        /* @__PURE__ */ x(
          Bl,
          {
            rootElement: T,
            isOpen: !1,
            staticParams: u,
            dynamicParams: C,
            editorElementComponent: g,
            theme: a,
            tippyProps: b
          }
        )
      );
    }
  };
};
var Fl = {
  color: void 0,
  size: void 0,
  className: void 0,
  style: void 0,
  attr: void 0
}, kl = He.createContext && He.createContext(Fl), Qe = globalThis && globalThis.__assign || function() {
  return Qe = Object.assign || function(u) {
    for (var g, a = 1, b = arguments.length; a < b; a++) {
      g = arguments[a];
      for (var T in g)
        Object.prototype.hasOwnProperty.call(g, T) && (u[T] = g[T]);
    }
    return u;
  }, Qe.apply(this, arguments);
}, A0 = globalThis && globalThis.__rest || function(u, g) {
  var a = {};
  for (var b in u)
    Object.prototype.hasOwnProperty.call(u, b) && g.indexOf(b) < 0 && (a[b] = u[b]);
  if (u != null && typeof Object.getOwnPropertySymbols == "function")
    for (var T = 0, b = Object.getOwnPropertySymbols(u); T < b.length; T++)
      g.indexOf(b[T]) < 0 && Object.prototype.propertyIsEnumerable.call(u, b[T]) && (a[b[T]] = u[b[T]]);
  return a;
};
function Ul(u) {
  return u && u.map(function(g, a) {
    return He.createElement(g.tag, Qe({
      key: a
    }, g.attr), Ul(g.child));
  });
}
function rn(u) {
  return function(g) {
    return He.createElement(I0, Qe({
      attr: Qe({}, u.attr)
    }, g), Ul(u.child));
  };
}
function I0(u) {
  var g = function(a) {
    var b = u.attr, T = u.size, I = u.title, C = A0(u, ["attr", "size", "title"]), V = T || a.size || "1em", D;
    return a.className && (D = a.className), u.className && (D = (D ? D + " " : "") + u.className), He.createElement("svg", Qe({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, a.attr, b, C, {
      className: D,
      style: Qe(Qe({
        color: u.color || a.color
      }, a.style), u.style),
      height: V,
      width: V,
      xmlns: "http://www.w3.org/2000/svg"
    }), I && He.createElement("title", null, I), u.children);
  };
  return kl !== void 0 ? He.createElement(kl.Consumer, null, function(a) {
    return g(a);
  }) : g(Fl);
}
function M0(u) {
  return rn({ tag: "svg", attr: { t: "1551322312294", style: "", viewBox: "0 0 1024 1024", version: "1.1" }, child: [{ tag: "defs", attr: {}, child: [] }, { tag: "path", attr: { d: "M474 152m8 0l60 0q8 0 8 8l0 704q0 8-8 8l-60 0q-8 0-8-8l0-704q0-8 8-8Z" } }, { tag: "path", attr: { d: "M168 474m8 0l672 0q8 0 8 8l0 60q0 8-8 8l-672 0q-8 0-8-8l0-60q0-8 8-8Z" } }] })(u);
}
function L0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0V0z" } }, { tag: "path", attr: { d: "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" } }] })(u);
}
const O0 = (u) => {
  const { classes: g } = Ft({ root: {} })(void 0, {
    name: "DragHandleMenu"
  });
  return /* @__PURE__ */ x(ln.Dropdown, { className: g.root, children: u.children });
}, Wl = (u) => {
  const { closeMenu: g, onClick: a, ...b } = u;
  return /* @__PURE__ */ x(
    ln.Item,
    {
      ...b,
      onClick: (T) => {
        g(), a == null || a(T);
      },
      children: u.children
    }
  );
}, B0 = (u) => /* @__PURE__ */ x(
  Wl,
  {
    closeMenu: u.closeMenu,
    onClick: () => u.editor.removeBlocks([u.block]),
    children: u.children
  }
);
function k0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" }, child: [{ tag: "path", attr: { fillRule: "evenodd", d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z", clipRule: "evenodd" } }] })(u);
}
function H0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" }, child: [{ tag: "path", attr: { fillRule: "evenodd", d: "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z", clipRule: "evenodd" } }] })(u);
}
const Xu = (u) => {
  const g = u.textColor || "default", a = u.backgroundColor || "default", b = u.size || 16;
  return /* @__PURE__ */ x(
    zl,
    {
      sx: (T) => ({
        backgroundColor: T.colors.backgroundColors[T.other.colors.indexOf(a)],
        border: "solid #D3D3D3 1px",
        borderRadius: (b * 0.25).toString() + "px",
        color: T.colors.textColors[T.other.colors.indexOf(g)],
        fontSize: (b * 0.75).toString() + "px",
        height: b.toString() + "px",
        lineHeight: b.toString() + "px",
        textAlign: "center",
        width: b.toString() + "px"
      }),
      children: "A"
    }
  );
};
function Qu(u) {
  return rn({ tag: "svg", attr: { version: "1.2", baseProfile: "tiny", viewBox: "0 0 24 24" }, child: [{ tag: "path", attr: { d: "M16.972 6.251c-.967-.538-2.185-.188-2.72.777l-3.713 6.682-2.125-2.125c-.781-.781-2.047-.781-2.828 0-.781.781-.781 2.047 0 2.828l4 4c.378.379.888.587 1.414.587l.277-.02c.621-.087 1.166-.46 1.471-1.009l5-9c.537-.966.189-2.183-.776-2.72z" } }] })(u);
}
const P0 = (u) => /* @__PURE__ */ An(S0, { children: [
  /* @__PURE__ */ x(ln.Label, { children: "Text" }),
  [
    "default",
    "gray",
    "brown",
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink"
  ].map((g) => /* @__PURE__ */ x(
    ln.Item,
    {
      onClick: () => {
        u.onClick && u.onClick(), u.setTextColor(g);
      },
      component: "div",
      "data-test": "text-color-" + g,
      icon: /* @__PURE__ */ x(Xu, { textColor: g, size: u.iconSize }),
      rightSection: u.textColor === g ? /* @__PURE__ */ x(Qu, { size: 16, style: { paddingLeft: "8px" } }) : /* @__PURE__ */ x("div", { style: { width: "24px", padding: "0" } }),
      children: g.charAt(0).toUpperCase() + g.slice(1)
    },
    "text-color-" + g
  )),
  /* @__PURE__ */ x(ln.Label, { children: "Background" }),
  [
    "default",
    "gray",
    "brown",
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink"
  ].map((g) => /* @__PURE__ */ x(
    ln.Item,
    {
      onClick: () => {
        u.onClick && u.onClick(), u.setBackgroundColor(g);
      },
      component: "div",
      "data-test": "background-color-" + g,
      icon: /* @__PURE__ */ x(Xu, { backgroundColor: g, size: u.iconSize }),
      rightSection: u.backgroundColor === g ? /* @__PURE__ */ x(Qu, { size: 16, style: { paddingLeft: "8px" } }) : /* @__PURE__ */ x("div", { style: { width: "24px", padding: "0" } }),
      children: g.charAt(0).toUpperCase() + g.slice(1)
    },
    "background-color-" + g
  ))
] }), z0 = (u) => {
  const [g, a] = ie(!1), b = pr(), T = Vn(() => {
    b.current && clearTimeout(b.current), b.current = setTimeout(() => {
      a(!1);
    }, 250);
  }, []), I = Vn(() => {
    b.current && clearTimeout(b.current), a(!0);
  }, []);
  return !("textColor" in u.block.props) || !("backgroundColor" in u.block.props) ? null : /* @__PURE__ */ x(
    Wl,
    {
      closeMenu: u.closeMenu,
      onMouseLeave: T,
      onMouseOver: I,
      children: /* @__PURE__ */ An(ln, { opened: g, position: "right", children: [
        /* @__PURE__ */ x(ln.Target, { children: /* @__PURE__ */ An("div", { style: { display: "flex", alignItems: "center" }, children: [
          /* @__PURE__ */ x("div", { style: { flex: 1 }, children: u.children }),
          /* @__PURE__ */ x(zl, { style: { display: "flex", alignItems: "center" }, children: /* @__PURE__ */ x(H0, { size: 15 }) })
        ] }) }),
        /* @__PURE__ */ x(
          ln.Dropdown,
          {
            onMouseLeave: T,
            onMouseOver: I,
            style: { marginLeft: "5px" },
            children: /* @__PURE__ */ x(
              P0,
              {
                iconSize: 18,
                textColor: u.block.props.textColor || "default",
                backgroundColor: u.block.props.backgroundColor || "default",
                setTextColor: (C) => u.editor.updateBlock(u.block, {
                  props: { textColor: C }
                }),
                setBackgroundColor: (C) => u.editor.updateBlock(u.block, {
                  props: { backgroundColor: C }
                })
              }
            )
          }
        )
      ] })
    }
  );
}, Nl = (u) => /* @__PURE__ */ An(O0, { children: [
  /* @__PURE__ */ x(B0, { ...u, children: "Delete" }),
  /* @__PURE__ */ x(z0, { ...u, children: "Colors" })
] }), D0 = (u) => {
  const [g, a] = ie(!1), b = pr(null);
  Dt(() => {
    const C = b.current;
    if (C instanceof HTMLDivElement)
      return C.addEventListener("dragstart", u.blockDragStart), C.addEventListener("dragend", u.blockDragEnd), () => {
        C.removeEventListener("dragstart", u.blockDragStart), C.removeEventListener("dragend", u.blockDragEnd);
      };
  }, [u.blockDragEnd, u.blockDragStart]);
  const T = () => {
    a(!1), u.unfreezeMenu();
  }, I = u.dragHandleMenu || Nl;
  return /* @__PURE__ */ An(no, { spacing: 0, children: [
    /* @__PURE__ */ x(Ku, { size: 24, "data-test": "dragHandleAdd", children: /* @__PURE__ */ x(
      M0,
      {
        size: 24,
        onClick: () => {
          u.addBlock();
        }
      }
    ) }),
    /* @__PURE__ */ An(ln, { opened: g, width: 100, position: "left", children: [
      /* @__PURE__ */ x(ln.Target, { children: /* @__PURE__ */ x("div", { draggable: "true", ref: b, children: /* @__PURE__ */ x(
        Ku,
        {
          onClick: () => {
            a(!0), u.freezeMenu();
          },
          size: 24,
          "data-test": "dragHandle",
          children: /* @__PURE__ */ x(L0, { size: 24 })
        }
      ) }) }),
      /* @__PURE__ */ x(
        I,
        {
          editor: u.editor,
          block: u.block,
          closeMenu: T
        }
      )
    ] })
  ] });
}, F0 = (u, g = Nl) => {
  const a = g, b = (T) => /* @__PURE__ */ x(D0, { ...T, dragHandleMenu: a });
  return (T) => Ei(T, b, u, {
    animation: "fade",
    offset: [0, 0],
    placement: "left"
  });
}, $l = (u) => {
  const { classes: g } = Ft({ root: {} })(void 0, {
    name: "Toolbar"
  });
  return /* @__PURE__ */ x(no, { className: g.root, children: u.children });
}, Gl = (u) => {
  const { classes: g } = Ft({ root: {} })(void 0, {
    name: "Tooltip"
  });
  return /* @__PURE__ */ An(eo, { spacing: 0, className: g.root, children: [
    /* @__PURE__ */ x(bi, { size: "sm", children: u.mainTooltip }),
    u.secondaryTooltip && /* @__PURE__ */ x(bi, { size: "xs", children: u.secondaryTooltip })
  ] });
}, Pe = ju(
  (u, g) => {
    const a = u.icon;
    return /* @__PURE__ */ x(
      Ti,
      {
        content: /* @__PURE__ */ x(
          Gl,
          {
            mainTooltip: u.mainTooltip,
            secondaryTooltip: u.secondaryTooltip
          }
        ),
        trigger: "mouseenter",
        children: u.children ? /* @__PURE__ */ An(
          Dl,
          {
            onClick: u.onClick,
            "data-selected": u.isSelected ? "true" : void 0,
            "data-test": u.mainTooltip.slice(0, 1).toLowerCase() + u.mainTooltip.replace(/\s+/g, "").slice(1),
            size: "xs",
            disabled: u.isDisabled || !1,
            ref: g,
            children: [
              a && /* @__PURE__ */ x(a, {}),
              u.children
            ]
          }
        ) : /* @__PURE__ */ x(
          Ku,
          {
            onClick: u.onClick,
            "data-selected": u.isSelected ? "true" : void 0,
            "data-test": u.mainTooltip.slice(0, 1).toLowerCase() + u.mainTooltip.replace(/\s+/g, "").slice(1),
            size: 30,
            disabled: u.isDisabled || !1,
            ref: g,
            children: a && /* @__PURE__ */ x(a, {})
          }
        )
      }
    );
  }
), U0 = (u) => {
  const g = Vn(
    (b) => {
      u.editor.focus(), b === "default" ? u.editor.removeStyles({ textColor: b }) : u.editor.addStyles({ textColor: b });
    },
    [u.editor]
  ), a = Vn(
    (b) => {
      u.editor.focus(), b === "default" ? u.editor.removeStyles({ backgroundColor: b }) : u.editor.addStyles({ backgroundColor: b });
    },
    [u.editor]
  );
  return /* @__PURE__ */ An(ln, { children: [
    /* @__PURE__ */ x(ln.Target, { children: /* @__PURE__ */ x(
      Pe,
      {
        mainTooltip: "Colors",
        icon: () => /* @__PURE__ */ x(
          Xu,
          {
            textColor: u.editor.getActiveStyles().textColor || "default",
            backgroundColor: u.editor.getActiveStyles().backgroundColor || "default",
            size: 20
          }
        )
      }
    ) }),
    /* @__PURE__ */ x(ln.Dropdown, { children: /* @__PURE__ */ x(
      w0,
      {
        textColor: u.editor.getActiveStyles().textColor || "default",
        setTextColor: g,
        backgroundColor: u.editor.getActiveStyles().backgroundColor || "default",
        setBackgroundColor: a
      }
    ) })
  ] });
};
function W0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M23 12l-7.071 7.071-1.414-1.414L20.172 12l-5.657-5.657 1.414-1.414L23 12zM3.828 12l5.657 5.657-1.414 1.414L1 12l7.071-7.071 1.414 1.414L3.828 12z" } }] }] })(u);
}
function N0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M3 4h18v2H3V4zm2 15h14v2H5v-2zm-2-5h18v2H3v-2zm2-5h14v2H5V9z" } }] }] })(u);
}
function $0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M3 4h18v2H3V4zm0 15h18v2H3v-2zm0-5h18v2H3v-2zm0-5h18v2H3V9z" } }] }] })(u);
}
function G0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M3 4h18v2H3V4zm0 15h14v2H3v-2zm0-5h18v2H3v-2zm0-5h14v2H3V9z" } }] }] })(u);
}
function q0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M3 4h18v2H3V4zm4 15h14v2H7v-2zm-4-5h18v2H3v-2zm4-5h14v2H7V9z" } }] }] })(u);
}
function V0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M8 11h4.5a2.5 2.5 0 1 0 0-5H8v5zm10 4.5a4.5 4.5 0 0 1-4.5 4.5H6V4h6.5a4.5 4.5 0 0 1 3.256 7.606A4.498 4.498 0 0 1 18 15.5zM8 13v5h5.5a2.5 2.5 0 1 0 0-5H8z" } }] }] })(u);
}
function ql(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0H24V24H0z" } }, { tag: "path", attr: { d: "M13 20h-2v-7H4v7H2V4h2v7h7V4h2v16zm8-12v12h-2v-9.796l-2 .536V8.67L19.5 8H21z" } }] }] })(u);
}
function Vl(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0H24V24H0z" } }, { tag: "path", attr: { d: "M4 4v7h7V4h2v16h-2v-7H4v7H2V4h2zm14.5 4c2.071 0 3.75 1.679 3.75 3.75 0 .857-.288 1.648-.772 2.28l-.148.18L18.034 18H22v2h-7v-1.556l4.82-5.546c.268-.307.43-.709.43-1.148 0-.966-.784-1.75-1.75-1.75-.918 0-1.671.707-1.744 1.606l-.006.144h-2C14.75 9.679 16.429 8 18.5 8z" } }] }] })(u);
}
function Yl(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0H24V24H0z" } }, { tag: "path", attr: { d: "M22 8l-.002 2-2.505 2.883c1.59.435 2.757 1.89 2.757 3.617 0 2.071-1.679 3.75-3.75 3.75-1.826 0-3.347-1.305-3.682-3.033l1.964-.382c.156.806.866 1.415 1.718 1.415.966 0 1.75-.784 1.75-1.75s-.784-1.75-1.75-1.75c-.286 0-.556.069-.794.19l-1.307-1.547L19.35 10H15V8h7zM4 4v7h7V4h2v16h-2v-7H4v7H2V4h2z" } }] }] })(u);
}
function Y0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M3 4h18v2H3V4zm0 15h18v2H3v-2zm8-5h10v2H11v-2zm0-5h10v2H11V9zm-8 3.5L7 9v7l-4-3.5z" } }] }] })(u);
}
function K0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M3 4h18v2H3V4zm0 15h18v2H3v-2zm8-5h10v2H11v-2zm0-5h10v2H11V9zm-4 3.5L3 16V9l4 3.5z" } }] }] })(u);
}
function Z0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M15 20H7v-2h2.927l2.116-12H9V4h8v2h-2.927l-2.116 12H15z" } }] }] })(u);
}
function J0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M17 17h5v2h-3v3h-2v-5zM7 7H2V5h3V2h2v5zm11.364 8.536L16.95 14.12l1.414-1.414a5 5 0 1 0-7.071-7.071L9.879 7.05 8.464 5.636 9.88 4.222a7 7 0 0 1 9.9 9.9l-1.415 1.414zm-2.828 2.828l-1.415 1.414a7 7 0 0 1-9.9-9.9l1.415-1.414L7.05 9.88l-1.414 1.414a5 5 0 1 0 7.071 7.071l1.414-1.414 1.415 1.414zm-.708-10.607l1.415 1.415-7.071 7.07-1.415-1.414 7.071-7.07z" } }] }] })(u);
}
function Kl(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M18.364 15.536L16.95 14.12l1.414-1.414a5 5 0 1 0-7.071-7.071L9.879 7.05 8.464 5.636 9.88 4.222a7 7 0 0 1 9.9 9.9l-1.415 1.414zm-2.828 2.828l-1.415 1.414a7 7 0 0 1-9.9-9.9l1.415-1.414L7.05 9.88l-1.414 1.414a5 5 0 1 0 7.071 7.071l1.414-1.414 1.415 1.414zm-.708-10.607l1.415 1.415-7.071 7.07-1.415-1.414 7.071-7.07z" } }] }] })(u);
}
function Zl(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M8 4h13v2H8V4zM5 3v3h1v1H3V6h1V4H3V3h2zM3 14v-2.5h2V11H3v-1h3v2.5H4v.5h2v1H3zm2 5.5H3v-1h2V18H3v-1h3v4H3v-1h2v-.5zM8 11h13v2H8v-2zm0 7h13v2H8v-2z" } }] }] })(u);
}
function Jl(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M8 4h13v2H8V4zM4.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 6.9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM8 11h13v2H8v-2zm0 7h13v2H8v-2z" } }] }] })(u);
}
function X0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M17.154 14c.23.516.346 1.09.346 1.72 0 1.342-.524 2.392-1.571 3.147C14.88 19.622 13.433 20 11.586 20c-1.64 0-3.263-.381-4.87-1.144V16.6c1.52.877 3.075 1.316 4.666 1.316 2.551 0 3.83-.732 3.839-2.197a2.21 2.21 0 0 0-.648-1.603l-.12-.117H3v-2h18v2h-3.846zm-4.078-3H7.629a4.086 4.086 0 0 1-.481-.522C6.716 9.92 6.5 9.246 6.5 8.452c0-1.236.466-2.287 1.397-3.153C8.83 4.433 10.271 4 12.222 4c1.471 0 2.879.328 4.222.984v2.152c-1.2-.687-2.515-1.03-3.946-1.03-2.48 0-3.719.782-3.719 2.346 0 .42.218.786.654 1.099.436.313.974.562 1.613.75.62.18 1.297.414 2.03.699z" } }] }] })(u);
}
function ro(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M13 6v15h-2V6H5V4h14v2z" } }] }] })(u);
}
function Q0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M8 3v9a4 4 0 1 0 8 0V3h2v9a6 6 0 1 1-12 0V3h2zM4 20h16v2H4v-2z" } }] }] })(u);
}
function j0(u) {
  return rn({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "g", attr: {}, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" } }, { tag: "path", attr: { d: "M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v9l-3.794-3.793-5.999 6-1.414-1.414 5.999-6L12 3h9z" } }] }] })(u);
}
function nv(u) {
  const g = u.icon;
  return /* @__PURE__ */ x(
    Ti,
    {
      content: /* @__PURE__ */ x(
        Gl,
        {
          mainTooltip: u.mainTooltip,
          secondaryTooltip: u.secondaryTooltip
        }
      ),
      placement: "left",
      children: /* @__PURE__ */ x(b0, { children: /* @__PURE__ */ x(g, { size: 16 }) })
    }
  );
}
function ev(u) {
  function g(a) {
    a.key === "Enter" && (a.preventDefault(), u.onSubmit());
  }
  return /* @__PURE__ */ x(
    C0,
    {
      autoFocus: u.autofocus,
      size: "xs",
      value: u.value,
      onChange: (a) => u.onChange(a.currentTarget.value),
      onKeyDown: g,
      placeholder: u.placeholder
    }
  );
}
function Hl(u) {
  return /* @__PURE__ */ An(no, { children: [
    /* @__PURE__ */ x(
      nv,
      {
        icon: u.icon,
        mainTooltip: u.mainIconTooltip,
        secondaryTooltip: u.secondaryIconTooltip
      }
    ),
    /* @__PURE__ */ x(
      ev,
      {
        autofocus: u.autofocus,
        placeholder: u.placeholder,
        value: u.value,
        onChange: u.onChange,
        onSubmit: u.onSubmit
      }
    )
  ] });
}
const Xl = ju((u, g) => {
  const { classes: a } = Ft({ root: {} })(void 0, {
    name: "EditHyperlinkMenu"
  }), [b, T] = ie(u.url), [I, C] = ie(u.text);
  return /* @__PURE__ */ An(eo, { className: a.root, ref: g, children: [
    /* @__PURE__ */ x(
      Hl,
      {
        icon: Kl,
        mainIconTooltip: "Edit URL",
        autofocus: !0,
        placeholder: "Edit URL",
        value: b,
        onChange: (V) => T(V),
        onSubmit: () => u.update(b, I)
      }
    ),
    /* @__PURE__ */ x(
      Hl,
      {
        icon: ro,
        mainIconTooltip: "Edit Title",
        placeholder: "Edit Title",
        value: I,
        onChange: (V) => C(V),
        onSubmit: () => u.update(b, I)
      }
    )
  ] });
}), tv = (u) => {
  const [g, a] = ie(), [b, T] = ie(!1), I = pr(null), C = pr(null), V = Vn(() => {
    a(
      /* @__PURE__ */ x(
        Xl,
        {
          url: u.activeHyperlinkUrl,
          text: u.activeHyperlinkText,
          update: (hn, Z) => {
            u.setHyperlink(hn, Z), T(!1);
          },
          ref: C
        },
        Math.random() + ""
      )
    );
  }, [u]), D = Vn(
    (hn) => {
      var Z, nn;
      if ((Z = I.current) != null && Z.contains(hn.target)) {
        T(!b);
        return;
      }
      (nn = C.current) != null && nn.contains(hn.target) || T(!1);
    },
    [b]
  );
  return Dt(() => (document.body.addEventListener("click", D), () => document.body.removeEventListener("click", D)), [D]), /* @__PURE__ */ x(
    Ti,
    {
      appendTo: document.body,
      content: g,
      onShow: V,
      interactive: !0,
      maxWidth: 500,
      visible: b,
      children: /* @__PURE__ */ x(
        Pe,
        {
          isSelected: u.isSelected,
          mainTooltip: u.mainTooltip,
          secondaryTooltip: u.secondaryTooltip,
          icon: u.icon,
          ref: I
        }
      )
    }
  );
}, rv = () => typeof navigator < "u" && (/Mac/.test(navigator.platform) || /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent));
function we(u) {
  return rv() ? u.replace("Mod", "⌘") : u.replace("Mod", "Ctrl");
}
const iv = (u) => {
  const g = Vn(
    (a, b) => {
      u.editor.focus(), u.editor.createLink(a, b);
    },
    [u.editor]
  );
  return /* @__PURE__ */ x(
    tv,
    {
      isSelected: !!u.editor.getSelectedLinkUrl(),
      mainTooltip: "Link",
      secondaryTooltip: we("Mod+K"),
      icon: Kl,
      hyperlinkIsActive: !!u.editor.getSelectedLinkUrl(),
      activeHyperlinkUrl: u.editor.getSelectedLinkUrl() || "",
      activeHyperlinkText: u.editor.getSelectedText(),
      setHyperlink: g
    }
  );
}, uv = (u) => {
  const g = Vn(() => {
    u.editor.focus(), u.editor.nestBlock();
  }, [u.editor]);
  return /* @__PURE__ */ x(
    Pe,
    {
      onClick: g,
      isDisabled: !u.editor.canNestBlock(),
      mainTooltip: "Nest Block",
      secondaryTooltip: we("Tab"),
      icon: K0
    }
  );
}, ov = (u) => {
  const g = Vn(() => {
    u.editor.focus(), u.editor.unnestBlock();
  }, [u]);
  return /* @__PURE__ */ x(
    Pe,
    {
      onClick: g,
      isDisabled: !u.editor.canUnnestBlock(),
      mainTooltip: "Unnest Block",
      secondaryTooltip: we("Shift+Tab"),
      icon: Y0
    }
  );
}, av = {
  left: G0,
  center: N0,
  right: q0,
  justify: $0
}, Vu = (u) => {
  const g = o0(() => {
    const b = u.editor.getSelection();
    if (b) {
      for (const T of b.blocks)
        if (!("textAlignment" in T.props))
          return !1;
    } else if (!("textAlignment" in u.editor.getTextCursorPosition().block.props))
      return !1;
    return !0;
  }, [u.editor]), a = Vn(
    (b) => {
      u.editor.focus();
      const T = u.editor.getSelection();
      if (T)
        for (const I of T.blocks)
          u.editor.updateBlock(I, {
            props: { textAlignment: b }
          });
      else {
        const I = u.editor.getTextCursorPosition().block;
        u.editor.updateBlock(I, {
          props: { textAlignment: b }
        });
      }
    },
    [u.editor]
  );
  return g ? /* @__PURE__ */ x(
    Pe,
    {
      onClick: () => a(u.textAlignment),
      isSelected: u.editor.getTextCursorPosition().block.props.textAlignment === u.textAlignment,
      mainTooltip: u.textAlignment === "justify" ? "Justify Text" : "Align Text " + u.textAlignment.slice(0, 1).toUpperCase() + u.textAlignment.slice(1),
      icon: av[u.textAlignment]
    }
  ) : null;
}, lv = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
  strike: "Mod+Shift+X",
  code: ""
}, fv = {
  bold: V0,
  italic: Z0,
  underline: Q0,
  strike: X0,
  code: W0
}, yi = (u) => {
  const g = (a) => {
    u.editor.focus(), u.editor.toggleStyles({ [a]: !0 });
  };
  return /* @__PURE__ */ x(
    Pe,
    {
      onClick: () => g(u.toggledStyle),
      isSelected: u.toggledStyle in u.editor.getActiveStyles(),
      mainTooltip: u.toggledStyle.slice(0, 1).toUpperCase() + u.toggledStyle.slice(1),
      secondaryTooltip: we(lv[u.toggledStyle]),
      icon: fv[u.toggledStyle]
    }
  );
};
function cv(u) {
  const g = u.icon;
  return /* @__PURE__ */ x(
    ln.Item,
    {
      onClick: u.onClick,
      icon: g && /* @__PURE__ */ x(g, { size: 16 }),
      rightSection: u.isSelected ? /* @__PURE__ */ x(Qu, { size: 16 }) : (
        // Ensures space for tick even if item isn't currently selected.
        /* @__PURE__ */ x("div", { style: { width: "16px", padding: "0" } })
      ),
      disabled: u.isDisabled,
      children: u.text
    },
    u.text
  );
}
const sv = ju((u, g) => {
  const { text: a, icon: b, isDisabled: T, ...I } = u, C = u.icon;
  return /* @__PURE__ */ x(
    Dl,
    {
      leftIcon: C && /* @__PURE__ */ x(C, { size: 16 }),
      rightIcon: /* @__PURE__ */ x(k0, {}),
      size: "xs",
      variant: "subtle",
      disabled: u.isDisabled,
      ref: g,
      ...I,
      children: u.text
    }
  );
});
function dv(u) {
  const g = u.items.filter((a) => a.isSelected)[0];
  return g ? /* @__PURE__ */ An(ln, { exitTransitionDuration: 0, disabled: u.isDisabled, children: [
    /* @__PURE__ */ x(ln.Target, { children: /* @__PURE__ */ x(sv, { ...g }) }),
    /* @__PURE__ */ x(ln.Dropdown, { children: u.items.map((a) => /* @__PURE__ */ x(cv, { ...a }, a.text)) })
  ] }) : null;
}
const hv = {
  1: ql,
  2: Vl,
  3: Yl
}, gv = (u) => {
  const g = "paragraph" in u, a = "heading" in u && "level" in u.heading.propSchema, b = "bulletListItem" in u, T = "numberedListItem" in u;
  return g && a && b && T;
}, vv = (u) => {
  const [g, a] = ie(u.editor.getTextCursorPosition().block);
  if (Dt(() => a(u.editor.getTextCursorPosition().block), [u]), !gv(u.editor.schema))
    return null;
  let b = u.editor;
  const T = b.schema.heading.propSchema.level.values.map(
    (I) => ({
      onClick: () => {
        b.focus(), b.updateBlock(g, {
          type: "heading",
          props: { level: I }
        });
      },
      text: "Heading " + I,
      icon: hv[I],
      isSelected: g.type === "heading" && g.props.level === I
    })
  );
  return /* @__PURE__ */ x(
    dv,
    {
      items: [
        {
          onClick: () => {
            u.editor.focus(), u.editor.updateBlock(g, {
              type: "paragraph",
              props: {}
            });
          },
          text: "Paragraph",
          icon: ro,
          isSelected: g.type === "paragraph"
        },
        ...T,
        {
          onClick: () => {
            u.editor.focus(), u.editor.updateBlock(g, {
              type: "bulletListItem",
              props: {}
            });
          },
          text: "Bullet List",
          icon: Jl,
          isSelected: g.type === "bulletListItem"
        },
        {
          onClick: () => {
            u.editor.focus(), u.editor.updateBlock(g, {
              type: "numberedListItem",
              props: {}
            });
          },
          text: "Numbered List",
          icon: Zl,
          isSelected: g.type === "numberedListItem"
        }
      ]
    }
  );
}, pv = (u) => /* @__PURE__ */ An($l, { children: [
  /* @__PURE__ */ x(vv, { ...u }),
  /* @__PURE__ */ x(yi, { editor: u.editor, toggledStyle: "bold" }),
  /* @__PURE__ */ x(yi, { editor: u.editor, toggledStyle: "italic" }),
  /* @__PURE__ */ x(yi, { editor: u.editor, toggledStyle: "underline" }),
  /* @__PURE__ */ x(yi, { editor: u.editor, toggledStyle: "strike" }),
  /* @__PURE__ */ x(Vu, { editor: u.editor, textAlignment: "left" }),
  /* @__PURE__ */ x(Vu, { editor: u.editor, textAlignment: "center" }),
  /* @__PURE__ */ x(Vu, { editor: u.editor, textAlignment: "right" }),
  /* @__PURE__ */ x(U0, { editor: u.editor }),
  /* @__PURE__ */ x(uv, { editor: u.editor }),
  /* @__PURE__ */ x(ov, { editor: u.editor }),
  /* @__PURE__ */ x(iv, { editor: u.editor })
] }), _v = (u, g = pv) => (a) => Ei(a, g, u, {
  animation: "fade",
  placement: "top-start"
}), mv = (u) => {
  const [g, a] = ie(!1);
  return g ? /* @__PURE__ */ x(
    Xl,
    {
      url: u.url,
      text: u.text,
      update: u.editHyperlink
    }
  ) : /* @__PURE__ */ An($l, { children: [
    /* @__PURE__ */ x(
      Pe,
      {
        mainTooltip: "Edit",
        isSelected: !1,
        onClick: () => a(!0),
        children: "Edit Link"
      }
    ),
    /* @__PURE__ */ x(
      Pe,
      {
        mainTooltip: "Open in new tab",
        isSelected: !1,
        onClick: () => {
          window.open(u.url, "_blank");
        },
        icon: j0
      }
    ),
    /* @__PURE__ */ x(
      Pe,
      {
        mainTooltip: "Remove link",
        isSelected: !1,
        onClick: u.deleteHyperlink,
        icon: J0
      }
    )
  ] });
}, xv = (u) => (g) => Ei(g, mv, u, {
  animation: "fade",
  placement: "top-start"
});
class yv extends p0 {
  constructor(g, a, b = [], T, I, C, V) {
    super(g, a, b), this.name = g, this.execute = a, this.aliases = b, this.group = T, this.icon = I, this.hint = C, this.shortcut = V;
  }
}
const wi = {
  Heading: {
    group: "Headings",
    icon: /* @__PURE__ */ x(ql, { size: 18 }),
    hint: "Used for a top-level heading",
    shortcut: we("Mod-Alt-1")
  },
  "Heading 2": {
    group: "Headings",
    icon: /* @__PURE__ */ x(Vl, { size: 18 }),
    hint: "Used for key sections",
    shortcut: we("Mod-Alt-2")
  },
  "Heading 3": {
    group: "Headings",
    icon: /* @__PURE__ */ x(Yl, { size: 18 }),
    hint: "Used for subsections and group headings",
    shortcut: we("Mod-Alt-3")
  },
  "Numbered List": {
    group: "Basic blocks",
    icon: /* @__PURE__ */ x(Zl, { size: 18 }),
    hint: "Used to display a numbered list",
    shortcut: we("Mod-Alt-7")
  },
  "Bullet List": {
    group: "Basic blocks",
    icon: /* @__PURE__ */ x(Jl, { size: 18 }),
    hint: "Used to display an unordered list",
    shortcut: we("Mod-Alt-9")
  },
  Paragraph: {
    group: "Basic blocks",
    icon: /* @__PURE__ */ x(ro, { size: 18 }),
    hint: "Used for the body of your document",
    shortcut: we("Mod-Alt-0")
  }
}, wv = _0.map(
  (u) => new yv(
    u.name,
    u.execute,
    u.aliases,
    wi[u.name].group,
    wi[u.name].icon,
    wi[u.name].hint,
    wi[u.name].shortcut
  )
);
var Ci = { exports: {} };
/**
 * @license
 * Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
Ci.exports;
(function(u, g) {
  (function() {
    var a, b = "4.17.21", T = 200, I = "Unsupported core-js use. Try https://npms.io/search?q=ponyfill.", C = "Expected a function", V = "Invalid `variable` option passed into `_.template`", D = "__lodash_hash_undefined__", hn = 500, Z = "__lodash_placeholder__", nn = 1, Cn = 2, Tn = 4, be = 1, gt = 2, In = 1, Mn = 2, pn = 4, Yn = 8, ze = 16, Kn = 32, De = 64, ue = 128, je = 256, vt = 512, Ri = 30, Si = "...", _r = 800, oe = 16, ge = 1, nt = 2, mr = 3, ve = 1 / 0, ae = 9007199254740991, xr = 17976931348623157e292, et = 0 / 0, zn = 4294967295, yr = zn - 1, wr = zn >>> 1, Ai = [
      ["ary", ue],
      ["bind", In],
      ["bindKey", Mn],
      ["curry", Yn],
      ["curryRight", ze],
      ["flip", vt],
      ["partial", Kn],
      ["partialRight", De],
      ["rearg", je]
    ], Fe = "[object Arguments]", Ue = "[object Array]", Ut = "[object AsyncFunction]", pe = "[object Boolean]", Ce = "[object Date]", pt = "[object DOMException]", _t = "[object Error]", tt = "[object Function]", br = "[object GeneratorFunction]", Dn = "[object Map]", _e = "[object Number]", mt = "[object Null]", Zn = "[object Object]", Wt = "[object Promise]", xt = "[object Proxy]", rt = "[object RegExp]", Fn = "[object Set]", Te = "[object String]", yt = "[object Symbol]", Ii = "[object Undefined]", We = "[object WeakMap]", Cr = "[object WeakSet]", le = "[object ArrayBuffer]", Ne = "[object DataView]", wt = "[object Float32Array]", bt = "[object Float64Array]", it = "[object Int8Array]", Nt = "[object Int16Array]", $t = "[object Int32Array]", Gt = "[object Uint8Array]", qt = "[object Uint8ClampedArray]", Vt = "[object Uint16Array]", Yt = "[object Uint32Array]", Mi = /\b__p \+= '';/g, Kt = /\b(__p \+=) '' \+/g, Tr = /(__e\(.*?\)|\b__t\)) \+\n'';/g, Ee = /&(?:amp|lt|gt|quot|#39);/g, Ct = /[&<>"']/g, Zt = RegExp(Ee.source), Er = RegExp(Ct.source), Li = /<%-([\s\S]+?)%>/g, Rr = /<%([\s\S]+?)%>/g, Sr = /<%=([\s\S]+?)%>/g, Ar = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, Ir = /^\w*$/, Oi = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, Jt = /[\\^$.*+?()[\]{}|]/g, Mr = RegExp(Jt.source), Xt = /^\s+/, Bi = /\s/, ki = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/, Hi = /\{\n\/\* \[wrapped with (.+)\] \*/, c = /,? & /, w = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g, E = /[()=,{}\[\]\/\s]/, B = /\\(\\)?/g, q = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g, J = /\w*$/, N = /^[-+]0x[0-9a-f]+$/i, U = /^0b[01]+$/i, mn = /^\[object .+?Constructor\]$/, on = /^0o[0-7]+$/i, fn = /^(?:0|[1-9]\d*)$/, Ln = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g, fe = /($^)/, Lr = /['\n\r\u2028\u2029\\]/g, On = "\\ud800-\\udfff", Ql = "\\u0300-\\u036f", jl = "\\ufe20-\\ufe2f", nf = "\\u20d0-\\u20ff", io = Ql + jl + nf, uo = "\\u2700-\\u27bf", oo = "a-z\\xdf-\\xf6\\xf8-\\xff", ef = "\\xac\\xb1\\xd7\\xf7", tf = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rf = "\\u2000-\\u206f", uf = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", ao = "A-Z\\xc0-\\xd6\\xd8-\\xde", lo = "\\ufe0e\\ufe0f", fo = ef + tf + rf + uf, Pi = "['’]", of = "[" + On + "]", co = "[" + fo + "]", Or = "[" + io + "]", so = "\\d+", af = "[" + uo + "]", ho = "[" + oo + "]", go = "[^" + On + fo + so + uo + oo + ao + "]", zi = "\\ud83c[\\udffb-\\udfff]", lf = "(?:" + Or + "|" + zi + ")", vo = "[^" + On + "]", Di = "(?:\\ud83c[\\udde6-\\uddff]){2}", Fi = "[\\ud800-\\udbff][\\udc00-\\udfff]", Tt = "[" + ao + "]", po = "\\u200d", _o = "(?:" + ho + "|" + go + ")", ff = "(?:" + Tt + "|" + go + ")", mo = "(?:" + Pi + "(?:d|ll|m|re|s|t|ve))?", xo = "(?:" + Pi + "(?:D|LL|M|RE|S|T|VE))?", yo = lf + "?", wo = "[" + lo + "]?", cf = "(?:" + po + "(?:" + [vo, Di, Fi].join("|") + ")" + wo + yo + ")*", sf = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", df = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", bo = wo + yo + cf, hf = "(?:" + [af, Di, Fi].join("|") + ")" + bo, gf = "(?:" + [vo + Or + "?", Or, Di, Fi, of].join("|") + ")", vf = RegExp(Pi, "g"), pf = RegExp(Or, "g"), Ui = RegExp(zi + "(?=" + zi + ")|" + gf + bo, "g"), _f = RegExp([
      Tt + "?" + ho + "+" + mo + "(?=" + [co, Tt, "$"].join("|") + ")",
      ff + "+" + xo + "(?=" + [co, Tt + _o, "$"].join("|") + ")",
      Tt + "?" + _o + "+" + mo,
      Tt + "+" + xo,
      df,
      sf,
      so,
      hf
    ].join("|"), "g"), mf = RegExp("[" + po + On + io + lo + "]"), xf = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/, yf = [
      "Array",
      "Buffer",
      "DataView",
      "Date",
      "Error",
      "Float32Array",
      "Float64Array",
      "Function",
      "Int8Array",
      "Int16Array",
      "Int32Array",
      "Map",
      "Math",
      "Object",
      "Promise",
      "RegExp",
      "Set",
      "String",
      "Symbol",
      "TypeError",
      "Uint8Array",
      "Uint8ClampedArray",
      "Uint16Array",
      "Uint32Array",
      "WeakMap",
      "_",
      "clearTimeout",
      "isFinite",
      "parseInt",
      "setTimeout"
    ], wf = -1, tn = {};
    tn[wt] = tn[bt] = tn[it] = tn[Nt] = tn[$t] = tn[Gt] = tn[qt] = tn[Vt] = tn[Yt] = !0, tn[Fe] = tn[Ue] = tn[le] = tn[pe] = tn[Ne] = tn[Ce] = tn[_t] = tn[tt] = tn[Dn] = tn[_e] = tn[Zn] = tn[rt] = tn[Fn] = tn[Te] = tn[We] = !1;
    var en = {};
    en[Fe] = en[Ue] = en[le] = en[Ne] = en[pe] = en[Ce] = en[wt] = en[bt] = en[it] = en[Nt] = en[$t] = en[Dn] = en[_e] = en[Zn] = en[rt] = en[Fn] = en[Te] = en[yt] = en[Gt] = en[qt] = en[Vt] = en[Yt] = !0, en[_t] = en[tt] = en[We] = !1;
    var bf = {
      // Latin-1 Supplement block.
      À: "A",
      Á: "A",
      Â: "A",
      Ã: "A",
      Ä: "A",
      Å: "A",
      à: "a",
      á: "a",
      â: "a",
      ã: "a",
      ä: "a",
      å: "a",
      Ç: "C",
      ç: "c",
      Ð: "D",
      ð: "d",
      È: "E",
      É: "E",
      Ê: "E",
      Ë: "E",
      è: "e",
      é: "e",
      ê: "e",
      ë: "e",
      Ì: "I",
      Í: "I",
      Î: "I",
      Ï: "I",
      ì: "i",
      í: "i",
      î: "i",
      ï: "i",
      Ñ: "N",
      ñ: "n",
      Ò: "O",
      Ó: "O",
      Ô: "O",
      Õ: "O",
      Ö: "O",
      Ø: "O",
      ò: "o",
      ó: "o",
      ô: "o",
      õ: "o",
      ö: "o",
      ø: "o",
      Ù: "U",
      Ú: "U",
      Û: "U",
      Ü: "U",
      ù: "u",
      ú: "u",
      û: "u",
      ü: "u",
      Ý: "Y",
      ý: "y",
      ÿ: "y",
      Æ: "Ae",
      æ: "ae",
      Þ: "Th",
      þ: "th",
      ß: "ss",
      // Latin Extended-A block.
      Ā: "A",
      Ă: "A",
      Ą: "A",
      ā: "a",
      ă: "a",
      ą: "a",
      Ć: "C",
      Ĉ: "C",
      Ċ: "C",
      Č: "C",
      ć: "c",
      ĉ: "c",
      ċ: "c",
      č: "c",
      Ď: "D",
      Đ: "D",
      ď: "d",
      đ: "d",
      Ē: "E",
      Ĕ: "E",
      Ė: "E",
      Ę: "E",
      Ě: "E",
      ē: "e",
      ĕ: "e",
      ė: "e",
      ę: "e",
      ě: "e",
      Ĝ: "G",
      Ğ: "G",
      Ġ: "G",
      Ģ: "G",
      ĝ: "g",
      ğ: "g",
      ġ: "g",
      ģ: "g",
      Ĥ: "H",
      Ħ: "H",
      ĥ: "h",
      ħ: "h",
      Ĩ: "I",
      Ī: "I",
      Ĭ: "I",
      Į: "I",
      İ: "I",
      ĩ: "i",
      ī: "i",
      ĭ: "i",
      į: "i",
      ı: "i",
      Ĵ: "J",
      ĵ: "j",
      Ķ: "K",
      ķ: "k",
      ĸ: "k",
      Ĺ: "L",
      Ļ: "L",
      Ľ: "L",
      Ŀ: "L",
      Ł: "L",
      ĺ: "l",
      ļ: "l",
      ľ: "l",
      ŀ: "l",
      ł: "l",
      Ń: "N",
      Ņ: "N",
      Ň: "N",
      Ŋ: "N",
      ń: "n",
      ņ: "n",
      ň: "n",
      ŋ: "n",
      Ō: "O",
      Ŏ: "O",
      Ő: "O",
      ō: "o",
      ŏ: "o",
      ő: "o",
      Ŕ: "R",
      Ŗ: "R",
      Ř: "R",
      ŕ: "r",
      ŗ: "r",
      ř: "r",
      Ś: "S",
      Ŝ: "S",
      Ş: "S",
      Š: "S",
      ś: "s",
      ŝ: "s",
      ş: "s",
      š: "s",
      Ţ: "T",
      Ť: "T",
      Ŧ: "T",
      ţ: "t",
      ť: "t",
      ŧ: "t",
      Ũ: "U",
      Ū: "U",
      Ŭ: "U",
      Ů: "U",
      Ű: "U",
      Ų: "U",
      ũ: "u",
      ū: "u",
      ŭ: "u",
      ů: "u",
      ű: "u",
      ų: "u",
      Ŵ: "W",
      ŵ: "w",
      Ŷ: "Y",
      ŷ: "y",
      Ÿ: "Y",
      Ź: "Z",
      Ż: "Z",
      Ž: "Z",
      ź: "z",
      ż: "z",
      ž: "z",
      Ĳ: "IJ",
      ĳ: "ij",
      Œ: "Oe",
      œ: "oe",
      ŉ: "'n",
      ſ: "s"
    }, Cf = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }, Tf = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'"
    }, Ef = {
      "\\": "\\",
      "'": "'",
      "\n": "n",
      "\r": "r",
      "\u2028": "u2028",
      "\u2029": "u2029"
    }, Rf = parseFloat, Sf = parseInt, Co = typeof hr == "object" && hr && hr.Object === Object && hr, Af = typeof self == "object" && self && self.Object === Object && self, xn = Co || Af || Function("return this")(), Wi = g && !g.nodeType && g, ut = Wi && !0 && u && !u.nodeType && u, To = ut && ut.exports === Wi, Ni = To && Co.process, Jn = function() {
      try {
        var d = ut && ut.require && ut.require("util").types;
        return d || Ni && Ni.binding && Ni.binding("util");
      } catch {
      }
    }(), Eo = Jn && Jn.isArrayBuffer, Ro = Jn && Jn.isDate, So = Jn && Jn.isMap, Ao = Jn && Jn.isRegExp, Io = Jn && Jn.isSet, Mo = Jn && Jn.isTypedArray;
    function Un(d, p, v) {
      switch (v.length) {
        case 0:
          return d.call(p);
        case 1:
          return d.call(p, v[0]);
        case 2:
          return d.call(p, v[0], v[1]);
        case 3:
          return d.call(p, v[0], v[1], v[2]);
      }
      return d.apply(p, v);
    }
    function If(d, p, v, S) {
      for (var k = -1, K = d == null ? 0 : d.length; ++k < K; ) {
        var gn = d[k];
        p(S, gn, v(gn), d);
      }
      return S;
    }
    function Xn(d, p) {
      for (var v = -1, S = d == null ? 0 : d.length; ++v < S && p(d[v], v, d) !== !1; )
        ;
      return d;
    }
    function Mf(d, p) {
      for (var v = d == null ? 0 : d.length; v-- && p(d[v], v, d) !== !1; )
        ;
      return d;
    }
    function Lo(d, p) {
      for (var v = -1, S = d == null ? 0 : d.length; ++v < S; )
        if (!p(d[v], v, d))
          return !1;
      return !0;
    }
    function $e(d, p) {
      for (var v = -1, S = d == null ? 0 : d.length, k = 0, K = []; ++v < S; ) {
        var gn = d[v];
        p(gn, v, d) && (K[k++] = gn);
      }
      return K;
    }
    function Br(d, p) {
      var v = d == null ? 0 : d.length;
      return !!v && Et(d, p, 0) > -1;
    }
    function $i(d, p, v) {
      for (var S = -1, k = d == null ? 0 : d.length; ++S < k; )
        if (v(p, d[S]))
          return !0;
      return !1;
    }
    function un(d, p) {
      for (var v = -1, S = d == null ? 0 : d.length, k = Array(S); ++v < S; )
        k[v] = p(d[v], v, d);
      return k;
    }
    function Ge(d, p) {
      for (var v = -1, S = p.length, k = d.length; ++v < S; )
        d[k + v] = p[v];
      return d;
    }
    function Gi(d, p, v, S) {
      var k = -1, K = d == null ? 0 : d.length;
      for (S && K && (v = d[++k]); ++k < K; )
        v = p(v, d[k], k, d);
      return v;
    }
    function Lf(d, p, v, S) {
      var k = d == null ? 0 : d.length;
      for (S && k && (v = d[--k]); k--; )
        v = p(v, d[k], k, d);
      return v;
    }
    function qi(d, p) {
      for (var v = -1, S = d == null ? 0 : d.length; ++v < S; )
        if (p(d[v], v, d))
          return !0;
      return !1;
    }
    var Of = Vi("length");
    function Bf(d) {
      return d.split("");
    }
    function kf(d) {
      return d.match(w) || [];
    }
    function Oo(d, p, v) {
      var S;
      return v(d, function(k, K, gn) {
        if (p(k, K, gn))
          return S = K, !1;
      }), S;
    }
    function kr(d, p, v, S) {
      for (var k = d.length, K = v + (S ? 1 : -1); S ? K-- : ++K < k; )
        if (p(d[K], K, d))
          return K;
      return -1;
    }
    function Et(d, p, v) {
      return p === p ? Vf(d, p, v) : kr(d, Bo, v);
    }
    function Hf(d, p, v, S) {
      for (var k = v - 1, K = d.length; ++k < K; )
        if (S(d[k], p))
          return k;
      return -1;
    }
    function Bo(d) {
      return d !== d;
    }
    function ko(d, p) {
      var v = d == null ? 0 : d.length;
      return v ? Ki(d, p) / v : et;
    }
    function Vi(d) {
      return function(p) {
        return p == null ? a : p[d];
      };
    }
    function Yi(d) {
      return function(p) {
        return d == null ? a : d[p];
      };
    }
    function Ho(d, p, v, S, k) {
      return k(d, function(K, gn, j) {
        v = S ? (S = !1, K) : p(v, K, gn, j);
      }), v;
    }
    function Pf(d, p) {
      var v = d.length;
      for (d.sort(p); v--; )
        d[v] = d[v].value;
      return d;
    }
    function Ki(d, p) {
      for (var v, S = -1, k = d.length; ++S < k; ) {
        var K = p(d[S]);
        K !== a && (v = v === a ? K : v + K);
      }
      return v;
    }
    function Zi(d, p) {
      for (var v = -1, S = Array(d); ++v < d; )
        S[v] = p(v);
      return S;
    }
    function zf(d, p) {
      return un(p, function(v) {
        return [v, d[v]];
      });
    }
    function Po(d) {
      return d && d.slice(0, Uo(d) + 1).replace(Xt, "");
    }
    function Wn(d) {
      return function(p) {
        return d(p);
      };
    }
    function Ji(d, p) {
      return un(p, function(v) {
        return d[v];
      });
    }
    function Qt(d, p) {
      return d.has(p);
    }
    function zo(d, p) {
      for (var v = -1, S = d.length; ++v < S && Et(p, d[v], 0) > -1; )
        ;
      return v;
    }
    function Do(d, p) {
      for (var v = d.length; v-- && Et(p, d[v], 0) > -1; )
        ;
      return v;
    }
    function Df(d, p) {
      for (var v = d.length, S = 0; v--; )
        d[v] === p && ++S;
      return S;
    }
    var Ff = Yi(bf), Uf = Yi(Cf);
    function Wf(d) {
      return "\\" + Ef[d];
    }
    function Nf(d, p) {
      return d == null ? a : d[p];
    }
    function Rt(d) {
      return mf.test(d);
    }
    function $f(d) {
      return xf.test(d);
    }
    function Gf(d) {
      for (var p, v = []; !(p = d.next()).done; )
        v.push(p.value);
      return v;
    }
    function Xi(d) {
      var p = -1, v = Array(d.size);
      return d.forEach(function(S, k) {
        v[++p] = [k, S];
      }), v;
    }
    function Fo(d, p) {
      return function(v) {
        return d(p(v));
      };
    }
    function qe(d, p) {
      for (var v = -1, S = d.length, k = 0, K = []; ++v < S; ) {
        var gn = d[v];
        (gn === p || gn === Z) && (d[v] = Z, K[k++] = v);
      }
      return K;
    }
    function Hr(d) {
      var p = -1, v = Array(d.size);
      return d.forEach(function(S) {
        v[++p] = S;
      }), v;
    }
    function qf(d) {
      var p = -1, v = Array(d.size);
      return d.forEach(function(S) {
        v[++p] = [S, S];
      }), v;
    }
    function Vf(d, p, v) {
      for (var S = v - 1, k = d.length; ++S < k; )
        if (d[S] === p)
          return S;
      return -1;
    }
    function Yf(d, p, v) {
      for (var S = v + 1; S--; )
        if (d[S] === p)
          return S;
      return S;
    }
    function St(d) {
      return Rt(d) ? Zf(d) : Of(d);
    }
    function ce(d) {
      return Rt(d) ? Jf(d) : Bf(d);
    }
    function Uo(d) {
      for (var p = d.length; p-- && Bi.test(d.charAt(p)); )
        ;
      return p;
    }
    var Kf = Yi(Tf);
    function Zf(d) {
      for (var p = Ui.lastIndex = 0; Ui.test(d); )
        ++p;
      return p;
    }
    function Jf(d) {
      return d.match(Ui) || [];
    }
    function Xf(d) {
      return d.match(_f) || [];
    }
    var Qf = function d(p) {
      p = p == null ? xn : At.defaults(xn.Object(), p, At.pick(xn, yf));
      var v = p.Array, S = p.Date, k = p.Error, K = p.Function, gn = p.Math, j = p.Object, Qi = p.RegExp, jf = p.String, Qn = p.TypeError, Pr = v.prototype, nc = K.prototype, It = j.prototype, zr = p["__core-js_shared__"], Dr = nc.toString, Q = It.hasOwnProperty, ec = 0, Wo = function() {
        var n = /[^.]+$/.exec(zr && zr.keys && zr.keys.IE_PROTO || "");
        return n ? "Symbol(src)_1." + n : "";
      }(), Fr = It.toString, tc = Dr.call(j), rc = xn._, ic = Qi(
        "^" + Dr.call(Q).replace(Jt, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
      ), Ur = To ? p.Buffer : a, Ve = p.Symbol, Wr = p.Uint8Array, No = Ur ? Ur.allocUnsafe : a, Nr = Fo(j.getPrototypeOf, j), $o = j.create, Go = It.propertyIsEnumerable, $r = Pr.splice, qo = Ve ? Ve.isConcatSpreadable : a, jt = Ve ? Ve.iterator : a, ot = Ve ? Ve.toStringTag : a, Gr = function() {
        try {
          var n = st(j, "defineProperty");
          return n({}, "", {}), n;
        } catch {
        }
      }(), uc = p.clearTimeout !== xn.clearTimeout && p.clearTimeout, oc = S && S.now !== xn.Date.now && S.now, ac = p.setTimeout !== xn.setTimeout && p.setTimeout, qr = gn.ceil, Vr = gn.floor, ji = j.getOwnPropertySymbols, lc = Ur ? Ur.isBuffer : a, Vo = p.isFinite, fc = Pr.join, cc = Fo(j.keys, j), vn = gn.max, wn = gn.min, sc = S.now, dc = p.parseInt, Yo = gn.random, hc = Pr.reverse, nu = st(p, "DataView"), nr = st(p, "Map"), eu = st(p, "Promise"), Mt = st(p, "Set"), er = st(p, "WeakMap"), tr = st(j, "create"), Yr = er && new er(), Lt = {}, gc = dt(nu), vc = dt(nr), pc = dt(eu), _c = dt(Mt), mc = dt(er), Kr = Ve ? Ve.prototype : a, rr = Kr ? Kr.valueOf : a, Ko = Kr ? Kr.toString : a;
      function o(n) {
        if (cn(n) && !H(n) && !(n instanceof $)) {
          if (n instanceof jn)
            return n;
          if (Q.call(n, "__wrapped__"))
            return Za(n);
        }
        return new jn(n);
      }
      var Ot = function() {
        function n() {
        }
        return function(e) {
          if (!an(e))
            return {};
          if ($o)
            return $o(e);
          n.prototype = e;
          var t = new n();
          return n.prototype = a, t;
        };
      }();
      function Zr() {
      }
      function jn(n, e) {
        this.__wrapped__ = n, this.__actions__ = [], this.__chain__ = !!e, this.__index__ = 0, this.__values__ = a;
      }
      o.templateSettings = {
        /**
         * Used to detect `data` property values to be HTML-escaped.
         *
         * @memberOf _.templateSettings
         * @type {RegExp}
         */
        escape: Li,
        /**
         * Used to detect code to be evaluated.
         *
         * @memberOf _.templateSettings
         * @type {RegExp}
         */
        evaluate: Rr,
        /**
         * Used to detect `data` property values to inject.
         *
         * @memberOf _.templateSettings
         * @type {RegExp}
         */
        interpolate: Sr,
        /**
         * Used to reference the data object in the template text.
         *
         * @memberOf _.templateSettings
         * @type {string}
         */
        variable: "",
        /**
         * Used to import variables into the compiled template.
         *
         * @memberOf _.templateSettings
         * @type {Object}
         */
        imports: {
          /**
           * A reference to the `lodash` function.
           *
           * @memberOf _.templateSettings.imports
           * @type {Function}
           */
          _: o
        }
      }, o.prototype = Zr.prototype, o.prototype.constructor = o, jn.prototype = Ot(Zr.prototype), jn.prototype.constructor = jn;
      function $(n) {
        this.__wrapped__ = n, this.__actions__ = [], this.__dir__ = 1, this.__filtered__ = !1, this.__iteratees__ = [], this.__takeCount__ = zn, this.__views__ = [];
      }
      function xc() {
        var n = new $(this.__wrapped__);
        return n.__actions__ = Bn(this.__actions__), n.__dir__ = this.__dir__, n.__filtered__ = this.__filtered__, n.__iteratees__ = Bn(this.__iteratees__), n.__takeCount__ = this.__takeCount__, n.__views__ = Bn(this.__views__), n;
      }
      function yc() {
        if (this.__filtered__) {
          var n = new $(this);
          n.__dir__ = -1, n.__filtered__ = !0;
        } else
          n = this.clone(), n.__dir__ *= -1;
        return n;
      }
      function wc() {
        var n = this.__wrapped__.value(), e = this.__dir__, t = H(n), r = e < 0, i = t ? n.length : 0, l = Bs(0, i, this.__views__), f = l.start, s = l.end, h = s - f, _ = r ? s : f - 1, m = this.__iteratees__, y = m.length, R = 0, A = wn(h, this.__takeCount__);
        if (!t || !r && i == h && A == h)
          return ma(n, this.__actions__);
        var L = [];
        n:
          for (; h-- && R < A; ) {
            _ += e;
            for (var z = -1, O = n[_]; ++z < y; ) {
              var W = m[z], G = W.iteratee, Gn = W.type, Sn = G(O);
              if (Gn == nt)
                O = Sn;
              else if (!Sn) {
                if (Gn == ge)
                  continue n;
                break n;
              }
            }
            L[R++] = O;
          }
        return L;
      }
      $.prototype = Ot(Zr.prototype), $.prototype.constructor = $;
      function at(n) {
        var e = -1, t = n == null ? 0 : n.length;
        for (this.clear(); ++e < t; ) {
          var r = n[e];
          this.set(r[0], r[1]);
        }
      }
      function bc() {
        this.__data__ = tr ? tr(null) : {}, this.size = 0;
      }
      function Cc(n) {
        var e = this.has(n) && delete this.__data__[n];
        return this.size -= e ? 1 : 0, e;
      }
      function Tc(n) {
        var e = this.__data__;
        if (tr) {
          var t = e[n];
          return t === D ? a : t;
        }
        return Q.call(e, n) ? e[n] : a;
      }
      function Ec(n) {
        var e = this.__data__;
        return tr ? e[n] !== a : Q.call(e, n);
      }
      function Rc(n, e) {
        var t = this.__data__;
        return this.size += this.has(n) ? 0 : 1, t[n] = tr && e === a ? D : e, this;
      }
      at.prototype.clear = bc, at.prototype.delete = Cc, at.prototype.get = Tc, at.prototype.has = Ec, at.prototype.set = Rc;
      function Re(n) {
        var e = -1, t = n == null ? 0 : n.length;
        for (this.clear(); ++e < t; ) {
          var r = n[e];
          this.set(r[0], r[1]);
        }
      }
      function Sc() {
        this.__data__ = [], this.size = 0;
      }
      function Ac(n) {
        var e = this.__data__, t = Jr(e, n);
        if (t < 0)
          return !1;
        var r = e.length - 1;
        return t == r ? e.pop() : $r.call(e, t, 1), --this.size, !0;
      }
      function Ic(n) {
        var e = this.__data__, t = Jr(e, n);
        return t < 0 ? a : e[t][1];
      }
      function Mc(n) {
        return Jr(this.__data__, n) > -1;
      }
      function Lc(n, e) {
        var t = this.__data__, r = Jr(t, n);
        return r < 0 ? (++this.size, t.push([n, e])) : t[r][1] = e, this;
      }
      Re.prototype.clear = Sc, Re.prototype.delete = Ac, Re.prototype.get = Ic, Re.prototype.has = Mc, Re.prototype.set = Lc;
      function Se(n) {
        var e = -1, t = n == null ? 0 : n.length;
        for (this.clear(); ++e < t; ) {
          var r = n[e];
          this.set(r[0], r[1]);
        }
      }
      function Oc() {
        this.size = 0, this.__data__ = {
          hash: new at(),
          map: new (nr || Re)(),
          string: new at()
        };
      }
      function Bc(n) {
        var e = li(this, n).delete(n);
        return this.size -= e ? 1 : 0, e;
      }
      function kc(n) {
        return li(this, n).get(n);
      }
      function Hc(n) {
        return li(this, n).has(n);
      }
      function Pc(n, e) {
        var t = li(this, n), r = t.size;
        return t.set(n, e), this.size += t.size == r ? 0 : 1, this;
      }
      Se.prototype.clear = Oc, Se.prototype.delete = Bc, Se.prototype.get = kc, Se.prototype.has = Hc, Se.prototype.set = Pc;
      function lt(n) {
        var e = -1, t = n == null ? 0 : n.length;
        for (this.__data__ = new Se(); ++e < t; )
          this.add(n[e]);
      }
      function zc(n) {
        return this.__data__.set(n, D), this;
      }
      function Dc(n) {
        return this.__data__.has(n);
      }
      lt.prototype.add = lt.prototype.push = zc, lt.prototype.has = Dc;
      function se(n) {
        var e = this.__data__ = new Re(n);
        this.size = e.size;
      }
      function Fc() {
        this.__data__ = new Re(), this.size = 0;
      }
      function Uc(n) {
        var e = this.__data__, t = e.delete(n);
        return this.size = e.size, t;
      }
      function Wc(n) {
        return this.__data__.get(n);
      }
      function Nc(n) {
        return this.__data__.has(n);
      }
      function $c(n, e) {
        var t = this.__data__;
        if (t instanceof Re) {
          var r = t.__data__;
          if (!nr || r.length < T - 1)
            return r.push([n, e]), this.size = ++t.size, this;
          t = this.__data__ = new Se(r);
        }
        return t.set(n, e), this.size = t.size, this;
      }
      se.prototype.clear = Fc, se.prototype.delete = Uc, se.prototype.get = Wc, se.prototype.has = Nc, se.prototype.set = $c;
      function Zo(n, e) {
        var t = H(n), r = !t && ht(n), i = !t && !r && Xe(n), l = !t && !r && !i && Pt(n), f = t || r || i || l, s = f ? Zi(n.length, jf) : [], h = s.length;
        for (var _ in n)
          (e || Q.call(n, _)) && !(f && // Safari 9 has enumerable `arguments.length` in strict mode.
          (_ == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
          i && (_ == "offset" || _ == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
          l && (_ == "buffer" || _ == "byteLength" || _ == "byteOffset") || // Skip index properties.
          Le(_, h))) && s.push(_);
        return s;
      }
      function Jo(n) {
        var e = n.length;
        return e ? n[du(0, e - 1)] : a;
      }
      function Gc(n, e) {
        return fi(Bn(n), ft(e, 0, n.length));
      }
      function qc(n) {
        return fi(Bn(n));
      }
      function tu(n, e, t) {
        (t !== a && !de(n[e], t) || t === a && !(e in n)) && Ae(n, e, t);
      }
      function ir(n, e, t) {
        var r = n[e];
        (!(Q.call(n, e) && de(r, t)) || t === a && !(e in n)) && Ae(n, e, t);
      }
      function Jr(n, e) {
        for (var t = n.length; t--; )
          if (de(n[t][0], e))
            return t;
        return -1;
      }
      function Vc(n, e, t, r) {
        return Ye(n, function(i, l, f) {
          e(r, i, t(i), f);
        }), r;
      }
      function Xo(n, e) {
        return n && xe(e, _n(e), n);
      }
      function Yc(n, e) {
        return n && xe(e, Hn(e), n);
      }
      function Ae(n, e, t) {
        e == "__proto__" && Gr ? Gr(n, e, {
          configurable: !0,
          enumerable: !0,
          value: t,
          writable: !0
        }) : n[e] = t;
      }
      function ru(n, e) {
        for (var t = -1, r = e.length, i = v(r), l = n == null; ++t < r; )
          i[t] = l ? a : zu(n, e[t]);
        return i;
      }
      function ft(n, e, t) {
        return n === n && (t !== a && (n = n <= t ? n : t), e !== a && (n = n >= e ? n : e)), n;
      }
      function ne(n, e, t, r, i, l) {
        var f, s = e & nn, h = e & Cn, _ = e & Tn;
        if (t && (f = i ? t(n, r, i, l) : t(n)), f !== a)
          return f;
        if (!an(n))
          return n;
        var m = H(n);
        if (m) {
          if (f = Hs(n), !s)
            return Bn(n, f);
        } else {
          var y = bn(n), R = y == tt || y == br;
          if (Xe(n))
            return wa(n, s);
          if (y == Zn || y == Fe || R && !i) {
            if (f = h || R ? {} : Ua(n), !s)
              return h ? Ts(n, Yc(f, n)) : Cs(n, Xo(f, n));
          } else {
            if (!en[y])
              return i ? n : {};
            f = Ps(n, y, s);
          }
        }
        l || (l = new se());
        var A = l.get(n);
        if (A)
          return A;
        l.set(n, f), vl(n) ? n.forEach(function(O) {
          f.add(ne(O, e, t, O, n, l));
        }) : hl(n) && n.forEach(function(O, W) {
          f.set(W, ne(O, e, t, W, n, l));
        });
        var L = _ ? h ? Cu : bu : h ? Hn : _n, z = m ? a : L(n);
        return Xn(z || n, function(O, W) {
          z && (W = O, O = n[W]), ir(f, W, ne(O, e, t, W, n, l));
        }), f;
      }
      function Kc(n) {
        var e = _n(n);
        return function(t) {
          return Qo(t, n, e);
        };
      }
      function Qo(n, e, t) {
        var r = t.length;
        if (n == null)
          return !r;
        for (n = j(n); r--; ) {
          var i = t[r], l = e[i], f = n[i];
          if (f === a && !(i in n) || !l(f))
            return !1;
        }
        return !0;
      }
      function jo(n, e, t) {
        if (typeof n != "function")
          throw new Qn(C);
        return sr(function() {
          n.apply(a, t);
        }, e);
      }
      function ur(n, e, t, r) {
        var i = -1, l = Br, f = !0, s = n.length, h = [], _ = e.length;
        if (!s)
          return h;
        t && (e = un(e, Wn(t))), r ? (l = $i, f = !1) : e.length >= T && (l = Qt, f = !1, e = new lt(e));
        n:
          for (; ++i < s; ) {
            var m = n[i], y = t == null ? m : t(m);
            if (m = r || m !== 0 ? m : 0, f && y === y) {
              for (var R = _; R--; )
                if (e[R] === y)
                  continue n;
              h.push(m);
            } else
              l(e, y, r) || h.push(m);
          }
        return h;
      }
      var Ye = Ra(me), na = Ra(uu, !0);
      function Zc(n, e) {
        var t = !0;
        return Ye(n, function(r, i, l) {
          return t = !!e(r, i, l), t;
        }), t;
      }
      function Xr(n, e, t) {
        for (var r = -1, i = n.length; ++r < i; ) {
          var l = n[r], f = e(l);
          if (f != null && (s === a ? f === f && !$n(f) : t(f, s)))
            var s = f, h = l;
        }
        return h;
      }
      function Jc(n, e, t, r) {
        var i = n.length;
        for (t = P(t), t < 0 && (t = -t > i ? 0 : i + t), r = r === a || r > i ? i : P(r), r < 0 && (r += i), r = t > r ? 0 : _l(r); t < r; )
          n[t++] = e;
        return n;
      }
      function ea(n, e) {
        var t = [];
        return Ye(n, function(r, i, l) {
          e(r, i, l) && t.push(r);
        }), t;
      }
      function yn(n, e, t, r, i) {
        var l = -1, f = n.length;
        for (t || (t = Ds), i || (i = []); ++l < f; ) {
          var s = n[l];
          e > 0 && t(s) ? e > 1 ? yn(s, e - 1, t, r, i) : Ge(i, s) : r || (i[i.length] = s);
        }
        return i;
      }
      var iu = Sa(), ta = Sa(!0);
      function me(n, e) {
        return n && iu(n, e, _n);
      }
      function uu(n, e) {
        return n && ta(n, e, _n);
      }
      function Qr(n, e) {
        return $e(e, function(t) {
          return Oe(n[t]);
        });
      }
      function ct(n, e) {
        e = Ze(e, n);
        for (var t = 0, r = e.length; n != null && t < r; )
          n = n[ye(e[t++])];
        return t && t == r ? n : a;
      }
      function ra(n, e, t) {
        var r = e(n);
        return H(n) ? r : Ge(r, t(n));
      }
      function En(n) {
        return n == null ? n === a ? Ii : mt : ot && ot in j(n) ? Os(n) : qs(n);
      }
      function ou(n, e) {
        return n > e;
      }
      function Xc(n, e) {
        return n != null && Q.call(n, e);
      }
      function Qc(n, e) {
        return n != null && e in j(n);
      }
      function jc(n, e, t) {
        return n >= wn(e, t) && n < vn(e, t);
      }
      function au(n, e, t) {
        for (var r = t ? $i : Br, i = n[0].length, l = n.length, f = l, s = v(l), h = 1 / 0, _ = []; f--; ) {
          var m = n[f];
          f && e && (m = un(m, Wn(e))), h = wn(m.length, h), s[f] = !t && (e || i >= 120 && m.length >= 120) ? new lt(f && m) : a;
        }
        m = n[0];
        var y = -1, R = s[0];
        n:
          for (; ++y < i && _.length < h; ) {
            var A = m[y], L = e ? e(A) : A;
            if (A = t || A !== 0 ? A : 0, !(R ? Qt(R, L) : r(_, L, t))) {
              for (f = l; --f; ) {
                var z = s[f];
                if (!(z ? Qt(z, L) : r(n[f], L, t)))
                  continue n;
              }
              R && R.push(L), _.push(A);
            }
          }
        return _;
      }
      function ns(n, e, t, r) {
        return me(n, function(i, l, f) {
          e(r, t(i), l, f);
        }), r;
      }
      function or(n, e, t) {
        e = Ze(e, n), n = Ga(n, e);
        var r = n == null ? n : n[ye(te(e))];
        return r == null ? a : Un(r, n, t);
      }
      function ia(n) {
        return cn(n) && En(n) == Fe;
      }
      function es(n) {
        return cn(n) && En(n) == le;
      }
      function ts(n) {
        return cn(n) && En(n) == Ce;
      }
      function ar(n, e, t, r, i) {
        return n === e ? !0 : n == null || e == null || !cn(n) && !cn(e) ? n !== n && e !== e : rs(n, e, t, r, ar, i);
      }
      function rs(n, e, t, r, i, l) {
        var f = H(n), s = H(e), h = f ? Ue : bn(n), _ = s ? Ue : bn(e);
        h = h == Fe ? Zn : h, _ = _ == Fe ? Zn : _;
        var m = h == Zn, y = _ == Zn, R = h == _;
        if (R && Xe(n)) {
          if (!Xe(e))
            return !1;
          f = !0, m = !1;
        }
        if (R && !m)
          return l || (l = new se()), f || Pt(n) ? za(n, e, t, r, i, l) : Ms(n, e, h, t, r, i, l);
        if (!(t & be)) {
          var A = m && Q.call(n, "__wrapped__"), L = y && Q.call(e, "__wrapped__");
          if (A || L) {
            var z = A ? n.value() : n, O = L ? e.value() : e;
            return l || (l = new se()), i(z, O, t, r, l);
          }
        }
        return R ? (l || (l = new se()), Ls(n, e, t, r, i, l)) : !1;
      }
      function is(n) {
        return cn(n) && bn(n) == Dn;
      }
      function lu(n, e, t, r) {
        var i = t.length, l = i, f = !r;
        if (n == null)
          return !l;
        for (n = j(n); i--; ) {
          var s = t[i];
          if (f && s[2] ? s[1] !== n[s[0]] : !(s[0] in n))
            return !1;
        }
        for (; ++i < l; ) {
          s = t[i];
          var h = s[0], _ = n[h], m = s[1];
          if (f && s[2]) {
            if (_ === a && !(h in n))
              return !1;
          } else {
            var y = new se();
            if (r)
              var R = r(_, m, h, n, e, y);
            if (!(R === a ? ar(m, _, be | gt, r, y) : R))
              return !1;
          }
        }
        return !0;
      }
      function ua(n) {
        if (!an(n) || Us(n))
          return !1;
        var e = Oe(n) ? ic : mn;
        return e.test(dt(n));
      }
      function us(n) {
        return cn(n) && En(n) == rt;
      }
      function os(n) {
        return cn(n) && bn(n) == Fn;
      }
      function as(n) {
        return cn(n) && vi(n.length) && !!tn[En(n)];
      }
      function oa(n) {
        return typeof n == "function" ? n : n == null ? Pn : typeof n == "object" ? H(n) ? fa(n[0], n[1]) : la(n) : Al(n);
      }
      function fu(n) {
        if (!cr(n))
          return cc(n);
        var e = [];
        for (var t in j(n))
          Q.call(n, t) && t != "constructor" && e.push(t);
        return e;
      }
      function ls(n) {
        if (!an(n))
          return Gs(n);
        var e = cr(n), t = [];
        for (var r in n)
          r == "constructor" && (e || !Q.call(n, r)) || t.push(r);
        return t;
      }
      function cu(n, e) {
        return n < e;
      }
      function aa(n, e) {
        var t = -1, r = kn(n) ? v(n.length) : [];
        return Ye(n, function(i, l, f) {
          r[++t] = e(i, l, f);
        }), r;
      }
      function la(n) {
        var e = Eu(n);
        return e.length == 1 && e[0][2] ? Na(e[0][0], e[0][1]) : function(t) {
          return t === n || lu(t, n, e);
        };
      }
      function fa(n, e) {
        return Su(n) && Wa(e) ? Na(ye(n), e) : function(t) {
          var r = zu(t, n);
          return r === a && r === e ? Du(t, n) : ar(e, r, be | gt);
        };
      }
      function jr(n, e, t, r, i) {
        n !== e && iu(e, function(l, f) {
          if (i || (i = new se()), an(l))
            fs(n, e, f, t, jr, r, i);
          else {
            var s = r ? r(Iu(n, f), l, f + "", n, e, i) : a;
            s === a && (s = l), tu(n, f, s);
          }
        }, Hn);
      }
      function fs(n, e, t, r, i, l, f) {
        var s = Iu(n, t), h = Iu(e, t), _ = f.get(h);
        if (_) {
          tu(n, t, _);
          return;
        }
        var m = l ? l(s, h, t + "", n, e, f) : a, y = m === a;
        if (y) {
          var R = H(h), A = !R && Xe(h), L = !R && !A && Pt(h);
          m = h, R || A || L ? H(s) ? m = s : sn(s) ? m = Bn(s) : A ? (y = !1, m = wa(h, !0)) : L ? (y = !1, m = ba(h, !0)) : m = [] : dr(h) || ht(h) ? (m = s, ht(s) ? m = ml(s) : (!an(s) || Oe(s)) && (m = Ua(h))) : y = !1;
        }
        y && (f.set(h, m), i(m, h, r, l, f), f.delete(h)), tu(n, t, m);
      }
      function ca(n, e) {
        var t = n.length;
        if (t)
          return e += e < 0 ? t : 0, Le(e, t) ? n[e] : a;
      }
      function sa(n, e, t) {
        e.length ? e = un(e, function(l) {
          return H(l) ? function(f) {
            return ct(f, l.length === 1 ? l[0] : l);
          } : l;
        }) : e = [Pn];
        var r = -1;
        e = un(e, Wn(M()));
        var i = aa(n, function(l, f, s) {
          var h = un(e, function(_) {
            return _(l);
          });
          return { criteria: h, index: ++r, value: l };
        });
        return Pf(i, function(l, f) {
          return bs(l, f, t);
        });
      }
      function cs(n, e) {
        return da(n, e, function(t, r) {
          return Du(n, r);
        });
      }
      function da(n, e, t) {
        for (var r = -1, i = e.length, l = {}; ++r < i; ) {
          var f = e[r], s = ct(n, f);
          t(s, f) && lr(l, Ze(f, n), s);
        }
        return l;
      }
      function ss(n) {
        return function(e) {
          return ct(e, n);
        };
      }
      function su(n, e, t, r) {
        var i = r ? Hf : Et, l = -1, f = e.length, s = n;
        for (n === e && (e = Bn(e)), t && (s = un(n, Wn(t))); ++l < f; )
          for (var h = 0, _ = e[l], m = t ? t(_) : _; (h = i(s, m, h, r)) > -1; )
            s !== n && $r.call(s, h, 1), $r.call(n, h, 1);
        return n;
      }
      function ha(n, e) {
        for (var t = n ? e.length : 0, r = t - 1; t--; ) {
          var i = e[t];
          if (t == r || i !== l) {
            var l = i;
            Le(i) ? $r.call(n, i, 1) : vu(n, i);
          }
        }
        return n;
      }
      function du(n, e) {
        return n + Vr(Yo() * (e - n + 1));
      }
      function ds(n, e, t, r) {
        for (var i = -1, l = vn(qr((e - n) / (t || 1)), 0), f = v(l); l--; )
          f[r ? l : ++i] = n, n += t;
        return f;
      }
      function hu(n, e) {
        var t = "";
        if (!n || e < 1 || e > ae)
          return t;
        do
          e % 2 && (t += n), e = Vr(e / 2), e && (n += n);
        while (e);
        return t;
      }
      function F(n, e) {
        return Mu($a(n, e, Pn), n + "");
      }
      function hs(n) {
        return Jo(zt(n));
      }
      function gs(n, e) {
        var t = zt(n);
        return fi(t, ft(e, 0, t.length));
      }
      function lr(n, e, t, r) {
        if (!an(n))
          return n;
        e = Ze(e, n);
        for (var i = -1, l = e.length, f = l - 1, s = n; s != null && ++i < l; ) {
          var h = ye(e[i]), _ = t;
          if (h === "__proto__" || h === "constructor" || h === "prototype")
            return n;
          if (i != f) {
            var m = s[h];
            _ = r ? r(m, h, s) : a, _ === a && (_ = an(m) ? m : Le(e[i + 1]) ? [] : {});
          }
          ir(s, h, _), s = s[h];
        }
        return n;
      }
      var ga = Yr ? function(n, e) {
        return Yr.set(n, e), n;
      } : Pn, vs = Gr ? function(n, e) {
        return Gr(n, "toString", {
          configurable: !0,
          enumerable: !1,
          value: Uu(e),
          writable: !0
        });
      } : Pn;
      function ps(n) {
        return fi(zt(n));
      }
      function ee(n, e, t) {
        var r = -1, i = n.length;
        e < 0 && (e = -e > i ? 0 : i + e), t = t > i ? i : t, t < 0 && (t += i), i = e > t ? 0 : t - e >>> 0, e >>>= 0;
        for (var l = v(i); ++r < i; )
          l[r] = n[r + e];
        return l;
      }
      function _s(n, e) {
        var t;
        return Ye(n, function(r, i, l) {
          return t = e(r, i, l), !t;
        }), !!t;
      }
      function ni(n, e, t) {
        var r = 0, i = n == null ? r : n.length;
        if (typeof e == "number" && e === e && i <= wr) {
          for (; r < i; ) {
            var l = r + i >>> 1, f = n[l];
            f !== null && !$n(f) && (t ? f <= e : f < e) ? r = l + 1 : i = l;
          }
          return i;
        }
        return gu(n, e, Pn, t);
      }
      function gu(n, e, t, r) {
        var i = 0, l = n == null ? 0 : n.length;
        if (l === 0)
          return 0;
        e = t(e);
        for (var f = e !== e, s = e === null, h = $n(e), _ = e === a; i < l; ) {
          var m = Vr((i + l) / 2), y = t(n[m]), R = y !== a, A = y === null, L = y === y, z = $n(y);
          if (f)
            var O = r || L;
          else
            _ ? O = L && (r || R) : s ? O = L && R && (r || !A) : h ? O = L && R && !A && (r || !z) : A || z ? O = !1 : O = r ? y <= e : y < e;
          O ? i = m + 1 : l = m;
        }
        return wn(l, yr);
      }
      function va(n, e) {
        for (var t = -1, r = n.length, i = 0, l = []; ++t < r; ) {
          var f = n[t], s = e ? e(f) : f;
          if (!t || !de(s, h)) {
            var h = s;
            l[i++] = f === 0 ? 0 : f;
          }
        }
        return l;
      }
      function pa(n) {
        return typeof n == "number" ? n : $n(n) ? et : +n;
      }
      function Nn(n) {
        if (typeof n == "string")
          return n;
        if (H(n))
          return un(n, Nn) + "";
        if ($n(n))
          return Ko ? Ko.call(n) : "";
        var e = n + "";
        return e == "0" && 1 / n == -ve ? "-0" : e;
      }
      function Ke(n, e, t) {
        var r = -1, i = Br, l = n.length, f = !0, s = [], h = s;
        if (t)
          f = !1, i = $i;
        else if (l >= T) {
          var _ = e ? null : As(n);
          if (_)
            return Hr(_);
          f = !1, i = Qt, h = new lt();
        } else
          h = e ? [] : s;
        n:
          for (; ++r < l; ) {
            var m = n[r], y = e ? e(m) : m;
            if (m = t || m !== 0 ? m : 0, f && y === y) {
              for (var R = h.length; R--; )
                if (h[R] === y)
                  continue n;
              e && h.push(y), s.push(m);
            } else
              i(h, y, t) || (h !== s && h.push(y), s.push(m));
          }
        return s;
      }
      function vu(n, e) {
        return e = Ze(e, n), n = Ga(n, e), n == null || delete n[ye(te(e))];
      }
      function _a(n, e, t, r) {
        return lr(n, e, t(ct(n, e)), r);
      }
      function ei(n, e, t, r) {
        for (var i = n.length, l = r ? i : -1; (r ? l-- : ++l < i) && e(n[l], l, n); )
          ;
        return t ? ee(n, r ? 0 : l, r ? l + 1 : i) : ee(n, r ? l + 1 : 0, r ? i : l);
      }
      function ma(n, e) {
        var t = n;
        return t instanceof $ && (t = t.value()), Gi(e, function(r, i) {
          return i.func.apply(i.thisArg, Ge([r], i.args));
        }, t);
      }
      function pu(n, e, t) {
        var r = n.length;
        if (r < 2)
          return r ? Ke(n[0]) : [];
        for (var i = -1, l = v(r); ++i < r; )
          for (var f = n[i], s = -1; ++s < r; )
            s != i && (l[i] = ur(l[i] || f, n[s], e, t));
        return Ke(yn(l, 1), e, t);
      }
      function xa(n, e, t) {
        for (var r = -1, i = n.length, l = e.length, f = {}; ++r < i; ) {
          var s = r < l ? e[r] : a;
          t(f, n[r], s);
        }
        return f;
      }
      function _u(n) {
        return sn(n) ? n : [];
      }
      function mu(n) {
        return typeof n == "function" ? n : Pn;
      }
      function Ze(n, e) {
        return H(n) ? n : Su(n, e) ? [n] : Ka(X(n));
      }
      var ms = F;
      function Je(n, e, t) {
        var r = n.length;
        return t = t === a ? r : t, !e && t >= r ? n : ee(n, e, t);
      }
      var ya = uc || function(n) {
        return xn.clearTimeout(n);
      };
      function wa(n, e) {
        if (e)
          return n.slice();
        var t = n.length, r = No ? No(t) : new n.constructor(t);
        return n.copy(r), r;
      }
      function xu(n) {
        var e = new n.constructor(n.byteLength);
        return new Wr(e).set(new Wr(n)), e;
      }
      function xs(n, e) {
        var t = e ? xu(n.buffer) : n.buffer;
        return new n.constructor(t, n.byteOffset, n.byteLength);
      }
      function ys(n) {
        var e = new n.constructor(n.source, J.exec(n));
        return e.lastIndex = n.lastIndex, e;
      }
      function ws(n) {
        return rr ? j(rr.call(n)) : {};
      }
      function ba(n, e) {
        var t = e ? xu(n.buffer) : n.buffer;
        return new n.constructor(t, n.byteOffset, n.length);
      }
      function Ca(n, e) {
        if (n !== e) {
          var t = n !== a, r = n === null, i = n === n, l = $n(n), f = e !== a, s = e === null, h = e === e, _ = $n(e);
          if (!s && !_ && !l && n > e || l && f && h && !s && !_ || r && f && h || !t && h || !i)
            return 1;
          if (!r && !l && !_ && n < e || _ && t && i && !r && !l || s && t && i || !f && i || !h)
            return -1;
        }
        return 0;
      }
      function bs(n, e, t) {
        for (var r = -1, i = n.criteria, l = e.criteria, f = i.length, s = t.length; ++r < f; ) {
          var h = Ca(i[r], l[r]);
          if (h) {
            if (r >= s)
              return h;
            var _ = t[r];
            return h * (_ == "desc" ? -1 : 1);
          }
        }
        return n.index - e.index;
      }
      function Ta(n, e, t, r) {
        for (var i = -1, l = n.length, f = t.length, s = -1, h = e.length, _ = vn(l - f, 0), m = v(h + _), y = !r; ++s < h; )
          m[s] = e[s];
        for (; ++i < f; )
          (y || i < l) && (m[t[i]] = n[i]);
        for (; _--; )
          m[s++] = n[i++];
        return m;
      }
      function Ea(n, e, t, r) {
        for (var i = -1, l = n.length, f = -1, s = t.length, h = -1, _ = e.length, m = vn(l - s, 0), y = v(m + _), R = !r; ++i < m; )
          y[i] = n[i];
        for (var A = i; ++h < _; )
          y[A + h] = e[h];
        for (; ++f < s; )
          (R || i < l) && (y[A + t[f]] = n[i++]);
        return y;
      }
      function Bn(n, e) {
        var t = -1, r = n.length;
        for (e || (e = v(r)); ++t < r; )
          e[t] = n[t];
        return e;
      }
      function xe(n, e, t, r) {
        var i = !t;
        t || (t = {});
        for (var l = -1, f = e.length; ++l < f; ) {
          var s = e[l], h = r ? r(t[s], n[s], s, t, n) : a;
          h === a && (h = n[s]), i ? Ae(t, s, h) : ir(t, s, h);
        }
        return t;
      }
      function Cs(n, e) {
        return xe(n, Ru(n), e);
      }
      function Ts(n, e) {
        return xe(n, Da(n), e);
      }
      function ti(n, e) {
        return function(t, r) {
          var i = H(t) ? If : Vc, l = e ? e() : {};
          return i(t, n, M(r, 2), l);
        };
      }
      function Bt(n) {
        return F(function(e, t) {
          var r = -1, i = t.length, l = i > 1 ? t[i - 1] : a, f = i > 2 ? t[2] : a;
          for (l = n.length > 3 && typeof l == "function" ? (i--, l) : a, f && Rn(t[0], t[1], f) && (l = i < 3 ? a : l, i = 1), e = j(e); ++r < i; ) {
            var s = t[r];
            s && n(e, s, r, l);
          }
          return e;
        });
      }
      function Ra(n, e) {
        return function(t, r) {
          if (t == null)
            return t;
          if (!kn(t))
            return n(t, r);
          for (var i = t.length, l = e ? i : -1, f = j(t); (e ? l-- : ++l < i) && r(f[l], l, f) !== !1; )
            ;
          return t;
        };
      }
      function Sa(n) {
        return function(e, t, r) {
          for (var i = -1, l = j(e), f = r(e), s = f.length; s--; ) {
            var h = f[n ? s : ++i];
            if (t(l[h], h, l) === !1)
              break;
          }
          return e;
        };
      }
      function Es(n, e, t) {
        var r = e & In, i = fr(n);
        function l() {
          var f = this && this !== xn && this instanceof l ? i : n;
          return f.apply(r ? t : this, arguments);
        }
        return l;
      }
      function Aa(n) {
        return function(e) {
          e = X(e);
          var t = Rt(e) ? ce(e) : a, r = t ? t[0] : e.charAt(0), i = t ? Je(t, 1).join("") : e.slice(1);
          return r[n]() + i;
        };
      }
      function kt(n) {
        return function(e) {
          return Gi(Rl(El(e).replace(vf, "")), n, "");
        };
      }
      function fr(n) {
        return function() {
          var e = arguments;
          switch (e.length) {
            case 0:
              return new n();
            case 1:
              return new n(e[0]);
            case 2:
              return new n(e[0], e[1]);
            case 3:
              return new n(e[0], e[1], e[2]);
            case 4:
              return new n(e[0], e[1], e[2], e[3]);
            case 5:
              return new n(e[0], e[1], e[2], e[3], e[4]);
            case 6:
              return new n(e[0], e[1], e[2], e[3], e[4], e[5]);
            case 7:
              return new n(e[0], e[1], e[2], e[3], e[4], e[5], e[6]);
          }
          var t = Ot(n.prototype), r = n.apply(t, e);
          return an(r) ? r : t;
        };
      }
      function Rs(n, e, t) {
        var r = fr(n);
        function i() {
          for (var l = arguments.length, f = v(l), s = l, h = Ht(i); s--; )
            f[s] = arguments[s];
          var _ = l < 3 && f[0] !== h && f[l - 1] !== h ? [] : qe(f, h);
          if (l -= _.length, l < t)
            return Ba(
              n,
              e,
              ri,
              i.placeholder,
              a,
              f,
              _,
              a,
              a,
              t - l
            );
          var m = this && this !== xn && this instanceof i ? r : n;
          return Un(m, this, f);
        }
        return i;
      }
      function Ia(n) {
        return function(e, t, r) {
          var i = j(e);
          if (!kn(e)) {
            var l = M(t, 3);
            e = _n(e), t = function(s) {
              return l(i[s], s, i);
            };
          }
          var f = n(e, t, r);
          return f > -1 ? i[l ? e[f] : f] : a;
        };
      }
      function Ma(n) {
        return Me(function(e) {
          var t = e.length, r = t, i = jn.prototype.thru;
          for (n && e.reverse(); r--; ) {
            var l = e[r];
            if (typeof l != "function")
              throw new Qn(C);
            if (i && !f && ai(l) == "wrapper")
              var f = new jn([], !0);
          }
          for (r = f ? r : t; ++r < t; ) {
            l = e[r];
            var s = ai(l), h = s == "wrapper" ? Tu(l) : a;
            h && Au(h[0]) && h[1] == (ue | Yn | Kn | je) && !h[4].length && h[9] == 1 ? f = f[ai(h[0])].apply(f, h[3]) : f = l.length == 1 && Au(l) ? f[s]() : f.thru(l);
          }
          return function() {
            var _ = arguments, m = _[0];
            if (f && _.length == 1 && H(m))
              return f.plant(m).value();
            for (var y = 0, R = t ? e[y].apply(this, _) : m; ++y < t; )
              R = e[y].call(this, R);
            return R;
          };
        });
      }
      function ri(n, e, t, r, i, l, f, s, h, _) {
        var m = e & ue, y = e & In, R = e & Mn, A = e & (Yn | ze), L = e & vt, z = R ? a : fr(n);
        function O() {
          for (var W = arguments.length, G = v(W), Gn = W; Gn--; )
            G[Gn] = arguments[Gn];
          if (A)
            var Sn = Ht(O), qn = Df(G, Sn);
          if (r && (G = Ta(G, r, i, A)), l && (G = Ea(G, l, f, A)), W -= qn, A && W < _) {
            var dn = qe(G, Sn);
            return Ba(
              n,
              e,
              ri,
              O.placeholder,
              t,
              G,
              dn,
              s,
              h,
              _ - W
            );
          }
          var he = y ? t : this, ke = R ? he[n] : n;
          return W = G.length, s ? G = Vs(G, s) : L && W > 1 && G.reverse(), m && h < W && (G.length = h), this && this !== xn && this instanceof O && (ke = z || fr(ke)), ke.apply(he, G);
        }
        return O;
      }
      function La(n, e) {
        return function(t, r) {
          return ns(t, n, e(r), {});
        };
      }
      function ii(n, e) {
        return function(t, r) {
          var i;
          if (t === a && r === a)
            return e;
          if (t !== a && (i = t), r !== a) {
            if (i === a)
              return r;
            typeof t == "string" || typeof r == "string" ? (t = Nn(t), r = Nn(r)) : (t = pa(t), r = pa(r)), i = n(t, r);
          }
          return i;
        };
      }
      function yu(n) {
        return Me(function(e) {
          return e = un(e, Wn(M())), F(function(t) {
            var r = this;
            return n(e, function(i) {
              return Un(i, r, t);
            });
          });
        });
      }
      function ui(n, e) {
        e = e === a ? " " : Nn(e);
        var t = e.length;
        if (t < 2)
          return t ? hu(e, n) : e;
        var r = hu(e, qr(n / St(e)));
        return Rt(e) ? Je(ce(r), 0, n).join("") : r.slice(0, n);
      }
      function Ss(n, e, t, r) {
        var i = e & In, l = fr(n);
        function f() {
          for (var s = -1, h = arguments.length, _ = -1, m = r.length, y = v(m + h), R = this && this !== xn && this instanceof f ? l : n; ++_ < m; )
            y[_] = r[_];
          for (; h--; )
            y[_++] = arguments[++s];
          return Un(R, i ? t : this, y);
        }
        return f;
      }
      function Oa(n) {
        return function(e, t, r) {
          return r && typeof r != "number" && Rn(e, t, r) && (t = r = a), e = Be(e), t === a ? (t = e, e = 0) : t = Be(t), r = r === a ? e < t ? 1 : -1 : Be(r), ds(e, t, r, n);
        };
      }
      function oi(n) {
        return function(e, t) {
          return typeof e == "string" && typeof t == "string" || (e = re(e), t = re(t)), n(e, t);
        };
      }
      function Ba(n, e, t, r, i, l, f, s, h, _) {
        var m = e & Yn, y = m ? f : a, R = m ? a : f, A = m ? l : a, L = m ? a : l;
        e |= m ? Kn : De, e &= ~(m ? De : Kn), e & pn || (e &= ~(In | Mn));
        var z = [
          n,
          e,
          i,
          A,
          y,
          L,
          R,
          s,
          h,
          _
        ], O = t.apply(a, z);
        return Au(n) && qa(O, z), O.placeholder = r, Va(O, n, e);
      }
      function wu(n) {
        var e = gn[n];
        return function(t, r) {
          if (t = re(t), r = r == null ? 0 : wn(P(r), 292), r && Vo(t)) {
            var i = (X(t) + "e").split("e"), l = e(i[0] + "e" + (+i[1] + r));
            return i = (X(l) + "e").split("e"), +(i[0] + "e" + (+i[1] - r));
          }
          return e(t);
        };
      }
      var As = Mt && 1 / Hr(new Mt([, -0]))[1] == ve ? function(n) {
        return new Mt(n);
      } : $u;
      function ka(n) {
        return function(e) {
          var t = bn(e);
          return t == Dn ? Xi(e) : t == Fn ? qf(e) : zf(e, n(e));
        };
      }
      function Ie(n, e, t, r, i, l, f, s) {
        var h = e & Mn;
        if (!h && typeof n != "function")
          throw new Qn(C);
        var _ = r ? r.length : 0;
        if (_ || (e &= ~(Kn | De), r = i = a), f = f === a ? f : vn(P(f), 0), s = s === a ? s : P(s), _ -= i ? i.length : 0, e & De) {
          var m = r, y = i;
          r = i = a;
        }
        var R = h ? a : Tu(n), A = [
          n,
          e,
          t,
          r,
          i,
          m,
          y,
          l,
          f,
          s
        ];
        if (R && $s(A, R), n = A[0], e = A[1], t = A[2], r = A[3], i = A[4], s = A[9] = A[9] === a ? h ? 0 : n.length : vn(A[9] - _, 0), !s && e & (Yn | ze) && (e &= ~(Yn | ze)), !e || e == In)
          var L = Es(n, e, t);
        else
          e == Yn || e == ze ? L = Rs(n, e, s) : (e == Kn || e == (In | Kn)) && !i.length ? L = Ss(n, e, t, r) : L = ri.apply(a, A);
        var z = R ? ga : qa;
        return Va(z(L, A), n, e);
      }
      function Ha(n, e, t, r) {
        return n === a || de(n, It[t]) && !Q.call(r, t) ? e : n;
      }
      function Pa(n, e, t, r, i, l) {
        return an(n) && an(e) && (l.set(e, n), jr(n, e, a, Pa, l), l.delete(e)), n;
      }
      function Is(n) {
        return dr(n) ? a : n;
      }
      function za(n, e, t, r, i, l) {
        var f = t & be, s = n.length, h = e.length;
        if (s != h && !(f && h > s))
          return !1;
        var _ = l.get(n), m = l.get(e);
        if (_ && m)
          return _ == e && m == n;
        var y = -1, R = !0, A = t & gt ? new lt() : a;
        for (l.set(n, e), l.set(e, n); ++y < s; ) {
          var L = n[y], z = e[y];
          if (r)
            var O = f ? r(z, L, y, e, n, l) : r(L, z, y, n, e, l);
          if (O !== a) {
            if (O)
              continue;
            R = !1;
            break;
          }
          if (A) {
            if (!qi(e, function(W, G) {
              if (!Qt(A, G) && (L === W || i(L, W, t, r, l)))
                return A.push(G);
            })) {
              R = !1;
              break;
            }
          } else if (!(L === z || i(L, z, t, r, l))) {
            R = !1;
            break;
          }
        }
        return l.delete(n), l.delete(e), R;
      }
      function Ms(n, e, t, r, i, l, f) {
        switch (t) {
          case Ne:
            if (n.byteLength != e.byteLength || n.byteOffset != e.byteOffset)
              return !1;
            n = n.buffer, e = e.buffer;
          case le:
            return !(n.byteLength != e.byteLength || !l(new Wr(n), new Wr(e)));
          case pe:
          case Ce:
          case _e:
            return de(+n, +e);
          case _t:
            return n.name == e.name && n.message == e.message;
          case rt:
          case Te:
            return n == e + "";
          case Dn:
            var s = Xi;
          case Fn:
            var h = r & be;
            if (s || (s = Hr), n.size != e.size && !h)
              return !1;
            var _ = f.get(n);
            if (_)
              return _ == e;
            r |= gt, f.set(n, e);
            var m = za(s(n), s(e), r, i, l, f);
            return f.delete(n), m;
          case yt:
            if (rr)
              return rr.call(n) == rr.call(e);
        }
        return !1;
      }
      function Ls(n, e, t, r, i, l) {
        var f = t & be, s = bu(n), h = s.length, _ = bu(e), m = _.length;
        if (h != m && !f)
          return !1;
        for (var y = h; y--; ) {
          var R = s[y];
          if (!(f ? R in e : Q.call(e, R)))
            return !1;
        }
        var A = l.get(n), L = l.get(e);
        if (A && L)
          return A == e && L == n;
        var z = !0;
        l.set(n, e), l.set(e, n);
        for (var O = f; ++y < h; ) {
          R = s[y];
          var W = n[R], G = e[R];
          if (r)
            var Gn = f ? r(G, W, R, e, n, l) : r(W, G, R, n, e, l);
          if (!(Gn === a ? W === G || i(W, G, t, r, l) : Gn)) {
            z = !1;
            break;
          }
          O || (O = R == "constructor");
        }
        if (z && !O) {
          var Sn = n.constructor, qn = e.constructor;
          Sn != qn && "constructor" in n && "constructor" in e && !(typeof Sn == "function" && Sn instanceof Sn && typeof qn == "function" && qn instanceof qn) && (z = !1);
        }
        return l.delete(n), l.delete(e), z;
      }
      function Me(n) {
        return Mu($a(n, a, Qa), n + "");
      }
      function bu(n) {
        return ra(n, _n, Ru);
      }
      function Cu(n) {
        return ra(n, Hn, Da);
      }
      var Tu = Yr ? function(n) {
        return Yr.get(n);
      } : $u;
      function ai(n) {
        for (var e = n.name + "", t = Lt[e], r = Q.call(Lt, e) ? t.length : 0; r--; ) {
          var i = t[r], l = i.func;
          if (l == null || l == n)
            return i.name;
        }
        return e;
      }
      function Ht(n) {
        var e = Q.call(o, "placeholder") ? o : n;
        return e.placeholder;
      }
      function M() {
        var n = o.iteratee || Wu;
        return n = n === Wu ? oa : n, arguments.length ? n(arguments[0], arguments[1]) : n;
      }
      function li(n, e) {
        var t = n.__data__;
        return Fs(e) ? t[typeof e == "string" ? "string" : "hash"] : t.map;
      }
      function Eu(n) {
        for (var e = _n(n), t = e.length; t--; ) {
          var r = e[t], i = n[r];
          e[t] = [r, i, Wa(i)];
        }
        return e;
      }
      function st(n, e) {
        var t = Nf(n, e);
        return ua(t) ? t : a;
      }
      function Os(n) {
        var e = Q.call(n, ot), t = n[ot];
        try {
          n[ot] = a;
          var r = !0;
        } catch {
        }
        var i = Fr.call(n);
        return r && (e ? n[ot] = t : delete n[ot]), i;
      }
      var Ru = ji ? function(n) {
        return n == null ? [] : (n = j(n), $e(ji(n), function(e) {
          return Go.call(n, e);
        }));
      } : Gu, Da = ji ? function(n) {
        for (var e = []; n; )
          Ge(e, Ru(n)), n = Nr(n);
        return e;
      } : Gu, bn = En;
      (nu && bn(new nu(new ArrayBuffer(1))) != Ne || nr && bn(new nr()) != Dn || eu && bn(eu.resolve()) != Wt || Mt && bn(new Mt()) != Fn || er && bn(new er()) != We) && (bn = function(n) {
        var e = En(n), t = e == Zn ? n.constructor : a, r = t ? dt(t) : "";
        if (r)
          switch (r) {
            case gc:
              return Ne;
            case vc:
              return Dn;
            case pc:
              return Wt;
            case _c:
              return Fn;
            case mc:
              return We;
          }
        return e;
      });
      function Bs(n, e, t) {
        for (var r = -1, i = t.length; ++r < i; ) {
          var l = t[r], f = l.size;
          switch (l.type) {
            case "drop":
              n += f;
              break;
            case "dropRight":
              e -= f;
              break;
            case "take":
              e = wn(e, n + f);
              break;
            case "takeRight":
              n = vn(n, e - f);
              break;
          }
        }
        return { start: n, end: e };
      }
      function ks(n) {
        var e = n.match(Hi);
        return e ? e[1].split(c) : [];
      }
      function Fa(n, e, t) {
        e = Ze(e, n);
        for (var r = -1, i = e.length, l = !1; ++r < i; ) {
          var f = ye(e[r]);
          if (!(l = n != null && t(n, f)))
            break;
          n = n[f];
        }
        return l || ++r != i ? l : (i = n == null ? 0 : n.length, !!i && vi(i) && Le(f, i) && (H(n) || ht(n)));
      }
      function Hs(n) {
        var e = n.length, t = new n.constructor(e);
        return e && typeof n[0] == "string" && Q.call(n, "index") && (t.index = n.index, t.input = n.input), t;
      }
      function Ua(n) {
        return typeof n.constructor == "function" && !cr(n) ? Ot(Nr(n)) : {};
      }
      function Ps(n, e, t) {
        var r = n.constructor;
        switch (e) {
          case le:
            return xu(n);
          case pe:
          case Ce:
            return new r(+n);
          case Ne:
            return xs(n, t);
          case wt:
          case bt:
          case it:
          case Nt:
          case $t:
          case Gt:
          case qt:
          case Vt:
          case Yt:
            return ba(n, t);
          case Dn:
            return new r();
          case _e:
          case Te:
            return new r(n);
          case rt:
            return ys(n);
          case Fn:
            return new r();
          case yt:
            return ws(n);
        }
      }
      function zs(n, e) {
        var t = e.length;
        if (!t)
          return n;
        var r = t - 1;
        return e[r] = (t > 1 ? "& " : "") + e[r], e = e.join(t > 2 ? ", " : " "), n.replace(ki, `{
/* [wrapped with ` + e + `] */
`);
      }
      function Ds(n) {
        return H(n) || ht(n) || !!(qo && n && n[qo]);
      }
      function Le(n, e) {
        var t = typeof n;
        return e = e ?? ae, !!e && (t == "number" || t != "symbol" && fn.test(n)) && n > -1 && n % 1 == 0 && n < e;
      }
      function Rn(n, e, t) {
        if (!an(t))
          return !1;
        var r = typeof e;
        return (r == "number" ? kn(t) && Le(e, t.length) : r == "string" && e in t) ? de(t[e], n) : !1;
      }
      function Su(n, e) {
        if (H(n))
          return !1;
        var t = typeof n;
        return t == "number" || t == "symbol" || t == "boolean" || n == null || $n(n) ? !0 : Ir.test(n) || !Ar.test(n) || e != null && n in j(e);
      }
      function Fs(n) {
        var e = typeof n;
        return e == "string" || e == "number" || e == "symbol" || e == "boolean" ? n !== "__proto__" : n === null;
      }
      function Au(n) {
        var e = ai(n), t = o[e];
        if (typeof t != "function" || !(e in $.prototype))
          return !1;
        if (n === t)
          return !0;
        var r = Tu(t);
        return !!r && n === r[0];
      }
      function Us(n) {
        return !!Wo && Wo in n;
      }
      var Ws = zr ? Oe : qu;
      function cr(n) {
        var e = n && n.constructor, t = typeof e == "function" && e.prototype || It;
        return n === t;
      }
      function Wa(n) {
        return n === n && !an(n);
      }
      function Na(n, e) {
        return function(t) {
          return t == null ? !1 : t[n] === e && (e !== a || n in j(t));
        };
      }
      function Ns(n) {
        var e = hi(n, function(r) {
          return t.size === hn && t.clear(), r;
        }), t = e.cache;
        return e;
      }
      function $s(n, e) {
        var t = n[1], r = e[1], i = t | r, l = i < (In | Mn | ue), f = r == ue && t == Yn || r == ue && t == je && n[7].length <= e[8] || r == (ue | je) && e[7].length <= e[8] && t == Yn;
        if (!(l || f))
          return n;
        r & In && (n[2] = e[2], i |= t & In ? 0 : pn);
        var s = e[3];
        if (s) {
          var h = n[3];
          n[3] = h ? Ta(h, s, e[4]) : s, n[4] = h ? qe(n[3], Z) : e[4];
        }
        return s = e[5], s && (h = n[5], n[5] = h ? Ea(h, s, e[6]) : s, n[6] = h ? qe(n[5], Z) : e[6]), s = e[7], s && (n[7] = s), r & ue && (n[8] = n[8] == null ? e[8] : wn(n[8], e[8])), n[9] == null && (n[9] = e[9]), n[0] = e[0], n[1] = i, n;
      }
      function Gs(n) {
        var e = [];
        if (n != null)
          for (var t in j(n))
            e.push(t);
        return e;
      }
      function qs(n) {
        return Fr.call(n);
      }
      function $a(n, e, t) {
        return e = vn(e === a ? n.length - 1 : e, 0), function() {
          for (var r = arguments, i = -1, l = vn(r.length - e, 0), f = v(l); ++i < l; )
            f[i] = r[e + i];
          i = -1;
          for (var s = v(e + 1); ++i < e; )
            s[i] = r[i];
          return s[e] = t(f), Un(n, this, s);
        };
      }
      function Ga(n, e) {
        return e.length < 2 ? n : ct(n, ee(e, 0, -1));
      }
      function Vs(n, e) {
        for (var t = n.length, r = wn(e.length, t), i = Bn(n); r--; ) {
          var l = e[r];
          n[r] = Le(l, t) ? i[l] : a;
        }
        return n;
      }
      function Iu(n, e) {
        if (!(e === "constructor" && typeof n[e] == "function") && e != "__proto__")
          return n[e];
      }
      var qa = Ya(ga), sr = ac || function(n, e) {
        return xn.setTimeout(n, e);
      }, Mu = Ya(vs);
      function Va(n, e, t) {
        var r = e + "";
        return Mu(n, zs(r, Ys(ks(r), t)));
      }
      function Ya(n) {
        var e = 0, t = 0;
        return function() {
          var r = sc(), i = oe - (r - t);
          if (t = r, i > 0) {
            if (++e >= _r)
              return arguments[0];
          } else
            e = 0;
          return n.apply(a, arguments);
        };
      }
      function fi(n, e) {
        var t = -1, r = n.length, i = r - 1;
        for (e = e === a ? r : e; ++t < e; ) {
          var l = du(t, i), f = n[l];
          n[l] = n[t], n[t] = f;
        }
        return n.length = e, n;
      }
      var Ka = Ns(function(n) {
        var e = [];
        return n.charCodeAt(0) === 46 && e.push(""), n.replace(Oi, function(t, r, i, l) {
          e.push(i ? l.replace(B, "$1") : r || t);
        }), e;
      });
      function ye(n) {
        if (typeof n == "string" || $n(n))
          return n;
        var e = n + "";
        return e == "0" && 1 / n == -ve ? "-0" : e;
      }
      function dt(n) {
        if (n != null) {
          try {
            return Dr.call(n);
          } catch {
          }
          try {
            return n + "";
          } catch {
          }
        }
        return "";
      }
      function Ys(n, e) {
        return Xn(Ai, function(t) {
          var r = "_." + t[0];
          e & t[1] && !Br(n, r) && n.push(r);
        }), n.sort();
      }
      function Za(n) {
        if (n instanceof $)
          return n.clone();
        var e = new jn(n.__wrapped__, n.__chain__);
        return e.__actions__ = Bn(n.__actions__), e.__index__ = n.__index__, e.__values__ = n.__values__, e;
      }
      function Ks(n, e, t) {
        (t ? Rn(n, e, t) : e === a) ? e = 1 : e = vn(P(e), 0);
        var r = n == null ? 0 : n.length;
        if (!r || e < 1)
          return [];
        for (var i = 0, l = 0, f = v(qr(r / e)); i < r; )
          f[l++] = ee(n, i, i += e);
        return f;
      }
      function Zs(n) {
        for (var e = -1, t = n == null ? 0 : n.length, r = 0, i = []; ++e < t; ) {
          var l = n[e];
          l && (i[r++] = l);
        }
        return i;
      }
      function Js() {
        var n = arguments.length;
        if (!n)
          return [];
        for (var e = v(n - 1), t = arguments[0], r = n; r--; )
          e[r - 1] = arguments[r];
        return Ge(H(t) ? Bn(t) : [t], yn(e, 1));
      }
      var Xs = F(function(n, e) {
        return sn(n) ? ur(n, yn(e, 1, sn, !0)) : [];
      }), Qs = F(function(n, e) {
        var t = te(e);
        return sn(t) && (t = a), sn(n) ? ur(n, yn(e, 1, sn, !0), M(t, 2)) : [];
      }), js = F(function(n, e) {
        var t = te(e);
        return sn(t) && (t = a), sn(n) ? ur(n, yn(e, 1, sn, !0), a, t) : [];
      });
      function nd(n, e, t) {
        var r = n == null ? 0 : n.length;
        return r ? (e = t || e === a ? 1 : P(e), ee(n, e < 0 ? 0 : e, r)) : [];
      }
      function ed(n, e, t) {
        var r = n == null ? 0 : n.length;
        return r ? (e = t || e === a ? 1 : P(e), e = r - e, ee(n, 0, e < 0 ? 0 : e)) : [];
      }
      function td(n, e) {
        return n && n.length ? ei(n, M(e, 3), !0, !0) : [];
      }
      function rd(n, e) {
        return n && n.length ? ei(n, M(e, 3), !0) : [];
      }
      function id(n, e, t, r) {
        var i = n == null ? 0 : n.length;
        return i ? (t && typeof t != "number" && Rn(n, e, t) && (t = 0, r = i), Jc(n, e, t, r)) : [];
      }
      function Ja(n, e, t) {
        var r = n == null ? 0 : n.length;
        if (!r)
          return -1;
        var i = t == null ? 0 : P(t);
        return i < 0 && (i = vn(r + i, 0)), kr(n, M(e, 3), i);
      }
      function Xa(n, e, t) {
        var r = n == null ? 0 : n.length;
        if (!r)
          return -1;
        var i = r - 1;
        return t !== a && (i = P(t), i = t < 0 ? vn(r + i, 0) : wn(i, r - 1)), kr(n, M(e, 3), i, !0);
      }
      function Qa(n) {
        var e = n == null ? 0 : n.length;
        return e ? yn(n, 1) : [];
      }
      function ud(n) {
        var e = n == null ? 0 : n.length;
        return e ? yn(n, ve) : [];
      }
      function od(n, e) {
        var t = n == null ? 0 : n.length;
        return t ? (e = e === a ? 1 : P(e), yn(n, e)) : [];
      }
      function ad(n) {
        for (var e = -1, t = n == null ? 0 : n.length, r = {}; ++e < t; ) {
          var i = n[e];
          r[i[0]] = i[1];
        }
        return r;
      }
      function ja(n) {
        return n && n.length ? n[0] : a;
      }
      function ld(n, e, t) {
        var r = n == null ? 0 : n.length;
        if (!r)
          return -1;
        var i = t == null ? 0 : P(t);
        return i < 0 && (i = vn(r + i, 0)), Et(n, e, i);
      }
      function fd(n) {
        var e = n == null ? 0 : n.length;
        return e ? ee(n, 0, -1) : [];
      }
      var cd = F(function(n) {
        var e = un(n, _u);
        return e.length && e[0] === n[0] ? au(e) : [];
      }), sd = F(function(n) {
        var e = te(n), t = un(n, _u);
        return e === te(t) ? e = a : t.pop(), t.length && t[0] === n[0] ? au(t, M(e, 2)) : [];
      }), dd = F(function(n) {
        var e = te(n), t = un(n, _u);
        return e = typeof e == "function" ? e : a, e && t.pop(), t.length && t[0] === n[0] ? au(t, a, e) : [];
      });
      function hd(n, e) {
        return n == null ? "" : fc.call(n, e);
      }
      function te(n) {
        var e = n == null ? 0 : n.length;
        return e ? n[e - 1] : a;
      }
      function gd(n, e, t) {
        var r = n == null ? 0 : n.length;
        if (!r)
          return -1;
        var i = r;
        return t !== a && (i = P(t), i = i < 0 ? vn(r + i, 0) : wn(i, r - 1)), e === e ? Yf(n, e, i) : kr(n, Bo, i, !0);
      }
      function vd(n, e) {
        return n && n.length ? ca(n, P(e)) : a;
      }
      var pd = F(nl);
      function nl(n, e) {
        return n && n.length && e && e.length ? su(n, e) : n;
      }
      function _d(n, e, t) {
        return n && n.length && e && e.length ? su(n, e, M(t, 2)) : n;
      }
      function md(n, e, t) {
        return n && n.length && e && e.length ? su(n, e, a, t) : n;
      }
      var xd = Me(function(n, e) {
        var t = n == null ? 0 : n.length, r = ru(n, e);
        return ha(n, un(e, function(i) {
          return Le(i, t) ? +i : i;
        }).sort(Ca)), r;
      });
      function yd(n, e) {
        var t = [];
        if (!(n && n.length))
          return t;
        var r = -1, i = [], l = n.length;
        for (e = M(e, 3); ++r < l; ) {
          var f = n[r];
          e(f, r, n) && (t.push(f), i.push(r));
        }
        return ha(n, i), t;
      }
      function Lu(n) {
        return n == null ? n : hc.call(n);
      }
      function wd(n, e, t) {
        var r = n == null ? 0 : n.length;
        return r ? (t && typeof t != "number" && Rn(n, e, t) ? (e = 0, t = r) : (e = e == null ? 0 : P(e), t = t === a ? r : P(t)), ee(n, e, t)) : [];
      }
      function bd(n, e) {
        return ni(n, e);
      }
      function Cd(n, e, t) {
        return gu(n, e, M(t, 2));
      }
      function Td(n, e) {
        var t = n == null ? 0 : n.length;
        if (t) {
          var r = ni(n, e);
          if (r < t && de(n[r], e))
            return r;
        }
        return -1;
      }
      function Ed(n, e) {
        return ni(n, e, !0);
      }
      function Rd(n, e, t) {
        return gu(n, e, M(t, 2), !0);
      }
      function Sd(n, e) {
        var t = n == null ? 0 : n.length;
        if (t) {
          var r = ni(n, e, !0) - 1;
          if (de(n[r], e))
            return r;
        }
        return -1;
      }
      function Ad(n) {
        return n && n.length ? va(n) : [];
      }
      function Id(n, e) {
        return n && n.length ? va(n, M(e, 2)) : [];
      }
      function Md(n) {
        var e = n == null ? 0 : n.length;
        return e ? ee(n, 1, e) : [];
      }
      function Ld(n, e, t) {
        return n && n.length ? (e = t || e === a ? 1 : P(e), ee(n, 0, e < 0 ? 0 : e)) : [];
      }
      function Od(n, e, t) {
        var r = n == null ? 0 : n.length;
        return r ? (e = t || e === a ? 1 : P(e), e = r - e, ee(n, e < 0 ? 0 : e, r)) : [];
      }
      function Bd(n, e) {
        return n && n.length ? ei(n, M(e, 3), !1, !0) : [];
      }
      function kd(n, e) {
        return n && n.length ? ei(n, M(e, 3)) : [];
      }
      var Hd = F(function(n) {
        return Ke(yn(n, 1, sn, !0));
      }), Pd = F(function(n) {
        var e = te(n);
        return sn(e) && (e = a), Ke(yn(n, 1, sn, !0), M(e, 2));
      }), zd = F(function(n) {
        var e = te(n);
        return e = typeof e == "function" ? e : a, Ke(yn(n, 1, sn, !0), a, e);
      });
      function Dd(n) {
        return n && n.length ? Ke(n) : [];
      }
      function Fd(n, e) {
        return n && n.length ? Ke(n, M(e, 2)) : [];
      }
      function Ud(n, e) {
        return e = typeof e == "function" ? e : a, n && n.length ? Ke(n, a, e) : [];
      }
      function Ou(n) {
        if (!(n && n.length))
          return [];
        var e = 0;
        return n = $e(n, function(t) {
          if (sn(t))
            return e = vn(t.length, e), !0;
        }), Zi(e, function(t) {
          return un(n, Vi(t));
        });
      }
      function el(n, e) {
        if (!(n && n.length))
          return [];
        var t = Ou(n);
        return e == null ? t : un(t, function(r) {
          return Un(e, a, r);
        });
      }
      var Wd = F(function(n, e) {
        return sn(n) ? ur(n, e) : [];
      }), Nd = F(function(n) {
        return pu($e(n, sn));
      }), $d = F(function(n) {
        var e = te(n);
        return sn(e) && (e = a), pu($e(n, sn), M(e, 2));
      }), Gd = F(function(n) {
        var e = te(n);
        return e = typeof e == "function" ? e : a, pu($e(n, sn), a, e);
      }), qd = F(Ou);
      function Vd(n, e) {
        return xa(n || [], e || [], ir);
      }
      function Yd(n, e) {
        return xa(n || [], e || [], lr);
      }
      var Kd = F(function(n) {
        var e = n.length, t = e > 1 ? n[e - 1] : a;
        return t = typeof t == "function" ? (n.pop(), t) : a, el(n, t);
      });
      function tl(n) {
        var e = o(n);
        return e.__chain__ = !0, e;
      }
      function Zd(n, e) {
        return e(n), n;
      }
      function ci(n, e) {
        return e(n);
      }
      var Jd = Me(function(n) {
        var e = n.length, t = e ? n[0] : 0, r = this.__wrapped__, i = function(l) {
          return ru(l, n);
        };
        return e > 1 || this.__actions__.length || !(r instanceof $) || !Le(t) ? this.thru(i) : (r = r.slice(t, +t + (e ? 1 : 0)), r.__actions__.push({
          func: ci,
          args: [i],
          thisArg: a
        }), new jn(r, this.__chain__).thru(function(l) {
          return e && !l.length && l.push(a), l;
        }));
      });
      function Xd() {
        return tl(this);
      }
      function Qd() {
        return new jn(this.value(), this.__chain__);
      }
      function jd() {
        this.__values__ === a && (this.__values__ = pl(this.value()));
        var n = this.__index__ >= this.__values__.length, e = n ? a : this.__values__[this.__index__++];
        return { done: n, value: e };
      }
      function nh() {
        return this;
      }
      function eh(n) {
        for (var e, t = this; t instanceof Zr; ) {
          var r = Za(t);
          r.__index__ = 0, r.__values__ = a, e ? i.__wrapped__ = r : e = r;
          var i = r;
          t = t.__wrapped__;
        }
        return i.__wrapped__ = n, e;
      }
      function th() {
        var n = this.__wrapped__;
        if (n instanceof $) {
          var e = n;
          return this.__actions__.length && (e = new $(this)), e = e.reverse(), e.__actions__.push({
            func: ci,
            args: [Lu],
            thisArg: a
          }), new jn(e, this.__chain__);
        }
        return this.thru(Lu);
      }
      function rh() {
        return ma(this.__wrapped__, this.__actions__);
      }
      var ih = ti(function(n, e, t) {
        Q.call(n, t) ? ++n[t] : Ae(n, t, 1);
      });
      function uh(n, e, t) {
        var r = H(n) ? Lo : Zc;
        return t && Rn(n, e, t) && (e = a), r(n, M(e, 3));
      }
      function oh(n, e) {
        var t = H(n) ? $e : ea;
        return t(n, M(e, 3));
      }
      var ah = Ia(Ja), lh = Ia(Xa);
      function fh(n, e) {
        return yn(si(n, e), 1);
      }
      function ch(n, e) {
        return yn(si(n, e), ve);
      }
      function sh(n, e, t) {
        return t = t === a ? 1 : P(t), yn(si(n, e), t);
      }
      function rl(n, e) {
        var t = H(n) ? Xn : Ye;
        return t(n, M(e, 3));
      }
      function il(n, e) {
        var t = H(n) ? Mf : na;
        return t(n, M(e, 3));
      }
      var dh = ti(function(n, e, t) {
        Q.call(n, t) ? n[t].push(e) : Ae(n, t, [e]);
      });
      function hh(n, e, t, r) {
        n = kn(n) ? n : zt(n), t = t && !r ? P(t) : 0;
        var i = n.length;
        return t < 0 && (t = vn(i + t, 0)), pi(n) ? t <= i && n.indexOf(e, t) > -1 : !!i && Et(n, e, t) > -1;
      }
      var gh = F(function(n, e, t) {
        var r = -1, i = typeof e == "function", l = kn(n) ? v(n.length) : [];
        return Ye(n, function(f) {
          l[++r] = i ? Un(e, f, t) : or(f, e, t);
        }), l;
      }), vh = ti(function(n, e, t) {
        Ae(n, t, e);
      });
      function si(n, e) {
        var t = H(n) ? un : aa;
        return t(n, M(e, 3));
      }
      function ph(n, e, t, r) {
        return n == null ? [] : (H(e) || (e = e == null ? [] : [e]), t = r ? a : t, H(t) || (t = t == null ? [] : [t]), sa(n, e, t));
      }
      var _h = ti(function(n, e, t) {
        n[t ? 0 : 1].push(e);
      }, function() {
        return [[], []];
      });
      function mh(n, e, t) {
        var r = H(n) ? Gi : Ho, i = arguments.length < 3;
        return r(n, M(e, 4), t, i, Ye);
      }
      function xh(n, e, t) {
        var r = H(n) ? Lf : Ho, i = arguments.length < 3;
        return r(n, M(e, 4), t, i, na);
      }
      function yh(n, e) {
        var t = H(n) ? $e : ea;
        return t(n, gi(M(e, 3)));
      }
      function wh(n) {
        var e = H(n) ? Jo : hs;
        return e(n);
      }
      function bh(n, e, t) {
        (t ? Rn(n, e, t) : e === a) ? e = 1 : e = P(e);
        var r = H(n) ? Gc : gs;
        return r(n, e);
      }
      function Ch(n) {
        var e = H(n) ? qc : ps;
        return e(n);
      }
      function Th(n) {
        if (n == null)
          return 0;
        if (kn(n))
          return pi(n) ? St(n) : n.length;
        var e = bn(n);
        return e == Dn || e == Fn ? n.size : fu(n).length;
      }
      function Eh(n, e, t) {
        var r = H(n) ? qi : _s;
        return t && Rn(n, e, t) && (e = a), r(n, M(e, 3));
      }
      var Rh = F(function(n, e) {
        if (n == null)
          return [];
        var t = e.length;
        return t > 1 && Rn(n, e[0], e[1]) ? e = [] : t > 2 && Rn(e[0], e[1], e[2]) && (e = [e[0]]), sa(n, yn(e, 1), []);
      }), di = oc || function() {
        return xn.Date.now();
      };
      function Sh(n, e) {
        if (typeof e != "function")
          throw new Qn(C);
        return n = P(n), function() {
          if (--n < 1)
            return e.apply(this, arguments);
        };
      }
      function ul(n, e, t) {
        return e = t ? a : e, e = n && e == null ? n.length : e, Ie(n, ue, a, a, a, a, e);
      }
      function ol(n, e) {
        var t;
        if (typeof e != "function")
          throw new Qn(C);
        return n = P(n), function() {
          return --n > 0 && (t = e.apply(this, arguments)), n <= 1 && (e = a), t;
        };
      }
      var Bu = F(function(n, e, t) {
        var r = In;
        if (t.length) {
          var i = qe(t, Ht(Bu));
          r |= Kn;
        }
        return Ie(n, r, e, t, i);
      }), al = F(function(n, e, t) {
        var r = In | Mn;
        if (t.length) {
          var i = qe(t, Ht(al));
          r |= Kn;
        }
        return Ie(e, r, n, t, i);
      });
      function ll(n, e, t) {
        e = t ? a : e;
        var r = Ie(n, Yn, a, a, a, a, a, e);
        return r.placeholder = ll.placeholder, r;
      }
      function fl(n, e, t) {
        e = t ? a : e;
        var r = Ie(n, ze, a, a, a, a, a, e);
        return r.placeholder = fl.placeholder, r;
      }
      function cl(n, e, t) {
        var r, i, l, f, s, h, _ = 0, m = !1, y = !1, R = !0;
        if (typeof n != "function")
          throw new Qn(C);
        e = re(e) || 0, an(t) && (m = !!t.leading, y = "maxWait" in t, l = y ? vn(re(t.maxWait) || 0, e) : l, R = "trailing" in t ? !!t.trailing : R);
        function A(dn) {
          var he = r, ke = i;
          return r = i = a, _ = dn, f = n.apply(ke, he), f;
        }
        function L(dn) {
          return _ = dn, s = sr(W, e), m ? A(dn) : f;
        }
        function z(dn) {
          var he = dn - h, ke = dn - _, Il = e - he;
          return y ? wn(Il, l - ke) : Il;
        }
        function O(dn) {
          var he = dn - h, ke = dn - _;
          return h === a || he >= e || he < 0 || y && ke >= l;
        }
        function W() {
          var dn = di();
          if (O(dn))
            return G(dn);
          s = sr(W, z(dn));
        }
        function G(dn) {
          return s = a, R && r ? A(dn) : (r = i = a, f);
        }
        function Gn() {
          s !== a && ya(s), _ = 0, r = h = i = s = a;
        }
        function Sn() {
          return s === a ? f : G(di());
        }
        function qn() {
          var dn = di(), he = O(dn);
          if (r = arguments, i = this, h = dn, he) {
            if (s === a)
              return L(h);
            if (y)
              return ya(s), s = sr(W, e), A(h);
          }
          return s === a && (s = sr(W, e)), f;
        }
        return qn.cancel = Gn, qn.flush = Sn, qn;
      }
      var Ah = F(function(n, e) {
        return jo(n, 1, e);
      }), Ih = F(function(n, e, t) {
        return jo(n, re(e) || 0, t);
      });
      function Mh(n) {
        return Ie(n, vt);
      }
      function hi(n, e) {
        if (typeof n != "function" || e != null && typeof e != "function")
          throw new Qn(C);
        var t = function() {
          var r = arguments, i = e ? e.apply(this, r) : r[0], l = t.cache;
          if (l.has(i))
            return l.get(i);
          var f = n.apply(this, r);
          return t.cache = l.set(i, f) || l, f;
        };
        return t.cache = new (hi.Cache || Se)(), t;
      }
      hi.Cache = Se;
      function gi(n) {
        if (typeof n != "function")
          throw new Qn(C);
        return function() {
          var e = arguments;
          switch (e.length) {
            case 0:
              return !n.call(this);
            case 1:
              return !n.call(this, e[0]);
            case 2:
              return !n.call(this, e[0], e[1]);
            case 3:
              return !n.call(this, e[0], e[1], e[2]);
          }
          return !n.apply(this, e);
        };
      }
      function Lh(n) {
        return ol(2, n);
      }
      var Oh = ms(function(n, e) {
        e = e.length == 1 && H(e[0]) ? un(e[0], Wn(M())) : un(yn(e, 1), Wn(M()));
        var t = e.length;
        return F(function(r) {
          for (var i = -1, l = wn(r.length, t); ++i < l; )
            r[i] = e[i].call(this, r[i]);
          return Un(n, this, r);
        });
      }), ku = F(function(n, e) {
        var t = qe(e, Ht(ku));
        return Ie(n, Kn, a, e, t);
      }), sl = F(function(n, e) {
        var t = qe(e, Ht(sl));
        return Ie(n, De, a, e, t);
      }), Bh = Me(function(n, e) {
        return Ie(n, je, a, a, a, e);
      });
      function kh(n, e) {
        if (typeof n != "function")
          throw new Qn(C);
        return e = e === a ? e : P(e), F(n, e);
      }
      function Hh(n, e) {
        if (typeof n != "function")
          throw new Qn(C);
        return e = e == null ? 0 : vn(P(e), 0), F(function(t) {
          var r = t[e], i = Je(t, 0, e);
          return r && Ge(i, r), Un(n, this, i);
        });
      }
      function Ph(n, e, t) {
        var r = !0, i = !0;
        if (typeof n != "function")
          throw new Qn(C);
        return an(t) && (r = "leading" in t ? !!t.leading : r, i = "trailing" in t ? !!t.trailing : i), cl(n, e, {
          leading: r,
          maxWait: e,
          trailing: i
        });
      }
      function zh(n) {
        return ul(n, 1);
      }
      function Dh(n, e) {
        return ku(mu(e), n);
      }
      function Fh() {
        if (!arguments.length)
          return [];
        var n = arguments[0];
        return H(n) ? n : [n];
      }
      function Uh(n) {
        return ne(n, Tn);
      }
      function Wh(n, e) {
        return e = typeof e == "function" ? e : a, ne(n, Tn, e);
      }
      function Nh(n) {
        return ne(n, nn | Tn);
      }
      function $h(n, e) {
        return e = typeof e == "function" ? e : a, ne(n, nn | Tn, e);
      }
      function Gh(n, e) {
        return e == null || Qo(n, e, _n(e));
      }
      function de(n, e) {
        return n === e || n !== n && e !== e;
      }
      var qh = oi(ou), Vh = oi(function(n, e) {
        return n >= e;
      }), ht = ia(function() {
        return arguments;
      }()) ? ia : function(n) {
        return cn(n) && Q.call(n, "callee") && !Go.call(n, "callee");
      }, H = v.isArray, Yh = Eo ? Wn(Eo) : es;
      function kn(n) {
        return n != null && vi(n.length) && !Oe(n);
      }
      function sn(n) {
        return cn(n) && kn(n);
      }
      function Kh(n) {
        return n === !0 || n === !1 || cn(n) && En(n) == pe;
      }
      var Xe = lc || qu, Zh = Ro ? Wn(Ro) : ts;
      function Jh(n) {
        return cn(n) && n.nodeType === 1 && !dr(n);
      }
      function Xh(n) {
        if (n == null)
          return !0;
        if (kn(n) && (H(n) || typeof n == "string" || typeof n.splice == "function" || Xe(n) || Pt(n) || ht(n)))
          return !n.length;
        var e = bn(n);
        if (e == Dn || e == Fn)
          return !n.size;
        if (cr(n))
          return !fu(n).length;
        for (var t in n)
          if (Q.call(n, t))
            return !1;
        return !0;
      }
      function Qh(n, e) {
        return ar(n, e);
      }
      function jh(n, e, t) {
        t = typeof t == "function" ? t : a;
        var r = t ? t(n, e) : a;
        return r === a ? ar(n, e, a, t) : !!r;
      }
      function Hu(n) {
        if (!cn(n))
          return !1;
        var e = En(n);
        return e == _t || e == pt || typeof n.message == "string" && typeof n.name == "string" && !dr(n);
      }
      function ng(n) {
        return typeof n == "number" && Vo(n);
      }
      function Oe(n) {
        if (!an(n))
          return !1;
        var e = En(n);
        return e == tt || e == br || e == Ut || e == xt;
      }
      function dl(n) {
        return typeof n == "number" && n == P(n);
      }
      function vi(n) {
        return typeof n == "number" && n > -1 && n % 1 == 0 && n <= ae;
      }
      function an(n) {
        var e = typeof n;
        return n != null && (e == "object" || e == "function");
      }
      function cn(n) {
        return n != null && typeof n == "object";
      }
      var hl = So ? Wn(So) : is;
      function eg(n, e) {
        return n === e || lu(n, e, Eu(e));
      }
      function tg(n, e, t) {
        return t = typeof t == "function" ? t : a, lu(n, e, Eu(e), t);
      }
      function rg(n) {
        return gl(n) && n != +n;
      }
      function ig(n) {
        if (Ws(n))
          throw new k(I);
        return ua(n);
      }
      function ug(n) {
        return n === null;
      }
      function og(n) {
        return n == null;
      }
      function gl(n) {
        return typeof n == "number" || cn(n) && En(n) == _e;
      }
      function dr(n) {
        if (!cn(n) || En(n) != Zn)
          return !1;
        var e = Nr(n);
        if (e === null)
          return !0;
        var t = Q.call(e, "constructor") && e.constructor;
        return typeof t == "function" && t instanceof t && Dr.call(t) == tc;
      }
      var Pu = Ao ? Wn(Ao) : us;
      function ag(n) {
        return dl(n) && n >= -ae && n <= ae;
      }
      var vl = Io ? Wn(Io) : os;
      function pi(n) {
        return typeof n == "string" || !H(n) && cn(n) && En(n) == Te;
      }
      function $n(n) {
        return typeof n == "symbol" || cn(n) && En(n) == yt;
      }
      var Pt = Mo ? Wn(Mo) : as;
      function lg(n) {
        return n === a;
      }
      function fg(n) {
        return cn(n) && bn(n) == We;
      }
      function cg(n) {
        return cn(n) && En(n) == Cr;
      }
      var sg = oi(cu), dg = oi(function(n, e) {
        return n <= e;
      });
      function pl(n) {
        if (!n)
          return [];
        if (kn(n))
          return pi(n) ? ce(n) : Bn(n);
        if (jt && n[jt])
          return Gf(n[jt]());
        var e = bn(n), t = e == Dn ? Xi : e == Fn ? Hr : zt;
        return t(n);
      }
      function Be(n) {
        if (!n)
          return n === 0 ? n : 0;
        if (n = re(n), n === ve || n === -ve) {
          var e = n < 0 ? -1 : 1;
          return e * xr;
        }
        return n === n ? n : 0;
      }
      function P(n) {
        var e = Be(n), t = e % 1;
        return e === e ? t ? e - t : e : 0;
      }
      function _l(n) {
        return n ? ft(P(n), 0, zn) : 0;
      }
      function re(n) {
        if (typeof n == "number")
          return n;
        if ($n(n))
          return et;
        if (an(n)) {
          var e = typeof n.valueOf == "function" ? n.valueOf() : n;
          n = an(e) ? e + "" : e;
        }
        if (typeof n != "string")
          return n === 0 ? n : +n;
        n = Po(n);
        var t = U.test(n);
        return t || on.test(n) ? Sf(n.slice(2), t ? 2 : 8) : N.test(n) ? et : +n;
      }
      function ml(n) {
        return xe(n, Hn(n));
      }
      function hg(n) {
        return n ? ft(P(n), -ae, ae) : n === 0 ? n : 0;
      }
      function X(n) {
        return n == null ? "" : Nn(n);
      }
      var gg = Bt(function(n, e) {
        if (cr(e) || kn(e)) {
          xe(e, _n(e), n);
          return;
        }
        for (var t in e)
          Q.call(e, t) && ir(n, t, e[t]);
      }), xl = Bt(function(n, e) {
        xe(e, Hn(e), n);
      }), _i = Bt(function(n, e, t, r) {
        xe(e, Hn(e), n, r);
      }), vg = Bt(function(n, e, t, r) {
        xe(e, _n(e), n, r);
      }), pg = Me(ru);
      function _g(n, e) {
        var t = Ot(n);
        return e == null ? t : Xo(t, e);
      }
      var mg = F(function(n, e) {
        n = j(n);
        var t = -1, r = e.length, i = r > 2 ? e[2] : a;
        for (i && Rn(e[0], e[1], i) && (r = 1); ++t < r; )
          for (var l = e[t], f = Hn(l), s = -1, h = f.length; ++s < h; ) {
            var _ = f[s], m = n[_];
            (m === a || de(m, It[_]) && !Q.call(n, _)) && (n[_] = l[_]);
          }
        return n;
      }), xg = F(function(n) {
        return n.push(a, Pa), Un(yl, a, n);
      });
      function yg(n, e) {
        return Oo(n, M(e, 3), me);
      }
      function wg(n, e) {
        return Oo(n, M(e, 3), uu);
      }
      function bg(n, e) {
        return n == null ? n : iu(n, M(e, 3), Hn);
      }
      function Cg(n, e) {
        return n == null ? n : ta(n, M(e, 3), Hn);
      }
      function Tg(n, e) {
        return n && me(n, M(e, 3));
      }
      function Eg(n, e) {
        return n && uu(n, M(e, 3));
      }
      function Rg(n) {
        return n == null ? [] : Qr(n, _n(n));
      }
      function Sg(n) {
        return n == null ? [] : Qr(n, Hn(n));
      }
      function zu(n, e, t) {
        var r = n == null ? a : ct(n, e);
        return r === a ? t : r;
      }
      function Ag(n, e) {
        return n != null && Fa(n, e, Xc);
      }
      function Du(n, e) {
        return n != null && Fa(n, e, Qc);
      }
      var Ig = La(function(n, e, t) {
        e != null && typeof e.toString != "function" && (e = Fr.call(e)), n[e] = t;
      }, Uu(Pn)), Mg = La(function(n, e, t) {
        e != null && typeof e.toString != "function" && (e = Fr.call(e)), Q.call(n, e) ? n[e].push(t) : n[e] = [t];
      }, M), Lg = F(or);
      function _n(n) {
        return kn(n) ? Zo(n) : fu(n);
      }
      function Hn(n) {
        return kn(n) ? Zo(n, !0) : ls(n);
      }
      function Og(n, e) {
        var t = {};
        return e = M(e, 3), me(n, function(r, i, l) {
          Ae(t, e(r, i, l), r);
        }), t;
      }
      function Bg(n, e) {
        var t = {};
        return e = M(e, 3), me(n, function(r, i, l) {
          Ae(t, i, e(r, i, l));
        }), t;
      }
      var kg = Bt(function(n, e, t) {
        jr(n, e, t);
      }), yl = Bt(function(n, e, t, r) {
        jr(n, e, t, r);
      }), Hg = Me(function(n, e) {
        var t = {};
        if (n == null)
          return t;
        var r = !1;
        e = un(e, function(l) {
          return l = Ze(l, n), r || (r = l.length > 1), l;
        }), xe(n, Cu(n), t), r && (t = ne(t, nn | Cn | Tn, Is));
        for (var i = e.length; i--; )
          vu(t, e[i]);
        return t;
      });
      function Pg(n, e) {
        return wl(n, gi(M(e)));
      }
      var zg = Me(function(n, e) {
        return n == null ? {} : cs(n, e);
      });
      function wl(n, e) {
        if (n == null)
          return {};
        var t = un(Cu(n), function(r) {
          return [r];
        });
        return e = M(e), da(n, t, function(r, i) {
          return e(r, i[0]);
        });
      }
      function Dg(n, e, t) {
        e = Ze(e, n);
        var r = -1, i = e.length;
        for (i || (i = 1, n = a); ++r < i; ) {
          var l = n == null ? a : n[ye(e[r])];
          l === a && (r = i, l = t), n = Oe(l) ? l.call(n) : l;
        }
        return n;
      }
      function Fg(n, e, t) {
        return n == null ? n : lr(n, e, t);
      }
      function Ug(n, e, t, r) {
        return r = typeof r == "function" ? r : a, n == null ? n : lr(n, e, t, r);
      }
      var bl = ka(_n), Cl = ka(Hn);
      function Wg(n, e, t) {
        var r = H(n), i = r || Xe(n) || Pt(n);
        if (e = M(e, 4), t == null) {
          var l = n && n.constructor;
          i ? t = r ? new l() : [] : an(n) ? t = Oe(l) ? Ot(Nr(n)) : {} : t = {};
        }
        return (i ? Xn : me)(n, function(f, s, h) {
          return e(t, f, s, h);
        }), t;
      }
      function Ng(n, e) {
        return n == null ? !0 : vu(n, e);
      }
      function $g(n, e, t) {
        return n == null ? n : _a(n, e, mu(t));
      }
      function Gg(n, e, t, r) {
        return r = typeof r == "function" ? r : a, n == null ? n : _a(n, e, mu(t), r);
      }
      function zt(n) {
        return n == null ? [] : Ji(n, _n(n));
      }
      function qg(n) {
        return n == null ? [] : Ji(n, Hn(n));
      }
      function Vg(n, e, t) {
        return t === a && (t = e, e = a), t !== a && (t = re(t), t = t === t ? t : 0), e !== a && (e = re(e), e = e === e ? e : 0), ft(re(n), e, t);
      }
      function Yg(n, e, t) {
        return e = Be(e), t === a ? (t = e, e = 0) : t = Be(t), n = re(n), jc(n, e, t);
      }
      function Kg(n, e, t) {
        if (t && typeof t != "boolean" && Rn(n, e, t) && (e = t = a), t === a && (typeof e == "boolean" ? (t = e, e = a) : typeof n == "boolean" && (t = n, n = a)), n === a && e === a ? (n = 0, e = 1) : (n = Be(n), e === a ? (e = n, n = 0) : e = Be(e)), n > e) {
          var r = n;
          n = e, e = r;
        }
        if (t || n % 1 || e % 1) {
          var i = Yo();
          return wn(n + i * (e - n + Rf("1e-" + ((i + "").length - 1))), e);
        }
        return du(n, e);
      }
      var Zg = kt(function(n, e, t) {
        return e = e.toLowerCase(), n + (t ? Tl(e) : e);
      });
      function Tl(n) {
        return Fu(X(n).toLowerCase());
      }
      function El(n) {
        return n = X(n), n && n.replace(Ln, Ff).replace(pf, "");
      }
      function Jg(n, e, t) {
        n = X(n), e = Nn(e);
        var r = n.length;
        t = t === a ? r : ft(P(t), 0, r);
        var i = t;
        return t -= e.length, t >= 0 && n.slice(t, i) == e;
      }
      function Xg(n) {
        return n = X(n), n && Er.test(n) ? n.replace(Ct, Uf) : n;
      }
      function Qg(n) {
        return n = X(n), n && Mr.test(n) ? n.replace(Jt, "\\$&") : n;
      }
      var jg = kt(function(n, e, t) {
        return n + (t ? "-" : "") + e.toLowerCase();
      }), n1 = kt(function(n, e, t) {
        return n + (t ? " " : "") + e.toLowerCase();
      }), e1 = Aa("toLowerCase");
      function t1(n, e, t) {
        n = X(n), e = P(e);
        var r = e ? St(n) : 0;
        if (!e || r >= e)
          return n;
        var i = (e - r) / 2;
        return ui(Vr(i), t) + n + ui(qr(i), t);
      }
      function r1(n, e, t) {
        n = X(n), e = P(e);
        var r = e ? St(n) : 0;
        return e && r < e ? n + ui(e - r, t) : n;
      }
      function i1(n, e, t) {
        n = X(n), e = P(e);
        var r = e ? St(n) : 0;
        return e && r < e ? ui(e - r, t) + n : n;
      }
      function u1(n, e, t) {
        return t || e == null ? e = 0 : e && (e = +e), dc(X(n).replace(Xt, ""), e || 0);
      }
      function o1(n, e, t) {
        return (t ? Rn(n, e, t) : e === a) ? e = 1 : e = P(e), hu(X(n), e);
      }
      function a1() {
        var n = arguments, e = X(n[0]);
        return n.length < 3 ? e : e.replace(n[1], n[2]);
      }
      var l1 = kt(function(n, e, t) {
        return n + (t ? "_" : "") + e.toLowerCase();
      });
      function f1(n, e, t) {
        return t && typeof t != "number" && Rn(n, e, t) && (e = t = a), t = t === a ? zn : t >>> 0, t ? (n = X(n), n && (typeof e == "string" || e != null && !Pu(e)) && (e = Nn(e), !e && Rt(n)) ? Je(ce(n), 0, t) : n.split(e, t)) : [];
      }
      var c1 = kt(function(n, e, t) {
        return n + (t ? " " : "") + Fu(e);
      });
      function s1(n, e, t) {
        return n = X(n), t = t == null ? 0 : ft(P(t), 0, n.length), e = Nn(e), n.slice(t, t + e.length) == e;
      }
      function d1(n, e, t) {
        var r = o.templateSettings;
        t && Rn(n, e, t) && (e = a), n = X(n), e = _i({}, e, r, Ha);
        var i = _i({}, e.imports, r.imports, Ha), l = _n(i), f = Ji(i, l), s, h, _ = 0, m = e.interpolate || fe, y = "__p += '", R = Qi(
          (e.escape || fe).source + "|" + m.source + "|" + (m === Sr ? q : fe).source + "|" + (e.evaluate || fe).source + "|$",
          "g"
        ), A = "//# sourceURL=" + (Q.call(e, "sourceURL") ? (e.sourceURL + "").replace(/\s/g, " ") : "lodash.templateSources[" + ++wf + "]") + `
`;
        n.replace(R, function(O, W, G, Gn, Sn, qn) {
          return G || (G = Gn), y += n.slice(_, qn).replace(Lr, Wf), W && (s = !0, y += `' +
__e(` + W + `) +
'`), Sn && (h = !0, y += `';
` + Sn + `;
__p += '`), G && (y += `' +
((__t = (` + G + `)) == null ? '' : __t) +
'`), _ = qn + O.length, O;
        }), y += `';
`;
        var L = Q.call(e, "variable") && e.variable;
        if (!L)
          y = `with (obj) {
` + y + `
}
`;
        else if (E.test(L))
          throw new k(V);
        y = (h ? y.replace(Mi, "") : y).replace(Kt, "$1").replace(Tr, "$1;"), y = "function(" + (L || "obj") + `) {
` + (L ? "" : `obj || (obj = {});
`) + "var __t, __p = ''" + (s ? ", __e = _.escape" : "") + (h ? `, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
` : `;
`) + y + `return __p
}`;
        var z = Sl(function() {
          return K(l, A + "return " + y).apply(a, f);
        });
        if (z.source = y, Hu(z))
          throw z;
        return z;
      }
      function h1(n) {
        return X(n).toLowerCase();
      }
      function g1(n) {
        return X(n).toUpperCase();
      }
      function v1(n, e, t) {
        if (n = X(n), n && (t || e === a))
          return Po(n);
        if (!n || !(e = Nn(e)))
          return n;
        var r = ce(n), i = ce(e), l = zo(r, i), f = Do(r, i) + 1;
        return Je(r, l, f).join("");
      }
      function p1(n, e, t) {
        if (n = X(n), n && (t || e === a))
          return n.slice(0, Uo(n) + 1);
        if (!n || !(e = Nn(e)))
          return n;
        var r = ce(n), i = Do(r, ce(e)) + 1;
        return Je(r, 0, i).join("");
      }
      function _1(n, e, t) {
        if (n = X(n), n && (t || e === a))
          return n.replace(Xt, "");
        if (!n || !(e = Nn(e)))
          return n;
        var r = ce(n), i = zo(r, ce(e));
        return Je(r, i).join("");
      }
      function m1(n, e) {
        var t = Ri, r = Si;
        if (an(e)) {
          var i = "separator" in e ? e.separator : i;
          t = "length" in e ? P(e.length) : t, r = "omission" in e ? Nn(e.omission) : r;
        }
        n = X(n);
        var l = n.length;
        if (Rt(n)) {
          var f = ce(n);
          l = f.length;
        }
        if (t >= l)
          return n;
        var s = t - St(r);
        if (s < 1)
          return r;
        var h = f ? Je(f, 0, s).join("") : n.slice(0, s);
        if (i === a)
          return h + r;
        if (f && (s += h.length - s), Pu(i)) {
          if (n.slice(s).search(i)) {
            var _, m = h;
            for (i.global || (i = Qi(i.source, X(J.exec(i)) + "g")), i.lastIndex = 0; _ = i.exec(m); )
              var y = _.index;
            h = h.slice(0, y === a ? s : y);
          }
        } else if (n.indexOf(Nn(i), s) != s) {
          var R = h.lastIndexOf(i);
          R > -1 && (h = h.slice(0, R));
        }
        return h + r;
      }
      function x1(n) {
        return n = X(n), n && Zt.test(n) ? n.replace(Ee, Kf) : n;
      }
      var y1 = kt(function(n, e, t) {
        return n + (t ? " " : "") + e.toUpperCase();
      }), Fu = Aa("toUpperCase");
      function Rl(n, e, t) {
        return n = X(n), e = t ? a : e, e === a ? $f(n) ? Xf(n) : kf(n) : n.match(e) || [];
      }
      var Sl = F(function(n, e) {
        try {
          return Un(n, a, e);
        } catch (t) {
          return Hu(t) ? t : new k(t);
        }
      }), w1 = Me(function(n, e) {
        return Xn(e, function(t) {
          t = ye(t), Ae(n, t, Bu(n[t], n));
        }), n;
      });
      function b1(n) {
        var e = n == null ? 0 : n.length, t = M();
        return n = e ? un(n, function(r) {
          if (typeof r[1] != "function")
            throw new Qn(C);
          return [t(r[0]), r[1]];
        }) : [], F(function(r) {
          for (var i = -1; ++i < e; ) {
            var l = n[i];
            if (Un(l[0], this, r))
              return Un(l[1], this, r);
          }
        });
      }
      function C1(n) {
        return Kc(ne(n, nn));
      }
      function Uu(n) {
        return function() {
          return n;
        };
      }
      function T1(n, e) {
        return n == null || n !== n ? e : n;
      }
      var E1 = Ma(), R1 = Ma(!0);
      function Pn(n) {
        return n;
      }
      function Wu(n) {
        return oa(typeof n == "function" ? n : ne(n, nn));
      }
      function S1(n) {
        return la(ne(n, nn));
      }
      function A1(n, e) {
        return fa(n, ne(e, nn));
      }
      var I1 = F(function(n, e) {
        return function(t) {
          return or(t, n, e);
        };
      }), M1 = F(function(n, e) {
        return function(t) {
          return or(n, t, e);
        };
      });
      function Nu(n, e, t) {
        var r = _n(e), i = Qr(e, r);
        t == null && !(an(e) && (i.length || !r.length)) && (t = e, e = n, n = this, i = Qr(e, _n(e)));
        var l = !(an(t) && "chain" in t) || !!t.chain, f = Oe(n);
        return Xn(i, function(s) {
          var h = e[s];
          n[s] = h, f && (n.prototype[s] = function() {
            var _ = this.__chain__;
            if (l || _) {
              var m = n(this.__wrapped__), y = m.__actions__ = Bn(this.__actions__);
              return y.push({ func: h, args: arguments, thisArg: n }), m.__chain__ = _, m;
            }
            return h.apply(n, Ge([this.value()], arguments));
          });
        }), n;
      }
      function L1() {
        return xn._ === this && (xn._ = rc), this;
      }
      function $u() {
      }
      function O1(n) {
        return n = P(n), F(function(e) {
          return ca(e, n);
        });
      }
      var B1 = yu(un), k1 = yu(Lo), H1 = yu(qi);
      function Al(n) {
        return Su(n) ? Vi(ye(n)) : ss(n);
      }
      function P1(n) {
        return function(e) {
          return n == null ? a : ct(n, e);
        };
      }
      var z1 = Oa(), D1 = Oa(!0);
      function Gu() {
        return [];
      }
      function qu() {
        return !1;
      }
      function F1() {
        return {};
      }
      function U1() {
        return "";
      }
      function W1() {
        return !0;
      }
      function N1(n, e) {
        if (n = P(n), n < 1 || n > ae)
          return [];
        var t = zn, r = wn(n, zn);
        e = M(e), n -= zn;
        for (var i = Zi(r, e); ++t < n; )
          e(t);
        return i;
      }
      function $1(n) {
        return H(n) ? un(n, ye) : $n(n) ? [n] : Bn(Ka(X(n)));
      }
      function G1(n) {
        var e = ++ec;
        return X(n) + e;
      }
      var q1 = ii(function(n, e) {
        return n + e;
      }, 0), V1 = wu("ceil"), Y1 = ii(function(n, e) {
        return n / e;
      }, 1), K1 = wu("floor");
      function Z1(n) {
        return n && n.length ? Xr(n, Pn, ou) : a;
      }
      function J1(n, e) {
        return n && n.length ? Xr(n, M(e, 2), ou) : a;
      }
      function X1(n) {
        return ko(n, Pn);
      }
      function Q1(n, e) {
        return ko(n, M(e, 2));
      }
      function j1(n) {
        return n && n.length ? Xr(n, Pn, cu) : a;
      }
      function n0(n, e) {
        return n && n.length ? Xr(n, M(e, 2), cu) : a;
      }
      var e0 = ii(function(n, e) {
        return n * e;
      }, 1), t0 = wu("round"), r0 = ii(function(n, e) {
        return n - e;
      }, 0);
      function i0(n) {
        return n && n.length ? Ki(n, Pn) : 0;
      }
      function u0(n, e) {
        return n && n.length ? Ki(n, M(e, 2)) : 0;
      }
      return o.after = Sh, o.ary = ul, o.assign = gg, o.assignIn = xl, o.assignInWith = _i, o.assignWith = vg, o.at = pg, o.before = ol, o.bind = Bu, o.bindAll = w1, o.bindKey = al, o.castArray = Fh, o.chain = tl, o.chunk = Ks, o.compact = Zs, o.concat = Js, o.cond = b1, o.conforms = C1, o.constant = Uu, o.countBy = ih, o.create = _g, o.curry = ll, o.curryRight = fl, o.debounce = cl, o.defaults = mg, o.defaultsDeep = xg, o.defer = Ah, o.delay = Ih, o.difference = Xs, o.differenceBy = Qs, o.differenceWith = js, o.drop = nd, o.dropRight = ed, o.dropRightWhile = td, o.dropWhile = rd, o.fill = id, o.filter = oh, o.flatMap = fh, o.flatMapDeep = ch, o.flatMapDepth = sh, o.flatten = Qa, o.flattenDeep = ud, o.flattenDepth = od, o.flip = Mh, o.flow = E1, o.flowRight = R1, o.fromPairs = ad, o.functions = Rg, o.functionsIn = Sg, o.groupBy = dh, o.initial = fd, o.intersection = cd, o.intersectionBy = sd, o.intersectionWith = dd, o.invert = Ig, o.invertBy = Mg, o.invokeMap = gh, o.iteratee = Wu, o.keyBy = vh, o.keys = _n, o.keysIn = Hn, o.map = si, o.mapKeys = Og, o.mapValues = Bg, o.matches = S1, o.matchesProperty = A1, o.memoize = hi, o.merge = kg, o.mergeWith = yl, o.method = I1, o.methodOf = M1, o.mixin = Nu, o.negate = gi, o.nthArg = O1, o.omit = Hg, o.omitBy = Pg, o.once = Lh, o.orderBy = ph, o.over = B1, o.overArgs = Oh, o.overEvery = k1, o.overSome = H1, o.partial = ku, o.partialRight = sl, o.partition = _h, o.pick = zg, o.pickBy = wl, o.property = Al, o.propertyOf = P1, o.pull = pd, o.pullAll = nl, o.pullAllBy = _d, o.pullAllWith = md, o.pullAt = xd, o.range = z1, o.rangeRight = D1, o.rearg = Bh, o.reject = yh, o.remove = yd, o.rest = kh, o.reverse = Lu, o.sampleSize = bh, o.set = Fg, o.setWith = Ug, o.shuffle = Ch, o.slice = wd, o.sortBy = Rh, o.sortedUniq = Ad, o.sortedUniqBy = Id, o.split = f1, o.spread = Hh, o.tail = Md, o.take = Ld, o.takeRight = Od, o.takeRightWhile = Bd, o.takeWhile = kd, o.tap = Zd, o.throttle = Ph, o.thru = ci, o.toArray = pl, o.toPairs = bl, o.toPairsIn = Cl, o.toPath = $1, o.toPlainObject = ml, o.transform = Wg, o.unary = zh, o.union = Hd, o.unionBy = Pd, o.unionWith = zd, o.uniq = Dd, o.uniqBy = Fd, o.uniqWith = Ud, o.unset = Ng, o.unzip = Ou, o.unzipWith = el, o.update = $g, o.updateWith = Gg, o.values = zt, o.valuesIn = qg, o.without = Wd, o.words = Rl, o.wrap = Dh, o.xor = Nd, o.xorBy = $d, o.xorWith = Gd, o.zip = qd, o.zipObject = Vd, o.zipObjectDeep = Yd, o.zipWith = Kd, o.entries = bl, o.entriesIn = Cl, o.extend = xl, o.extendWith = _i, Nu(o, o), o.add = q1, o.attempt = Sl, o.camelCase = Zg, o.capitalize = Tl, o.ceil = V1, o.clamp = Vg, o.clone = Uh, o.cloneDeep = Nh, o.cloneDeepWith = $h, o.cloneWith = Wh, o.conformsTo = Gh, o.deburr = El, o.defaultTo = T1, o.divide = Y1, o.endsWith = Jg, o.eq = de, o.escape = Xg, o.escapeRegExp = Qg, o.every = uh, o.find = ah, o.findIndex = Ja, o.findKey = yg, o.findLast = lh, o.findLastIndex = Xa, o.findLastKey = wg, o.floor = K1, o.forEach = rl, o.forEachRight = il, o.forIn = bg, o.forInRight = Cg, o.forOwn = Tg, o.forOwnRight = Eg, o.get = zu, o.gt = qh, o.gte = Vh, o.has = Ag, o.hasIn = Du, o.head = ja, o.identity = Pn, o.includes = hh, o.indexOf = ld, o.inRange = Yg, o.invoke = Lg, o.isArguments = ht, o.isArray = H, o.isArrayBuffer = Yh, o.isArrayLike = kn, o.isArrayLikeObject = sn, o.isBoolean = Kh, o.isBuffer = Xe, o.isDate = Zh, o.isElement = Jh, o.isEmpty = Xh, o.isEqual = Qh, o.isEqualWith = jh, o.isError = Hu, o.isFinite = ng, o.isFunction = Oe, o.isInteger = dl, o.isLength = vi, o.isMap = hl, o.isMatch = eg, o.isMatchWith = tg, o.isNaN = rg, o.isNative = ig, o.isNil = og, o.isNull = ug, o.isNumber = gl, o.isObject = an, o.isObjectLike = cn, o.isPlainObject = dr, o.isRegExp = Pu, o.isSafeInteger = ag, o.isSet = vl, o.isString = pi, o.isSymbol = $n, o.isTypedArray = Pt, o.isUndefined = lg, o.isWeakMap = fg, o.isWeakSet = cg, o.join = hd, o.kebabCase = jg, o.last = te, o.lastIndexOf = gd, o.lowerCase = n1, o.lowerFirst = e1, o.lt = sg, o.lte = dg, o.max = Z1, o.maxBy = J1, o.mean = X1, o.meanBy = Q1, o.min = j1, o.minBy = n0, o.stubArray = Gu, o.stubFalse = qu, o.stubObject = F1, o.stubString = U1, o.stubTrue = W1, o.multiply = e0, o.nth = vd, o.noConflict = L1, o.noop = $u, o.now = di, o.pad = t1, o.padEnd = r1, o.padStart = i1, o.parseInt = u1, o.random = Kg, o.reduce = mh, o.reduceRight = xh, o.repeat = o1, o.replace = a1, o.result = Dg, o.round = t0, o.runInContext = d, o.sample = wh, o.size = Th, o.snakeCase = l1, o.some = Eh, o.sortedIndex = bd, o.sortedIndexBy = Cd, o.sortedIndexOf = Td, o.sortedLastIndex = Ed, o.sortedLastIndexBy = Rd, o.sortedLastIndexOf = Sd, o.startCase = c1, o.startsWith = s1, o.subtract = r0, o.sum = i0, o.sumBy = u0, o.template = d1, o.times = N1, o.toFinite = Be, o.toInteger = P, o.toLength = _l, o.toLower = h1, o.toNumber = re, o.toSafeInteger = hg, o.toString = X, o.toUpper = g1, o.trim = v1, o.trimEnd = p1, o.trimStart = _1, o.truncate = m1, o.unescape = x1, o.uniqueId = G1, o.upperCase = y1, o.upperFirst = Fu, o.each = rl, o.eachRight = il, o.first = ja, Nu(o, function() {
        var n = {};
        return me(o, function(e, t) {
          Q.call(o.prototype, t) || (n[t] = e);
        }), n;
      }(), { chain: !1 }), o.VERSION = b, Xn(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function(n) {
        o[n].placeholder = o;
      }), Xn(["drop", "take"], function(n, e) {
        $.prototype[n] = function(t) {
          t = t === a ? 1 : vn(P(t), 0);
          var r = this.__filtered__ && !e ? new $(this) : this.clone();
          return r.__filtered__ ? r.__takeCount__ = wn(t, r.__takeCount__) : r.__views__.push({
            size: wn(t, zn),
            type: n + (r.__dir__ < 0 ? "Right" : "")
          }), r;
        }, $.prototype[n + "Right"] = function(t) {
          return this.reverse()[n](t).reverse();
        };
      }), Xn(["filter", "map", "takeWhile"], function(n, e) {
        var t = e + 1, r = t == ge || t == mr;
        $.prototype[n] = function(i) {
          var l = this.clone();
          return l.__iteratees__.push({
            iteratee: M(i, 3),
            type: t
          }), l.__filtered__ = l.__filtered__ || r, l;
        };
      }), Xn(["head", "last"], function(n, e) {
        var t = "take" + (e ? "Right" : "");
        $.prototype[n] = function() {
          return this[t](1).value()[0];
        };
      }), Xn(["initial", "tail"], function(n, e) {
        var t = "drop" + (e ? "" : "Right");
        $.prototype[n] = function() {
          return this.__filtered__ ? new $(this) : this[t](1);
        };
      }), $.prototype.compact = function() {
        return this.filter(Pn);
      }, $.prototype.find = function(n) {
        return this.filter(n).head();
      }, $.prototype.findLast = function(n) {
        return this.reverse().find(n);
      }, $.prototype.invokeMap = F(function(n, e) {
        return typeof n == "function" ? new $(this) : this.map(function(t) {
          return or(t, n, e);
        });
      }), $.prototype.reject = function(n) {
        return this.filter(gi(M(n)));
      }, $.prototype.slice = function(n, e) {
        n = P(n);
        var t = this;
        return t.__filtered__ && (n > 0 || e < 0) ? new $(t) : (n < 0 ? t = t.takeRight(-n) : n && (t = t.drop(n)), e !== a && (e = P(e), t = e < 0 ? t.dropRight(-e) : t.take(e - n)), t);
      }, $.prototype.takeRightWhile = function(n) {
        return this.reverse().takeWhile(n).reverse();
      }, $.prototype.toArray = function() {
        return this.take(zn);
      }, me($.prototype, function(n, e) {
        var t = /^(?:filter|find|map|reject)|While$/.test(e), r = /^(?:head|last)$/.test(e), i = o[r ? "take" + (e == "last" ? "Right" : "") : e], l = r || /^find/.test(e);
        i && (o.prototype[e] = function() {
          var f = this.__wrapped__, s = r ? [1] : arguments, h = f instanceof $, _ = s[0], m = h || H(f), y = function(W) {
            var G = i.apply(o, Ge([W], s));
            return r && R ? G[0] : G;
          };
          m && t && typeof _ == "function" && _.length != 1 && (h = m = !1);
          var R = this.__chain__, A = !!this.__actions__.length, L = l && !R, z = h && !A;
          if (!l && m) {
            f = z ? f : new $(this);
            var O = n.apply(f, s);
            return O.__actions__.push({ func: ci, args: [y], thisArg: a }), new jn(O, R);
          }
          return L && z ? n.apply(this, s) : (O = this.thru(y), L ? r ? O.value()[0] : O.value() : O);
        });
      }), Xn(["pop", "push", "shift", "sort", "splice", "unshift"], function(n) {
        var e = Pr[n], t = /^(?:push|sort|unshift)$/.test(n) ? "tap" : "thru", r = /^(?:pop|shift)$/.test(n);
        o.prototype[n] = function() {
          var i = arguments;
          if (r && !this.__chain__) {
            var l = this.value();
            return e.apply(H(l) ? l : [], i);
          }
          return this[t](function(f) {
            return e.apply(H(f) ? f : [], i);
          });
        };
      }), me($.prototype, function(n, e) {
        var t = o[e];
        if (t) {
          var r = t.name + "";
          Q.call(Lt, r) || (Lt[r] = []), Lt[r].push({ name: e, func: t });
        }
      }), Lt[ri(a, Mn).name] = [{
        name: "wrapper",
        func: a
      }], $.prototype.clone = xc, $.prototype.reverse = yc, $.prototype.value = wc, o.prototype.at = Jd, o.prototype.chain = Xd, o.prototype.commit = Qd, o.prototype.next = jd, o.prototype.plant = eh, o.prototype.reverse = th, o.prototype.toJSON = o.prototype.valueOf = o.prototype.value = rh, o.prototype.first = o.prototype.head, jt && (o.prototype[jt] = nh), o;
    }, At = Qf();
    ut ? ((ut.exports = At)._ = At, Wi._ = At) : xn._ = At;
  }).call(hr);
})(Ci, Ci.exports);
var Pl = Ci.exports;
const bv = 5;
function Cv(u) {
  const g = pr(null), { classes: a } = Ft({ root: {} })(void 0, {
    name: "SuggestionListItem"
  });
  function b() {
    var V;
    const I = u.isSelected, C = (V = g.current) == null ? void 0 : V.matches(":hover");
    return I || C;
  }
  function T() {
    var I, C;
    b() ? (I = g.current) == null || I.setAttribute("data-hovered", "true") : (C = g.current) == null || C.removeAttribute("data-hovered");
  }
  return Dt(() => {
    T(), b() && g.current && g.current.getBoundingClientRect().left > bv && g.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }), /* @__PURE__ */ x(
    ln.Item,
    {
      className: a.root,
      icon: u.icon,
      onClick: u.set,
      closeMenuOnClick: !1,
      onMouseLeave: () => {
        setTimeout(() => {
          T();
        }, 1);
      },
      ref: g,
      rightSection: u.shortcut && /* @__PURE__ */ x(T0, { size: "xs", children: u.shortcut }),
      children: /* @__PURE__ */ An(eo, { children: [
        /* @__PURE__ */ x(bi, { size: 14, weight: 500, children: u.name }),
        /* @__PURE__ */ x(bi, { size: 10, children: u.hint })
      ] })
    }
  );
}
function Tv(u) {
  const { classes: g } = Ft({ root: {} })(void 0, {
    name: "SlashMenu"
  }), a = [];
  let b = 0;
  const T = Pl.groupBy(u.items, (I) => I.group);
  return Pl.forEach(T, (I) => {
    a.push(/* @__PURE__ */ x(ln.Label, { children: I[0].group }, I[0].group));
    for (const C of I)
      a.push(
        /* @__PURE__ */ x(
          Cv,
          {
            name: C.name,
            icon: C.icon,
            hint: C.hint,
            shortcut: C.shortcut,
            isSelected: u.keyboardHoveredItemIndex === b,
            set: () => u.itemCallback(C)
          },
          C.name
        )
      ), b++;
  }), /* @__PURE__ */ x(
    ln,
    {
      defaultOpened: !0,
      trigger: "hover",
      closeDelay: 1e7,
      children: /* @__PURE__ */ x(ln.Dropdown, { className: g.root, children: a.length > 0 ? a : /* @__PURE__ */ x(ln.Item, { children: "No match found" }) })
    }
  );
}
const Ev = (u) => (g) => Ei(g, Tv, u, {
  animation: "fade",
  placement: "bottom-start"
});
function Rv() {
  const [, u] = ie(0);
  return () => u((g) => g + 1);
}
const zv = (u = {}, g = []) => {
  const [a, b] = ie(null), T = Rv();
  return Dt(() => {
    var hn, Z;
    let I = !0, C = {
      slashCommands: wv,
      ...u
    };
    C.customElements && C.uiFactories && console.warn(
      "BlockNote editor initialized with both `customElements` and `uiFactories` options, prioritizing `uiFactories`."
    );
    let V = {
      formattingToolbarFactory: _v(
        mi(C.theme === "dark"),
        (hn = C.customElements) == null ? void 0 : hn.formattingToolbar
      ),
      hyperlinkToolbarFactory: xv(
        mi(C.theme === "dark")
      ),
      slashMenuFactory: Ev(
        mi(C.theme === "dark")
      ),
      blockSideMenuFactory: F0(
        mi(C.theme === "dark"),
        (Z = C.customElements) == null ? void 0 : Z.dragHandleMenu
      ),
      ...C.uiFactories
    };
    C = {
      ...C,
      uiFactories: V
    }, console.log("create new blocknote instance");
    const D = new m0(
      C
    );
    return b(D), D._tiptapEditor.on("transaction", () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          I && T();
        });
      });
    }), () => {
      D._tiptapEditor.destroy(), I = !1;
    };
  }, g), a;
};
function Sv() {
  const [, u] = ie(0);
  return () => u((g) => g + 1);
}
const Dv = (u) => {
  const g = Sv();
  Dt(() => {
    const a = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          g();
        });
      });
    };
    return u.on("transaction", a), () => {
      u.off("transaction", a);
    };
  }, [u]);
};
export {
  z0 as BlockColorsButton,
  kv as BlockNoteView,
  vv as BlockTypeDropdown,
  U0 as ColorStyleButton,
  iv as CreateLinkButton,
  O0 as DragHandleMenu,
  Wl as DragHandleMenuItem,
  pv as FormattingToolbar,
  Hv as InlineContent,
  uv as NestBlockButton,
  Ei as ReactElementFactory,
  yv as ReactSlashMenuItem,
  B0 as RemoveBlockButton,
  Vu as TextAlignButton,
  yi as ToggledStyleButton,
  $l as Toolbar,
  Pe as ToolbarButton,
  dv as ToolbarDropdown,
  ov as UnnestBlockButton,
  Y as blockNoteColorScheme,
  F0 as createReactBlockSideMenuFactory,
  Pv as createReactBlockSpec,
  _v as createReactFormattingToolbarFactory,
  xv as createReactHyperlinkToolbarFactory,
  Ev as createReactSlashMenuFactory,
  wv as defaultReactSlashMenuItems,
  mi as getBlockNoteTheme,
  zv as useBlockNote,
  Dv as useEditorForceUpdate
};
//# sourceMappingURL=blocknote-react.js.map
