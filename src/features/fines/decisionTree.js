// Fines / PCN decision tree — config-driven so individual branches can be
// corrected later without touching UI code.
//
// Shape:
//   nodes[id] = one of
//     { type: 'question', prompt, field?, options: [{ label, value, next }] }
//     { type: 'grounds',  prompt, field, options: [...checklist...],
//         onContest, onPay }               // checklist + free text, two exits
//     { type: 'action',   title, action, deadlineDays?, patch }   // leaf
//
// A 'question' node may write the chosen answer's `value` onto the ticket
// record via `field`. An 'action' (leaf) writes `patch` (a set of record
// fields) plus its `action` text into recommended_action and, if
// `deadlineDays` is set, key_deadline_date = today + deadlineDays.
//
// This module is duplicated verbatim in mobile/src/features/fines/decisionTree.js
// (the two apps are separate bundles). Keep them in sync.

export const START_NODE = 'entry';

// ── Enums (split by track) ────────────────────────────────────────────────
export const GOV_STAGES = [
  'PCN issued',
  'Notice to Owner',
  'Charge Certificate',
  'Order for Recovery (TEC)',
  'Enforcement / Bailiffs',
  'Representation made',
  'Resolved',
];

export const PRIVATE_STAGES = [
  'PCN issued',
  'Appeal to operator',
  'Independent appeal (POPLA/IAS)',
  'Debt collection',
  'Letter Before Claim',
  'Court / Enforcement',
  'Resolved',
];

export const ALL_STAGES = [...new Set([...GOV_STAGES, ...PRIVATE_STAGES])];

export const STATUS_OPTIONS = [
  'open',
  'resolved_paid',
  'resolved_contested_won',
  'resolved_written_off',
  'escalated',
];

export const CONTEST_OUTCOMES = ['pending', 'accepted', 'rejected', 'n/a'];
export const TICKET_TYPES = ['movement', 'non_movement'];

// Common valid grounds for contesting a government PCN (editable later).
export const CONTEST_GROUNDS = [
  { value: 'contravention_did_not_occur', label: 'The contravention did not occur' },
  { value: 'signage_inadequate', label: 'Signage / road markings were inadequate or unclear' },
  { value: 'vehicle_sold_or_stolen', label: 'Vehicle had been sold, or was stolen / hired out' },
  { value: 'exempt_vehicle', label: 'Vehicle was exempt (e.g. loading, blue badge, emergency)' },
  { value: 'procedural_error', label: 'Procedural error by the authority (wrong details, late notice)' },
];

export const tree = {
  // ── Step 0 — entry point ───────────────────────────────────────────────
  entry: {
    type: 'question',
    prompt: 'Is this fine from a government body (council, TfL) or a private parking company?',
    field: 'issuer_type',
    options: [
      { label: 'Government (council / TfL)', value: 'government', next: 'gov_authority' },
      { label: 'Private parking company', value: 'private', next: 'priv_stage' },
    ],
  },

  // ── Government track ────────────────────────────────────────────────────
  // Capture TfL vs council early — it decides which statutory forms apply
  // later (TE7/TE9 for TfL / Road User Charging, PE2/PE3 for councils).
  gov_authority: {
    type: 'question',
    prompt: 'Is this a TfL / Road User Charging PCN, or a council PCN?',
    field: 'gov_authority',
    options: [
      { label: 'TfL / Road User Charging (e.g. Congestion, ULEZ, red routes)', value: 'tfl', next: 'gov_contest' },
      { label: 'Council PCN (parking, bus lane, moving traffic)', value: 'council', next: 'gov_contest' },
    ],
  },

  // Q1 — can this be contested? Checklist of grounds + free text.
  gov_contest: {
    type: 'grounds',
    prompt: 'Can this fine be contested? Tick any grounds that apply, or add your own. If none apply, choose "No grounds — I’ll pay".',
    field: 'contest_grounds',
    grounds: CONTEST_GROUNDS,
    onContest: 'gov_contest_action',
    onPay: 'gov_pay_timing',
  },

  gov_contest_action: {
    type: 'action',
    title: 'Contest it — submit a formal representation',
    action:
      'Submit a formal representation (challenge) to the authority citing your selected ground(s). ' +
      'Keep evidence (photos, receipts, correspondence). The authority must respond — if they reject it they will issue ' +
      'a Notice of Rejection with your next options. Note: paying is not an admission, but once you contest, the early ' +
      'discount is usually paused pending their decision.',
    deadlineDays: 28,
    patch: {
      contested: true,
      contest_outcome: 'pending',
      current_stage: 'Representation made',
      status: 'open',
    },
  },

  // Q — pay path: how long since issue?
  gov_pay_timing: {
    type: 'question',
    prompt: 'How long ago was the PCN issued?',
    options: [
      { label: 'Within 14 days (discount still available)', value: 'within_14', next: 'gov_pay_discount' },
      { label: 'More than 14 days ago', value: 'past_14', next: 'gov_stage' },
    ],
  },

  gov_pay_discount: {
    type: 'action',
    title: 'Pay now at the discounted rate',
    action:
      'Pay at the discounted rate (usually 50% off) before the 14-day window closes. Pay via the authority’s ' +
      'website using the PCN reference. Once payment clears, mark this fine Resolved / Paid.',
    deadlineDays: 14,
    patch: {
      current_stage: 'PCN issued',
      status: 'open',
      contested: false,
      contest_outcome: 'n/a',
    },
  },

  // Past 14 days — where is it now?
  gov_stage: {
    type: 'question',
    prompt: 'What stage has it reached? (each stage escalates — pay now to stop it going further)',
    field: 'current_stage',
    options: [
      { label: 'Notice to Owner (discount lost)', value: 'Notice to Owner', next: 'gov_nto' },
      { label: 'Charge Certificate (amount increased)', value: 'Charge Certificate', next: 'gov_cc' },
      { label: 'Registered at TEC / Order for Recovery', value: 'Order for Recovery (TEC)', next: 'gov_ootime' },
      { label: 'Referred to enforcement agents / bailiffs', value: 'Enforcement / Bailiffs', next: 'gov_ootime' },
    ],
  },

  gov_nto: {
    type: 'action',
    title: 'Pay the full amount now',
    action:
      'The discount is gone at Notice to Owner stage — pay the full penalty now to stop a Charge Certificate ' +
      '(which adds a further 50%). If you have genuine grounds you can still make formal representations against the ' +
      'Notice to Owner instead of paying.',
    deadlineDays: 28,
    patch: { current_stage: 'Notice to Owner', status: 'open' },
  },

  gov_cc: {
    type: 'action',
    title: 'Pay the increased amount now',
    action:
      'At Charge Certificate stage the penalty has risen by 50% and you have 14 days to pay before it is registered ' +
      'as a debt at the Traffic Enforcement Centre (TEC). Pay now to stop it being registered and gaining an Order for Recovery.',
    deadlineDays: 14,
    patch: { current_stage: 'Charge Certificate', status: 'open' },
  },

  // Q2 — out-of-time statutory declaration route (only once at TEC / bailiffs)
  gov_ootime: {
    type: 'question',
    prompt:
      'It’s reached the TEC / bailiff stage. Do you want to challenge how it got here (the out-of-time ' +
      'statutory declaration route), or just pay to stop enforcement?',
    options: [
      { label: 'Challenge it (file the statutory declaration / witness statement)', value: 'challenge', next: 'gov_ootime_which' },
      { label: 'Just pay now to stop the bailiffs', value: 'pay', next: 'gov_pay_enforcement' },
    ],
  },

  gov_pay_enforcement: {
    type: 'action',
    title: 'Pay in full immediately to stop enforcement',
    action:
      'Pay the full outstanding amount (including any TEC/bailiff fees) immediately to halt enforcement action against ' +
      'the vehicle. Contact the enforcement agent directly to confirm the total and get written confirmation once paid.',
    deadlineDays: 7,
    patch: { current_stage: 'Enforcement / Bailiffs', status: 'escalated' },
  },

  // Route depends on TfL vs council (captured at gov_authority).
  gov_ootime_which: {
    type: 'question',
    prompt: 'Which grounds is your witness statement based on?',
    field: 'ootime_ground',
    options: [
      { label: 'Never received the Notice to Owner / PCN', value: 'not_received', next: 'gov_ootime_form' },
      { label: 'Already paid the full amount', value: 'already_paid', next: 'gov_ootime_form' },
      { label: 'Made representations / appeal but got no response', value: 'no_response', next: 'gov_ootime_form' },
      { label: 'Appeal to adjudicator was won or is still pending', value: 'appeal_pending', next: 'gov_ootime_form' },
    ],
  },

  // Leaf: picks TE7/TE9 vs PE2/PE3 based on gov_authority answer.
  gov_ootime_form: {
    type: 'action',
    title: 'File the out-of-time witness statement',
    // Action text is resolved dynamically (see resolveAction) using gov_authority.
    action: null,
    dynamic: 'gov_ootime_form',
    deadlineDays: 28,
    patch: {
      contested: true,
      contest_outcome: 'pending',
      current_stage: 'Order for Recovery (TEC)',
      status: 'open',
    },
  },

  // ── Private track ───────────────────────────────────────────────────────
  priv_stage: {
    type: 'question',
    prompt: 'How far along is the private parking charge? (you can contest at any stage — the route just changes)',
    field: 'current_stage',
    options: [
      { label: 'Just received / still in appeal window', value: 'Appeal to operator', next: 'priv_appeal' },
      { label: 'Operator rejected my appeal', value: 'Independent appeal (POPLA/IAS)', next: 'priv_independent' },
      { label: 'Getting debt collection letters', value: 'Debt collection', next: 'priv_debt' },
      { label: 'Received a Letter Before Claim', value: 'Letter Before Claim', next: 'priv_lbc' },
      { label: 'With a bailiff / court / debt collector (last resort)', value: 'Court / Enforcement', next: 'priv_lastresort' },
    ],
  },

  priv_appeal: {
    type: 'action',
    title: 'Appeal directly to the parking operator',
    action:
      'Appeal to the parking company directly, usually within 28 days, via the appeal link on the charge notice. ' +
      'State your grounds clearly and attach evidence. If they reject it they must give you a POPLA (BPA members) or ' +
      'IAS (IPC members) reference so you can escalate to the independent appeals service for free.',
    deadlineDays: 28,
    patch: {
      contested: true,
      contest_outcome: 'pending',
      current_stage: 'Appeal to operator',
      status: 'open',
    },
  },

  priv_independent: {
    type: 'action',
    title: 'Escalate to the independent appeals body',
    action:
      'Appeal for free to POPLA (if the operator is a BPA member) or the IAS (if an IPC member) — the code is on the ' +
      'rejection letter. You normally have 28 days from the rejection. Their decision is binding on the operator. If you win, ' +
      'the charge is cancelled; if you lose you can still choose to pay or wait to see if they pursue it.',
    deadlineDays: 28,
    patch: {
      contested: true,
      contest_outcome: 'pending',
      current_stage: 'Independent appeal (POPLA/IAS)',
      status: 'open',
    },
  },

  priv_debt: {
    type: 'action',
    title: 'Debt collector letters — no legal power',
    action:
      'Debt collectors chasing a private parking charge have NO legal power — they are just letters, not bailiffs, and ' +
      'cannot seize anything without a court order. Do not panic-pay. Decide whether to (a) hold your position if your ' +
      'appeal grounds are strong, or (b) settle to make it stop. The real escalation to watch for is a Letter Before Claim.',
    deadlineDays: null,
    patch: { current_stage: 'Debt collection', status: 'open' },
  },

  priv_lbc: {
    type: 'action',
    title: 'Letter Before Claim — do NOT ignore this',
    action:
      'This is the real danger point: a Letter Before Claim means court action can follow if ignored. You normally have ' +
      '30 days to respond. Respond in writing — either dispute it (restating your grounds and any POPLA/IAS outcome) or ' +
      'negotiate/settle. Ignoring it can lead to a County Court Judgment (CCJ) against you.',
    deadlineDays: 30,
    patch: { current_stage: 'Letter Before Claim', status: 'escalated' },
  },

  priv_lastresort: {
    type: 'question',
    prompt: 'Last-resort contest — how do you want to challenge it at this stage?',
    options: [
      { label: 'Email the parking company directly', value: 'email', next: 'priv_lastresort_email' },
      { label: 'It has gone to court / a CCJ was issued', value: 'court', next: 'priv_lastresort_court' },
    ],
  },

  priv_lastresort_email: {
    type: 'action',
    title: 'Email the operator directly as a final challenge',
    action:
      'Email the parking company directly stating your grounds and requesting they cancel or halt collection — keep a ' +
      'written record. Note: the free independent appeal (POPLA / IAS) is likely closed by this stage, and there is no ' +
      'standard statutory form for private charges the way there is for government PCNs. If it later becomes a court claim, ' +
      'respond to the court paperwork on time.',
    deadlineDays: 14,
    patch: {
      contested: true,
      contest_outcome: 'pending',
      current_stage: 'Court / Enforcement',
      status: 'escalated',
    },
  },

  priv_lastresort_court: {
    type: 'action',
    title: 'Respond to the court claim on time',
    action:
      'If a County Court claim has been issued, respond using the enclosed forms before the deadline (usually 14 days to ' +
      'acknowledge, 28 to defend) — you can defend or, if a CCJ has already been made in error, apply to set it aside. ' +
      'Consider free advice from Citizens Advice. Ignoring court papers leads to a CCJ by default.',
    deadlineDays: 14,
    patch: {
      contested: true,
      contest_outcome: 'pending',
      current_stage: 'Court / Enforcement',
      status: 'escalated',
    },
  },
};

// Resolve a leaf's action text, filling in dynamic branches from answers so far.
export function resolveAction(node, answers) {
  if (node.dynamic === 'gov_ootime_form') {
    const isTfl = answers.gov_authority === 'tfl';
    if (isTfl) {
      return (
        'File a TE9 (witness statement) with the Traffic Enforcement Centre, and — if you are outside the deadline — ' +
        'a TE7 first (application for more time to file the TE9). These apply to TfL / Road User Charging PCNs. Filing a valid ' +
        'TE9 cancels the Order for Recovery and sends the case back to the authority. Submit online or by post before the deadline.'
      );
    }
    return (
      'File a PE3 (witness statement) with the Traffic Enforcement Centre, and — if you are outside the deadline — ' +
      'a PE2 first (application for more time to file the PE3). These apply to council PCNs (parking, bus lane, moving traffic). ' +
      'A valid PE3 cancels the Order for Recovery and returns the case to the council. Submit online or by post before the deadline.'
    );
  }
  return node.action || '';
}
