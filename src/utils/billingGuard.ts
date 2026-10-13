export interface BillingEvaluationStatus {
  canSubmit: boolean;
  freeTasksUsed: number;
  freeTasksMax: number;
  hasPaid: boolean;
  message?: string;
  checkoutUrl?: string;
}

/**
 * Checks whether the student has quota remaining to submit and evaluate tasks.
 * Interns get exactly 6 free tasks before tuition payment is mandatory.
 */
export function checkEvaluationQuota(
  submissionsCount: number,
  hasPaid: boolean = false,
  studentId?: string,
  cohortId?: string,
): BillingEvaluationStatus {
  const freeTasksMax = 6;

  if (hasPaid) {
    return {
      canSubmit: true,
      freeTasksUsed: submissionsCount,
      freeTasksMax,
      hasPaid: true,
      message: "Paid enrollment: unlimited submissions & evaluations enabled.",
    };
  }

  if (submissionsCount < freeTasksMax) {
    return {
      canSubmit: true,
      freeTasksUsed: submissionsCount,
      freeTasksMax,
      hasPaid: false,
      message: `Free trial tier: ${submissionsCount} of ${freeTasksMax} free evaluations completed.`,
    };
  }

  // Quota exceeded:
  const checkoutUrl = studentId && cohortId
    ? `https://zigex.com/checkout?studentId=${studentId}&cohortId=${cohortId}`
    : "https://zigex.com/checkout";

  return {
    canSubmit: false,
    freeTasksUsed: submissionsCount,
    freeTasksMax,
    hasPaid: false,
    message: `Evaluation access paused: You have completed all ${freeTasksMax} free submissions. Please complete your internship tuition payment to resume automated evaluation.`,
    checkoutUrl,
  };
}
