export interface AIProposal {
  actionId: string;
  actionType: 'medication' | 'diagnosis' | 'referral';
  description: string;
  confidence: number;
}

export interface DoctorDecision {
  actionId: string;
  status: 'approved' | 'rejected' | 'modified';
  doctorNotes: string;
  timestamp: string;
}

export class HumanInTheLoop {
  async requireDoctorConfirmation(proposal: AIProposal): Promise<boolean> {
    console.log("Oczekiwanie na decyzję lekarza:", proposal);
    return true;
  }

  async logDoctorDecision(decision: DoctorDecision) {
    console.log("Zapisano decyzję lekarza:", decision);
  }
}
