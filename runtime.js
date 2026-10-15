/* ============================================================================
   VAPS PVT Nexus — dc-runtime
   Minimal template + component engine that replaces the Claude Design canvas.

   Supports the markup dialect the design export already uses:
     {{ expr }}                     in text nodes and attribute values
     <sc-if value="{{ cond }}">     conditional block
     <sc-for list="{{ arr }}" as="x">  repeated block
     <dc-import name="X" on-back="{{ fn }}" ...>   child component
     sc-camel-view-box="..."        -> viewBox="..."
     onclick="{{ handler }}"        event binding

   Rendering is PATCH-BASED: elements are created once and then updated in
   place. This matters — CSS transitions break if nodes are recreated, and the
   PVT animations depend on them.
   ========================================================================= */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var registry = Object.create(null);
  var exprCache = Object.create(null);
  var slots = Object.create(null);

  /* ---------------------------------------------------------------- utils */

  function camel(name) {
    // sc-camel-view-box -> viewBox
    return name.slice(9).replace(/-([a-z])/g, function (_, c) {
      return c.toUpperCase();
    });
  }

  function compileExpr(src) {
    var key = src;
    if (exprCache[key]) return exprCache[key];
    var fn;
    try {
      /* eslint-disable no-new-func */
      fn = new Function('$v', '$s',
        'with($v){with($s){ return (' + src + '); }}');
    } catch (e) {
      console.warn('[dc] bad expression:', src, e.message);
      fn = function () { return ''; };
    }
    exprCache[key] = fn;
    return fn;
  }

  function evalIn(src, vals, scope) {
    try {
      return compileExpr(src)(vals, scope);
    } catch (e) {
      return '';
    }
  }

  // Split "a {{ b }} c" into parts: ["a ", {e:"b"}, " c"]
  function splitParts(str) {
    var parts = [], re = /\{\{([\s\S]*?)\}\}/g, last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      parts.push({ e: m[1].trim() });
      last = m.index + m[0].length;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts;
  }

  function partsValue(parts, vals, scope) {
    if (parts.length === 1 && typeof parts[0] === 'object') {
      return evalIn(parts[0].e, vals, scope); // keep native type
    }
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      out += (typeof p === 'string') ? p : stringify(evalIn(p.e, vals, scope));
    }
    return out;
  }

  function stringify(v) {
    return (v === null || v === undefined || v === false) ? '' : String(v);
  }

  function hasBinding(str) { return str.indexOf('{{') !== -1; }

  /* -------------------------------------------------------------- compile */

  function compileNode(node) {
    if (node.nodeType === 3) { // text
      var txt = node.nodeValue;
      if (!hasBinding(txt)) return txt.trim() === '' ? null : { k: 'text', s: txt };
      return { k: 'bind', parts: splitParts(txt) };
    }
    if (node.nodeType !== 1) return null; // drop comments

    var tag = node.tagName.toLowerCase();

    if (tag === 'sc-if') {
      return {
        k: 'if',
        cond: (node.getAttribute('value') || '{{ false }}').replace(/^\{\{|\}\}$/g, '').trim(),
        body: compileChildren(node)
      };
    }
    if (tag === 'sc-for') {
      return {
        k: 'for',
        list: (node.getAttribute('list') || '{{ [] }}').replace(/^\{\{|\}\}$/g, '').trim(),
        as: node.getAttribute('as') || 'item',
        body: compileChildren(node)
      };
    }
    if (tag === 'dc-import') {
      var props = [];
      for (var a = 0; a < node.attributes.length; a++) {
        var at = node.attributes[a];
        if (at.name === 'name' || at.name.indexOf('hint-') === 0) continue;
        props.push({
          // on-back -> onBack, src-context -> srcContext  (hyphen-to-camel, nothing stripped)
          name: at.name.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }),
          parts: splitParts(at.value)
        });
      }
      return { k: 'comp', name: node.getAttribute('name'), props: props };
    }

    // ordinary element
    var attrs = [], events = [];
    for (var i = 0; i < node.attributes.length; i++) {
      var att = node.attributes[i];
      var name = att.name, value = att.value;
      if (name.indexOf('hint-') === 0) continue;          // design-tool hints
      if (name.indexOf('sc-camel-') === 0) name = camel(name);
      if (name === 'ref' && hasBinding(value)) {
        attrs.push({ name: 'ref', isRef: true, parts: splitParts(value) });
        continue;
      }
      if (/^on[a-z]+$/.test(name) && hasBinding(value)) {
        events.push({ type: name.slice(2), expr: value.replace(/^\{\{|\}\}$/g, '').trim() });
        continue;
      }
      attrs.push({ name: name, parts: hasBinding(value) ? splitParts(value) : null, s: value });
    }
    return {
      k: 'el',
      tag: node.tagName,           // preserve case for SVG (e.g. linearGradient)
      ns: node.namespaceURI === SVG_NS,
      attrs: attrs,
      events: events,
      body: compileChildren(node)
    };
  }

  function compileChildren(node) {
    var out = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = compileNode(node.childNodes[i]);
      if (c) out.push(c);
    }
    return out;
  }

  function compileTemplate(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    return compileChildren(tpl.content);
  }

  /* --------------------------------------------------------------- render */
  /* An "instance" mirrors a plan node and owns its DOM. */

  function makeInstance(plan, parentEl, host, anchor) {
    var inst = { plan: plan, host: host, parent: parentEl };

    switch (plan.k) {
      case 'text':
        inst.node = document.createTextNode(plan.s);
        parentEl.insertBefore(inst.node, anchor || null);
        break;

      case 'bind':
        inst.node = document.createTextNode('');
        parentEl.insertBefore(inst.node, anchor || null);
        break;

      case 'el':
        inst.node = plan.ns
          ? document.createElementNS(SVG_NS, plan.tag)
          : document.createElement(plan.tag);
        // static attributes once
        for (var i = 0; i < plan.attrs.length; i++) {
          var a = plan.attrs[i];
          if (!a.parts) setAttr(inst.node, a.name, a.s);
        }
        // events
        inst.handlers = {};
        (function (node, inst) {
          for (var j = 0; j < plan.events.length; j++) {
            (function (ev) {
              node.addEventListener(ev.type, function (e) {
                var fn = evalIn(ev.expr, inst.lastVals || {}, inst.lastScope || {});
                if (typeof fn === 'function') fn(e);
              });
            })(plan.events[j]);
          }
        })(inst.node, inst);
        parentEl.insertBefore(inst.node, anchor || null);
        inst.children = plan.body.map(function (p) {
          return makeInstance(p, inst.node, host, null);
        });
        break;

      case 'if':
        inst.node = document.createComment('if');
        parentEl.insertBefore(inst.node, anchor || null);
        inst.mounted = null;
        break;

      case 'for':
        inst.node = document.createComment('for');
        parentEl.insertBefore(inst.node, anchor || null);
        inst.items = [];
        break;

      case 'comp':
        inst.node = document.createComment('comp');
        parentEl.insertBefore(inst.node, anchor || null);
        inst.child = null;
        break;
    }
    return inst;
  }

  /* style bindings may be given as an object: {borderRadius:'7px'} -> "border-radius:7px;" */
  function cssText(o) {
    var out = '';
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      var v = o[k];
      if (v === null || v === undefined || v === false || v === '') continue;
      out += k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + ':' + v + ';';
    }
    return out;
  }

  function setAttr(el, name, value) {
    if (value === false || value === null || value === undefined) {
      el.removeAttribute(name);
    } else if (name === 'style' && typeof value === 'object') {
      el.setAttribute(name, cssText(value));
    } else {
      el.setAttribute(name, value);
    }
  }

  function updateInstance(inst, vals, scope) {
    var plan = inst.plan;
    inst.lastVals = vals;
    inst.lastScope = scope;

    switch (plan.k) {
      case 'text':
        break;

      case 'bind': {
        var s = stringify(partsValue(plan.parts, vals, scope));
        if (inst.node.nodeValue !== s) inst.node.nodeValue = s;
        break;
      }

      case 'el': {
        inst.prev = inst.prev || {};
        for (var i = 0; i < plan.attrs.length; i++) {
          var a = plan.attrs[i];
          if (!a.parts) continue;
          if (a.isRef) {
            var refObj = partsValue(a.parts, vals, scope);
            if (refObj && typeof refObj === 'object') refObj.current = inst.node;
            continue;
          }
          var v = partsValue(a.parts, vals, scope);
          if (a.name === 'style' && v && typeof v === 'object') v = cssText(v);
          var sv = (v === false || v === null || v === undefined) ? null : String(v);
          if (inst.prev[a.name] !== sv) {
            inst.prev[a.name] = sv;
            setAttr(inst.node, a.name, sv);
          }
        }
        for (var c = 0; c < inst.children.length; c++) {
          updateInstance(inst.children[c], vals, scope);
        }
        break;
      }

      case 'if': {
        var on = !!evalIn(plan.cond, vals, scope);
        if (on && !inst.mounted) {
          inst.mounted = plan.body.map(function (p) {
            return makeInstance(p, inst.parent, inst.host, inst.node);
          });
        } else if (!on && inst.mounted) {
          inst.mounted.forEach(destroyInstance);
          inst.mounted = null;
        }
        if (inst.mounted) {
          inst.mounted.forEach(function (ci) { updateInstance(ci, vals, scope); });
        }
        break;
      }

      case 'for': {
        var list = evalIn(plan.list, vals, scope) || [];
        if (!Array.isArray(list)) list = [];
        while (inst.items.length > list.length) {
          inst.items.pop().forEach(destroyInstance);
        }
        while (inst.items.length < list.length) {
          inst.items.push(plan.body.map(function (p) {
            return makeInstance(p, inst.parent, inst.host, inst.node);
          }));
        }
        for (var k = 0; k < list.length; k++) {
          var sub = Object.create(scope);
          sub[plan.as] = list[k];
          sub[plan.as + 'Index'] = k;
          /* eslint-disable no-loop-func */
          inst.items[k].forEach(function (ci) { updateInstance(ci, vals, sub); });
        }
        break;
      }

      case 'comp': {
        var props = {};
        for (var p = 0; p < plan.props.length; p++) {
          props[plan.props[p].name] = partsValue(plan.props[p].parts, vals, scope);
        }
        if (!inst.child) {
          var def = registry[plan.name];
          if (!def) { console.warn('[dc] unknown component:', plan.name); break; }
          inst.child = mountComponent(def, inst.parent, inst.node, props);
        } else {
          inst.child.setProps(props);
        }
        break;
      }
    }
  }

  function destroyInstance(inst) {
    var plan = inst.plan;
    if (plan.k === 'el') inst.children.forEach(destroyInstance);
    if (plan.k === 'if' && inst.mounted) inst.mounted.forEach(destroyInstance);
    if (plan.k === 'for') inst.items.forEach(function (g) { g.forEach(destroyInstance); });
    if (plan.k === 'comp' && inst.child) inst.child.unmount();
    if (inst.node && inst.node.parentNode) inst.node.parentNode.removeChild(inst.node);
  }

  /* ------------------------------------------------------------ component */

  function DCLogic() {}
  DCLogic.prototype.setState = function (patch) {
    var next = (typeof patch === 'function') ? patch(this.state) : patch;
    for (var k in next) this.state[k] = next[k];
    this.$schedule();
  };
  DCLogic.prototype.renderVals = function () { return {}; };
  DCLogic.prototype.componentDidMount = function () {};
  DCLogic.prototype.componentDidUpdate = function () {};
  DCLogic.prototype.componentWillUnmount = function () {};
  DCLogic.createRef = function () { return { current: null }; };

  // Minimal React shim: the export uses React.createRef() for DOM measurement.
  if (!global.React) global.React = { createRef: DCLogic.createRef };

  function mountComponent(def, parentEl, anchor, props) {
    var inst = new def.logic();
    inst.props = props || {};
    if (!inst.state) inst.state = {};

    var dirty = false;
    inst.$schedule = function () {
      if (dirty) return;
      dirty = true;
      requestAnimationFrame(function () {
        dirty = false;
        if (inst.$alive) render();
      });
    };
    inst.$alive = true;

    var roots = def.plan.map(function (p) {
      return makeInstance(p, parentEl, inst, anchor);
    });

    function render() {
      var vals;
      try { vals = inst.renderVals() || {}; }
      catch (e) { console.error('[dc] renderVals failed:', e); return; }
      vals.props = inst.props;
      var scope = { props: inst.props };
      roots.forEach(function (r) { updateInstance(r, vals, scope); });
      if (mounted) { try { inst.componentDidUpdate(); } catch (e) { console.error(e); } }
    }

    var mounted = false;
    render();
    mounted = true;
    try { inst.componentDidMount(); } catch (e) { console.error(e); }

    return {
      logic: inst,
      setProps: function (p) { inst.props = p; inst.$schedule(); },
      unmount: function () {
        inst.$alive = false;
        try { inst.componentWillUnmount(); } catch (e) {}
        roots.forEach(destroyInstance);
      }
    };
  }

  /* ----------------------------------------------------------------- API */

  var DC = {
    DCLogic: DCLogic,

    /** Register a screen partial, pulled into a template by <sc-slot name="..."> */
    slot: function (name, html) { slots[name] = html; },

    /** Register a component: DC.define('StageGC', { template, logic, style }) */
    define: function (name, def) {
      def.template = def.template.replace(
        /<sc-slot\s+name="([^"]+)"\s*><\/sc-slot>/g,
        function (_, s) {
          if (!(s in slots)) console.warn('[dc] missing slot:', s);
          return slots[s] || '';
        });
      if (def.style) {
        var st = document.createElement('style');
        st.textContent = def.style;
        st.setAttribute('data-dc', name);
        document.head.appendChild(st);
      }
      registry[name] = { plan: compileTemplate(def.template), logic: def.logic };
    },

    /** Mount the root component into a container element. */
    mount: function (name, container) {
      var def = registry[name];
      if (!def) throw new Error('[dc] component not registered: ' + name);
      return mountComponent(def, container, null, {});
    }
  };

  global.DC = DC;
  global.DCLogic = DCLogic;
})(window);
