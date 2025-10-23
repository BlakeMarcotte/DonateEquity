/**
 * Decision logic for determining the recommended donation model based on quiz answers
 * Implements the decision matrix with rules R1-R9
 */

export interface DonationRecommendation {
  model: string
  explanation: string
  ruleId: string
}

export interface ModelDetails {
  title: string
  description: string
  keyPoints: string[]
  considerations: string[]
  typicalUsers: string
}

type QuizAnswers = Record<string, string | string[] | Record<string, string>>

export function getDonationRecommendation(answers: QuizAnswers): DonationRecommendation {
  const companyStage = answers.company_stage as string
  const donationSource = answers.donation_source as string
  const transferTiming = answers.transfer_timing as string
  const dilutionSensitivity = answers.dilution_sensitivity as string
  const boardApproval = answers.board_approval as string

  // R8: Fallback - No board approval available → founder donates personally
  if (boardApproval === 'no') {
    return {
      model: 'Founder Pre-Exit (Fallback)',
      explanation: 'Since you don\'t have board approval available, we recommend donating from your personal founder shares before the exit. This fully secures your social-impact legacy even if ownership changes, and allows potential pre-exit liquidity where the DAF can sometimes sell small portions early with company approval.',
      ruleId: 'R8'
    }
  }

  // R1: Corporate Upfront
  if (
    donationSource === 'company' &&
    ['pre-seed', 'seed', 'series-a'].includes(companyStage) &&
    transferTiming === 'now' &&
    dilutionSensitivity !== 'high' &&
    boardApproval !== 'no'
  ) {
    return {
      model: 'Corporate Upfront',
      explanation: 'Your company will donate approximately 1% of its shares immediately through a warrant or stock-transfer agreement approved by the board. This locks in your social-impact legacy before valuations rise and is 100% legally binding, guaranteeing impact even if ownership or leadership changes.',
      ruleId: 'R1'
    }
  }

  // R2: Corporate Distributed
  if (
    donationSource === 'company' &&
    (['series-b', 'growth', 'pre-ipo', 'public'].includes(companyStage) || dilutionSensitivity === 'high')
  ) {
    return {
      model: 'Corporate Distributed',
      explanation: 'Instead of donating all at once, your company will spread the 1% equity donation across yearly tranches (approximately 0.1% per year). This minimizes investor dilution by issuing gradually, keeps the board engaged annually with the impact program, and captures higher valuations over time.',
      ruleId: 'R2'
    }
  }

  // R3: Founder Pre-Exit
  if (donationSource === 'founder' && transferTiming === 'now') {
    return {
      model: 'Founder Pre-Exit',
      explanation: 'You\'ll personally donate shares before the IPO or sale, transferring stock directly to a nonprofit or donor-advised fund (DAF). This fully secures your social-impact legacy even if ownership changes, allows potential pre-exit liquidity where the DAF can sometimes sell small portions early with company approval, and provides immediate tax benefits.',
      ruleId: 'R3'
    }
  }

  // R4: Founder Post-Exit
  if (donationSource === 'founder' && transferTiming === 'at-liquidity') {
    return {
      model: 'Founder Post-Exit',
      explanation: 'You\'ll sign a pledge agreement now but complete the donation after IPO or acquisition, when shares are liquid and valued higher. This maximizes your tax deduction since the fair-market value post-exit is far higher, is easiest administratively (public stock requires no appraisal), and lets you offset capital-gains income at exit.',
      ruleId: 'R4'
    }
  }

  // R5: Hybrid Upfront
  if (donationSource === 'both' && ['seed', 'series-a'].includes(companyStage)) {
    return {
      model: 'Hybrid Upfront',
      explanation: 'This combines a corporate pledge and a founder pledge - you\'ll give some of your personal shares and the company will donate corporate shares simultaneously. This shares responsibility between leadership and company, balances dilution (company) with personal tax benefit (founder), and sends a powerful unified message of company-wide commitment.',
      ruleId: 'R5'
    }
  }

  // R6: Hybrid Distributed
  if (donationSource === 'both' && ['series-b', 'growth'].includes(companyStage)) {
    return {
      model: 'Hybrid Distributed',
      explanation: 'You as the founder will donate your personal shares early to lead by example, while the company contributes in distributed tranches over time (approximately 0.1% per year). This shares responsibility between leadership and company, balances dilution concerns with immediate founder commitment, and demonstrates a unified philanthropic vision.',
      ruleId: 'R6'
    }
  }

  // R7: Hybrid Deferred
  if (donationSource === 'both' && ['pre-ipo', 'public'].includes(companyStage)) {
    return {
      model: 'Hybrid Deferred',
      explanation: 'You\'ll cover the early pledge from your personal founder shares before exit, with the corporate portion pledged after the liquidity event (IPO or acquisition). This balances your personal commitment before exit with maximizing the corporate donation value, while sharing responsibility between leadership and company.',
      ruleId: 'R7'
    }
  }

  // R9: Manual Review (default/fallback)
  return {
    model: 'Manual Review',
    explanation: 'Your situation requires a customized approach. Our team will review your responses and recommend the best donation structure for your specific circumstances.',
    ruleId: 'R9'
  }
}

// Export model descriptions for reference
export const MODEL_DESCRIPTIONS: Record<string, ModelDetails> = {
  'Corporate Upfront': {
    title: 'Corporate Upfront',
    description: 'Used mainly by early-stage companies (Pre-Seed → Series A). The company donates approximately 1% of its shares immediately through a warrant or stock-transfer agreement, approved by its board. This locks in the social-impact legacy before valuations rise.',
    keyPoints: [
      '100% legally binding—guarantees impact even if ownership or leadership changes',
      'Simple, one-time action: board resolution + DAF setup',
      'Aligns the company\'s mission with investors early',
      'Immediate philanthropic impact'
    ],
    considerations: [
      'Dilutes investors immediately (approximately 1%)',
      'No way to "undo" if the company never exits',
      'Tax deduction only occurs when the warrant is exercised, not when granted'
    ],
    typicalUsers: 'Early-stage startups wanting to cement a legacy and inspire culture from day one'
  },
  'Corporate Distributed': {
    title: 'Corporate Distributed',
    description: 'Best for growth or late-stage companies (Series B → Pre-IPO). Instead of donating all at once, the company spreads the 1% equity donation across yearly tranches (e.g., 0.1% per year).',
    keyPoints: [
      'Minimizes investor dilution by issuing gradually (approximately 0.1% per year)',
      'Keeps the board engaged annually with the impact program',
      'Captures higher valuations over time',
      'More manageable for boards and investors'
    ],
    considerations: [
      'Requires annual board votes and follow-through',
      'If leadership changes, later tranches could stall or be cancelled'
    ],
    typicalUsers: 'Later-stage or IPO-ready companies seeking flexibility and governance continuity'
  },
  'Founder Pre-Exit': {
    title: 'Founder Pre-Exit',
    description: 'The founder personally donates shares before the IPO or sale, transferring stock directly to a nonprofit or a donor-advised fund (DAF) via a stock-transfer agreement.',
    keyPoints: [
      'Fully secures the social-impact legacy even if ownership changes',
      'Allows potential pre-exit liquidity: the DAF can sometimes sell small portions early with company approval',
      'Immediate tax benefits',
      'No company dilution'
    ],
    considerations: [
      'Smaller tax deduction: shares are valued lower pre-IPO',
      'Requires private-stock appraisal; usually capped at 30% of AGI for deduction',
      'Board approval: usually not required for a founder transferring personal shares'
    ],
    typicalUsers: 'Founders who want to "lock it in" early and demonstrate authentic commitment to social impact'
  },
  'Founder Pre-Exit (Fallback)': {
    title: 'Founder Pre-Exit',
    description: 'The founder personally donates shares before the IPO or sale, transferring stock directly to a nonprofit or a donor-advised fund (DAF) via a stock-transfer agreement. This approach is recommended when board approval is not available.',
    keyPoints: [
      'Alternative when board approval unavailable',
      'Fully secures the social-impact legacy even if ownership changes',
      'Allows potential pre-exit liquidity: the DAF can sometimes sell small portions early with company approval',
      'Immediate tax benefits and no company dilution required'
    ],
    considerations: [
      'Smaller tax deduction: shares are valued lower pre-IPO',
      'Requires private-stock appraisal; usually capped at 30% of AGI for deduction',
      'Board approval: usually not required for a founder transferring personal shares'
    ],
    typicalUsers: 'Founders without board approval who want to "lock it in" early and demonstrate authentic commitment to social impact'
  },
  'Founder Post-Exit': {
    title: 'Founder Post-Exit',
    description: 'The founder signs a pledge agreement now but completes the donation after IPO or acquisition, when shares are liquid and valued higher.',
    keyPoints: [
      'Maximizes tax deduction—the fair-market value post-exit is far higher',
      'Easiest administratively (public stock; no appraisal needed)',
      'Lets founders offset capital-gains income at exit',
      'Flexibility during company growth'
    ],
    considerations: [
      'If leadership changes or relationships sour, follow-through risk rises',
      'Less symbolic early-stage signal'
    ],
    typicalUsers: 'Founders within approximately 12 months of IPO or sale who want full tax efficiency without disrupting cap-table governance'
  },
  'Hybrid Upfront': {
    title: 'Hybrid Upfront',
    description: 'Combines a corporate pledge and a founder pledge. Founders give some of their personal shares, and the company donates corporate shares—either simultaneously or on staggered schedules.',
    keyPoints: [
      'Shares responsibility between leadership and company',
      'Balances dilution (company) with personal tax benefit (founder)',
      'Sends a powerful unified message of company-wide commitment',
      'Combined impact from multiple sources'
    ],
    considerations: [
      'Slightly more complex (two sets of docs + signers)',
      'Requires coordination between personal and corporate DAF accounts'
    ],
    typicalUsers: 'Mid-to-late-stage companies where founders want to lead by example while managing investor dilution'
  },
  'Hybrid Distributed': {
    title: 'Hybrid Distributed',
    description: 'Combines a corporate pledge and a founder pledge. Founders give some of their personal shares early, and the company donates corporate shares in distributed tranches over time.',
    keyPoints: [
      'Founder leads with immediate donation',
      'Company follows with manageable tranches (approximately 0.1% per year)',
      'Shares responsibility between leadership and company',
      'Balances immediate and long-term impact'
    ],
    considerations: [
      'Slightly more complex (two sets of docs + signers)',
      'Requires coordination between personal and corporate DAF accounts',
      'If leadership changes, later corporate tranches could stall'
    ],
    typicalUsers: 'Mid-to-late-stage companies where founders want to lead by example while managing investor dilution'
  },
  'Hybrid Deferred': {
    title: 'Hybrid Deferred',
    description: 'Combines a corporate pledge and a founder pledge. The founder covers the early pledge from personal shares, with the corporate portion pledged after a liquidity event (IPO or acquisition).',
    keyPoints: [
      'Founder commitment before exit',
      'Corporate portion secured for post-liquidity with maximum valuation',
      'Shares responsibility between leadership and company',
      'Maximizes certainty and impact'
    ],
    considerations: [
      'Slightly more complex (two sets of docs + signers)',
      'Requires coordination between personal and corporate DAF accounts',
      'Corporate portion has follow-through risk if leadership changes'
    ],
    typicalUsers: 'Mid-to-late-stage companies where founders want to lead by example while managing investor dilution'
  },
  'Manual Review': {
    title: 'Manual Review Required',
    description: 'Your situation requires a customized approach. Our team will review your responses and recommend the best donation structure for your specific circumstances.',
    keyPoints: [
      'Unique circumstances require expert review',
      'Our team will analyze your specific situation',
      'Personalized recommendation forthcoming',
      'We\'ll contact you within 2 business days'
    ],
    considerations: [
      'Requires waiting for team review',
      'May involve additional follow-up questions'
    ],
    typicalUsers: 'Companies or founders with unique circumstances that don\'t fit standard models'
  }
}
