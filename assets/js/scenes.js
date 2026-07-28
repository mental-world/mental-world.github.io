/* The three events the hero can open, and what the system claims to know about
   each one. Everything the video frame and the analysis panel display comes
   from here, so re-cutting a clip or re-wording a reading is a one-place edit.

   The split is the paper's, and the two halves are deliberately given different
   shapes on the page. `phy` is what a camera settles, so it is written as
   extracted state — short subject/predicate tags, no prose, no hedging. `ment`
   is per-agent and is never stated as fact: full sentences, every one hedged,
   every agent carrying a confidence. The interesting content of all three
   scenes is not what happened but that the people in them are working from
   different pictures of it.

   Keys match the `data-scene` attributes in index.html and the filenames in
   assets/media: `<key>.mp4` is the normal view, `<key>-phy.mp4` the god
   physical pass, `<key>-ment.mp4` the per-agent mental pass. `conf`: 1 low,
   2 moderate, 3 high.

   `cues` are subtitles, one track per clip, `[from, to, speaker, line]` in
   seconds. They are transcribed off each clip's own audio rather than taken
   from the generation scripts, because the rendered clips do not all match the
   duration those scripts planned for — roadwork's normal view came back at
   12.4s against a 15s plan, so its scripted cue times would run past the end.
   Re-render a clip and these have to be re-measured, not scaled. */

export const SCENES = {
  roadwork: {
    title: 'One raised hand, two readings',
    place: 'City roadwork site · barricades, open gate, idle roller · late afternoon',
    tag: 'Roadwork Site',
    dur: '12s',
    phy: {
      eye: 'god view · one fixed frame',
      where: 'Work bay between the sidewalk barricades and the road. The pedestrian gate stays open and unlatched throughout.',
      tags: [
        ['pedestrian gate', 'open, unlatched'],
        ['barricade', 'opaque, blocks the foreman'],
        ['road roller', 'idling, never moves'],
        ['delivery van', 'slowing, then away'],
        ['3 workers', 'gate, sidewalk, cab']
      ]
    },
    mentEye: 'per agent · one mind',
    ment: [
      {
        who: 'Marcus Reed',
        role: 'foreman',
        conf: 2,
        belief: 'Believes the gate was shut. He saw a raised hand and took it for the all-clear he asked for.',
        intent: 'To get the roller moving and pull the job back onto schedule.',
        attend: "Daniel's hand above the fence, then the cab. Never the gate — the panel is in the way."
      },
      {
        who: 'Daniel Park',
        role: 'traffic marshal',
        conf: 3,
        belief: 'Knows the gate is still open. He was reaching for the latch when the van pulled him away.',
        intent: 'To stop the roller, even though it means contradicting his supervisor in the open.',
        attend: "The van first, then the gate, then Marcus's thumb."
      },
      {
        who: 'Jamal Brooks',
        role: 'roller operator',
        conf: 2,
        belief: 'Holds no belief about the gate at all. From inside the cab he cannot see it.',
        intent: 'To keep the machine still until the two signals agree.',
        attend: 'A thumbs-up in one window, an open stop palm in the other.'
      }
    ],
    note: 'Three men, one gate. The foreman is certain it is shut, the marshal knows it is open, and the operator — the only one holding the controls — cannot see it at all.',
    cues: {
      main: [
        [0.30, 2.80, 'Marcus', 'Close that gate, then give me the all-clear.'],
        [5.58, 7.05, 'Marcus', 'Jamal, start her up.'],
        [8.26, 9.95, 'Daniel', "Hold it — the gate's still open!"],
        [11.08, 12.38, 'Jamal', 'Holding.']
      ],
      phy: [
        [0.00, 2.45, 'Marcus', 'Close that gate, then give me the all-clear.'],
        [6.50, 8.30, 'Marcus', 'Jamal, start her up.'],
        [9.26, 11.45, 'Daniel', "Hold it — the gate's still open!"],
        [14.02, 15.07, 'Jamal', 'Holding.']
      ],
      ment: [
        [0.00, 1.80, 'Marcus', "We're behind. I saw Daniel's hand,"],
        [1.82, 3.10, 'Marcus', 'and assumed the gate was shut.'],
        [3.38, 4.85, 'Marcus', 'I acted before I knew.'],
        [5.68, 7.05, 'Daniel', 'The gate was still open.'],
        [7.34, 8.32, 'Daniel', 'Marcus outranks me,'],
        [8.34, 10.00, 'Daniel', 'but staying quiet could get someone hurt.'],
        [10.58, 12.00, 'Jamal', 'They gave me opposite signals.'],
        [12.38, 14.91, 'Jamal', 'Until they agree, I keep the roller still.']
      ]
    }
  },

  park: {
    title: 'Three swings, then a fourth',
    place: 'Neighborhood park · two-bay swing set behind the slide · late afternoon',
    tag: 'Neighborhood Park',
    dur: '15s',
    phy: {
      eye: 'god view · fixed wide',
      where: 'Swing set on the rubber area. The red slide stands between the right-hand swing and the bench.',
      tags: [
        ['right swing', 'four forward crests'],
        ['red slide', 'blocks the bench sightline'],
        ['3 fingers', 'raised, held up'],
        ['one palm', 'on a chain, under a second'],
        ['adult', 'arrives after the shout']
      ]
    },
    mentEye: 'per agent · one mind',
    ment: [
      {
        who: 'Lily Chen',
        role: 'eight',
        conf: 3,
        belief: 'Knows the promise was three, and knows she counted it correctly.',
        intent: 'To be believed. The count is the only evidence she has.',
        attend: "The forward crests, then her mother's face."
      },
      {
        who: 'Ethan Liu',
        role: 'nine',
        conf: 2,
        belief: 'Knows he broke the promise, and knows Mei heard none of it.',
        intent: 'To report the one thing that was visible: her hand on his chain.',
        attend: 'What Mei can see from the bench, not what he agreed to.'
      },
      {
        who: 'Mei Chen',
        role: "Lily's mother",
        conf: 1,
        belief: 'Has the accusation, three raised fingers and a still swing. Not the promise.',
        intent: 'To hold judgment until she has both sides.',
        attend: 'The pointing hand, the raised fingers, the motionless chain.'
      }
    ],
    note: 'The slide is one object to the physical state and an information barrier to the one person who has to judge. What is missing from Mei’s picture is exactly the part that decides it.',
    cues: {
      main: [
        [0.00, 2.20, 'Ethan', "Three swings, then it's yours."],
        [2.26, 3.00, 'Lily', 'Okay.'],
        [4.64, 6.00, 'Lily', "That's three."],
        [9.06, 11.00, 'Ethan', 'She grabbed my swing!'],
        [11.32, 12.40, 'Lily', 'You promised!'],
        [13.00, 15.10, 'Mei', 'Stop. One at a time.']
      ],
      phy: [
        [0.00, 1.70, 'Ethan', "Three swings, then it's yours."],
        [1.72, 2.40, 'Lily', 'Okay.'],
        [4.40, 5.75, 'Lily', "That's three."],
        [9.46, 11.15, 'Ethan', 'She grabbed my swing!'],
        [11.20, 12.20, 'Lily', 'You promised!'],
        [12.60, 15.10, 'Mei', 'Stop. One at a time.']
      ],
      ment: [
        [0.00, 2.95, 'Lily', 'He promised after three. I counted right.'],
        [3.14, 5.00, 'Lily', 'Now Mom may think I cheated.'],
        [5.50, 6.60, 'Ethan', 'I did promise.'],
        [7.04, 10.00, 'Ethan', 'But if I tell Mom she grabbed it, she may blame Lily.'],
        [10.50, 13.15, 'Mei', 'I heard the accusation, not what came before.'],
        [13.58, 15.10, 'Mei', 'I need both sides.']
      ]
    }
  },

  office: {
    title: 'Two folders, one carrier',
    place: 'Glass office and open work area · one closed door between · late afternoon',
    tag: 'Office Floor',
    dur: '15s',
    phy: {
      eye: 'god view · 78° overhead',
      where: "A glass manager's office and the open floor beyond it, joined by one door that closes after a single crossing.",
      tags: [
        ['red folder', 'thick, assigned to Ava'],
        ['blue folder', 'thin, assigned to Ben'],
        ['desk', 'empty after the pickup'],
        ['blinds', 'raised once, stay raised'],
        ['glass door', 'closed, passes no words']
      ]
    },
    mentEye: 'per agent · one mind',
    ment: [
      {
        who: 'Maya',
        role: 'department manager',
        conf: 2,
        belief: 'Saw the transfer and not the sentence that caused it, and reads it as Ava offloading.',
        intent: 'To decide between confronting Ava now and watching a little longer.',
        attend: "Ben's hands through the glass, and her own hand on the door."
      },
      {
        who: 'Ava',
        role: 'junior employee',
        conf: 3,
        belief: 'Knows the split was one folder each, and knows Maya could not hear her ask.',
        intent: 'To have both folders come back through her.',
        attend: "Ben's hesitation, and briefly the raised blinds."
      },
      {
        who: 'Ben',
        role: 'junior employee',
        conf: 1,
        belief: 'Never heard the original assignment, so cannot tell delegation from dumping.',
        intent: 'To avoid a scene at the desk.',
        attend: "The unexpected red folder, then Ava's face."
      }
    ],
    note: 'The glass passes the picture and stops the words. All three are right about what they saw, and only one of them saw the thing that decides it.',
    cues: {
      main: [
        [0.00, 2.15, 'Maya', 'Ava, take the red folder. Ben takes the blue.'],
        [2.20, 4.05, 'Maya', 'Bring them back together before the client call.'],
        [8.28, 9.35, 'Ava', 'Can you do both?'],
        [9.46, 10.90, 'Ava', 'Bring them back to me first.']
      ],
      phy: [
        [0.12, 2.40, 'Maya', 'Ava, take the red folder. Ben takes the blue.'],
        [2.46, 4.70, 'Maya', 'Bring them back together before the client call.'],
        [9.04, 10.10, 'Ava', 'Can you do both?'],
        [10.26, 11.65, 'Ava', 'Bring them back to me first.']
      ],
      ment: [
        [0.00, 2.60, 'Maya', 'I assigned them separately. Ben has both.'],
        [3.14, 5.80, 'Maya', 'Confront Ava now — or watch a little longer?'],
        [6.06, 6.95, 'Ava', 'Ben is faster.'],
        [7.06, 10.10, 'Ava', 'If he returns both to me, Maya may think I did my part.'],
        [10.18, 11.85, 'Ben', "I never heard Maya's plan."],
        [11.96, 12.98, 'Ben', 'Is Ava delegating —'],
        [13.00, 15.10, 'Ben', 'or quietly dumping her work on me?']
      ]
    }
  }
};
