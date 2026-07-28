/* Mentis · six inspectable stages. The rail selects a stage; the panel shows
   the artifact that stage writes to disk, instantiated on the same scene the
   theater above is running. Branch scores are an illustrative worked example
   of the evaluator's rubric, not benchmark numbers. */

import { mx } from './mathx.js';

const kv = (rows) => `<dl class="kv">${rows.map((r) => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;
const art = (cls, sym, name, body) => `
  <div class="art ${cls}">
    <div class="art-h"><span class="dot"></span>${name}<span class="sym">${sym ? mx(sym) : ''}</span></div>
    <div class="art-b">${body}</div>
  </div>`;

const OPTIONS = [
  {
    l: 'A', t: 'Open the closet and hand Bob the gift now.',
    mc: 0.14, pp: 0.96, sa: 0.62, v: 0.49,
    phy: 'The closet opens; the gift is in Bob’s hands; the wrapping is visible.',
    ment: 'Bob’s uncertainty resolves, but Alice’s goal (keep the surprise) is destroyed. Her own successor state contradicts her prior intention.'
  },
  {
    l: 'B', t: 'Say nothing and keep watching him search.',
    mc: 0.46, pp: 0.93, sa: 0.74, v: 0.66,
    phy: 'Bob keeps sweeping the living room and moves closer to the closet.',
    ment: 'Bob stays ignorant, but the risk of him opening the closet rises. Alice’s goal is preserved only by luck, not by her action.'
  },
  {
    l: 'C', t: 'Say “Maybe check the kitchen” and point toward the kitchen.',
    mc: 0.93, pp: 0.95, sa: 0.89, v: 0.92, sel: true,
    phy: 'Alice’s utterance becomes audible and her gesture visible; Bob walks to the kitchen; the gift stays in the closet.',
    ment: 'Bob adopts a new (false) belief about the gift’s location. Alice believes the surprise is safe. Both updates follow from the physical event that actually occurred.'
  },
  {
    l: 'D', t: 'Tell Bob there is no gift this year.',
    mc: 0.36, pp: 0.94, sa: 0.41, v: 0.54,
    phy: 'The utterance is audible; Bob stops searching.',
    ment: 'Protects the location but injects a belief Alice must later retract; disappointment and a trust cost enter Bob’s state.'
  },
  {
    l: 'E', t: 'Block the closet doorway and push Bob back.',
    mc: 0.52, pp: 0.71, sa: 0.08, v: 0.00, veto: true,
    phy: 'Physical contact between Alice and Bob near the closet door.',
    ment: 'Reveals that the closet matters, and violates a basic interpersonal safety norm, so the branch is vetoed regardless of its other scores.'
  },
  {
    l: 'F', t: 'Ask Bob to stop searching and leave the room.',
    mc: 0.41, pp: 0.92, sa: 0.55, v: 0.59,
    phy: 'The request is audible; Bob may or may not comply.',
    ment: 'A bare prohibition marks the room as significant; Bob’s suspicion about this room increases.'
  }
];

const STAGES = [
  {
    n: 1, t: 'State parsing', d: 'raw scene → joint state', sym: '\\hat{s}_t',
    module: 'StateParser', head: 'State parsing',
    sub: 'The perceptual entry point. It does not summarise the story; it fills the state schema: entities, attributes, relations and environment on the physical side; beliefs, attention, goals, intentions, emotions, norms, relations and atmosphere on the mental side. Modality-aware: text is parsed directly, images combine visual evidence with caption narration, video is decoded into sampled key frames plus a transcribed audio track.',
    body: () =>
      art('a-phy', '\\hat{s}_t^phy', 'parsed physical state', kv([
        ['entities', 'Alice; Bob; wrapped gift; closet; sofa; living-room shelf'],
        ['attributes', 'gift: wrapped, small, inside the closet · closet: door shut · Bob: standing, scanning the shelf'],
        ['relations', 'gift <span class="mx">' + mx('\\in') + '</span> closet (containment, occluded) · Bob ≠ line-of-sight to gift'],
        ['environment', 'daytime; living room; quiet; uncluttered']
      ])) +
      art('a-ment', '\\hat{s}_t^ment', 'parsed mental state', kv([
        ['Alice · belief', 'the gift is in the closet; Bob has not seen it move'],
        ['Alice · goal', 'keep the surprise intact until the party'],
        ['Bob · belief', 'a gift exists somewhere in this room'],
        ['Bob · emotion', 'mild frustration; rising impatience'],
        ['relation', 'Alice–Bob: close, trusting'],
        ['atmosphere', 'playful, lightly conspiratorial']
      ])) +
      '<p class="pp-note">Every field is emitted as validated JSON, so a wrong answer can be traced back to a wrong field. The mental component is treated as a <em>hypothesis-bearing</em> state: parser error is a first-class failure mode, not something hidden behind final accuracy.</p>'
  },
  {
    n: 2, t: 'Observation generation', d: 'state → first-person view', sym: '\\hat{o}_t^eps',
    module: 'ObservationGenerator', head: 'Observation generation',
    sub: 'Partial observability, made explicit. The physical part is a target-specific projection of the physical state. The mental part is not the global mental state: it is the target’s own state plus perspective-limited inferences about others. This is where MWM differs from direct social reasoning: if the narrator gives a fact the target could not have, a direct-answer model can still exploit it; Mentis makes the access relation auditable.',
    body: () =>
      art('a-obs', '\\hat{o}_t^{eps,phy}', 'physical observation · target = Alice', kv([
        ['visible', 'Bob at the shelf; closet door shut; her own hands free'],
        ['audible', 'drawers opening; Bob muttering'],
        ['withheld', 'nothing: Alice hid the gift herself']
      ])) +
      art('a-ment', '\\hat{o}_t^{eps,ment}', 'mental observation · self + ToM', kv([
        ['self', 'I know where the gift is; I want the surprise to hold'],
        ['inferred about Bob', 'he does not know the location; he is searching without success'],
        ['not accessible', 'Bob’s exact next search target']
      ])) +
      '<p class="pp-note">Run the same stage with <b>Bob</b> as the target and the observation inverts: the closet contents drop out of his physical view entirely, and his mental readout contains a belief that is false in <span class="mx">' + mx('\\hat{s}_t') + '</span>. That asymmetry is the whole point of rendering an observation instead of reusing the state.</p>'
  },
  {
    n: 3, t: 'Action decomposition', d: 'option → carrier × meaning', sym: '\\hat{a}_{t,k}^eps',
    module: 'ActionParser', head: 'Action decomposition',
    sub: 'Each candidate option is parsed into a physical carrier (move, speak, hand, point, open, hide, wait) and a mental component (the intended cognitive-social effect: reassure, deceive, refuse, apologise, draw attention, save face). The split matters because the two have different causal roles downstream: the physical transition is constrained by the carrier, the mental transition by both the carrier and the meaning others attribute to it.',
    body: () =>
      art('a-act', '\\hat{a}_{t,C}', 'option C, decomposed', kv([
        ['carrier', 'speech act + deictic gesture toward the kitchen'],
        ['meaning', 'redirect attention; protect the surprise without lying about its existence'],
        ['addressee', 'Bob'],
        ['cost', 'low; reversible, no physical contact']
      ])) +
      art('a-act', '\\hat{a}_{t,E}', 'option E, decomposed', kv([
        ['carrier', 'body blocking + physical contact'],
        ['meaning', 'prohibit access'],
        ['flag', '<b style="color:var(--red)">safety-relevant carrier</b>, forwarded to the evaluator']
      ])) +
      '<p class="pp-note">Same meaning, different carriers: “redirect attention” could also be realised by walking to the kitchen without speaking. Same carrier, different meanings: pointing can redirect, accuse, or invite. Only the pair determines the mental transition.</p>'
  },
  {
    n: 4, t: 'Branch simulation', d: 'K coupled transitions, in parallel', sym: '\\hat{s}_{t+1}^k',
    module: 'WorldStateTransitor', head: 'Coupled branch simulation',
    sub: 'For every candidate action the world model predicts a successor state: physical first, then mental conditioned on the physical outcome. Agents revise beliefs, emotions, trust and obligation in response to the perceptible event that actually occurred, so the coupling direction is not cosmetic. The K branches run in parallel; a parallel (decoupled) mode is retained only as an ablation.',
    body: () =>
      art('a-phy', '\\hat{s}_{t+1}^{C,phy}', 'physical transition · branch C', kv([
        ['event', 'utterance becomes audible; arm extends toward the kitchen doorway'],
        ['objects', 'gift unchanged, still occluded inside the closet'],
        ['agents', 'Bob turns, walks out of the living room'],
        ['visibility', 'closet remains unopened; no new line of sight to the gift']
      ])) +
      art('a-ment', '\\hat{s}_{t+1}^{C,ment}', 'mental transition · conditioned on the above', kv([
        ['Bob · belief', 'the gift may be in the kitchen &nbsp;<em>(false, and caused by the utterance)</em>'],
        ['Bob · emotion', 'renewed hope; frustration drops'],
        ['Alice · belief', 'Bob is searching the wrong room; the surprise holds'],
        ['relation', 'unchanged; the act reads as playful, not deceptive'],
        ['atmosphere', 'still playful']
      ])) +
      '<p class="pp-note">Ablating this coupling (A3, generate both transitions independently) costs <b>6.4 F1</b> on average: the successor mental state has to be conditioned on what actually became perceptible.</p>'
  },
  {
    n: 5, t: 'Value evaluation', d: 'three criteria + a safety veto', sym: 'V_\\psi',
    module: 'Evaluator', head: 'Value evaluation',
    sub: 'The evaluator never sees the question alone. For each branch it receives the current state, the target observation, the decomposed action and the simulated successor state, and scores three normalised criteria (mental consistency, physical plausibility, social appropriateness) plus a binary safety/legality veto that zeroes the branch. Click a branch to open its simulated successor state.',
    body: () => `<div class="opts">${OPTIONS.map((o) => `
      <button class="opt${o.sel ? ' is-sel' : ''}${o.veto ? ' veto' : ''}" data-l="${o.l}">
        <span class="o-l">${o.l}</span>
        <span class="o-t">${o.t}</span>
        <span class="o-v">${o.veto ? 'veto' : o.v.toFixed(2)}<span class="o-bar"><i style="--v:${o.veto ? 0 : o.v}"></i></span></span>
        <span class="o-detail"><div><div class="o-in">
          <div class="o-mini"><b>simulated physical successor</b><p>${o.phy}</p></div>
          <div class="o-mini"><b>simulated mental successor</b><p>${o.ment}</p></div>
          <div class="o-scores">
            <span class="o-sc mc">mental consistency <b>${o.mc.toFixed(2)}</b></span>
            <span class="o-sc pp">physical plausibility <b>${o.pp.toFixed(2)}</b></span>
            <span class="o-sc sa">social appropriateness <b>${o.sa.toFixed(2)}</b></span>
            ${o.veto ? '<span class="o-sc vt">safety veto → value 0</span>' : ''}
          </div>
        </div></div></span>
      </button>`).join('')}</div>
      <p class="pp-note">A branch can be physically plausible but mentally inconsistent (A: she <em>could</em> hand over the gift, she would not), or mentally consistent but socially inappropriate (E). Separating the two is what makes the failure legible.</p>`
  },
  {
    n: 6, t: 'Decision', d: 'deterministic argmax + trace', sym: 'k^*',
    module: 'Decision', head: 'Deterministic decision',
    sub: 'Selection is kept outside the language model so it is reproducible: highest value after the veto, ties broken by a fixed cascade (comparative rank, then per-dimension scores, then a seeded fallback). The raw outputs, parsed score objects, normalised values and the trace are all persisted with the run.',
    body: () =>
      art('a-act', 'k^*', 'decision trace', kv([
        ['selected', '<b>C</b>: “Maybe check the kitchen”, with a gesture'],
        ['value', '0.92 · margin over runner-up (B) 0.26'],
        ['vetoed', 'E (interpersonal safety)'],
        ['why not B', 'preserves the goal by inaction; the successor mental state leaves Bob’s search converging on the closet'],
        ['artifacts', 'state.json · observation.json · actions.json · branches/*.json · scores.json · decision.json']
      ])) +
      '<p class="pp-note">Because every stage wrote its artifact, the ladder, the ablations and the gold-artifact oracles in the next section are all read off the same run directory, with no separate instrumentation.</p>'
  }
];

export function initPipeline() {
  const rail = document.getElementById('pipeRail');
  const panel = document.getElementById('pipePanel');
  if (!rail || !panel) return;

  rail.innerHTML = STAGES.map((s, i) => `
    <button class="pstep${i === 0 ? ' is-on' : ''}" data-i="${i}">
      <span class="ps-n">${s.n}</span>
      <span class="ps-tx">
        <span class="ps-t">${s.t}<span class="ps-sym">${mx(s.sym)}</span></span>
        <span class="ps-d">${s.d}</span>
      </span>
    </button>`).join('');

  function show(i) {
    const s = STAGES[i];
    rail.querySelectorAll('.pstep').forEach((b, j) => b.classList.toggle('is-on', i === j));
    panel.innerHTML = `
      <div class="pp-head">
        <div class="pp-k">stage ${s.n} of 6 · ${s.module}</div>
        <h3 class="pp-h">${s.head}</h3>
        <p class="pp-sub">${s.sub}</p>
      </div>
      <div class="pp-body">${s.body()}</div>`;

    panel.querySelectorAll('.opt').forEach((b) => {
      b.addEventListener('click', () => {
        const on = b.classList.contains('is-open');
        panel.querySelectorAll('.opt').forEach((x) => x.classList.remove('is-open'));
        b.classList.toggle('is-open', !on);
      });
    });
  }

  rail.querySelectorAll('.pstep').forEach((b) => b.addEventListener('click', () => show(+b.dataset.i)));
  show(0);
}
