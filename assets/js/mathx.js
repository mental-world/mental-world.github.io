/* Tiny math typesetter, enough for this paper's notation, ~2 kB instead of
   a 300 kB layout engine. Input is a compact DSL:

     s_t^phy            →  s (sub t)(sup phy)
     s_{t+1}^ment       →  grouped scripts
     \Omega \pi \Gamma  →  greek
     \mid \times \neq   →  operators
     \hat{s} \tilde{s}  →  accents                                            */

const GREEK = {
  Omega: 'Ω', omega: 'ω', Pi: 'Π', pi: 'π', Gamma: 'Γ', gamma: 'γ',
  eps: 'ε', epsilon: 'ε', theta: 'θ', psi: 'ψ', kappa: 'κ', rho: 'ρ',
  alpha: 'α', iota: 'ι', mu: 'μ', Delta: 'Δ', delta: 'δ', lambda: 'λ',
  sigma: 'σ', tau: 'τ', beta: 'β', ell: 'ℓ'
};

/* U+1D4AE / U+2130 exist in almost no text face, so the browser swaps in a
   system fallback for that one glyph and the formula changes typeface midway.
   Set them as ordinary italic capitals in the page's own math face instead. */
const CAL = { Sc: 'S', Ec: 'E' };

const OPS = {
  times: '×', in: '∈', neq: '≠', to: '→', mapsto: '↦', forall: '∀',
  exists: '∃', wedge: '∧', vee: '∨', sim: '∼', cdot: '·', approx: '≈',
  ldots: '…', ge: '≥', le: '≤', propto: '∝', langle: '⟨', rangle: '⟩',
  Rightarrow: '⇒', xrightarrow: '⟶', star: '⋆', quad: ' '
};

const UPRIGHT = new Set(['phy', 'ment', 'self', 'id', 'max', 'argmax', 'ToM', 'gold', 'opt']);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function atom(name) {
  if (CAL[name]) return `<span class="cal">${CAL[name]}</span>`;
  if (GREEK[name]) return `<i>${GREEK[name]}</i>`;
  if (UPRIGHT.has(name)) return `<span class="up">${name}</span>`;
  return `<i>${esc(name)}</i>`;
}

/* body of a sub/superscript: letters italic unless they are upright tags */
function script(body) {
  let out = '', i = 0;
  while (i < body.length) {
    const c = body[i];
    if (/[A-Za-z]/.test(c)) {
      const m = /^[A-Za-z][A-Za-z0-9]*/.exec(body.slice(i))[0];
      i += m.length;
      out += atom(m);
    } else if (c === '*') { out += '⋆'; i++; }
    else { out += esc(c); i++; }
  }
  return out;
}

export function mx(src) {
  let out = '', i = 0;
  const readScripts = () => {
    let html = '';
    while (src[i] === '_' || src[i] === '^') {
      const tag = src[i] === '_' ? 'sub' : 'sup';
      i++;
      let body;
      if (src[i] === '{') {
        const j = src.indexOf('}', i);
        body = src.slice(i + 1, j === -1 ? src.length : j);
        i = (j === -1 ? src.length : j + 1);
      } else {
        const m = /^[A-Za-z0-9+\-*′']+/.exec(src.slice(i));
        body = m ? m[0] : '';
        i += body.length;
      }
      html += `<${tag}>${script(body)}</${tag}>`;
    }
    return html;
  };

  while (i < src.length) {
    const c = src[i];

    if (c === '\\') {
      const m = /^\\([A-Za-z]+)/.exec(src.slice(i));
      if (!m) { i++; continue; }
      const name = m[1];
      i += m[0].length;

      if ((name === 'hat' || name === 'tilde') && src[i] === '{') {
        const j = src.indexOf('}', i);
        const body = src.slice(i + 1, j === -1 ? src.length : j);
        i = (j === -1 ? src.length : j + 1);
        const mark = name === 'hat' ? '̂' : '̃';
        out += `<i>${(GREEK[body] || esc(body))}${mark}</i>` + readScripts();
        continue;
      }
      if (name === 'mid') { out += '<span class="mid">|</span>'; continue; }
      if (OPS[name]) { out += `<span class="op">${OPS[name]}</span>`; continue; }
      out += atom(name) + readScripts();
      continue;
    }

    if (/[A-Za-z]/.test(c)) {
      const m = /^[A-Za-z][A-Za-z0-9]*/.exec(src.slice(i))[0];
      i += m.length;
      out += atom(m) + readScripts();
      continue;
    }

    if (c === '|') { out += '<span class="mid">|</span>'; i++; continue; }
    if (c === '=' || c === '<' || c === '>') { out += `<span class="op">${esc(c)}</span>`; i++; continue; }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9.]+/.exec(src.slice(i))[0];
      i += m.length;
      out += `<span class="up">${m}</span>` + readScripts();
      continue;
    }
    out += esc(c);
    i++;
  }
  return out;
}

/* multi-token named expressions used verbatim in the markup */
const NAMED = {
  prop1: mx('p^*( a_t^eps \\mid s_t^phy, s_t^ment )') +
         '<span class="op">≠</span>' +
         mx('p^*( a_t^eps \\mid s_t^phy, \\tilde{s}_t^ment )')
};

export function renderMath(root = document) {
  root.querySelectorAll('[data-math]').forEach((el) => {
    const k = el.getAttribute('data-math');
    el.innerHTML = NAMED[k] !== undefined ? NAMED[k] : mx(k);
    if (!el.classList.contains('mx') && !el.classList.contains('fx')) el.classList.add('mx');
  });
}
