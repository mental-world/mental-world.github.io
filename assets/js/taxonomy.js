/* World-state taxonomy · the annotation schema behind s^phy and s^ment,
   as an openable tree. Fields and example values are the paper's. */

import { mx } from './mathx.js';

const PHY = {
  sym: 's_t^phy', name: 'Physical state', tuple: '( O, C, R^phy, E )',
  nodes: [
    {
      k: 'Entity and attribute', n: '2 branches', leaves: [
        { k: 'Objects · intrinsic', v: 'name; size; weight; color; material', e: 'cup; small; light; white; ceramic' },
        { k: 'Objects · contextual', v: 'motion state; position; physical condition; semantic content', e: 'static; on the table; cup broken; display says “Next train in 5 minutes”' },
        { k: 'Characters · intrinsic', v: 'height; weight; clothing type and color', e: 'about 1.75 m; about 70 kg; blue jacket' },
        { k: 'Characters · contextual', v: 'facial expression; pose; gesture; gaze; motion state; position; body condition; semantic content', e: 'frowning; standing; pointing to the door; looking at person 2; near the door; speech: “Leave now”' }
      ]
    },
    {
      k: 'Relations', n: '2 branches', leaves: [
        { k: 'Spatial relations', v: 'relative position; distance; occlusion', e: 'cup left of laptop; person 1 close to person 2; person 1 blocks the door' },
        { k: 'Contact relations', v: 'contact relation', e: 'hand touches the cup' }
      ]
    },
    {
      k: 'Environment', n: '5 branches', leaves: [
        { k: 'Time / place / region', v: 'time; place; region', e: 'daytime; classroom; near the window' },
        { k: 'Visual condition', v: 'lighting; visibility', e: 'bright; clear' },
        { k: 'Acoustic condition', v: 'noise level; background sound', e: 'noisy; traffic sound' },
        { k: 'Air condition', v: 'temperature; wind; humidity; smoke', e: 'hot; strong wind; humid; smoke present' },
        { k: 'Space condition', v: 'crowdedness; clutter; openness', e: 'crowded; cluttered; open space' }
      ]
    }
  ]
};

const MENT = {
  sym: 's_t^ment', name: 'Mental state', tuple: '( {m^i}, {m^G}, R^ment, \\alpha )',
  nodes: [
    {
      k: 'Individual mental entity  m^i', n: '6 fields', leaves: [
        { k: 'Identity attributes', v: 'name; occupation', e: 'Alice; teacher' },
        { k: 'Epistemic state', v: 'beliefs; attention focus', e: 'believes the train is delayed; looking at the display' },
        { k: 'Motivational state', v: 'goals; intentions', e: 'wants to catch the train; plans to wait' },
        { k: 'Affective state', v: 'emotions', e: 'angry; anxious; relieved' },
        { k: 'Dispositional state', v: 'preferences; values; personality', e: 'prefers quiet places; values fairness; competitive' },
        { k: 'Normative state', v: 'rules; cultural norms; customs', e: 'basketball rules; greet others politely; remove shoes indoors' },
        { k: 'Behavioral constraints', v: 'obligations; prohibitions', e: 'must follow the rules; cannot push others' }
      ]
    },
    {
      k: 'Group mental entity  m^G', n: 'same fields', leaves: [
        { k: 'Collective actor', v: 'same field structure as individuals, held by a collective', e: 'Team A believes it is losing; wants to win; excited; values teamwork; must stay in position' }
      ]
    },
    {
      k: 'Relations', n: '2 branches', leaves: [
        { k: 'Attitudes', v: 'person–object; person–person; person–group; group–group', e: 'person 1 likes the gift; person 1 distrusts person 2; Team A dislikes Team B' },
        { k: 'Role relations', v: 'person–person; person–group; group–group role relation', e: 'teacher–student; person 1 is coach of Team A; Team A and Team B are opponents' }
      ]
    },
    {
      k: 'Atmosphere  α', n: 'scene level', leaves: [
        { k: 'Social atmosphere', v: 'scene-level social atmosphere', e: 'tense; cooperative; festive; awkward' }
      ]
    }
  ]
};

function colHTML(d, side) {
  const nodes = d.nodes.map((n) => `
    <div class="tnode">
      <button class="tnode-h" aria-expanded="false">
        <span class="tn-tw">+</span>${n.k.replace(/(m\^[iG])/, (m) => `<span class="mx">${mx(m)}</span>`).replace('α', '<span class="mx"><i>α</i></span>')}
        <span class="tn-n">${n.n}</span>
      </button>
      <div class="tnode-b"><div><div class="tleaf">
        ${n.leaves.map((l) => `
          <div class="tl">
            <div class="tl-k">${l.k}</div>
            <div class="tl-v">${l.v}<br><em>e.g.</em> ${l.e}</div>
          </div>`).join('')}
      </div></div></div>
    </div>`).join('');

  return `
    <div class="tax-h">
      <span class="tx-sym">${mx(d.sym)}</span>
      <b>${d.name}</b>
    </div>${nodes}`;
}

export function initTaxonomy() {
  const grid = document.getElementById('taxGrid');
  if (!grid) return;
  const cols = grid.querySelectorAll('.tax-col');
  cols[0].innerHTML = colHTML(PHY, 'phy');
  cols[1].innerHTML = colHTML(MENT, 'ment');

  grid.querySelectorAll('.tnode-h').forEach((btn) => {
    btn.addEventListener('click', () => {
      const node = btn.closest('.tnode');
      const open = node.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}
