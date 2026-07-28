/* Results, re-drawn. Every number below is transcribed from the paper's
   tables (necessity ladder, oracle interventions, scenario study, modality
   analysis). Nothing is smoothed, rounded or invented; the charts are a
   rendering of the tables, and each mark can be clicked for its reading. */

/* ══════════════════════ data ══════════════════════ */

const MODELS = [
  { k: 'avg', n: 'Avg', c: '#191C24', avg: true },
  { k: 'g56', n: 'gpt-5.6-sol', c: '#1E4374', fam: 'OpenAI' },
  { k: 'g55', n: 'gpt-5.5', c: '#2F6DAE', fam: 'OpenAI' },
  { k: 'g54', n: 'gpt-5.4', c: '#4E8FCC', fam: 'OpenAI' },
  { k: 'g54m', n: 'gpt-5.4-mini', c: '#79ADDC', fam: 'OpenAI' },
  { k: 'g41', n: 'gpt-4.1', c: '#A3C6E7', fam: 'OpenAI' },
  { k: 'cf5', n: 'claude-fable-5', c: '#4A2E85', fam: 'Anthropic' },
  { k: 'co48', n: 'claude-opus-4-8', c: '#7A55C4', fam: 'Anthropic' },
  { k: 'ch45', n: 'claude-haiku-4-5', c: '#A98BE8', fam: 'Anthropic' }
];

const HUMAN = 98.5;

/* Table 3 · necessity ladder, final-action F1 (%) on all 448 records */
const LADDER = {
  avg:  [31.3, 63.3, 74.6, 77.9, 80.3, 82.6, 87.9],
  g56:  [33.2, 69.6, 79.2, 83.6, 84.0, 87.5, 90.7],
  g55:  [32.0, 65.4, 77.7, 79.5, 82.2, 83.8, 90.1],
  g54:  [31.4, 63.5, 74.8, 76.9, 80.7, 83.0, 87.1],
  g54m: [29.9, 59.8, 71.2, 74.4, 78.2, 79.6, 85.3],
  g41:  [29.7, 56.9, 68.0, 73.2, 76.0, 77.0, 84.9],
  cf5:  [32.9, 68.0, 77.4, 80.7, 84.1, 84.9, 90.1],
  co48: [31.2, 62.9, 75.6, 79.4, 80.1, 85.1, 88.9],
  ch45: [30.1, 60.3, 72.9, 75.5, 77.1, 79.9, 86.1]
};

const ABL = {
  avg:  [75.8, 71.4, 81.5],
  g56:  [80.1, 78.0, 85.3],
  g55:  [78.2, 74.3, 84.1],
  g54:  [75.5, 70.7, 82.9],
  g54m: [72.3, 66.8, 79.0],
  g41:  [68.6, 65.4, 76.1],
  cf5:  [79.6, 75.2, 83.2],
  co48: [77.1, 72.3, 81.5],
  ch45: [75.0, 68.5, 79.9]
};

const RUNGS = [
  { id: 'S0', t: 'options-only floor', d: 'no story at all' },
  { id: 'S1', t: 'direct answer', d: 'story + question + options' },
  { id: 'S2', t: '+ chain-of-thought', d: 'free-form reasoning first' },
  { id: 'S3', t: '+ self-consistency', d: 'six samples, majority vote' },
  { id: 'S4', t: '+ free-text state', d: 'unstructured world-state note' },
  { id: 'S5', t: '+ structured state', d: 'typed physical–mental state' },
  { id: 'S6', t: 'full MWM', d: 'observation · simulation · valuation' }
];

const RUNG_READ = [
  {
    h: 'The floor is low, and flat.',
    p: [
      'With the story removed entirely, the eight models land inside <span class="num">29.7–33.2</span>, about 32 points below S1 and essentially independent of model capability.',
      'It sits above random guessing (<span class="num">1/6 ≈ 16.7</span>) only because some distractors are semantically less plausible next actions.',
      '<span class="claim">A stronger model extracts nothing more from the options alone: everything measured above this line is story understanding.</span>'
    ]
  },
  {
    h: 'Reading the story: the single largest jump.',
    p: [
      'Giving the model the story, the question and the options moves the average from 31.3 to <span class="num">63.3</span>, a gain of <span class="num">+32.0</span>, the biggest increment on the whole ladder.',
      'This is the level most systems are deployed at today: one forward pass, no explicit reasoning, no state.',
      'Everything after this rung is the question the paper actually asks: how much is left on the table.'
    ]
  },
  {
    h: 'Explicit reasoning buys a lot, but only once.',
    p: [
      'Free-form reasoning before answering adds <span class="num">+11.3</span> to reach <span class="num">74.6</span>. The second-largest increment, and the last cheap one.',
      'This is standard chain-of-thought; the ladder deliberately embeds the familiar test-time reasoning baselines so that later rungs cannot be dismissed as "prompting in general".'
    ]
  },
  {
    h: 'More compute is not the answer.',
    p: [
      'Six sampled chains with a majority vote add only <span class="num">+3.3</span> (to <span class="num">77.9</span>) and still trail full MWM by <span class="num">10.0</span>.',
      'The comparison that settles it: S6 with the <em>weakest</em> model (gpt-4.1, <span class="num">84.9</span>) beats S3 with the <em>strongest</em> (gpt-5.6-sol, <span class="num">83.6</span>).',
      '<span class="claim">World-model-style simulation provides gains that direct answering cannot reach by sampling more.</span>'
    ]
  },
  {
    h: 'Writing the state down already helps.',
    p: [
      'An unformatted world-state note before answering reaches <span class="num">80.3</span>, already above six-sample self-consistency, at a fraction of the compute.',
      'No simulation is involved yet. The gain comes purely from committing to what the scene <em>is</em> before deciding what happens next.'
    ]
  },
  {
    h: 'Typing the state adds more.',
    p: [
      'Casting the note into the physical–mental schema (objects, characters, relations, environment; beliefs, goals, affect, norms) reaches <span class="num">82.6</span>.',
      'Still no simulation. The structure itself is worth <span class="num">+2.3</span> over free text.'
    ]
  },
  {
    h: 'The full loop: best for every model.',
    p: [
      'Observation rendering, per-option branch simulation and value evaluation add <span class="num">+5.3</span> (the largest of the modeling increments), for an average of <span class="num">87.9</span>.',
      'S6 is the best configuration for <span class="num">all eight</span> world models, in both families.',
      'Humans reach <span class="num">98.5</span> under the identical protocol, so the task is nearly unambiguous; the remaining <span class="num">7.8</span> points are a modeling shortfall, not item noise.',
      '<span class="claim claim-key">Every added commitment of mental world modeling improves target-action prediction, and the full MWM pipeline is the best configuration for all world models.</span>'
    ]
  }
];

const ABL_ROWS = [
  { id: 'S6', t: 'full MWM', v: 87.9, d: null, ref: true, key: null, c: '#C0912F' },
  { id: 'A3', t: 'decoupled transition', v: 81.5, d: -6.4, key: 2, c: '#1F8A86' },
  { id: 'A1', t: '− mental channel', v: 75.8, d: -12.1, key: 0, c: '#6F4BB7' },
  { id: 'A2', t: '− physical channel', v: 71.4, d: -16.5, key: 1, c: '#2F6DAE' }
];

const ABL_READ = {
  S6: {
    h: 'Both channels, jointly transitioned.',
    p: [
      'The reference configuration: typed physical <em>and</em> mental state, target observation, per-option branch simulation with the mental transition conditioned on the physical one.',
      'Average <span class="num">87.9</span>. Every ablation below removes exactly one of these commitments.',
      'The ordering <span class="num">S6 &gt; A3 &gt; A1 &gt; A2</span> holds for <em>all eight</em> models: the losses are structural, not noise.'
    ]
  },
  A3: {
    h: 'Coupling is worth 6.4 points.',
    p: [
      'A3 keeps both channels but predicts the physical and mental transitions <em>independently</em>, with no conditioning of the mental successor on the physical one.',
      'Cost: <span class="num">−6.4</span> (to <span class="num">81.5</span>). The cheapest ablation, and still the third-largest effect on the page.',
      '<span class="claim">The joint physical–mental transition outperforms modeling the two channels separately.</span>'
    ]
  },
  A1: {
    h: 'Deleting the mind costs 12.1.',
    p: [
      'A1 removes mental state and mental observation, leaving a competent <em>physical</em> world model: objects, characters, relations, environment, and their transitions.',
      'Cost: <span class="num">−12.1</span> (to <span class="num">75.8</span>).',
      '<span class="claim claim-key">This is the core-claim ablation: physical modeling alone is insufficient, and mental state is necessary.</span>'
    ]
  },
  A2: {
    h: 'Deleting the world costs 16.5, even more.',
    p: [
      'A2 removes physical state and physical observation, leaving mental reasoning with no scene to stand on.',
      'Cost: <span class="num">−16.5</span> (to <span class="num">71.4</span>), the largest single loss.',
      '<span class="claim claim-key">Mental reasoning degrades without physical grounding. MWM is not "theory of mind bolted on"; the two channels hold each other up.</span>'
    ]
  }
};

/* Table 4 · oracle interventions, gpt-5.6-sol, base S6 = 90.7, human 98.5 */
const ORACLE = [
  { id: 'O3', t: 'gold action', s: 'skip decomposition', f: 91.4, d: 0.7, g: 7.1, kind: 'single' },
  { id: 'O2', t: 'gold observation', s: 'what the target can perceive', f: 92.4, d: 1.7, g: 6.1, kind: 'single' },
  { id: 'O1', t: 'gold state', s: 'the parsed world state', f: 93.5, d: 2.8, g: 5.0, kind: 'single' },
  { id: 'O4', t: 'gold transition', s: 'the simulated successors', f: 94.2, d: 3.5, g: 4.3, kind: 'single', best: true },
  { id: 'O1+O2', t: 'state + observation', s: '', f: 94.6, d: 3.9, g: 3.9, kind: 'combo' },
  { id: 'O2+O4', t: 'observation + transition', s: '', f: 95.3, d: 4.6, g: 3.2, kind: 'combo' },
  { id: 'O1+O4', t: 'state + transition', s: '', f: 95.8, d: 5.1, g: 2.7, kind: 'combo' },
  { id: 'O1+O2+O4', t: 'state + obs. + transition', s: '', f: 96.5, d: 5.8, g: 2.0, kind: 'combo' },
  { id: 'O1–O4', t: 'all four stages', s: '', f: 97.0, d: 6.3, g: 1.5, kind: 'combo', best: true }
];

const ORACLE_READ = {
  base: {
    h: 'The baseline, and the gap being localized.',
    p: [
      'Fully predictive S6 on gpt-5.6-sol scores <span class="num">90.7</span>. Humans score <span class="num">98.5</span> under the same protocol.',
      'Each bar below replaces <em>one</em> predicted artifact with its gold annotation and re-runs everything else predictively. The bar length is the fraction of that <span class="num">7.8</span>-point gap the substitution recovers.',
      'Click any bar for what its stage contributes.'
    ]
  },
  O3: {
    h: 'Action decomposition is not the problem.',
    p: [
      'Handing the pipeline the gold action (skipping decomposition entirely, using the option text verbatim) gains only <span class="num">+0.7</span>.',
      'The option text is already usable as given; almost no error is contributed here.'
    ]
  },
  O2: {
    h: 'Observation rendering: a modest 1.7.',
    p: [
      'Replacing the rendered target observation with the gold annotation gains <span class="num">+1.7</span> (to <span class="num">92.4</span>).',
      'Deciding what the target can see and infer is genuinely lossy, but it is not where most of the error lives.'
    ]
  },
  O1: {
    h: 'State parsing: 2.8, and it propagates.',
    p: [
      'Gold state gains <span class="num">+2.8</span> (to <span class="num">93.5</span>), the second largest single effect.',
      'Note that an upstream state error also produces a downstream transition error, so part of this gain is double-counted by O4. That is exactly why the single gains sum to more than the combination.'
    ]
  },
  O4: {
    h: 'The bottleneck: simulating the change.',
    p: [
      'Gold successor states gain <span class="num">+3.5</span> (to <span class="num">94.2</span>), the largest single intervention, recovering <span class="num">45%</span> of the human gap on its own.',
      'Every combination containing O4 outperforms every combination without it.',
      '<span class="claim">What limits current MWM is simulating how the coupled world changes, not representing what it currently is. Improvements should target the transition model first.</span>'
    ]
  },
  'O1+O2': {
    h: 'State + observation: 3.9.',
    p: [
      'Two gold artifacts, <span class="num">94.6</span>. Less than the sum of their single gains (2.8 + 1.7 = 4.5), because the two error sources overlap.',
      'Still short of O4 combinations: representing the present correctly does not by itself fix the future.'
    ]
  },
  'O2+O4': {
    h: 'Observation + transition: 4.6.',
    p: [
      'Reaches <span class="num">95.3</span>, gap to human <span class="num">3.2</span>.',
      'Every pairing that contains the transition oracle beats every pairing that does not, consistent with the single-oracle ranking.'
    ]
  },
  'O1+O4': {
    h: 'State + transition: 5.1, the best pair.',
    p: [
      'The two stages that carry the coupled world forward. Together they reach <span class="num">95.8</span>, leaving a gap of <span class="num">2.7</span>.',
      'Their single gains sum to 6.3; jointly they deliver 5.1. The overlap is the shared error: a mis-parsed state <em>is</em> a wrong simulated consequence.'
    ]
  },
  'O1+O2+O4': {
    h: 'Everything but action: 5.8.',
    p: [
      '<span class="num">96.5</span>, gap <span class="num">2.0</span>. Adding the action oracle on top of this buys the final 0.5.',
      'Action decomposition is confirmed as the least lossy stage from both directions.'
    ]
  },
  'O1–O4': {
    h: 'All four gold: 97.0. The residual is 1.5.',
    p: [
      'Of the <span class="num">7.8</span>-point human gap, <span class="num">6.3</span> points (<span class="num">81%</span>) are prediction errors in the intermediate stages, chiefly transition simulation and state parsing.',
      'The remaining <span class="num">1.5</span> points (19%) sit in value evaluation, the decision rule, or residual item difficulty.',
      'The four single gains sum to <span class="num">+8.7</span>; all four together give <span class="num">+6.3</span>. <span class="claim">The combined gain, not the sum of single gains, is the correct estimate of the recoverable error.</span>'
    ]
  }
};

/* Table 5 · scenario study, gpt-5.6-sol */
const SCEN = {
  cat: {
    lab: 'scene category',
    cols: [
      { id: 'Interpersonal', sh: '47.5%' },
      { id: 'Object / resource', sh: '28.1%' },
      { id: 'Spatial / perceptual', sh: '12.9%' },
      { id: 'Risk / norm', sh: '11.4%' }
    ],
    rows: {
      S1: [66.5, 74.0, 71.0, 70.0],
      S2: [79.8, 79.0, 78.2, 78.0],
      S3: [85.2, 82.2, 82.0, 82.3],
      S6: [92.9, 88.0, 89.5, 89.7]
    },
    gain: [26.4, 14.0, 18.5, 19.7]
  },
  dom: {
    lab: 'domain',
    cols: [
      { id: 'Residential', sh: '52.0%' },
      { id: 'Public outdoor', sh: '14.7%' },
      { id: 'Commercial', sh: '12.1%' },
      { id: 'Institutional', sh: '11.6%' },
      { id: 'Workplace', sh: '9.6%' }
    ],
    rows: {
      S1: [69.3, 70.6, 68.7, 71.0, 69.0],
      S2: [79.5, 78.4, 80.1, 79.0, 77.8],
      S3: [83.4, 84.8, 82.9, 84.1, 83.2],
      S6: [90.8, 89.9, 91.5, 90.1, 91.0]
    },
    gain: [21.5, 19.3, 22.8, 19.1, 22.0]
  }
};

const SCEN_SERIES = [
  { k: 'S1', n: 'S1 direct', c: '#C9BFA8' },
  { k: 'S2', n: 'S2 +CoT', c: '#9FB6CE' },
  { k: 'S3', n: 'S3 +SC@6', c: '#5C8CBE' },
  { k: 'S6', n: 'S6 full MWM', c: '#1E4374' }
];

const SCEN_READ = {
  Interpersonal: {
    h: 'Where hidden mental variables decide.',
    p: [
      'The weakest category for direct answering (<span class="num">66.5</span>, below S1\'s overall 69.6) and the strongest for full MWM (<span class="num">92.9</span>), the largest gain on the page at <span class="num">+26.4</span>.',
      '<span class="claim claim-key">The benefit of mental world modeling is largest exactly where hidden mental variables govern the decision.</span>'
    ]
  },
  'Object / resource': {
    h: 'The smallest gain, and that is the point.',
    p: [
      'Highest S1 score of any category (<span class="num">74.0</span>) and the smallest gain (<span class="num">+14.0</span>).',
      'These decisions lean on commonsense affordances that direct answering already captures. Where minds matter less, MWM buys less.'
    ]
  },
  'Spatial / perceptual': {
    h: 'Perspective, not commonsense.',
    p: [
      'S1 <span class="num">71.0</span> → S6 <span class="num">89.5</span>, a gain of <span class="num">+18.5</span>.',
      'Who can see what is exactly the observation operator\'s job: the gap between world state and target view is the mechanism being tested.'
    ]
  },
  'Risk / norm': {
    h: 'Norms are mental state.',
    p: [
      'S1 <span class="num">70.0</span> → S6 <span class="num">89.7</span>, gain <span class="num">+19.7</span>.',
      'Rules, obligations and prohibitions live in the mental channel of the schema, not in the physical scene.'
    ]
  },
  Residential: {
    h: 'The largest slice, an ordinary gain.',
    p: ['52.0% of the data. S1 <span class="num">69.3</span> → S6 <span class="num">90.8</span>, <span class="num">+21.5</span>, squarely inside the 19.1–22.8 domain band.']
  },
  'Public outdoor': { h: 'Outdoors, same story.', p: ['S1 <span class="num">70.6</span> → S6 <span class="num">89.9</span>, <span class="num">+19.3</span>.'] },
  Commercial: { h: 'Highest domain gain, by 1.3 points.', p: ['S1 <span class="num">68.7</span> → S6 <span class="num">91.5</span>, <span class="num">+22.8</span>. The top of a very narrow band; not a spike.'] },
  Institutional: { h: 'Lowest domain gain, by 0.2 points.', p: ['S1 <span class="num">71.0</span> → S6 <span class="num">90.1</span>, <span class="num">+19.1</span>. The bottom of the same narrow band.'] },
  Workplace: { h: 'Smallest slice, ordinary gain.', p: ['9.6% of the data. S1 <span class="num">69.0</span> → S6 <span class="num">91.0</span>, <span class="num">+22.0</span>.'] }
};

/* Tables 6 & 7 · modality slices and channel interventions, gpt-5.6-sol */
const MODAL = {
  mod: {
    lab: 'story modality',
    cols: [{ id: 'All', sh: 'n=448' }, { id: 'Text', sh: 'n=320' }, { id: 'Image', sh: 'n=100' }, { id: 'Video', sh: 'n=28' }],
    rows: { S1: [69.6, 70.8, 67.0, 64.8], S3: [83.6, 84.0, 82.8, 82.2], S5: [87.5, 87.6, 87.2, 87.3], S6: [90.7, 90.5, 91.2, 90.9] },
    gain: [21.1, 19.7, 24.2, 26.1]
  },
  chan: {
    lab: 'channel intervention',
    cols: [
      { id: 'Image · original', sh: 'n=100' }, { id: 'Image → caption', sh: 'n=100' },
      { id: 'Video · full', sh: 'n=28' }, { id: 'Video · −audio', sh: 'n=28' },
      { id: '−audio + shuffled', sh: 'n=28' }, { id: 'Audio only', sh: 'n=28' }
    ],
    rows: {
      S1: [67.0, 64.2, 64.8, 62.1, 60.8, 52.0],
      S3: [82.8, 78.5, 82.2, 78.4, 75.9, 65.6],
      S5: [87.2, 82.0, 87.3, 82.5, 79.4, 69.7],
      S6: [91.2, 84.8, 90.9, 84.8, 80.7, 72.1]
    },
    gain: null
  }
};

const MODAL_SERIES = [
  { k: 'S1', n: 'S1 direct', c: '#C9BFA8' },
  { k: 'S3', n: 'S3 +SC@6', c: '#9C86CE' },
  { k: 'S5', n: 'S5 structured state', c: '#6F4BB7' },
  { k: 'S6', n: 'S6 full MWM', c: '#4A2E85' }
];

const MODAL_READ = {
  All: {
    h: 'The whole benchmark, for reference.',
    p: ['S1 <span class="num">69.6</span> → S6 <span class="num">90.7</span>, <span class="num">+21.1</span>. The slices below split this same set by input medium.']
  },
  Text: {
    h: 'Text is the easy case for direct answering.',
    p: ['Direct answering is highest here (<span class="num">70.8</span>) and the gain is therefore smallest (<span class="num">+19.7</span>).']
  },
  Image: {
    h: 'Image: direct answering drops, MWM does not.',
    p: [
      'S1 falls to <span class="num">67.0</span> while S6 <em>rises</em> to <span class="num">91.2</span> (the largest S6 score of any slice), for a gain of <span class="num">+24.2</span>.',
      'The gap already closes at S5, before any simulation: once the story is parsed into the typed state, the downstream stages stop depending on the input medium.'
    ]
  },
  Video: {
    h: 'Video: the biggest gain on the page.',
    p: [
      'Direct answering is weakest here (<span class="num">64.8</span>); full MWM reaches <span class="num">90.9</span>. Gain <span class="num">+26.1</span>.',
      'The text–video gap shrinks <span class="num">6.0 → 1.8 → 0.3</span> across S1, S3, S5 and is gone under S6.',
      '<span class="claim claim-key">The advantage of mental world modeling is modality-general: the structured state converts text, visual and audio evidence into a common format, and the media penalty of direct answering disappears.</span>'
    ]
  },
  'Image · original': { h: 'Image records, untouched.', p: ['The reference column for the caption intervention on its right: S1 <span class="num">67.0</span>, S6 <span class="num">91.2</span>.'] },
  'Image → caption': {
    h: 'Replace the picture with a neutral caption.',
    p: [
      'Every system loses, and the loss <em>grows</em> with structure: S1 <span class="num">−2.8</span>, S3 <span class="num">−4.3</span>, S5 <span class="num">−5.2</span>, S6 <span class="num">−6.4</span>.',
      'A system answering mainly from textual priors would barely notice. The structured pipeline uses more of the visual evidence than direct answering does.'
    ]
  },
  'Video · full': { h: 'Sounding video, all channels.', p: ['The reference for the three video interventions: S1 <span class="num">64.8</span>, S6 <span class="num">90.9</span>.'] },
  'Video · −audio': { h: 'Mute it: S6 loses 6.1.', p: ['S6 falls from 90.9 to <span class="num">84.8</span>; S1 loses only 2.7. Audio carries part of the evidence, and the structured pipeline was using it.'] },
  '−audio + shuffled': { h: 'Scramble the frame order: another 4.1.', p: ['S6 falls further to <span class="num">80.7</span>. Temporal order is real evidence, not decoration.'] },
  'Audio only': {
    h: 'Strip the picture: −18.8.',
    p: [
      'With only the soundtrack, S6 falls to <span class="num">72.1</span>, the largest single loss in the analysis.',
      'For S6 the ranking of evidence is visual stream (<span class="num">−18.8</span>), then audio (<span class="num">−6.1</span>), then frame order (<span class="num">−4.1</span>), consistent with the sounding-video design in which audio carries part but not all of the evidence.',
      'Given the subset sizes (100 image, 28 video) the absolute deltas are directional; the monotone pattern across systems is the stable result.'
    ]
  }
};

const TABLE_READ = {
  S0: ['Options-only floor', 'No story is shown at all. The band <span class="num">29.7–33.2</span> is flat across model capability: the records cannot be answered from the option set, which validates every score above.'],
  S1: ['Direct answer', 'Story, question and options in one forward pass, the level most deployed systems operate at. <span class="num">+32.0</span> over the floor, and <span class="num">24.6</span> below full MWM.'],
  S2: ['Chain-of-thought', 'Free-form reasoning before the answer: <span class="num">+11.3</span>. The last large increment available without representing the world.'],
  S3: ['Self-consistency @6', 'Six sampled chains, majority vote: <span class="num">+3.3</span>. S6 with the weakest model (84.9) still beats S3 with the strongest (83.6), so the gap is not a compute-budget artifact.'],
  S4: ['Free-text state', 'An unstructured world-state note. At <span class="num">80.3</span> it already exceeds six-sample self-consistency, and costs far less.'],
  S5: ['Structured state', 'The typed physical–mental schema, no simulation yet: <span class="num">82.6</span>. Structure alone is worth <span class="num">+2.3</span> over free text.'],
  S6: ['Full MWM · Mentis', 'Observation rendering, per-option branch simulation, value evaluation, deterministic decision: <span class="num">87.9</span> average and the best configuration for <em>all eight</em> models. <span class="claim">Every added commitment improves target-action prediction.</span>'],
  A1: ['− mental channel', 'S6 with mental state and mental observation removed, leaving a competent physical world model. Costs <span class="num">12.1</span> points. <span class="claim claim-key">Physical modeling alone is insufficient.</span>'],
  A2: ['− physical channel', 'S6 with physical state and observation removed. Costs <span class="num">16.5</span>, the largest ablation. Mental reasoning degrades without physical grounding.'],
  A3: ['Decoupled transition', 'Both channels kept, but their transitions predicted independently. Costs <span class="num">6.4</span>: the coupling itself carries information.'],
  HU: ['Human reference', 'Same protocol, same records: <span class="num">98.5</span>. The task is nearly unambiguous for people, so the best system\'s remaining <span class="num">7.8</span> points are a modeling shortfall, localized in panel B.']
};

const FINDINGS = [
  { n: 'the ladder', big: '+56.6', u: 'F1', p: 'Average final-action F1 rises from <b>31.3</b> at the options-only floor to <b>87.9</b> under full MWM, monotonically, at <em>every</em> rung. <b class="key">Every modeling commitment about minds pays.</b>' },
  { n: 'the mental channel', big: '−12.1', u: 'without minds', p: '<b class="key">Delete mental state and mental observation and a competent physical world model loses 12.1 F1.</b> Physical modeling alone is insufficient — this is the core-claim ablation, and the ordering <b>S6 &gt; A3 &gt; A1 &gt; A2</b> holds for all eight models.' },
  { n: 'the bottleneck', big: '+3.5', u: 'gold transition', p: 'The largest single oracle gain. Simulating how the coupled world <em>changes</em>, rather than representing what it currently <em>is</em>, is what limits MWM today.' }
];

const APPS = [
  {
    t: 'Embodied collaboration',
    tag: 'joint progress is physical and mental',
    p: 'A robot entering a kitchen, clinic room or shared office must decide whether a person has noticed it, whether an object is socially available, whether an interruption is acceptable, and whether an action will read as help or as pressure. A physical planner can represent that a door is open; an MWM can represent that Alice opened it <em>for</em> Bob, that Bob noticed, and that Bob now expects Alice to follow.',
    i: 'robot'
  },
  {
    t: 'Care, support and advising',
    tag: 'the failure is rarely factual',
    p: 'The same instruction can be heard as reassurance, blame, coercion or permission. Comprehension, trust, anxiety, obligation and dependency are exactly the variables a physical record cannot expose, yet they decide whether an intervention helps or harms. The strongest use is conservative: deciding when <em>not</em> to act autonomously.',
    i: 'care'
  },
  {
    t: 'Education and training',
    tag: 'interventions target the successor state',
    p: 'The same wrong answer may reflect a missing concept, a brittle heuristic, low confidence, inattention or frustration, and these call for different interventions. An explanation is an action with a linguistic carrier and a <em>mental transition target</em>: it updates knowledge, but also confidence, motivation and willingness to try the next step.',
    i: 'edu'
  },
  {
    t: 'Interactive agents and social worlds',
    tag: 'persistence requires mental transition',
    p: 'A digital character should remember promises, hide what it has not observed, react differently to friends and strangers, and hold a coherent emotional trajectory. Prompt-level personality creates local style but does not define a transition system. A world is convincing when beliefs, relationships and norms evolve legibly across counterfactual branches.',
    i: 'world'
  }
];

const APP_ICONS = {
  robot: '<circle cx="17" cy="12" r="7.4"/><path d="M17 19.4v4.2M8.6 23.6h16.8v7.2H8.6zM13 12.2h.02M21 12.2h.02"/>',
  care: '<path d="M17 29.5C10 24.6 5.5 20.8 5.5 15.8A6.3 6.3 0 0 1 17 12.2a6.3 6.3 0 0 1 11.5 3.6c0 5-4.5 8.8-11.5 13.7z"/>',
  edu: '<path d="M17 5.5 31 12l-14 6.5L3 12z"/><path d="M8 15v7.6c0 2.6 4 4.9 9 4.9s9-2.3 9-4.9V15"/>',
  world: '<circle cx="17" cy="17" r="11.5"/><path d="M5.5 17h23M17 5.5c3.2 3.3 4.8 7.2 4.8 11.5S20.2 25.2 17 28.5c-3.2-3.3-4.8-7.2-4.8-11.5S13.8 8.8 17 5.5z"/>'
};

/* ══════════════════════ small helpers ══════════════════════ */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svgWrap = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
const f1 = (v) => v.toFixed(1);
const sgn = (v) => (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1);

function read(el, k, h, ps) {
  if (!el) return;
  el.innerHTML = `<span class="cr-k">${k}</span><h4>${h}</h4>${ps.map((p) => `<p>${p}</p>`).join('')}`;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

/* one shared tooltip for every chart mark */
let tipEl = null;
function tip(html, x, y) {
  tipEl = tipEl || document.getElementById('tip');
  if (!tipEl) return;
  tipEl.innerHTML = html;
  tipEl.classList.add('on');
  tipEl.setAttribute('aria-hidden', 'false');
  const r = tipEl.getBoundingClientRect();
  const left = Math.min(Math.max(10, x - r.width / 2), window.innerWidth - r.width - 10);
  const top = y - r.height - 14 < 8 ? y + 20 : y - r.height - 14;
  tipEl.style.left = left + 'px';
  tipEl.style.top = top + 'px';
}
function untip() {
  if (tipEl) {
    tipEl.classList.remove('on');
    tipEl.setAttribute('aria-hidden', 'true');
  }
}

function hostFor(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('chart');
  return el;
}

/* a segmented switch used by the two slice charts */
function switcher(views, cur) {
  return `<div class="ch-switch">${views
    .map((v) => `<button class="chs${v.k === cur ? ' is-on' : ''}" data-view="${v.k}">${v.n}</button>`)
    .join('')}</div>`;
}

/* ══════════════════════ findings ══════════════════════ */

function initFindings() {
  const el = document.getElementById('findings');
  if (!el) return;
  el.innerHTML = FINDINGS.map(
    (f) => `<div class="fnd rv">
      <span class="fnd-n">${f.n}</span>
      <div class="fnd-big">${f.big}<i>${f.u}</i></div>
      <p>${f.p}</p>
    </div>`
  ).join('');
}

/* ══════════════════════ A · necessity ladder ══════════════════════ */

function initLadder() {
  const host = hostFor('ladderChart');
  const out = document.getElementById('ladderRead');
  if (!host) return;

  const W = 780, H = 352;
  const L = 44, R = 20, T = 28, B = 56;
  const lo = 25, hi = 100;
  const px = (i) => L + (i * (W - L - R)) / 6;
  const py = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);

  const off = new Set();
  let cur = 6;

  const grid = [];
  for (let v = 30; v <= 100; v += 10) {
    grid.push(`<line class="ax-grid" x1="${L}" y1="${py(v)}" x2="${W - R}" y2="${py(v)}"/>`);
    grid.push(`<text class="ax-t" x="${L - 9}" y="${py(v) + 3.5}" text-anchor="end">${v}</text>`);
  }

  const human = `
    <line class="hum-line" x1="${L}" y1="${py(HUMAN)}" x2="${W - R}" y2="${py(HUMAN)}"/>
    <text class="hum-t" x="${W - R}" y="${py(HUMAN) - 7}" text-anchor="end">human 98.5</text>`;

  const rungs = RUNGS.map((r, i) => {
    const w = (W - L - R) / 6;
    const x0 = px(i) - w / 2;
    /* the end labels are long enough to run off the viewBox, so they hug the edge instead of centring */
    const anc = i === 0 ? 'start' : i === 6 ? 'end' : 'middle';
    const lx = i === 0 ? 0 : i === 6 ? W : px(i);
    return `<g class="rung" data-i="${i}">
      <rect class="rung-hl" x="${x0}" y="${T - 6}" width="${w}" height="${H - T - B + 12}" rx="8"/>
      <text class="rung-t" x="${px(i)}" y="${H - B + 22}" text-anchor="middle">${r.id}</text>
      <text class="ax-t" x="${lx}" y="${H - B + 37}" text-anchor="${anc}">${esc(r.t)}</text>
      <rect class="hit" x="${x0}" y="${T - 6}" width="${w}" height="${H - T + 44}"/>
    </g>`;
  }).join('');

  function paint() {
    const lines = MODELS.map((m) => {
      if (off.has(m.k)) return '';
      const d = LADDER[m.k].map((v, i) => `${i ? 'L' : 'M'}${px(i)} ${py(v)}`).join(' ');
      return `<path class="ln${m.avg ? ' avg' : ''}" d="${d}" stroke="${m.c}" data-m="${m.k}"/>`;
    }).join('');

    const dots = off.has('avg')
      ? ''
      : LADDER.avg
          .map((v, i) => `<circle class="dotm" cx="${px(i)}" cy="${py(v)}" r="3.6"/>`)
          .join('') +
        LADDER.avg
          .map((v, i) => `<text class="vlab" x="${px(i)}" y="${py(v) - 11}" text-anchor="middle">${f1(v)}</text>`)
          .join('');

    host.querySelector('svg').innerHTML =
      grid.join('') +
      `<line class="ax-line" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/>` +
      human + rungs + lines + dots +
      `<text class="ax-lab" x="${L - 36}" y="${T - 12}">F1 %</text>`;
    wire();
    mark();
  }

  function mark() {
    host.querySelectorAll('.rung').forEach((g, i) => g.classList.toggle('on', i === cur));
  }

  function pick(i) {
    cur = i;
    mark();
    const r = RUNGS[i];
    const dl = i ? ` &nbsp;<span class="num">${sgn(LADDER.avg[i] - LADDER.avg[i - 1])}</span> over ${RUNGS[i - 1].id}` : '';
    const rd = RUNG_READ[i];
    read(out, `${r.id} · ${r.d}`, rd.h,
      [`<span class="big-n">${f1(LADDER.avg[i])}</span> avg F1${dl}`].concat(rd.p));
  }

  function wire() {
    host.querySelectorAll('.rung').forEach((g) => {
      const i = +g.dataset.i;
      g.querySelector('.hit').addEventListener('click', () => pick(i));
      g.querySelector('.hit').addEventListener('mousemove', (e) => {
        const rows = MODELS.filter((m) => !off.has(m.k))
          .map((m) => `<div style="display:flex;gap:10px;justify-content:space-between"><span>${m.n}</span><b>${f1(LADDER[m.k][i])}</b></div>`)
          .join('');
        tip(`<span class="t-k">${RUNGS[i].id} · ${esc(RUNGS[i].t)}</span>${rows}`, e.clientX, e.clientY);
      });
      g.querySelector('.hit').addEventListener('mouseleave', untip);
    });
  }

  host.innerHTML = svgWrap(W, H, '') +
    `<div class="legend">${MODELS.map(
      (m) => `<button class="lg${m.avg ? ' avg' : ''}" data-m="${m.k}"><i style="background:${m.c}"></i>${m.n}</button>`
    ).join('')}</div>` +
    `<p class="chart-note">Final-action F1 (%) on all 448 records · thin lines are the eight world models, the thick line their average · dashed gold is the human reference under the identical protocol</p>`;

  host.querySelectorAll('.lg').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.dataset.m;
      if (off.has(k)) off.delete(k); else off.add(k);
      b.classList.toggle('off', off.has(k));
      paint();
      mark();
    });
  });

  paint();
  pick(6);
}

/* ══════════════════════ A · ablations ══════════════════════ */

function initAbl() {
  const host = hostFor('ablChart');
  const out = document.getElementById('ablRead');
  if (!host) return;

  const W = 780, H = 232;
  const L = 168, R = 92, T = 26, B = 30;
  const bx = (v) => L + (v / 100) * (W - L - R);
  const bh = 26, gap = 16;

  const bars = ABL_ROWS.map((r, i) => {
    const y = T + i * (bh + gap);
    const dots = r.key === null
      ? MODELS.filter((m) => !m.avg).map((m) => `<circle class="pdot" cx="${bx(LADDER[m.k][6])}" cy="${y + bh / 2}" r="2.6"/>`).join('')
      : MODELS.filter((m) => !m.avg).map((m) => `<circle class="pdot" cx="${bx(ABL[m.k][r.key])}" cy="${y + bh / 2}" r="2.6"/>`).join('');
    return `<g class="bar" data-id="${r.id}">
      <text class="bar-l" x="${L - 12}" y="${y + bh / 2 + 4}" text-anchor="end">${r.id} · ${esc(r.t)}</text>
      <rect x="${L}" y="${y}" width="${bx(r.v) - L}" height="${bh}" rx="4" fill="${r.c}" opacity="${r.ref ? 1 : 0.82}"/>
      ${dots}
      <text class="bar-t" x="${bx(r.v) + 9}" y="${y + bh / 2 + 4}">${f1(r.v)}</text>
      ${r.d !== null ? `<text class="bar-d" x="${bx(r.v) + 48}" y="${y + bh / 2 + 4}">${sgn(r.d)}</text>` : ''}
      <rect class="hit" x="0" y="${y - gap / 2}" width="${W}" height="${bh + gap}"/>
    </g>`;
  }).join('');

  host.innerHTML = svgWrap(W, H,
    `<line class="ax-line" x1="${L}" y1="${T - 8}" x2="${L}" y2="${T + 4 * (bh + gap) - gap + 8}"/>` +
    bars +
    `<text class="ax-t" x="${L}" y="${H - 8}">0</text>` +
    `<text class="ax-t" x="${bx(100)}" y="${H - 8}" text-anchor="end">100 · F1 %</text>`
  ) + `<p class="chart-note">Averaged over the eight world models; small dots are the per-model values. The ordering <b>S6 &gt; A3 &gt; A1 &gt; A2</b> holds for every model individually.</p>`;

  function pick(id) {
    host.querySelectorAll('.bar').forEach((g) => g.classList.toggle('on', g.dataset.id === id));
    const r = ABL_ROWS.find((x) => x.id === id);
    const rd = ABL_READ[id];
    read(out, `${id} · ${r.d === null ? 'reference' : sgn(r.d) + ' vs. S6'}`, rd.h, rd.p);
  }

  host.querySelectorAll('.bar').forEach((g) => {
    g.querySelector('.hit').addEventListener('click', () => pick(g.dataset.id));
    g.querySelector('.hit').addEventListener('mousemove', (e) => {
      const r = ABL_ROWS.find((x) => x.id === g.dataset.id);
      const rows = MODELS.filter((m) => !m.avg)
        .map((m) => {
          const v = r.key === null ? LADDER[m.k][6] : ABL[m.k][r.key];
          return `<div style="display:flex;gap:10px;justify-content:space-between"><span>${m.n}</span><b>${f1(v)}</b></div>`;
        }).join('');
      tip(`<span class="t-k">${r.id} · ${esc(r.t)}</span>${rows}`, e.clientX, e.clientY);
    });
    g.querySelector('.hit').addEventListener('mouseleave', untip);
  });

  pick('A1');
}

/* ══════════════════════ B · oracle interventions ══════════════════════ */

function initOracle() {
  const host = hostFor('oracleChart');
  const out = document.getElementById('oracleRead');
  if (!host) return;

  const W = 780, H = 416;
  const L = 216, R = 22, T = 44;
  const GAP = 7.8, DOM = 9.2;
  const bx = (d) => L + (d / DOM) * (W - L - R);
  const bh = 20, gap = 12, band = 30;
  const rowY = (i) => T + i * (bh + gap) + (i >= 4 ? band : 0);

  const rows = ORACLE.map((o, i) => {
    const y = rowY(i);
    return `<g class="bar obar" data-id="${o.id}">
      <text class="bar-l" x="${L - 12}" y="${y + bh / 2 + 4}" text-anchor="end">${o.id} · ${esc(o.t)}</text>
      <rect class="otrack" x="${L}" y="${y}" width="${bx(GAP) - L}" height="${bh}" rx="4"/>
      <rect x="${L}" y="${y}" width="${bx(o.d) - L}" height="${bh}" rx="4"
            fill="${o.kind === 'single' ? (o.best ? '#C0912F' : '#5C8CBE') : '#4A2E85'}" opacity="${o.best ? 1 : 0.8}"/>
      <text class="bar-t" x="${bx(GAP) + 12}" y="${y + bh / 2 + 4}">${f1(o.f)}</text>
      <text class="bar-d" x="${bx(GAP) + 56}" y="${y + bh / 2 + 4}">${sgn(o.d)}</text>
      <rect class="hit" x="0" y="${y - gap / 2}" width="${W}" height="${bh + gap}"/>
    </g>`;
  }).join('');

  const sep = rowY(4) - band / 2 - gap / 2;
  const bot = rowY(8) + bh + 16;

  host.innerHTML = svgWrap(W, H,
    `<rect class="hit obase" x="0" y="0" width="${W}" height="${T - 10}"/>
     <text class="ax-lab" x="${L}" y="${T - 26}">S6 baseline 90.7 · the bar fills the 7.8-point gap to human</text>
     <line class="ax-line" x1="${L}" y1="${T - 14}" x2="${L}" y2="${bot}"/>
     <line class="hum-line" x1="${bx(GAP)}" y1="${T - 14}" x2="${bx(GAP)}" y2="${bot}"/>
     <text class="hum-t" x="${bx(GAP)}" y="${T - 20}" text-anchor="middle">human 98.5</text>
     <line class="sum-line" x1="${bx(8.7)}" y1="${T - 4}" x2="${bx(8.7)}" y2="${bot}"/>
     <text class="sum-t" x="${bx(8.7)}" y="${bot + 15}" text-anchor="end">Σ of the four single gains  +8.7</text>
     <line class="ax-grid" x1="${L}" y1="${sep}" x2="${W - R}" y2="${sep}"/>
     <text class="ax-t" x="${L - 12}" y="${sep - 7}" text-anchor="end">single</text>
     <text class="ax-t" x="${L - 12}" y="${sep + 16}" text-anchor="end">combined</text>` +
    rows
  ) + `<p class="chart-note">gpt-5.6-sol. Bar length is the gain over fully predictive S6; the full track is the 7.8-point human gap. The single gains sum to +8.7 but jointly deliver +6.3, because stage errors overlap.</p>`;

  function pick(id) {
    host.querySelectorAll('.obar').forEach((g) => g.classList.toggle('on', g.dataset.id === id));
    if (id === 'base') return read(out, 'S6 · 90.7 · gap 7.8', ORACLE_READ.base.h, ORACLE_READ.base.p);
    const o = ORACLE.find((x) => x.id === id);
    const rd = ORACLE_READ[id];
    read(out, `${o.id} · ${f1(o.f)} · ${sgn(o.d)} · gap ${f1(o.g)}`, rd.h, rd.p);
  }

  host.querySelectorAll('.obar').forEach((g) => {
    g.querySelector('.hit').addEventListener('click', () => pick(g.dataset.id));
    g.querySelector('.hit').addEventListener('mousemove', (e) => {
      const o = ORACLE.find((x) => x.id === g.dataset.id);
      tip(
        `<span class="t-k">${o.id}${o.s ? ' · ' + esc(o.s) : ''}</span>
         F1 <b>${f1(o.f)}</b> · gain <b>${sgn(o.d)}</b><br>recovers <b>${Math.round((o.d / GAP) * 100)}%</b> of the human gap · <b>${f1(o.g)}</b> left`,
        e.clientX, e.clientY
      );
    });
    g.querySelector('.hit').addEventListener('mouseleave', untip);
  });
  host.querySelector('.obase').addEventListener('click', () => {
    host.querySelectorAll('.obar').forEach((g) => g.classList.remove('on'));
    pick('base');
  });

  pick('O4');
}

/* ══════════════════════ C · grouped-bar slice charts ══════════════════════ */

/* the two slice charts share one readout, so only one may be lit at a time */
const sliceHosts = [];

function groupedChart({ host, out, data, series, views, kind, note, readMap, initial }) {
  if (!host) return;
  sliceHosts.push(host);
  let view = views[0].k;

  function draw() {
    const d = data[view];
    const n = d.cols.length;
    const W = 620, H = 330;
    const L = 40, R = 12, T = 26, B = 74;
    const pw = W - L - R;
    const gw = pw / n;
    const bw = Math.min(24, (gw - 16) / series.length);
    const py = (v) => T + ((100 - v) / 100) * (H - T - B);

    const grid = [];
    for (let v = 20; v <= 100; v += 20) {
      grid.push(`<line class="ax-grid" x1="${L}" y1="${py(v)}" x2="${W - R}" y2="${py(v)}"/>`);
      grid.push(`<text class="ax-t" x="${L - 7}" y="${py(v) + 3.5}" text-anchor="end">${v}</text>`);
    }

    const groups = d.cols.map((c, i) => {
      const cx = L + gw * i + gw / 2;
      const x0 = cx - (bw * series.length) / 2;
      const bars = series.map((s, j) => {
        const v = d.rows[s.k][i];
        return `<rect class="gb" x="${x0 + j * bw + 1}" y="${py(v)}" width="${bw - 2}" height="${H - B - py(v)}" rx="2.5" fill="${s.c}" data-s="${s.k}"/>`;
      }).join('');
      const top = Math.max(...series.map((s) => d.rows[s.k][i]));
      const g = d.gain
        ? `<text class="gain-t" x="${cx}" y="${py(top) - 9}" text-anchor="middle">+${d.gain[i].toFixed(1)}</text>`
        : '';
      const words = String(c.id).split(' ');
      const l1 = words.length > 2 ? words.slice(0, 2).join(' ') : c.id;
      const l2 = words.length > 2 ? words.slice(2).join(' ') : '';
      return `<g class="grp" data-id="${esc(c.id)}">
        <rect class="rung-hl" x="${L + gw * i + 1}" y="${T - 6}" width="${gw - 2}" height="${H - T - B + 10}" rx="7"/>
        ${bars}${g}
        <text class="grp-t" x="${cx}" y="${H - B + 19}" text-anchor="middle">${esc(l1)}</text>
        ${l2 ? `<text class="grp-t" x="${cx}" y="${H - B + 32}" text-anchor="middle">${esc(l2)}</text>` : ''}
        <text class="ax-t" x="${cx}" y="${H - B + (l2 ? 45 : 33)}" text-anchor="middle">${c.sh}</text>
        <rect class="hit" x="${L + gw * i}" y="${T - 6}" width="${gw}" height="${H - T - B + 60}"/>
      </g>`;
    }).join('');

    host.innerHTML =
      `<div class="ch-top"><span class="ch-lab">${kind}</span>${switcher(views, view)}</div>` +
      svgWrap(W, H, grid.join('') + `<line class="ax-line" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/>` + groups) +
      `<div class="legend">${series.map((s) => `<span class="lg static"><i style="background:${s.c};height:9px;width:9px;border-radius:2px"></i>${s.n}</span>`).join('')}</div>` +
      `<p class="chart-note">${note}${d.gain ? ' · the number above each group is the S6−S1 gain' : ''}</p>`;

    host.querySelectorAll('.chs').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.view === view) return;
        view = b.dataset.view;
        draw();
        pick(data[view].cols[0].id);
      })
    );
    host.querySelectorAll('.grp').forEach((g) => {
      const id = g.dataset.id;
      const i = d.cols.findIndex((c) => c.id === id);
      g.querySelector('.hit').addEventListener('click', () => pick(id));
      g.querySelector('.hit').addEventListener('mousemove', (e) => {
        const rows = series.map((s) => `<div style="display:flex;gap:12px;justify-content:space-between"><span>${s.n}</span><b>${f1(d.rows[s.k][i])}</b></div>`).join('');
        tip(`<span class="t-k">${esc(id)} · ${d.cols[i].sh}</span>${rows}`, e.clientX, e.clientY);
      });
      g.querySelector('.hit').addEventListener('mouseleave', untip);
    });

    host.querySelectorAll('.grp').forEach((g) => g.classList.toggle('on', g.dataset.id === (out.dataset.cur || '')));
  }

  function pick(id) {
    out.dataset.cur = id;
    sliceHosts.forEach((h) => h.querySelectorAll('.grp').forEach((g) => {
      g.classList.toggle('on', h === host && g.dataset.id === id);
    }));
    const rd = readMap[id];
    if (rd) read(out, `${kind} · ${esc(id)}`, rd.h, rd.p);
  }

  draw();
  if (initial) pick(initial);
}

function initSlices() {
  const sHost = hostFor('scenarioChart');
  const mHost = hostFor('modalityChart');
  const out = document.getElementById('sliceRead');
  if (!sHost || !mHost) return;

  groupedChart({
    host: sHost, out, data: SCEN, series: SCEN_SERIES,
    views: [{ k: 'cat', n: 'scene category' }, { k: 'dom', n: 'domain' }],
    kind: 'what the decision requires', readMap: SCEN_READ, initial: 'Interpersonal',
    note: 'gpt-5.6-sol, all 448 records · percentages are each slice\'s share of the data'
  });

  groupedChart({
    host: mHost, out, data: MODAL, series: MODAL_SERIES,
    views: [{ k: 'mod', n: 'modality' }, { k: 'chan', n: 'channel intervention' }],
    kind: 'what the story is made of', readMap: MODAL_READ, initial: null,
    note: 'gpt-5.6-sol · text, image and sounding-video records'
  });
}

/* ══════════════════════ D · the full table ══════════════════════ */

function initTable() {
  const t = document.getElementById('ladderTable');
  const out = document.getElementById('tableRead');
  if (!t) return;

  const cols = MODELS.filter((m) => !m.avg);
  const rows = [
    ...RUNGS.map((r, i) => ({ id: r.id, name: r.t, v: MODELS.map((m) => LADDER[m.k][i]), best: i === 6 })),
    ...['A1', 'A2', 'A3'].map((id, j) => ({
      id, name: { A1: '− mental', A2: '− physical', A3: 'decoupled transition' }[id],
      v: MODELS.map((m) => ABL[m.k][j]), abl: true, sep: j === 0
    })),
    { id: 'HU', name: 'human reference', v: MODELS.map(() => HUMAN), human: true, sep: true }
  ];

  const head = `<thead>
    <tr><th></th><th></th><th></th><th class="grp" colspan="5">OpenAI</th><th class="grp" colspan="3">Anthropic</th></tr>
    <tr><th>#</th><th>System</th><th>Avg</th>${cols.map((c) => `<th>${c.n.replace(/^(gpt|claude)-/, '')}</th>`).join('')}</tr>
  </thead>`;

  const body = `<tbody>${rows.map((r, ri) => {
    const prev = rows[ri - 1];
    const cells = r.v.map((v, ci) => {
      const dl = !r.abl && !r.human && prev && !prev.abl && !prev.human && ci === 0
        ? `<span class="dl">${sgn(v - prev.v[0])}</span>` : '';
      const d = prev && !r.human && prev.id !== 'HU' && !(r.abl && !prev.abl) ? f1(v - prev.v[ci]) : '';
      return `<td class="${ci === 0 ? 'avg' : ''}" data-v="${v}" data-d="${d}" data-c="${ci === 0 ? 'Avg' : cols[ci - 1].n}">${f1(v)}${dl}</td>`;
    }).join('');
    return `<tr data-id="${r.id}" class="${r.best ? 'best' : ''}${r.abl ? ' abl' : ''}${r.sep ? ' sep' : ''}${r.human ? ' hum' : ''}">
      <td>${r.human ? '' : r.id}</td><td>${esc(r.name)}</td>${cells}</tr>`;
  }).join('')}</tbody>`;

  t.innerHTML = head + body;

  function pick(id) {
    t.querySelectorAll('tbody tr').forEach((tr) => tr.classList.toggle('is-on', tr.dataset.id === id));
    const [h, p] = TABLE_READ[id];
    read(out, id === 'HU' ? 'human' : id, h, [p]);
  }

  t.querySelectorAll('tbody tr').forEach((tr) => {
    tr.addEventListener('click', () => pick(tr.dataset.id));
    tr.querySelectorAll('td[data-v]').forEach((td) => {
      td.addEventListener('mousemove', (e) => {
        const d = td.dataset.d;
        tip(
          `<span class="t-k">${tr.dataset.id} · ${esc(td.dataset.c)}</span>F1 <b>${td.dataset.v}</b>` +
          (d ? `<br>${+d >= 0 ? '+' : '−'}<b>${Math.abs(+d).toFixed(1)}</b> vs. the row above` : ''),
          e.clientX, e.clientY
        );
      });
      td.addEventListener('mouseleave', untip);
    });
  });

  pick('S6');
}

/* ══════════════════════ applications ══════════════════════ */

function initApps() {
  const el = document.getElementById('appGrid');
  if (!el) return;
  el.innerHTML = APPS.map(
    (a) => `<article class="app rv">
      <svg class="app-i" viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round">${APP_ICONS[a.i]}</svg>
      <h3>${a.t}</h3>
      <p>${a.p}</p>
      <span class="app-tag">${a.tag}</span>
    </article>`
  ).join('');
}

/* ══════════════════════ entry ══════════════════════ */

export function initCharts() {
  initFindings();
  initLadder();
  initAbl();
  initOracle();
  initSlices();
  initTable();
  initApps();
  window.addEventListener('scroll', untip, { passive: true });
}
